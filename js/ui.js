(function () {
let gameState = null;
let combatState = null;
let onUpdate = null;
let isoField = null;
let selSlot = 'weapon';
let selInvUid = null;
let selInvUids = new Set();
let invMultiMode = false;
let lastInvClickUid = null;
let selTownUids = new Set();
let townMultiMode = false;
let lastTownClickUid = null;
let lastCampSig = '';
let invPage = 0;
let lastTipAnchor = null;
let tipPinned = false;
let hoverTimer = null;
let attrPage = 0;
let autosellOpen = false;

function canHoverPeek() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function isMobileUi() {
  return document.documentElement.dataset.ui === 'mobile';
}

function applyUiMode() {
  const was = document.documentElement.dataset.ui;
  window.__applyUiMode?.();
  const now = document.documentElement.dataset.ui;
  if (was === now) return;
  if (now === 'mobile') setMobileView(document.body.dataset.mview || 'combat');
  else {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.isoField?.resize());
    });
  }
  if (lastTipAnchor && !document.getElementById('item-tip')?.hidden) positionItemTip(lastTipAnchor);
}

function setMobileView(view) {
  const next = view === 'camp' || view === 'maps' ? view : 'combat';
  document.body.dataset.mview = next;
  document.querySelectorAll('#mobile-nav [data-mview]').forEach((b) => {
    const on = b.dataset.mview === next;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.isoField?.resize());
  });
}
let mapActTab = 0;
let mapActFollow = true;
let knownMapUnlocks = null;
const ACT_TAB_NAMES = { 1: '一章', 2: '二章', 3: '三章', 4: '四章', 5: '五章', 6: '秘境' };
const INV_PAGE = 24;
const ATTR_PAGES = ['效率', '属性基础', '属性战斗', '属性防御'];
let townOpen = false;
let townBuilding = 'hall';
let selTownUid = null;
let townPage = 0;
let townInvTab = 'ware';
let selSkillId = null;

function shownAffix(item, a) {
  if (!a) return a;
  const m = itemAffixStatMult(item);
  if (m === 1) return a;
  return { ...a, value: Math.round(a.value * m * 1000) / 1000 };
}

function shownBase(item, n) {
  return Math.round((n || 0) * itemStatMult(item));
}

function salvageSum(items) {
  return (items || []).reduce((acc, it) => {
    const r = salvagePreview(it);
    acc.gold += r.gold;
    acc.metal += r.metal;
    acc.cloth += r.cloth;
    acc.crystal += r.crystal;
    return acc;
  }, { gold: 0, metal: 0, cloth: 0, crystal: 0 });
}

function salvageBtnText(items) {
  const s = salvageSum(items);
  return `分解 ${formatCostText({ gold: Math.floor(s.gold), metal: s.metal, cloth: s.cloth, crystal: s.crystal })}`;
}

function ownedAmount(key) {
  if (key === 'gold') return gameState.gold || 0;
  return ensureMats(gameState)[key] || 0;
}

function costStatusHtml(cost) {
  const labels = { gold: '金币', metal: '金属', cloth: '布料', crystal: '水晶' };
  return ['gold', 'metal', 'cloth', 'crystal'].map((key) => {
    const need = Math.floor(cost[key] || 0);
    if (!need) return '';
    const have = ownedAmount(key);
    const cls = have >= need ? 'ok' : 'short';
    return `<span class="cost-need ${cls}" title="${have.toLocaleString()} / ${need.toLocaleString()}">${labels[key]} ${formatCompactNum(have)}/${formatCompactNum(need)}</span>`;
  }).join('');
}

function payActionHtml(act, uid, label, cost) {
  const lack = canPayCost(gameState, cost);
  return `<div class="enhance-row">
    <button type="button" class="btn-small ${lack ? 'lack' : 'ready'}" data-act="${act}" data-uid="${uid || ''}">${label}</button>
    <div class="cost-line">${costStatusHtml(cost)}</div>
  </div>`;
}

function enhanceBtnHtml(item) {
  if (!item) return '';
  const cap = itemEnhanceCapPct(item.quality);
  if (!cap) return '';
  const lv = item.enhance || 0;
  if (lv >= 10) {
    return `<p class="hint">强化已满 +10（属性 +${Math.round(cap * 100)}%）</p>`;
  }
  return payActionHtml('enhance', item.uid, `强化 ${lv}/10`, enhanceCost(item));
}

function trainBonusText(def, lv = 1) {
  const v = (lv || 0) * def.per;
  if (def.unit === '%') return `+${Math.round(v * 1000) / 10}%`;
  return `+${Math.round(v * 10) / 10}${def.unit || ''}`;
}

function trainPanelHtml(hero) {
  ensureTrain(hero);
  const mats = ensureMats(gameState);
  const hall = getHallLevel(gameState);
  const rows = TRAIN_DEFS.map((def) => {
    const unlocked = !!hero.train.unlocked[def.id];
    const lv = hero.train.lv[def.id] || 0;
    const cap = def.max || TRAIN_MAX;
    const needHall = def.hall || 1;
    const hallOk = hall >= needHall;
    if (!unlocked) {
      if (!hallOk) {
        return `<div class="train-card locked-hall">
          <div class="train-card-h"><span>${def.name}</span><span class="hall-gate">议事厅条件不满足</span></div>
          <div class="hint">${def.desc} · 每级 ${trainBonusText(def, 1)}，上限 ${cap} 级</div>
          <p class="hall-gate-note">需议事厅 ${needHall} 级（当前 ${hall} 级）</p>
          <div class="enhance-row">
            <button type="button" class="btn-small lack" data-act="train-unlock" data-uid="${def.id}">议事厅条件不满足</button>
          </div>
        </div>`;
      }
      return `<div class="train-card">
        <div class="train-card-h"><span>${def.name}</span><span>未解锁</span></div>
        <div class="hint">${def.desc} · 每级 ${trainBonusText(def, 1)}，上限 ${cap} 级</div>
        ${payActionHtml('train-unlock', def.id, '解锁', trainUnlockCost(def))}
      </div>`;
    }
    const maxed = lv >= cap;
    const cost = maxed ? null : trainLevelCost(def, lv);
    return `<div class="train-card">
      <div class="train-card-h"><span>${def.name} ${lv}/${cap}</span><span>${trainBonusText(def, lv)}</span></div>
      <div class="hint">${def.desc}</div>
      ${maxed
        ? '<p class="hint">已达上限</p>'
        : payActionHtml('train-up', def.id, '训练升级', cost)}
    </div>`;
  }).join('');
  return `<h3>训练场</h3>
    <p>议事厅 ${hall} 级决定可解锁项目。金币 ${formatCompactNum(gameState.gold)} · 金属 ${formatCompactNum(mats.metal)} · 布料 ${formatCompactNum(mats.cloth)} · 水晶 ${formatCompactNum(mats.crystal)}</p>
    <div class="train-list">${rows}</div>`;
}

function initUI(state, updateCallback) {
  gameState = state;
  onUpdate = updateCallback;
  const canvas = document.getElementById('iso-canvas');
  isoField = new IsoField(canvas);
  window.isoField = isoField;
  isoField.resize();
  window.__applyUiMode?.();
  if (isMobileUi()) setMobileView(document.body.dataset.mview || 'combat');
  bindEvents();
  lastCampSig = '';
  renderAll();
}

function setCombatState(cs) {
  combatState = cs;
}

function renderAll() {
  if (!gameState || !getActiveHero(gameState)) return;
  try {
  renderHeroPanel();
    renderCombatHud();
  renderStatsPanel();
  renderLog();
  renderMapSelect();
  checkOfflineReward();
    syncTownButton();
  } catch (err) {
    console.error('[ui]', err);
  }
}

function bindEvents() {
  document.getElementById('btn-offline')?.addEventListener('click', showOfflineModal);
  document.getElementById('btn-skills')?.addEventListener('click', showSkillModal);
  document.getElementById('btn-characters')?.addEventListener('click', showCharacterModal);
  const openTownOrShop = () => {
    if (townUnlocked(gameState)) openTown();
    else showShopModal();
  };
  document.getElementById('btn-shop')?.addEventListener('click', openTownOrShop);
  document.getElementById('btn-town-m')?.addEventListener('click', openTownOrShop);
  document.getElementById('mobile-nav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mview]');
    if (!btn) return;
    setMobileView(btn.dataset.mview);
  });
  window.addEventListener('resize', applyUiMode);
  window.addEventListener('orientationchange', applyUiMode);
  window.visualViewport?.addEventListener('resize', () => {
    applyUiMode();
    window.isoField?.resize();
    if (lastTipAnchor && !document.getElementById('item-tip')?.hidden) positionItemTip(lastTipAnchor);
  });
  document.getElementById('town-close')?.addEventListener('click', closeTown);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && townOpen) closeTown();
  });
  document.getElementById('town-overlay')?.addEventListener('click', onTownClick);
  document.getElementById('town-overlay')?.addEventListener('mouseover', (e) => {
    if (!canHoverPeek() || tipPinned) return;
    const el = e.target.closest('[data-inv], [data-wh]');
    if (!el || el.contains(e.relatedTarget)) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      showPeekTip(el);
    }, 200);
  });
  document.getElementById('town-overlay')?.addEventListener('mouseout', (e) => {
    if (!canHoverPeek() || tipPinned) return;
    const el = e.target.closest('[data-inv], [data-wh]');
    if (!el) return;
    const to = e.relatedTarget;
    if (to && (el.contains(to) || to.closest?.('#item-tip'))) return;
    scheduleHideItemTip();
  });
  document.getElementById('btn-reset-save')?.addEventListener('click', () => {
    if (!confirm('将清除本地存档并重新开始（等级、地图、解锁、背包全部还原），确定？')) return;
    resetSave();
    location.replace(`${location.pathname}?v=89&reset=${Date.now()}`);
  });
  const fillJunkSelect = () => {
    const sel = document.getElementById('junk-q');
    if (!sel || sel.options.length) return;
    sel.innerHTML = JUNK_FILTER_MODES.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  };
  fillJunkSelect();
  const optsEl = document.getElementById('autosell-opts');
  if (optsEl && !optsEl.childElementCount) {
    optsEl.innerHTML = AUTO_SELL_MODES.map(m =>
      `<button type="button" class="as-opt" data-as="${m.id}" title="${m.hint || m.name}">${m.name}${m.hint ? `<span class="as-hint">${m.hint}</span>` : ''}</button>`
    ).join('');
  }
  const closeAutosellPop = () => {
    autosellOpen = false;
    document.getElementById('autosell-pop')?.setAttribute('hidden', '');
  };
  const placeAutosellPop = () => {
    const pop = document.getElementById('autosell-pop');
    const btn = document.getElementById('btn-autosell');
    if (!pop || !btn) return;
    const r = btn.getBoundingClientRect();
    const w = Math.min(240, window.innerWidth - 16);
    pop.style.width = `${w}px`;
    const h = pop.offsetHeight || 280;
    let left = r.right - w;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };
  const openAutosellPop = () => {
    autosellOpen = true;
    const pop = document.getElementById('autosell-pop');
    pop?.removeAttribute('hidden');
    placeAutosellPop();
  };
  document.getElementById('btn-autosell')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (autosellOpen) closeAutosellPop();
    else openAutosellPop();
  });
  document.getElementById('btn-bag-expand')?.addEventListener('click', () => {
    showBagExpandModal();
  });
  document.getElementById('autosell-pop')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!gameState.autoSell) return;
    const actBtn = e.target.closest('[data-as-act]');
    if (actBtn) {
      gameState.autoSell.action = actBtn.dataset.asAct;
      lastCampSig = '';
      renderHeroPanel();
      return;
    }
    const opt = e.target.closest('[data-as]');
    if (!opt) return;
    const id = opt.dataset.as;
    if (id === 'off') {
      gameState.autoSell.enabled = false;
      closeAutosellPop();
    } else {
      gameState.autoSell.enabled = true;
      gameState.autoSell.maxQuality = id;
    }
    lastCampSig = '';
    renderHeroPanel();
  });
  document.getElementById('as-ilvl')?.addEventListener('change', () => {
    if (!gameState.autoSell) return;
    const n = Math.max(0, Math.min(99, Number(document.getElementById('as-ilvl')?.value) || 0));
    gameState.autoSell.minKeepLevel = n;
  });
  document.getElementById('as-better')?.addEventListener('change', () => {
    if (!gameState.autoSell) return;
    gameState.autoSell.keepBetter = document.getElementById('as-better')?.checked;
  });
  document.addEventListener('click', (e) => {
    if (!autosellOpen) return;
    if (e.target.closest?.('.autosell-wrap')) return;
    closeAutosellPop();
  });
  document.querySelector('.modal-overlay')?.addEventListener('click', () => closeModal());
  document.getElementById('btn-inv-multi')?.addEventListener('click', () => {
    invMultiMode = !invMultiMode;
    if (!invMultiMode && selInvUids.size > 1) {
      const keep = selInvUid && selInvUids.has(selInvUid) ? selInvUid : [...selInvUids][0];
      selInvUids = keep ? new Set([keep]) : new Set();
      selInvUid = keep || null;
    }
    lastCampSig = '';
    renderHeroPanel();
    if (selInvUids.size > 1) {
      tipPinned = true;
      showItemTip(document.querySelector(`[data-inv="${CSS.escape(selInvUid)}"]`));
    }
  });
  document.getElementById('inv-bulk-bar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bulk]');
    if (!btn) return;
    const kind = btn.dataset.bulk;
    if (kind === 'page') selectBagPage();
    else if (kind === 'clear') {
      selInvUids = new Set();
      selInvUid = null;
      hideItemTip();
    } else if (kind === 'sell') runBulkBag('sell');
    else if (kind === 'salvage') runBulkBag('salvage');
    lastCampSig = '';
    renderAll();
    if (selInvUids.size) {
      tipPinned = true;
      refreshItemTip();
    }
  });
  document.getElementById('btn-sort')?.addEventListener('click', () => {
    sortInventory(gameState);
    lastCampSig = '';
    renderHeroPanel();
  });
  document.getElementById('junk-q')?.addEventListener('change', () => {
    if (!gameState) return;
    gameState.junkQuality = document.getElementById('junk-q')?.value || 'magic';
  });
  const runJunkDispose = (kind) => {
    const mode = document.getElementById('junk-q')?.value || gameState.junkQuality || 'magic';
    gameState.junkQuality = mode;
    const targets = junkBagTargets(gameState, mode);
    const verb = kind === 'salvage' ? '分解' : '出售';
    if (!targets.length) {
      addLog({ type: 'info', text: `没有符合筛选的可${verb}装备` });
      return;
    }
    if (!confirmValuableDispose(targets, verb)) return;
    const r = kind === 'salvage' ? salvageJunkItems(gameState, mode) : sellJunkItems(gameState, mode);
    addLog({
      type: 'loot',
      text: r.n
        ? (kind === 'salvage' ? formatSalvageLog(`${verb} ${r.n} 件`, r) : `${verb} ${r.n} 件 +${r.gold}金`)
        : `没有符合筛选的可${verb}装备`,
    });
    lastCampSig = '';
    renderAll();
  };
  document.getElementById('btn-sell-junk')?.addEventListener('click', () => runJunkDispose('sell'));
  document.getElementById('btn-salvage-junk')?.addEventListener('click', () => runJunkDispose('salvage'));
  document.getElementById('camp-panel')?.addEventListener('click', onCampClick);
  document.getElementById('item-tip')?.addEventListener('click', onCampClick);
  document.getElementById('modal')?.addEventListener('click', onCampClick);
  document.querySelector('.combat-panel')?.addEventListener('click', onCampClick);
  document.getElementById('item-tip')?.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
  document.getElementById('item-tip')?.addEventListener('mouseleave', () => {
    if (tipPinned) return;
    if (canHoverPeek()) scheduleHideItemTip();
  });
  const camp = document.getElementById('camp-panel');
  camp?.addEventListener('mouseover', (e) => {
    if (!canHoverPeek() || tipPinned) return;
    const el = e.target.closest('[data-inv], [data-slot], [data-set-tip]');
    if (!el) return;
    if (el.contains(e.relatedTarget)) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      showPeekTip(el);
    }, 200);
  });
  camp?.addEventListener('mouseout', (e) => {
    if (!canHoverPeek() || tipPinned) return;
    const el = e.target.closest('[data-inv], [data-slot], [data-set-tip]');
    if (!el) return;
    const to = e.relatedTarget;
    if (to && (el.contains(to) || to.closest?.('#item-tip'))) return;
    scheduleHideItemTip();
  });
  const modal = document.getElementById('modal');
  modal?.addEventListener('mouseover', (e) => {
    if (!canHoverPeek()) return;
    const el = e.target.closest('[data-skill-tip]');
    if (!el || el.contains(e.relatedTarget)) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showSkillPeek(el), 80);
  });
  modal?.addEventListener('mouseout', (e) => {
    if (!canHoverPeek()) return;
    const el = e.target.closest('[data-skill-tip]');
    if (!el) return;
    const to = e.relatedTarget;
    if (to && (el.contains(to) || to.closest?.('#skill-inspect'))) return;
    clearTimeout(hoverTimer);
  });
  const combatSkills = document.getElementById('combat-skills');
  combatSkills?.addEventListener('mouseover', (e) => {
    if (!canHoverPeek() || tipPinned) return;
    const el = e.target.closest('[data-skill-tip]');
    if (!el || el.contains(e.relatedTarget)) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showSkillPeek(el), 160);
  });
  combatSkills?.addEventListener('mouseout', (e) => {
    if (!canHoverPeek()) return;
    const el = e.target.closest('[data-skill-tip]');
    if (!el) return;
    const to = e.relatedTarget;
    if (to && (el.contains(to) || to.closest?.('#item-tip'))) return;
    clearTimeout(hoverTimer);
    if (canHoverPeek() && !tipPinned) scheduleHideItemTip();
  });
  document.getElementById('inv-prev')?.addEventListener('click', () => {
    invPage = Math.max(0, invPage - 1);
    lastCampSig = '';
    renderHeroPanel();
  });
  document.getElementById('inv-next')?.addEventListener('click', () => {
    invPage += 1;
    lastCampSig = '';
    renderHeroPanel();
  });
  document.getElementById('attr-prev')?.addEventListener('click', () => {
    attrPage = (attrPage + ATTR_PAGES.length - 1) % ATTR_PAGES.length;
    renderCampAttrs(getActiveHero(gameState));
  });
  document.getElementById('attr-next')?.addEventListener('click', () => {
    attrPage = (attrPage + 1) % ATTR_PAGES.length;
    renderCampAttrs(getActiveHero(gameState));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#item-tip, [data-inv], [data-slot], [data-skill-tip], [data-set-tip], #inv-bulk-bar, #btn-inv-multi')) hideItemTip();
  });
  document.getElementById('map-select')?.addEventListener('click', (e) => {
    const diffTab = e.target.closest('.diff-tab');
    if (diffTab) {
      const r = setWorldDiff(gameState, diffTab.dataset.diff);
      if (!r.ok) {
        addLog({ type: 'info', text: r.reason || '无法切换难度' });
        return;
      }
      if (!r.same) {
        knownMapUnlocks = null;
        resetFieldForZone();
        addLog({ type: 'info', text: `难度切换为${r.diff.name}（怪物 Lv.${r.diff.lvMin}–${r.diff.lvMax} · ×${r.diff.monsterMult} · 掉落 ×${r.diff.lootMult}）` });
        lastCampSig = '';
        renderAll();
      }
      return;
    }
    const tab = e.target.closest('.act-tab');
    if (tab) {
      mapActTab = Number(tab.dataset.act) || 1;
      mapActFollow = false;
      renderMapSelect();
      return;
    }
    const btn = e.target.closest('.map-btn');
    if (!btn) return;
    const hero = getActiveHero(gameState);
    if (btn.dataset.map === 'rift') {
      if (!riftUnlocked(gameState)) {
        addLog({ type: 'info', text: '解锁世界之石要塞后可进入小秘境' });
        return;
      }
      ensureRiftHero(hero);
      hero.currentMap = 'rift';
      gameState.mapsEntered = gameState.mapsEntered || {};
      gameState.mapsEntered.rift = true;
      mapActTab = 6;
      mapActFollow = true;
      resetFieldForZone();
      addLog({ type: 'info', text: `进入小秘境 ${hero.riftFloor} 层` });
      renderAll();
      setMobileView('combat');
      return;
    }
    const map = MAPS.find(m => m.id === btn.dataset.map);
    if (!map) return;
    if (!mapUnlocked(gameState, map)) {
      addLog({ type: 'info', text: mapUnlockHint(gameState, map) || '尚未解锁' });
      return;
    }
    hero.currentMap = map.id;
    gameState.mapsEntered = gameState.mapsEntered || {};
    gameState.mapsEntered[map.id] = true;
    mapActTab = map.act;
    mapActFollow = true;
    resetFieldForZone();
    renderAll();
    setMobileView('combat');
  });
  const autoNext = document.getElementById('chk-auto-next-map');
  if (autoNext) {
    autoNext.checked = gameState.autoNextMap !== false;
    autoNext.addEventListener('change', () => {
      gameState.autoNextMap = !!autoNext.checked;
    });
  }
}

function filteredBagItems() {
  let items = (gameState.inventory || []).slice();
  const filter = gameState.invFilter || 'all';
  if (filter === 'slot') items = items.filter(i => itemFitsSlot(i, selSlot));
  return sortBagItems(items, gameState.invSort, getActiveHero(gameState));
}

function applyBagSlotFromItem(item) {
  if (!item) return;
  if (isRingItem(item)) {
    if (selSlot !== 'ring1' && selSlot !== 'ring2') {
      const hero = getActiveHero(gameState);
      selSlot = !hero.equipment.ring1 ? 'ring1' : (!hero.equipment.ring2 ? 'ring2' : 'ring1');
    }
  } else if (item.slot === 'offhand') selSlot = 'offhand';
  else if (item.slot) selSlot = item.slot;
}

function pickBagItem(uid, e) {
  const list = filteredBagItems();
  if (e.shiftKey && lastInvClickUid) {
    invMultiMode = true;
    const a = list.findIndex(i => i.uid === lastInvClickUid);
    const b = list.findIndex(i => i.uid === uid);
    if (a >= 0 && b >= 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) selInvUids.add(list[i].uid);
    } else selInvUids.add(uid);
  } else if (e.metaKey || e.ctrlKey || invMultiMode) {
    if (selInvUids.has(uid)) selInvUids.delete(uid);
    else selInvUids.add(uid);
  } else {
    selInvUids = new Set([uid]);
  }
  lastInvClickUid = uid;
  selInvUid = selInvUids.has(uid) ? uid : ([...selInvUids][0] || null);
  applyBagSlotFromItem((gameState.inventory || []).find(i => i.uid === selInvUid));
}

function selectBagPage() {
  const items = filteredBagItems();
  const start = invPage * INV_PAGE;
  items.slice(start, start + INV_PAGE).forEach(i => selInvUids.add(i.uid));
  if (!selInvUid && selInvUids.size) selInvUid = [...selInvUids][0];
  invMultiMode = true;
}

function confirmValuableDispose(items, verb) {
  const free = items.filter(i => !i.locked);
  if (!free.length) return true;
  const hot = free.filter(i => (Q_RANK[i.quality] || 0) >= 3);
  if (!hot.length) return true;
  const names = hot.slice(0, 3).map(i => i.name).join('、');
  return confirm(`${verb} ${free.length} 件，含 ${hot.length} 件套装/暗金级（${names}${hot.length > 3 ? '…' : ''}），确定？`);
}

function runBulkBag(mode) {
  const items = (gameState.inventory || []).filter(i => selInvUids.has(i.uid));
  const verb = mode === 'salvage' ? '分解' : '出售';
  if (!items.length) return;
  if (!confirmValuableDispose(items, verb)) return;
  const r = bulkDisposeLoose(gameState, [...selInvUids], mode);
  if (!r.n) {
    addLog({ type: 'info', text: r.skipped ? '选中装备已锁定' : '没有可处理的装备' });
    return;
  }
  const extra = r.skipped ? `（跳过锁定 ${r.skipped}）` : '';
  addLog({
    type: 'loot',
    text: mode === 'salvage'
      ? formatSalvageLog(`分解 ${r.n} 件`, r) + extra
      : `出售 ${r.n} 件 +${r.gold}金${extra}`,
  });
  selInvUids = new Set();
  selInvUid = null;
  hideItemTip();
  lastCampSig = '';
  renderAll();
}

function onCampClick(e) {
  const act = e.target.closest('[data-act]');
  if (act) {
    e.stopPropagation();
    runCampAct(act.dataset.act, act.dataset.uid, act.dataset.slot);
    return;
  }
  const slotEl = e.target.closest('[data-slot]');
  if (slotEl) {
    selSlot = slotEl.dataset.slot;
    selInvUid = null;
    selInvUids = new Set();
    lastCampSig = '';
    renderHeroPanel();
    clearTimeout(hoverTimer);
    tipPinned = true;
    showItemTip(document.querySelector(`[data-slot="${selSlot}"]`));
    return;
  }
  const row = e.target.closest('[data-inv]');
  if (row) {
    pickBagItem(row.dataset.inv, e);
    lastCampSig = '';
    renderHeroPanel();
    clearTimeout(hoverTimer);
    tipPinned = true;
    showItemTip(document.querySelector(`[data-inv="${CSS.escape(selInvUid || '')}"]`));
    return;
  }
  const skillEl = e.target.closest('[data-skill-tip]');
  if (skillEl) showSkillPeek(skillEl);
}

function runCampAct(act, uid, slot) {
  const hero = getActiveHero(gameState);
  if (act === 'equip') {
    const idx = gameState.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const item = gameState.inventory[idx];
    const r = tryEquip(gameState, hero, item, slot || selSlot);
    if (!r.ok) {
      addLog({ type: 'info', text: r.reason || '无法装备' });
      return;
    }
    gameState.inventory.splice(idx, 1);
    if (r.prev) gameState.inventory.push(r.prev);
    if (r.extra) gameState.inventory.push(r.extra);
    addLog({ type: 'loot', text: r.extra ? `装备 ${itemDisplayName(item)}（卸下 ${itemDisplayName(r.extra)}）` : `装备 ${itemDisplayName(item)}` });
    selInvUid = null;
    selInvUids = new Set();
    selSlot = r.dest;
  } else if (act === 'unequip') {
    const r = unequipItem(gameState, hero, slot || selSlot);
    if (!r.ok) addLog({ type: 'info', text: r.reason });
    else {
      addLog({ type: 'loot', text: r.toWarehouse ? `卸下 ${itemDisplayName(r.item)}（已存入仓库）` : `卸下 ${itemDisplayName(r.item)}` });
      selInvUid = r.toWarehouse ? null : r.item.uid;
    }
  } else if (act === 'sell') {
    const idx = gameState.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const it = gameState.inventory[idx];
    if (it.locked) return;
    gameState.gold += sellValue(it);
    gameState.inventory.splice(idx, 1);
    selInvUid = null;
    selInvUids = new Set();
  } else if (act === 'sell-sel') {
    runBulkBag('sell');
    return;
  } else if (act === 'salvage-sel') {
    runBulkBag('salvage');
    return;
  } else if (act === 'lock') {
    const it = gameState.inventory.find(i => i.uid === uid);
    if (it) it.locked = !it.locked;
  } else if (act === 'stash') {
    const r = stashToWarehouse(gameState, uid);
    if (!r.ok) addLog({ type: 'info', text: r.reason || '无法存仓' });
    else {
      addLog({ type: 'loot', text: `存入仓库 ${itemDisplayName(r.item)}` });
      selInvUid = null;
    }
  } else if (act === 'salvage') {
    const idx = gameState.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const it = gameState.inventory[idx];
    if (it.locked) return;
    const r = salvageItem(gameState, it);
    gameState.inventory.splice(idx, 1);
    selInvUid = null;
    selInvUids = new Set();
    addLog({ type: 'loot', text: formatSalvageLog(`分解 ${it.name}`, r) });
  } else if (act === 'enhance') {
    const it = findOwnedItem(gameState, uid);
    const r = enhanceItem(gameState, it);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '强化') });
    else addLog({ type: 'loot', text: `强化 ${it.name} +${r.enhance}/10（+${Math.round(r.bonus * 100)}%）` });
  } else if (act === 'reroll') {
    const it = findOwnedItem(gameState, uid);
    const r = rerollItemAffix(gameState, it);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '洗练') });
    else {
      addLog({
        type: 'loot',
        text: `洗练 ${it.name}：${r.prev.name} T${r.prev.tier} → ${r.next.name} T${r.next.tier}（-${formatCostText(r.cost)}）`,
      });
    }
  } else if (act === 'filter') {
    gameState.invFilter = uid || 'all';
    invPage = 0;
  } else if (act === 'inv-sort') {
    const keys = normalizeInvSort(gameState.invSort);
    keys[uid] = !keys[uid];
    if (!keys.rarity && !keys.ilvl && !keys.score) keys[uid] = true;
    gameState.invSort = keys;
    invPage = 0;
  } else if (act === 'cmpring') {
    selSlot = uid === 'ring2' ? 'ring2' : 'ring1';
  } else if (act === 'potion-up-hp' || act === 'potion-up-mana') {
    const kind = act === 'potion-up-mana' ? 'mana' : 'hp';
    const r = upgradePotionTier(gameState, kind);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '升级') });
    else addLog({ type: 'loot', text: `${kind === 'mana' ? '魔力' : '生命'}药水升至 ${r.tier.name}（${r.tier.lv} 级）` });
    lastCampSig = '';
    renderAll();
    if (document.getElementById('modal')?.classList.contains('open')) showShopModal();
    return;
  } else if (act === 'learn') {
    const r = allocateSkillPoint(hero, uid, gameState);
    if (r) addLog({ type: 'skill', text: `学习 ${SKILLS[hero.charId][uid].name}${r.cost ? `（-${formatCostText(r.cost)}）` : ''}` });
    else addLog({ type: 'info', text: canLearnSkill(hero, uid, gameState).reason || '无法加点' });
    lastCampSig = '';
    renderAll();
    if (document.getElementById('modal')?.classList.contains('open')) showSkillModal(uid);
    return;
  } else if (act === 'toggle-skill') {
    if ((hero.skillLevels[uid] || 0) < 1) return;
    const on = toggleSkillEnabled(hero, uid);
    addLog({ type: 'skill', text: `${on ? '启用' : '停用'} ${SKILLS[hero.charId][uid].name}` });
    lastCampSig = '';
    renderAll();
    if (document.getElementById('modal')?.classList.contains('open')) showSkillModal(uid);
    return;
  }
  lastCampSig = '';
  renderAll();
  if (selInvUid || selInvUids.size || hero.equipment[selSlot]) {
    tipPinned = true;
    refreshItemTip();
  } else hideItemTip();
}

function expandCostRowsHtml(cost) {
  const labels = { gold: '金币', metal: '金属', cloth: '布料', crystal: '水晶' };
  return ['gold', 'metal', 'cloth', 'crystal'].map((key) => {
    const need = Math.floor(cost[key] || 0);
    if (!need) return '';
    const have = ownedAmount(key);
    const ok = have >= need;
    return `<div class="expand-cost-row">
      <span>${labels[key]}</span>
      <span class="cost-need ${ok ? 'ok' : 'short'}">持有 ${formatCompactNum(have)} / 需要 ${formatCompactNum(need)}</span>
    </div>`;
  }).join('');
}

function showBagExpandModal() {
  const left = bagExpandsLeft(gameState);
  if (!left) {
    showModal('背包扩容', `<p>背包已扩到上限（${getInvCap(gameState)} 格）。</p>`);
    return;
  }
  const cost = bagExpandCost(gameState);
  const lack = canPayCost(gameState, cost);
  const cap = getInvCap(gameState);
  showModal('背包扩容', `
    <p>扩容 +${BAG_EXPAND_SLOTS} 格 · 还可扩 ${left} 次</p>
    <p class="hint">当前 ${gameState.inventory.length}/${cap}，扩容后容量 ${cap + BAG_EXPAND_SLOTS}</p>
    <div class="expand-cost-list">${expandCostRowsHtml(cost)}</div>
    ${lack ? `<p class="bag-expand-hint">材料不足</p>` : '<button type="button" class="btn-primary" id="confirm-bag-expand">确认扩容</button>'}
  `);
  document.getElementById('confirm-bag-expand')?.addEventListener('click', () => {
    const r = buyBagExpand(gameState);
    if (!r.ok) {
      addLog({ type: 'info', text: r.reason || '无法扩容' });
      showBagExpandModal();
      return;
    }
    addLog({ type: 'loot', text: `背包扩容 +${BAG_EXPAND_SLOTS}（${gameState.inventory.length}/${getInvCap(gameState)}）· ${formatCostText(r.cost)}` });
    closeModal();
    lastCampSig = '';
    renderAll();
  });
}

function syncBagExpandBtn() {
  const btn = document.getElementById('btn-bag-expand');
  const hint = document.getElementById('bag-expand-hint');
  if (!btn || !gameState) return;
  const left = bagExpandsLeft(gameState);
  btn.classList.remove('ready', 'lack');
  if (!left) {
    btn.textContent = '已满';
    btn.disabled = true;
    btn.title = '背包容量已达上限';
    if (hint) hint.hidden = true;
    return;
  }
  btn.disabled = false;
  btn.textContent = '扩容';
  const cost = bagExpandCost(gameState);
  const lack = canPayCost(gameState, cost);
  if (lack) {
    btn.classList.add('lack');
    btn.title = '材料不足，点击查看需求';
    if (hint) {
      hint.hidden = false;
      hint.textContent = '材料不足';
    }
  } else {
    btn.classList.add('ready');
    btn.title = `还可扩 ${left} 次`;
    if (hint) hint.hidden = true;
  }
}

function resetFieldForZone() {
  const hero = getActiveHero(gameState);
  if (!combatState || !hero) return;
  if (hero.currentMap === 'rift') combatState.killCount = hero.riftProgress || 0;
  else combatState.killCount = gameState.mapKills?.[hero.currentMap] || 0;
  combatState.bossPity = 0;
  combatState.monsters = [];
  combatState.target = null;
  combatState.spawnTimer = 0.2;
}

function campSig() {
  const hero = getActiveHero(gameState);
  const eq = SLOTS.map(s => hero.equipment[s]?.uid || '').join(',');
  const inv = (gameState.inventory || []).map(i => i.uid + (i.locked ? 'L' : '')).join(',');
  const enh = SLOTS.map(s => hero.equipment[s]?.enhance || 0).join(',');
  const mats = ensureMats(gameState);
  const tr = JSON.stringify(hero.train || {});
  return [hero.charId, hero.level, hero.skillPoints, JSON.stringify(hero.skillLevels), eq, inv, selSlot, selInvUid, [...selInvUids].sort().join('.'), invMultiMode ? 'm' : '', gameState.invFilter || 'all', JSON.stringify(normalizeInvSort(gameState.invSort)), invPage, gameState.autoSell?.enabled ? '1' : '0', gameState.autoSell?.maxQuality || '', gameState.autoSell?.action || '', autosellOpen ? 'p' : '', enh, mats.metal, mats.cloth, mats.crystal, tr, gameState.gold, gameState.bagExpands || 0, gameState.diffId || 'normal'].join('|');
}

function renderHeroPanel() {
  const hero = getActiveHero(gameState);
  const charDef = CHARACTERS[hero.charId];
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs });
  const map = getCurrentMap(hero, gameState);
  const power = heroGearScore(hero);
  const nameEl = document.getElementById('hero-name');
  nameEl.innerHTML = `${charDef.name} Lv.${hero.level} <span class="hero-score">总评分：${formatCompactNum(power)}</span>`;
  nameEl.title = `总评分 ${power.toLocaleString()}`;
  const skillBtn = document.getElementById('btn-skills');
  if (skillBtn) {
    const sp = hero.skillPoints || 0;
    skillBtn.textContent = sp > 0 ? `技能 ${sp}` : '技能';
    skillBtn.classList.toggle('skill-ready', sp > 0);
  }
  const goldEl = document.getElementById('gold-amount');
  if (goldEl) {
    goldEl.textContent = formatCompactNum(gameState.gold);
    goldEl.parentElement?.setAttribute('title', `金币 ${gameState.gold.toLocaleString()}`);
  }
  const mats = ensureMats(gameState);
  const setMat = (id, n, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatCompactNum(n);
    el.parentElement?.setAttribute('title', `${label} ${n.toLocaleString()}`);
  };
  setMat('mat-metal', mats.metal, '金属');
  setMat('mat-cloth', mats.cloth, '布料');
  setMat('mat-crystal', mats.crystal, '水晶');
  const expForLv = expForLevel(hero.level);
  const pct = Math.floor(hero.exp / expForLv * 100);
  document.getElementById('exp-bar').style.width = `${pct}%`;
  document.getElementById('exp-text').textContent = `经验 ${hero.exp.toLocaleString()} / ${expForLv.toLocaleString()}`;
  const pen = mapExpPenalty(hero, map);
  const penEl = document.getElementById('exp-pen');
  if (penEl) {
    if (pen.label) {
      penEl.hidden = false;
      penEl.textContent = pen.label;
      penEl.className = `exp-pen ${pen.kind || ''}`;
    } else {
      penEl.hidden = true;
      penEl.textContent = '';
    }
  }
  document.getElementById('hero-hp-bar').style.width = `${Math.max(0, hero.currentHp / stats.maxHp * 100)}%`;
  document.getElementById('hero-hp-text').textContent = `${Math.floor(Math.max(0, hero.currentHp))} / ${stats.maxHp}`;
  clampHeroResource(hero, stats);
  const resBar = document.getElementById('hero-res-bar');
  const resText = document.getElementById('hero-res-text');
  if (resBar && resText) {
    const pct = stats.maxRes > 0 ? Math.max(0, (hero.currentRes || 0) / stats.maxRes * 100) : 0;
    resBar.style.width = `${pct}%`;
    resBar.style.background = `linear-gradient(90deg, ${stats.resColor}88, ${stats.resColor})`;
    resText.textContent = `${stats.resName} ${Math.floor(hero.currentRes || 0)} / ${stats.maxRes}`;
  }
  document.getElementById('current-map-name').textContent = `${map.name} · ${getWorldDiff(gameState).name}`;
  document.getElementById('map-level-range').textContent = `Lv.${map.levelMin}–${map.levelMax} · Act ${map.act}${pen.label ? ` · ${pen.label}` : ''}`;
  document.getElementById('inv-count').textContent = `${gameState.inventory.length}/${getInvCap(gameState)}`;
  syncBagExpandBtn();
  const st = document.getElementById('hero-status');
  if (st) {
    if (hero.isDead) {
      st.hidden = false;
      st.textContent = `复活 ${Math.ceil(hero.respawnTimer)}s`;
      st.className = 'status dead';
    } else {
      st.hidden = true;
      st.textContent = '';
    }
  }
  renderCampAttrs(hero);
  const sig = campSig();
  if (sig !== lastCampSig) {
    lastCampSig = sig;
    renderCampGear();
    refreshItemTip();
  }
}

const DOLL_SLOTS = [
  [null, 'helmet', null],
  ['weapon', 'chest', 'offhand'],
  ['gloves', 'belt', 'boots'],
  ['ring1', 'necklace', 'ring2'],
];

function inferItemIcon(item) {
  if (!item) return 'empty';
  if (item.icon) return item.icon;
  const n = item.name || '';
  const oh = inferOffhandClass(item);
  if (oh === 'quiver') return 'quiver';
  if (oh === 'shield') return 'shield';
  if (item.slot === 'weapon') {
    const wc = inferWeaponClass(item);
    if (wc === 'bow') return /弩/.test(n) ? 'crossbow' : 'bow';
    if (wc === 'javelin') return 'javelin';
    if (wc === 'claw') return 'claw';
    if (wc === 'caster') {
      if (/珠/.test(n)) return 'orb';
      if (/图腾/.test(n)) return 'totem';
      if (/魔杖/.test(n)) return 'wand';
      return 'staff';
    }
    if (/斧/.test(n)) return 'axe';
    if (/锤/.test(n)) return 'hammer';
    if (/权杖/.test(n)) return 'scepter';
    return 'sword';
  }
  if (item.slot === 'helmet') {
    if (/帽|头饰/.test(n)) return 'magehat';
    if (/皮|头皮/.test(n)) return 'pelt';
    if (/冠/.test(n)) return 'crown';
    if (/骨|颅/.test(n)) return 'bonehelm';
    return 'helm';
  }
  if (item.slot === 'chest') return /袍|衣/.test(n) ? 'robe' : 'chest';
  if (item.slot === 'ring1' || item.slot === 'ring2') return 'ring1';
  return item.slot;
}

function slotArt(slot, color) {
  return itemGlyph(slot, color);
}

function itemGlyph(kind, color) {
  const c = color || '#c8c0b0';
  const k = '#0c0c12';
  const a = {
    sword: `<rect x="11" y="1" width="3" height="15" fill="${c}"/><rect x="7" y="15" width="11" height="3" fill="${c}"/><rect x="11" y="18" width="3" height="5" fill="${c}"/>`,
    axe: `<rect x="11" y="3" width="3" height="18" fill="${c}"/><rect x="5" y="3" width="14" height="7" fill="${c}"/><rect x="4" y="5" width="4" height="5" fill="${c}"/>`,
    hammer: `<rect x="11" y="8" width="3" height="14" fill="${c}"/><rect x="5" y="2" width="14" height="8" fill="${c}"/>`,
    scepter: `<rect x="11" y="8" width="3" height="14" fill="${c}"/><rect x="8" y="2" width="9" height="7" fill="${c}"/><rect x="11" y="1" width="3" height="3" fill="${c}"/>`,
    bow: `<rect x="5" y="2" width="3" height="20" fill="${c}"/><rect x="8" y="4" width="10" height="2" fill="${c}"/><rect x="8" y="18" width="10" height="2" fill="${c}"/><rect x="16" y="6" width="2" height="12" fill="${c}"/>`,
    crossbow: `<rect x="3" y="10" width="18" height="3" fill="${c}"/><rect x="11" y="4" width="3" height="16" fill="${c}"/><rect x="8" y="4" width="9" height="4" fill="${c}"/>`,
    javelin: `<rect x="4" y="18" width="3" height="3" fill="${c}"/><rect x="6" y="4" width="3" height="16" fill="${c}"/><rect x="8" y="2" width="8" height="4" fill="${c}"/>`,
    staff: `<rect x="11" y="6" width="3" height="16" fill="${c}"/><rect x="8" y="2" width="9" height="6" fill="${c}"/>`,
    orb: `<rect x="7" y="6" width="10" height="10" fill="${c}"/><rect x="10" y="9" width="4" height="4" fill="${k}"/><rect x="11" y="16" width="3" height="5" fill="${c}"/>`,
    totem: `<rect x="8" y="16" width="8" height="5" fill="${c}"/><rect x="9" y="10" width="6" height="6" fill="${c}"/><rect x="10" y="4" width="4" height="6" fill="${c}"/>`,
    wand: `<rect x="11" y="6" width="2" height="15" fill="${c}"/><rect x="9" y="2" width="6" height="5" fill="${c}"/><rect x="16" y="3" width="3" height="3" fill="${c}"/>`,
    claw: `<rect x="4" y="4" width="3" height="16" fill="${c}"/><rect x="8" y="6" width="3" height="14" fill="${c}"/><rect x="14" y="6" width="3" height="14" fill="${c}"/><rect x="18" y="4" width="3" height="16" fill="${c}"/>`,
    helm: `<rect x="5" y="10" width="14" height="8" fill="${c}"/><rect x="7" y="4" width="10" height="7" fill="${c}"/><rect x="8" y="12" width="3" height="2" fill="${k}"/><rect x="13" y="12" width="3" height="2" fill="${k}"/>`,
    magehat: `<rect x="10" y="2" width="4" height="8" fill="${c}"/><rect x="6" y="9" width="12" height="4" fill="${c}"/><rect x="7" y="13" width="10" height="7" fill="${c}"/>`,
    pelt: `<rect x="5" y="4" width="4" height="5" fill="${c}"/><rect x="15" y="4" width="4" height="5" fill="${c}"/><rect x="6" y="8" width="12" height="12" fill="${c}"/><rect x="9" y="12" width="2" height="2" fill="${k}"/><rect x="13" y="12" width="2" height="2" fill="${k}"/>`,
    crown: `<rect x="5" y="10" width="14" height="8" fill="${c}"/><rect x="5" y="4" width="3" height="7" fill="${c}"/><rect x="11" y="2" width="3" height="9" fill="${c}"/><rect x="16" y="4" width="3" height="7" fill="${c}"/>`,
    bonehelm: `<rect x="6" y="5" width="12" height="14" fill="${c}"/><rect x="8" y="9" width="3" height="3" fill="${k}"/><rect x="13" y="9" width="3" height="3" fill="${k}"/><rect x="10" y="14" width="4" height="2" fill="${k}"/>`,
    chest: `<rect x="6" y="4" width="12" height="16" fill="${c}"/><rect x="3" y="5" width="5" height="7" fill="${c}"/><rect x="16" y="5" width="5" height="7" fill="${c}"/>`,
    robe: `<rect x="8" y="3" width="8" height="8" fill="${c}"/><rect x="4" y="10" width="16" height="11" fill="${c}"/>`,
    gloves: `<rect x="2" y="8" width="8" height="10" fill="${c}"/><rect x="14" y="8" width="8" height="10" fill="${c}"/><rect x="4" y="6" width="4" height="3" fill="${c}"/><rect x="16" y="6" width="4" height="3" fill="${c}"/>`,
    boots: `<rect x="3" y="8" width="7" height="12" fill="${c}"/><rect x="14" y="8" width="7" height="12" fill="${c}"/><rect x="2" y="17" width="9" height="4" fill="${c}"/><rect x="13" y="17" width="9" height="4" fill="${c}"/>`,
    belt: `<rect x="3" y="10" width="18" height="5" fill="${c}"/><rect x="10" y="10" width="4" height="5" fill="${k}"/><rect x="7" y="11" width="2" height="3" fill="${k}"/><rect x="15" y="11" width="2" height="3" fill="${k}"/>`,
    necklace: `<rect x="8" y="2" width="8" height="2" fill="${c}"/><rect x="7" y="4" width="2" height="6" fill="${c}"/><rect x="15" y="4" width="2" height="6" fill="${c}"/><rect x="10" y="10" width="4" height="6" fill="${c}"/>`,
    ring1: `<rect x="7" y="7" width="10" height="10" fill="${c}"/><rect x="10" y="10" width="4" height="4" fill="${k}"/>`,
    shield: `<rect x="5" y="3" width="14" height="18" fill="${c}"/><rect x="8" y="6" width="8" height="12" fill="${k}"/>`,
    quiver: `<rect x="8" y="3" width="8" height="16" fill="${c}"/><rect x="10" y="5" width="2" height="12" fill="${k}"/><rect x="13" y="6" width="2" height="10" fill="${k}"/><rect x="9" y="18" width="6" height="3" fill="${c}"/>`,
    weapon: `<rect x="11" y="1" width="3" height="15" fill="${c}"/><rect x="7" y="15" width="11" height="3" fill="${c}"/><rect x="11" y="18" width="3" height="5" fill="${c}"/>`,
    helmet: `<rect x="5" y="10" width="14" height="8" fill="${c}"/><rect x="7" y="4" width="10" height="7" fill="${c}"/><rect x="8" y="12" width="3" height="2" fill="${k}"/><rect x="13" y="12" width="3" height="2" fill="${k}"/>`,
    offhand: `<rect x="5" y="3" width="14" height="18" fill="${c}"/><rect x="8" y="6" width="8" height="12" fill="${k}"/>`,
  };
  return a[kind] || `<rect x="6" y="6" width="12" height="12" fill="${c}"/>`;
}

function skillArt(skill, color) {
  const c = color || '#e8dcc8';
  const k = '#0c0c12';
  const tags = skill.tags || [];
  if (skill.element === 'fire' || tags.includes('fire')) {
    return `<rect x="10" y="14" width="4" height="6" fill="${c}"/><rect x="8" y="8" width="8" height="7" fill="${c}"/><rect x="10" y="3" width="4" height="6" fill="${c}"/>`;
  }
  if (skill.element === 'ice' || tags.includes('ice')) {
    return `<rect x="11" y="2" width="2" height="20" fill="${c}"/><rect x="4" y="11" width="16" height="2" fill="${c}"/><rect x="6" y="6" width="3" height="3" fill="${c}"/><rect x="15" y="15" width="3" height="3" fill="${c}"/>`;
  }
  if (skill.element === 'lightning' || tags.includes('lightning')) {
    return `<polygon points="13,2 6,13 12,13 9,22 20,10 13,10" fill="${c}"/>`;
  }
  if (skill.element === 'poison' || tags.includes('poison')) {
    return `<rect x="9" y="4" width="6" height="4" fill="${c}"/><rect x="7" y="8" width="10" height="10" fill="${c}"/><rect x="9" y="11" width="2" height="3" fill="${k}"/><rect x="13" y="11" width="2" height="3" fill="${k}"/>`;
  }
  if (tags.includes('summon')) {
    return `<rect x="8" y="4" width="8" height="6" fill="${c}"/><rect x="6" y="10" width="12" height="10" fill="${c}"/><rect x="9" y="6" width="2" height="2" fill="${k}"/><rect x="13" y="6" width="2" height="2" fill="${k}"/>`;
  }
  if (tags.includes('aura')) {
    return `<rect x="9" y="9" width="6" height="6" fill="${c}"/><rect x="4" y="11" width="16" height="2" fill="${c}"/><rect x="11" y="4" width="2" height="16" fill="${c}"/>`;
  }
  if (tags.includes('trap')) {
    return `<rect x="4" y="14" width="16" height="6" fill="${c}"/><rect x="7" y="8" width="10" height="7" fill="${c}"/><rect x="10" y="4" width="4" height="5" fill="${c}"/>`;
  }
  if (tags.includes('projectile')) {
    return `<rect x="3" y="11" width="14" height="2" fill="${c}"/><rect x="16" y="9" width="5" height="6" fill="${c}"/><rect x="2" y="9" width="3" height="6" fill="${c}"/>`;
  }
  if (tags.includes('melee') || tags.includes('phys')) {
    return `<rect x="11" y="1" width="3" height="15" fill="${c}"/><rect x="7" y="15" width="11" height="3" fill="${c}"/><rect x="11" y="18" width="3" height="5" fill="${c}"/>`;
  }
  if (tags.includes('buff')) {
    return `<rect x="10" y="4" width="4" height="16" fill="${c}"/><rect x="4" y="10" width="16" height="4" fill="${c}"/>`;
  }
  if (tags.includes('curse')) {
    return `<rect x="7" y="6" width="10" height="10" fill="${c}"/><rect x="9" y="9" width="2" height="2" fill="${k}"/><rect x="13" y="9" width="2" height="2" fill="${k}"/><rect x="10" y="13" width="4" height="2" fill="${k}"/>`;
  }
  return `<rect x="6" y="6" width="12" height="12" fill="${c}"/>`;
}

function skillIconColor(skill) {
  if (skill.element === 'fire') return '#ff8844';
  if (skill.element === 'ice') return '#88d8ff';
  if (skill.element === 'lightning') return '#ffe060';
  if (skill.element === 'poison') return '#88cc66';
  if (skill.element === 'magic') return '#c090ff';
  const tags = skill.tags || [];
  if (tags.includes('aura')) return '#f0c860';
  if (tags.includes('summon')) return '#a8d8ff';
  if (tags.includes('trap')) return '#d08050';
  if (tags.includes('projectile')) return '#90c0ff';
  return '#e8dcc8';
}

function skillIconHtml(skill, lv, extraClass = '') {
  const c = skillIconColor(skill);
  return `<div class="item-icon skill-ic ${lv > 0 ? 'learned' : ''} ${extraClass}" style="border-color:${c}">
    <svg class="item-svg" viewBox="0 0 24 24" aria-hidden="true">${skillArt(skill, c)}</svg>
  </div>`;
}

function renderCampAttrs(hero) {
  const el = document.getElementById('camp-attrs');
  if (!el) return;
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs });
  const map = getCurrentMap(hero, gameState);
  const pages = [
    null,
    [
      ['力量', stats.str],
      ['敏捷', stats.agi],
      ['智力', stats.int],
      ['体力', stats.vit],
      ['智慧', Math.floor(stats.wis || 0)],
      ['生命', stats.maxHp],
      [stats.resName, `${Math.floor(hero.currentRes || 0)} / ${stats.maxRes}`],
      [`${stats.resName}回复`, `${stats.resRegen}/s`],
      ['伤害', stats.damage],
      ['护甲', stats.armor],
    ],
    [
      ['DPS', calcDPS(hero).toLocaleString()],
      ['攻速', `${stats.attacksPerSec.toFixed(2)}/s`],
      ['攻击距离', stats.attackRange.toFixed(1)],
      ['暴击', `${Math.round(stats.critRate * 100)}%`],
      ['暴伤', `${Math.round(stats.critDmg * 100)}%`],
      ['物理加成', `${Math.round(stats.physDmgPct * 100)}%`],
      ['冷却缩减', `${Math.round((stats.cdrPct || 0) * 100)}%`],
      ['技能点', hero.skillPoints || 0],
    ],
    [
      ['EHP', calcEHP(hero, (map.levelMin + map.levelMax) / 2).toLocaleString()],
      ['减伤', `${Math.round(stats.damageReduction * 100)}%`],
      ['全抗', `${Math.round((stats.allRes || 0) * 100)}%`],
      ['吸血', `${Math.round((stats.lifesteal || 0) * 100)}%`],
      ['每秒回血', stats.lifeRegen || 0],
      ['击杀回血', `${Math.round((stats.killHeal || 0) * 100)}%`],
      ['召唤', `${Math.round((stats.summonBonus || 0) * 100)}%`],
      ['穿透', `${Math.round((stats.pierceBonus || 0) * 100)}%`],
      ['火伤', `${Math.round((stats.fireDmgPct || 0) * 100)}%`],
      ['冰伤', `${Math.round((stats.iceDmgPct || 0) * 100)}%`],
      ['电伤', `${Math.round((stats.lightningDmgPct || 0) * 100)}%`],
      ['毒伤', `${Math.round((stats.poisonDmgPct || 0) * 100)}%`],
    ],
  ];
  attrPage = ((attrPage % ATTR_PAGES.length) + ATTR_PAGES.length) % ATTR_PAGES.length;
  const titleEl = document.getElementById('attr-page-title');
  const labelEl = document.getElementById('attr-page-label');
  if (titleEl) titleEl.textContent = '效率｜属性';
  if (labelEl) labelEl.textContent = `${attrPage + 1}/${ATTR_PAGES.length}`;
  if (attrPage === 0) {
    const cell = (label, value, id) =>
      `<div class="eff-item"><span>${label}</span><span${id ? ` id="${id}"` : ''}>${value}</span></div>`;
    el.innerHTML = `<div class="eff-strip">
      ${cell('DPS', calcDPS(hero).toLocaleString())}
      ${cell('EHP', calcEHP(hero, (map.levelMin + map.levelMax) / 2).toLocaleString())}
      ${cell('击杀/分', killsPerMinute(hero, map), 'stat-kpm')}
      ${cell('经验/时', expPerHour(hero, map).toLocaleString(), 'stat-eph')}
      ${cell('攻速', `${stats.attacksPerSec.toFixed(2)}/s`)}
      ${cell('攻击距离', stats.attackRange.toFixed(1))}
      ${cell('暴击', `${Math.round(stats.critRate * 100)}%`)}
      ${cell('护甲', stats.armor)}
      ${cell(stats.resName, `${Math.floor(hero.currentRes || 0)}/${stats.maxRes}`)}
      ${cell('生命药', gameState.hpPotions || 0, 'stat-hp-pots')}
      ${cell('魔力药', gameState.manaPotions || 0, 'stat-mana-pots')}
      ${cell('技能点', hero.skillPoints || 0)}
    </div>`;
    renderStatsPanel();
    return;
  }
  el.innerHTML = pages[attrPage].map(([k, v]) =>
    `<div class="attr-row"><span>${k}</span><span class="attr-val">${v}</span></div>`
  ).join('');
}

function itemIconHtml(item, extraClass = '', blocked = false) {
  if (!item) {
    return `<div class="item-icon empty ${extraClass}"></div>`;
  }
  const q = QUALITY[item.quality] || QUALITY.normal;
  const glyph = inferItemIcon(item);
  const title = blocked ? `不可装备：${blocked === true ? '' : blocked}` : itemDisplayName(item);
  const cls = itemClassId(item);
  const classMark = cls && CHARACTERS[cls]
    ? `<span class="class-mark">${CHARACTERS[cls].icon}</span>` : '';
  return `<div class="item-icon q-${item.quality} slot-${item.slot || ''} ic-${glyph} ${extraClass} ${item.locked ? 'locked' : ''} ${blocked ? 'blocked' : ''}" style="border-color:${blocked ? '#c05050' : q.color}" title="${title}">
    <svg class="item-svg" viewBox="0 0 24 24" aria-hidden="true">${itemGlyph(glyph, q.color)}</svg>
    ${classMark}
    ${blocked ? '<span class="icon-ban">禁</span>' : ''}
  </div>`;
}

function pointerOverTipOrAnchor() {
  const tip = document.getElementById('item-tip');
  if (tip && !tip.hidden && tip.matches(':hover')) return true;
  if (lastTipAnchor?.isConnected && lastTipAnchor.matches?.(':hover')) return true;
  return false;
}

function scheduleHideItemTip() {
  if (tipPinned) return;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    if (tipPinned || pointerOverTipOrAnchor()) return;
    hideItemTip();
  }, 160);
}

function hideItemTip() {
  clearTimeout(hoverTimer);
  const tip = document.getElementById('item-tip');
  if (tip) {
    tip.hidden = true;
    tip.setAttribute('hidden', '');
    tip.classList.remove('wide');
    tip.style.bottom = '';
    tip.style.right = '';
    tip.style.width = '';
    tip.style.left = '';
    tip.style.top = '';
  }
  lastTipAnchor = null;
  tipPinned = false;
}

function positionItemTip(anchor) {
  const tip = document.getElementById('item-tip');
  if (!tip || !anchor) return;
  if (isMobileUi()) {
    const nav = document.getElementById('mobile-nav');
    const navH = nav ? nav.getBoundingClientRect().height : 52;
    tip.style.left = '8px';
    tip.style.right = '8px';
    tip.style.width = 'auto';
    tip.style.top = 'auto';
    tip.style.bottom = `${navH + 8}px`;
    return;
  }
  tip.style.right = '';
  tip.style.bottom = '';
  tip.style.width = '';
  const r = anchor.getBoundingClientRect();
  const tw = tip.offsetWidth || 320;
  const th = tip.offsetHeight || 220;
  let x = r.right + 10;
  let y = r.top;
  if (x + tw > window.innerWidth - 8) x = r.left - tw - 10;
  if (x < 8) x = 8;
  if (y + th > window.innerHeight - 8) y = Math.max(8, window.innerHeight - th - 8);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function showSetPeek(anchor) {
  const hero = getActiveHero(gameState);
  const tip = document.getElementById('item-tip');
  const setId = anchor?.dataset?.setTip;
  const def = SETS[setId];
  if (!tip || !def) return;
  const n = countSetOn(hero.equipment, setId);
  lastTipAnchor = anchor;
  setTipWide(tip, false);
  tip.innerHTML = `<div class="inspect-name set-bonus">${def.name}（${n}/${def.pieceCount}）</div>${setBonusTiersHtml(def, n)}`;
  tip.hidden = false;
  positionItemTip(anchor);
}

function showPeekTip(anchor, force = false) {
  if (tipPinned && !force) return;
  if (anchor?.dataset?.skillTip) {
    showSkillPeek(anchor);
    return;
  }
  if (anchor?.dataset?.setTip) {
    showSetPeek(anchor);
    return;
  }
  const hero = getActiveHero(gameState);
  const tip = document.getElementById('item-tip');
  if (!tip || !anchor) return;
  const item = anchor.dataset.wh
    ? (gameState.town?.warehouse || []).find(i => i.uid === anchor.dataset.wh)
    : anchor.dataset.inv
      ? gameState.inventory.find(i => i.uid === anchor.dataset.inv)
      : hero.equipment[anchor.dataset.slot];
  if (!item) {
    hideItemTip();
    return;
  }
  lastTipAnchor = anchor;
  setTipWide(tip, false);
  tip.innerHTML = itemCardHtml(item, '', { setDetails: true, hero });
  tip.hidden = false;
  positionItemTip(anchor);
}

function skillInspectHtml(skillId) {
  const hero = getActiveHero(gameState);
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill) return '<p class="hint">点击技能查看说明。</p>';
  const lv = hero.skillLevels[skillId] || 0;
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs || {} });
  const parts = skillLevelParts(hero, skillId, stats);
  const lvHtml = formatSkillLevelHtml(parts);
  const bonusSrc = skillBonusBreakdown(hero, { useCombatBuffs: true, buffs: combatState?.buffs || {} });
  const bonusLine = parts.bonus > 0 && (parts.base > 0 || (parts.grant || 0) > 0)
    ? `<div class="stat-line">额外等级 +${parts.bonus}${bonusSrc.length ? `（${bonusSrc.map(s => `${s.name} +${s.add}`).join('、')}）` : ''}</div>`
    : '';
  const weap = skillWeaponReady(hero, skill);
  const syn = synergyMult(hero, skill);
  const gate = canLearnSkill(hero, skillId, gameState);
  const learnCost = skillLearnCost(hero, skillId);
  const need = [];
  if (skill.prereq && !(hero.skillLevels[skill.prereq] > 0) && !(parts.grant > 0)) {
    need.push(`前置 ${SKILLS[hero.charId][skill.prereq]?.name || ''}`);
  }
  if (hero.level < (skill.reqLevel || 1)) need.push(`角色 ${skill.reqLevel} 级`);
  if (!weap.ok) need.push(`装备${weap.label}`);
  return `
    ${skillIconHtml(skill, lv, 'lg')}
    <div class="inspect-name" style="color:${skillIconColor(skill)}">${skill.name}</div>
    <div class="quality-tag">${lvHtml} · ${skill.type === 'passive' ? '被动' : skill.type === 'aura' ? '光环' : skill.type === 'buff' ? '增益' : '主动'} · 需求 ${skill.reqLevel || 1} 级</div>
    <div class="stat-line">${skill.desc}</div>
    ${skillEffectLines(hero, skill, parts, stats).map(t => `<div class="skill-eff">${t}</div>`).join('')}
    ${(() => {
      const cost = skillResCost(hero, skill, stats);
      const gain = skillResGain(hero, skill);
      if (!cost && !gain) return '';
      const name = stats.resName || '资源';
      if (cost) return `<div class="stat-line">${name}消耗 ${cost}</div>`;
      return `<div class="stat-line">${name}回复 ${gain}</div>`;
    })()}
    ${bonusLine}
    ${syn > 1.01 ? `<div class="stat-line">联动 ×${syn.toFixed(2)}</div>` : ''}
    ${skill.reqWeapon ? `<div class="stat-line">武器：${WEAPON_CLASS_NAMES[skill.reqWeapon]}</div>` : ''}
    ${need.length ? `<div class="skill-need">${need.join(' · ')}</div>` : ''}
    ${lv < (skill.maxLevel || 10) ? `<div class="stat-line">下次学习 ${formatCostText(learnCost)} + 技能点 1${!gate.ok && gate.reason ? ` · ${gate.reason}` : ''}</div>` : ''}
    ${(lv > 0 || (parts.grant || 0) > 0) && skill.type !== 'passive' ? `<div class="inspect-actions"><button type="button" class="btn-small" data-act="toggle-skill" data-uid="${skillId}">${skill.type === 'aura' && skill.auraSlot ? (isAuraOn(hero, skillId) ? '当前光环' : '切换光环') : (isSkillEnabled(hero, skillId) ? '停用技能' : '启用技能')}</button></div>` : ''}
    ${gate.ok ? `<div class="inspect-actions"><button type="button" class="btn-small" data-act="learn" data-uid="${skillId}">投入 1 点（${formatCostText(learnCost)}）</button></div>` : ''}
  `;
}

function fillSkillInspect(skillId) {
  selSkillId = skillId;
  const pane = document.getElementById('skill-inspect');
  if (pane) pane.innerHTML = skillInspectHtml(skillId);
  document.querySelectorAll('#modal .skill-icon-cell').forEach((el) => {
    el.classList.toggle('sel-skill', el.dataset.skillTip === skillId);
  });
}

function showSkillPeek(anchor) {
  const skillId = anchor?.dataset?.skillTip;
  if (!skillId) return;
  if (anchor.closest('#modal')) {
    hideItemTip();
    fillSkillInspect(skillId);
    return;
  }
  const tip = document.getElementById('item-tip');
  if (!tip) return;
  lastTipAnchor = anchor;
  tip.innerHTML = skillInspectHtml(skillId);
  tip.hidden = false;
  positionItemTip(anchor);
}

function showItemTip(anchor) {
  const hero = getActiveHero(gameState);
  const tip = document.getElementById('item-tip');
  if (!tip) return;
  const bagItem = selInvUid ? gameState.inventory.find(i => i.uid === selInvUid) : null;
  const worn = hero.equipment[selSlot];
  if (selInvUids.size > 1) {
    lastTipAnchor = anchor || lastTipAnchor;
    setTipWide(tip, true);
    tip.innerHTML = inspectHtml(hero);
    tip.hidden = false;
    positionItemTip(lastTipAnchor);
    return;
  }
  if (!bagItem && !worn) {
    hideItemTip();
    return;
  }
  lastTipAnchor = anchor || lastTipAnchor;
  setTipWide(tip, !!bagItem);
  tip.innerHTML = inspectHtml(hero);
  tip.hidden = false;
  positionItemTip(lastTipAnchor);
}

function refreshItemTip() {
  const hero = getActiveHero(gameState);
  const tip = document.getElementById('item-tip');
  if (!tip || tip.hidden || !tipPinned) return;
  const bagItem = selInvUid ? gameState.inventory.find(i => i.uid === selInvUid) : null;
  const wasWide = tip.classList.contains('wide');
  const keepPos = !!(tip.style.top || tip.style.bottom);
  if (selInvUids.size > 1) {
    setTipWide(tip, true);
    tip.innerHTML = inspectHtml(hero);
    if (!keepPos || wasWide !== tip.classList.contains('wide')) positionItemTip(lastTipAnchor);
    return;
  }
  if (!bagItem && !hero.equipment[selSlot]) {
    hideItemTip();
    return;
  }
  setTipWide(tip, !!bagItem);
  tip.innerHTML = inspectHtml(hero);
  const anchor = document.querySelector(selInvUid ? `[data-inv="${CSS.escape(selInvUid)}"]` : `[data-slot="${selSlot}"]`) || lastTipAnchor;
  if (anchor) lastTipAnchor = anchor;
  if (!keepPos || wasWide !== tip.classList.contains('wide')) positionItemTip(lastTipAnchor);
}

function renderCampGear() {
  const hero = getActiveHero(gameState);
  const invEl = document.getElementById('camp-inv');
  document.getElementById('equip-slots').innerHTML = DOLL_SLOTS.map(row =>
    row.map(slot => {
      if (!slot) return '<div class="doll-cell blank"></div>';
    const item = hero.equipment[slot];
      const wornBlock = slot === 'offhand' && item && equipBlockReason(hero, item);
      return `<div class="doll-cell ${selSlot === slot ? 'sel' : ''} ${wornBlock ? 'blocked' : ''}" data-slot="${slot}">
      <span class="slot-label">${SLOT_NAMES[slot]}</span>
        ${itemIconHtml(item, '', wornBlock)}
    </div>`;
    }).join('')
  ).join('');
  const sets = getSetStatus(hero.equipment);
  document.getElementById('set-preview').innerHTML = sets.length
    ? sets.map(s => {
      const anc = Object.values(hero.equipment).filter(it => it?.setId === s.setId && it.quality === 'ancientSet').length;
      const tag = anc ? (anc >= s.count ? '远古' : `远古${anc}`) : '';
      return `<span class="set-hot-name" data-set-tip="${s.setId}">${s.def.name}（${s.count}/${s.def.pieceCount}）${tag ? ` · ${tag}` : ''}</span>`;
    }).join('')
    : '';
  const filter = gameState.invFilter || 'all';
  const sort = normalizeInvSort(gameState.invSort);
  document.getElementById('camp-inv-filters').innerHTML =
    [['all', '全部'], ['slot', '本部位']].map(([id, label]) =>
      `<button type="button" class="btn-small ${filter === id ? 'on' : ''}" data-act="filter" data-uid="${id}">${label}</button>`
    ).join('') +
    `<span class="filter-gap"></span>` +
    [['rarity', '稀有度'], ['ilvl', '装备等级'], ['score', '评分']].map(([id, label]) =>
      `<button type="button" class="btn-small ${sort[id] ? 'on' : ''}" data-act="inv-sort" data-uid="${id}">${label}</button>`
    ).join('');
  const items = filteredBagItems();
  const pages = Math.max(1, Math.ceil(Math.max(items.length, 1) / INV_PAGE));
  if (invPage >= pages) invPage = pages - 1;
  const start = invPage * INV_PAGE;
  const pageItems = items.slice(start, start + INV_PAGE);
  const cells = [];
  for (let i = 0; i < INV_PAGE; i++) {
    const item = pageItems[i];
    if (item) {
      const blocked = equipBlockReason(hero, item);
      const picked = selInvUids.has(item.uid) ? 'picked' : '';
      const sel = selInvUid === item.uid ? 'sel' : '';
      cells.push(`<button type="button" class="inv-cell ${sel} ${picked} ${blocked ? 'blocked' : ''} ${item.quality === 'ancientUnique' ? 'q-ancientUnique' : isUniqueItem(item) ? 'q-unique' : ''}" data-inv="${item.uid}" title="${blocked ? '不可装备：' + blocked : itemDisplayName(item)}">${itemIconHtml(item, '', blocked)}</button>`);
    } else {
      cells.push('<div class="inv-cell empty-cell"></div>');
    }
  }
  invEl.innerHTML = cells.join('');
  const pageLabel = document.getElementById('inv-page-label');
  if (pageLabel) pageLabel.textContent = `${invPage + 1}/${pages}`;
  const cap = getInvCap(gameState);
  document.getElementById('inv-count').textContent = `${gameState.inventory.length}/${cap}`;
  const a = gameState.autoSell || {};
  const asBtn = document.getElementById('btn-autosell');
  if (asBtn) {
    asBtn.classList.toggle('on', !!a.enabled);
    asBtn.classList.toggle('off', !a.enabled);
    const verb = a.action === 'salvage' ? '自动分解' : '自动出售';
    asBtn.textContent = a.enabled ? `${verb} · 开` : '自动出售 · 关';
  }
  document.getElementById('autosell-pop')?.toggleAttribute('hidden', !autosellOpen);
  document.querySelectorAll('#autosell-opts .as-opt').forEach((btn) => {
    btn.classList.toggle('on', !!a.enabled && btn.dataset.as === a.maxQuality);
  });
  document.querySelectorAll('[data-as-act]').forEach((btn) => {
    btn.classList.toggle('on', (a.action || 'sell') === btn.dataset.asAct);
  });
  const ilvl = document.getElementById('as-ilvl');
  if (ilvl && document.activeElement !== ilvl) ilvl.value = String(a.minKeepLevel || 0);
  const kb = document.getElementById('as-better');
  if (kb && document.activeElement !== kb) kb.checked = !!a.keepBetter;
  const jq = document.getElementById('junk-q');
  if (jq && document.activeElement !== jq) jq.value = gameState.junkQuality || 'magic';
  const multiBtn = document.getElementById('btn-inv-multi');
  if (multiBtn) multiBtn.classList.toggle('on', invMultiMode);
  const bulk = document.getElementById('inv-bulk-bar');
  if (bulk) {
    const n = selInvUids.size;
    bulk.hidden = !invMultiMode && n < 2;
    const items = (gameState.inventory || []).filter(i => selInvUids.has(i.uid) && !i.locked);
    const gold = items.reduce((s, it) => s + sellValue(it), 0);
    bulk.innerHTML = invMultiMode || n
      ? `<span>已选 ${n}</span>
         <button type="button" class="btn-small" data-bulk="page">全选本页</button>
         <button type="button" class="btn-small" data-bulk="clear">取消</button>
         <button type="button" class="btn-small" data-bulk="sell" ${items.length ? '' : 'disabled'}>出售 ${formatCompactNum(gold)}金</button>
         <button type="button" class="btn-small" data-bulk="salvage" ${items.length ? '' : 'disabled'}>${salvageBtnText(items)}</button>
         <span class="hint">Ctrl/⌘ 点选，Shift 连选</span>`
      : '';
  }
}

function itemCardHtml(item, tag, opts = {}) {
  if (!item) return `<div class="cmp-col"><div class="hint">${tag || ''}：空部位</div></div>`;
  const vs = opts.vs || null;
  const { q, affixHtml, morphStr, setStr } = itemLine(item, opts);
  const hero = opts.hero || getActiveHero(gameState);
  const block = tag !== '已装备' && tag !== '当前' && equipBlockReason(hero, item);
  const wclass = inferWeaponClass(item);
  const oh = inferOffhandClass(item);
  const req = itemClassId(item);
  const reqTxt = req && CHARACTERS[req] ? ` · 仅限${CHARACTERS[req].name}` : '';
  const wtxt = wclass ? ` · ${WEAPON_CLASS_NAMES[wclass]}` : (oh === 'quiver' ? ' · 箭袋（配弓/弩）' : oh === 'shield' ? ' · 盾' : '');
  const dmg = shownBase(item, item.baseDamage);
  const arm = shownBase(item, item.armor);
  const ias = Math.round((item.attackSpeed || 0) * itemEnhanceMult(item) * 100);
  const vdmg = vs ? shownBase(vs, vs.baseDamage) : 0;
  const varm = vs ? shownBase(vs, vs.armor) : 0;
  const vias = vs ? Math.round((vs.attackSpeed || 0) * itemEnhanceMult(vs) * 100) : 0;
  const enh = item.enhance || 0;
  const cap = itemEnhanceCapPct(item.quality);
  const enhTxt = enh ? ` · 强化+${enh}/10（+${Math.round(itemEnhanceBonus(item) * 100)}%）` : (cap ? ' · 可强化' : '');
  const dmgLine = item.baseDamage
    ? `<div class="stat-line">基础伤害 ${dmg}${vs ? deltaSpan(dmg - vdmg) : ''}</div>` : '';
  const armLine = item.armor
    ? `<div class="stat-line">护甲 ${arm}${vs ? deltaSpan(arm - varm) : ''}</div>` : '';
  const iasLine = item.attackSpeed
    ? `<div class="stat-line">攻速 +${ias}%${vs ? deltaSpan(ias - vias, '%') : ''}</div>` : '';
  const lost = vs ? lostAffixesHtml(item, vs) : '';
  const body = `
    ${tag ? `<div class="cmp-tag">${tag}</div>` : ''}
    ${itemIconHtml(item, opts.compact ? '' : 'lg', block)}
    <div class="inspect-name ${isUniqueItem(item) ? 'unique-name' : ''}" style="color:${q.color}">${item.locked ? '锁 ' : ''}${isAncientItem(item) ? '远古 · ' : ''}${itemDisplayName(item)}</div>
    <div class="quality-tag" style="color:${q.color}">${q.name} · ${SLOT_NAMES[item.slot] || item.slot}${wtxt}${reqTxt} · ${item.itemLevel || 1}级${enhTxt}</div>
    ${block ? `<div class="equip-block">不可装备：${block}</div>` : ''}
    ${gearScoreHtml(item, hero, !!opts.compact, vs)}
    ${dmgLine}${armLine}${iasLine}
    ${affixHtml || '<div class="stat-line dim">无词缀</div>'}
    ${lost}
    ${item.legendaryEffect ? `<div class="legendary-effect">${item.legendaryEffect}</div>` : ''}
    ${morphStr}${item.setId ? setStr : ''}
  `;
  if (opts.compact && !vs) {
    return `<div class="cmp-col compact">${body}</div>`;
  }
  return `<div class="cmp-col${vs ? ' cmp-new' : ''}${opts.side === 'old' ? ' cmp-old' : ''}">${body}</div>`;
}

function deltaSpan(d, suffix = '') {
  if (!d) return '';
  if (d > 0) return `<span class="affix-delta up">▲ +${d}${suffix}</span>`;
  return `<span class="affix-delta down">▼ ${d}${suffix}</span>`;
}

function affixValueDelta(item, a, vsItem) {
  if (!vsItem || !a?.stat) return null;
  const other = (vsItem.affixes || []).find(x => x.stat === a.stat)
    || (vsItem.exclusiveAffix?.stat === a.stat ? vsItem.exclusiveAffix : null);
  if (!other) return shownAffix(item, a).value;
  return shownAffix(item, a).value - shownAffix(vsItem, other).value;
}

function lostAffixesHtml(item, vs) {
  const have = new Set((item.affixes || []).map(a => a.stat).filter(Boolean));
  if (item.exclusiveAffix?.stat) have.add(item.exclusiveAffix.stat);
  const lost = [];
  for (const a of vs.affixes || []) {
    if (a?.stat && !have.has(a.stat)) lost.push(a);
  }
  if (vs.exclusiveAffix?.stat && !have.has(vs.exclusiveAffix.stat)) lost.push(vs.exclusiveAffix);
  return lost.map(a => {
    const s = shownAffix(vs, a);
    return `<div class="affix-line lost">失去 +${s.value}${a.suffix || ''} ${a.name || a.stat}</div>`;
  }).join('');
}

function itemStatMap(item) {
  const m = {};
  if (!item) return m;
  if (item.baseDamage) m._dmg = { name: '基础伤害', value: shownBase(item, item.baseDamage) };
  if (item.armor) m._arm = { name: '护甲', value: shownBase(item, item.armor) };
  if (item.attackSpeed) m._ias = { name: '攻速', value: Math.round(item.attackSpeed * itemEnhanceMult(item) * 100), suffix: '%' };
  for (const a of item.affixes || []) {
    if (!a?.stat) continue;
    const s = shownAffix(item, a);
    m[a.stat] = { name: a.name || a.stat, value: s.value, suffix: a.suffix || '', tier: a.tier };
  }
  if (item.exclusiveAffix?.stat) {
    const a = shownAffix(item, item.exclusiveAffix);
    m[`ex_${item.exclusiveAffix.stat}`] = { name: `专属·${a.name || a.stat}`, value: a.value, suffix: a.suffix || '', exclusive: true };
  }
  return m;
}

function compareStatTableHtml(oldItem, newItem, labels) {
  const a = itemStatMap(oldItem);
  const b = itemStatMap(newItem);
  const order = ['_dmg', '_arm', '_ias'];
  const keys = [...order.filter(k => a[k] || b[k]), ...[...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !order.includes(k))];
  if (!keys.length) return '';
  const rows = keys.map(k => {
    const left = a[k];
    const right = b[k];
    const lv = left?.value || 0;
    const rv = right?.value || 0;
    const d = rv - lv;
    const suf = right?.suffix || left?.suffix || '';
    const name = right?.name || left?.name || k;
    const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
    const sign = d > 0 ? '+' : '';
    return `<div class="cmp-stat ${cls}">
      <span class="cmp-stat-name">${name}</span>
      <span class="cmp-stat-old">${left ? `${lv}${suf}` : '—'}</span>
      <span class="cmp-stat-new">${right ? `${rv}${suf}` : '—'}</span>
      <span class="cmp-stat-d">${d === 0 ? '=' : `${sign}${d}${suf}`}</span>
    </div>`;
  }).join('');
  const leftH = labels?.old || '当前';
  const rightH = labels?.neu || '选中';
  return `<div class="cmp-table">
    <div class="cmp-stat head"><span>属性</span><span>${leftH}</span><span>${rightH}</span><span>差</span></div>
    ${rows}
  </div>`;
}

function dpsDeltaHtml(cmp, label) {
  const up = cmp.diff >= 0;
  const sign = cmp.diffPct >= 0 ? '+' : '';
  return `<div class="${up ? 'dps-up' : 'dps-down'}">${label} DPS ${cmp.newDps}（${sign}${cmp.diffPct.toFixed(1)}%）</div>`;
}

function ehpDeltaHtml(cmp, label) {
  const up = cmp.diff >= 0;
  const sign = cmp.diffPct >= 0 ? '+' : '';
  return `<div class="${up ? 'dps-up' : 'dps-down'}">${label} 生存 ${cmp.newEhp}（${sign}${cmp.diffPct.toFixed(1)}%）</div>`;
}

function gearScoreHtml(item, hero, compact = false, vs = null) {
  if (!item) return `<div class="gear-score empty">攻 0 · 生 0</div>`;
  const s = scoreItem(item, hero);
  if (!s.usable && !vs) {
    return `<div class="gear-score blocked">不可用</div>`;
  }
  const o = vs ? scoreItem(vs, hero) : null;
  return `<div class="gear-score ${compact ? 'compact' : ''}">
    <span class="gs atk g-${s.atkGrade}">攻 ${s.atkGrade} ${s.atk}${o ? deltaSpan(s.atk - o.atk) : ''}</span>
    <span class="gs surv g-${s.survGrade}">生 ${s.survGrade} ${s.surv}${o ? deltaSpan(s.surv - o.surv) : ''}</span>
  </div>`;
}

function scoreDelta(oldN, newN) {
  const d = newN - oldN;
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  const sign = d > 0 ? '+' : '';
  return { d, cls, text: d === 0 ? '=' : `${sign}${d}` };
}

function compareScoreHtml(oldItem, newItem, hero) {
  const a = scoreItem(oldItem, hero);
  const b = scoreItem(newItem, hero);
  const atk = scoreDelta(a.atk, b.atk);
  const surv = scoreDelta(a.surv, b.surv);
  return `<div class="score-compare">
    <div class="score-line">
      <span class="score-k">攻击</span>
      <span class="gs atk g-${a.atkGrade}">${oldItem ? `${a.atkGrade} ${a.atk}` : '—'}</span>
      <span class="score-arrow">→</span>
      <span class="gs atk g-${b.atkGrade}">${b.atkGrade} ${b.atk}</span>
      <span class="cmp-stat-d ${atk.cls}">${atk.text}</span>
    </div>
    <div class="score-line">
      <span class="score-k">生存</span>
      <span class="gs surv g-${a.survGrade}">${oldItem ? `${a.survGrade} ${a.surv}` : '—'}</span>
      <span class="score-arrow">→</span>
      <span class="gs surv g-${b.survGrade}">${b.survGrade} ${b.surv}</span>
      <span class="cmp-stat-d ${surv.cls}">${surv.text}</span>
    </div>
  </div>`;
}

function setTipWide(tip, wide) {
  if (tip) tip.classList.toggle('wide', !!wide);
}

function inspectSetHtml(hero, onlySetId) {
  const sets = getSetStatus(hero.equipment).filter(s => !onlySetId || s.setId === onlySetId);
  if (!sets.length) return '';
  let html = '';
  for (const { def: setDef, count } of sets) {
    const anc = Object.values(hero.equipment || {}).filter(it => it?.setId === setDef.id && it.quality === 'ancientSet').length;
    const ancTag = anc ? (anc >= count ? ' · 远古' : ` · 远古${anc}`) : '';
    html += `<div class="set-bonus">${setDef.name}（${count}/${setDef.pieceCount}）${ancTag}</div>`;
    for (const [pieces, bonus] of Object.entries(setDef.bonuses)) {
      html += `<div class="set-tier ${count >= parseInt(pieces, 10) ? 'active' : ''}">${pieces}件：${bonus.desc}</div>`;
    }
  }
  return html;
}

function countSetOn(eq, setId) {
  return Object.values(eq || {}).filter(it => it?.setId === setId).length;
}

function equipmentAfterEquip(hero, item, destSlot) {
  const eq = { ...hero.equipment };
  let dest = destSlot || item.slot;
  if (isRingItem(item)) dest = destSlot === 'ring2' ? 'ring2' : 'ring1';
  eq[dest] = { ...item, slot: dest };
  if (item.slot === 'weapon') {
    const chk = offhandFitsWeapon(item, eq.offhand);
    if (!chk.ok) delete eq.offhand;
  }
  return eq;
}

function setBonusTiersHtml(def, count) {
  return Object.entries(def.bonuses).map(([n, b]) =>
    `<div class="set-tier ${count >= parseInt(n, 10) ? 'active' : ''}">${n}件：${b.desc}</div>`
  ).join('');
}

function setNameHoverHtml(def, count) {
  if (!def) return '';
  return `<div class="set-hot">
    <span class="set-hot-name">${def.name}（${count}/${def.pieceCount}）</span>
    <div class="set-tip-pop">${setBonusTiersHtml(def, count)}</div>
  </div>`;
}

function setPieceLine(cat, afterEq, bagItem, destSlot) {
  const worn = Object.entries(afterEq).find(([, it]) =>
    it && it.setId === cat.setId && (it.id === cat.id || it.name === cat.name));
  const dest = isRingItem(bagItem) ? destSlot : bagItem.slot;
  const incoming = bagItem.setId === cat.setId && (bagItem.id === cat.id || bagItem.name === cat.name);
  const slotName = SLOT_NAMES[cat.slot === 'ring2' ? 'ring1' : cat.slot] || cat.slot;
  if (incoming) {
    const put = SLOT_NAMES[dest] || dest;
    const anc = bagItem.quality === 'ancientSet' ? ' · 远古' : '';
    return `<div class="set-piece on">✓ ${slotName} ${cat.name}<span class="set-piece-tag">选中 · ${put}${anc}</span></div>`;
  }
  if (worn) {
    const anc = worn[1].quality === 'ancientSet' ? '<span class="set-piece-tag">远古</span>' : '';
    return `<div class="set-piece on">✓ ${SLOT_NAMES[worn[0]] || worn[0]} ${worn[1].name}${anc}</div>`;
  }
  return `<div class="set-piece off">○ ${slotName} ${cat.name}<span class="set-piece-tag">未装备</span></div>`;
}

function renderSetCollection(beforeEq, afterEq, setId, bagItem, destSlot) {
  const def = SETS[setId];
  if (!def) return '';
  const after = countSetOn(afterEq, setId);
  const catalog = LEGENDARY_ITEMS.filter(i => i.setId === setId);
  let html = `<div class="set-bonus">穿上后 · ${def.name}（${after}/${def.pieceCount}）</div>`;
  html += `<div class="set-pieces">${catalog.map(cat => setPieceLine(cat, afterEq, bagItem, destSlot)).join('')}</div>`;
  html += setBonusTiersHtml(def, after);
  return html;
}

function renderSetsAfterEquip(beforeEq, afterEq) {
  const afterSets = getSetStatus(afterEq);
  const beforeSets = getSetStatus(beforeEq);
  if (!afterSets.length && !beforeSets.length) return '';
  let html = `<div class="set-cmp-head">穿上后套装</div>`;
  if (!afterSets.length) {
    html += '<div class="set-bonus lost">穿上后：无套装生效</div>';
    for (const s of beforeSets) {
      html += `<div class="set-tier lost">${s.def.name} 将失效</div>`;
    }
    return html;
  }
  for (const s of afterSets) {
    html += `<div class="set-bonus">${s.def.name}（${s.count}/${s.def.pieceCount}）</div>`;
    html += setBonusTiersHtml(s.def, s.count);
  }
  for (const s of beforeSets) {
    if (!afterSets.some(a => a.setId === s.setId)) {
      html += `<div class="set-bonus lost">${s.def.name} 将失效</div>`;
    }
  }
  return html;
}

function inspectCompareSetHtml(hero, bagItem, destSlot) {
  const after = equipmentAfterEquip(hero, bagItem, destSlot);
  if (bagItem.setId && SETS[bagItem.setId]) {
    return renderSetCollection(hero.equipment, after, bagItem.setId, bagItem, destSlot);
  }
  return renderSetsAfterEquip(hero.equipment, after);
}

function inspectCompareSetBlock(hero, bagItem) {
  if (!bagItem?.setId || !SETS[bagItem.setId]) return '';
  if (isRingItem(bagItem)) {
    const left = inspectCompareSetHtml(hero, bagItem, 'ring1');
    const right = inspectCompareSetHtml(hero, bagItem, 'ring2');
    if (left === right) return `<div class="set-cmp">${left}</div>`;
    return `<div class="set-cmp">
      <div class="set-cmp-label">若装备左戒</div>${left}
      <div class="set-cmp-label">若装备右戒</div>${right}
    </div>`;
  }
  return `<div class="set-cmp">${inspectCompareSetHtml(hero, bagItem, bagItem.slot)}</div>`;
}

function rerollBtnHtml(item) {
  if (!item?.affixes?.length || item.quality === 'normal') return '';
  return payActionHtml('reroll', item.uid, '洗练', rerollAffixCost(item));
}

function stashBtnHtml(item) {
  if (!item || !townUnlocked(gameState)) return '';
  return `<button type="button" class="btn-small" data-act="stash" data-uid="${item.uid}">存入仓库</button>`;
}

function inspectHtml(hero) {
  const worn = hero.equipment[selSlot];
  const picked = (gameState.inventory || []).filter(i => selInvUids.has(i.uid));
  if (picked.length > 1) {
    const free = picked.filter(i => !i.locked);
    const gold = free.reduce((s, it) => s + sellValue(it), 0);
    const locked = picked.length - free.length;
    return `<p class="hint">已选 ${picked.length} 件（锁 ${locked}）。锁定的不会被出售/分解。</p>
      <div class="inspect-actions">
        <button type="button" class="btn-small" data-act="sell-sel" ${free.length ? '' : 'disabled'}>出售 ${formatCompactNum(gold)}金</button>
        <button type="button" class="btn-small" data-act="salvage-sel" ${free.length ? '' : 'disabled'}>${salvageBtnText(free)}</button>
      </div>
      <div class="inspect-body">
      <p class="hint">锁定 ${locked} 件会跳过。Ctrl/⌘ 点选，Shift 连选本页范围。</p>
      <div class="inv-affixes">${picked.slice(0, 8).map(i => `${i.locked ? '锁 ' : ''}${i.name}`).join(' · ')}${picked.length > 8 ? ' …' : ''}</div>
      </div>`;
  }
  const bagItem = selInvUid ? gameState.inventory.find(i => i.uid === selInvUid) : null;
  if (bagItem) {
    const dest = isRingItem(bagItem)
      ? (selSlot === 'ring2' ? 'ring2' : 'ring1')
      : (selSlot || bagItem.slot);
    const worn = hero.equipment[dest];
    const block = equipBlockReason(hero, bagItem);
    const ring = isRingItem(bagItem);
    return `<div class="inspect-actions">
        ${ring ? `
          <button type="button" class="btn-small ${dest === 'ring1' ? 'on' : ''}" data-act="cmpring" data-uid="ring1">比左戒</button>
          <button type="button" class="btn-small ${dest === 'ring2' ? 'on' : ''}" data-act="cmpring" data-uid="ring2">比右戒</button>
          <button type="button" class="btn-small" data-act="equip" data-uid="${bagItem.uid}" data-slot="${dest}" ${block ? 'disabled' : ''}>装备到${SLOT_NAMES[dest]}</button>
        ` : (block
          ? `<button type="button" class="btn-small" disabled title="${block}">无法装备</button>`
          : `<button type="button" class="btn-small" data-act="equip" data-uid="${bagItem.uid}" data-slot="${dest}">装备</button>`)}
        <button type="button" class="btn-small" data-act="lock" data-uid="${bagItem.uid}">${bagItem.locked ? '解锁' : '锁定'}</button>
        <button type="button" class="btn-small" data-act="sell" data-uid="${bagItem.uid}">出售 ${formatCompactNum(sellValue(bagItem))}金</button>
        <button type="button" class="btn-small" data-act="salvage" data-uid="${bagItem.uid}">分解</button>
        ${stashBtnHtml(bagItem)}
        ${rerollBtnHtml(bagItem)}
        ${enhanceBtnHtml(bagItem)}
      </div>
      <div class="inspect-body">
      <div class="d4-cmp">
        ${itemCardHtml(bagItem, '替换', { hero, vs: worn, side: 'new' })}
        ${itemCardHtml(worn, '已装备', { hero, side: 'old' })}
      </div>
      </div>`;
  }
  let html = '';
  if (worn) {
    html += `<div class="inspect-actions">
        <button type="button" class="btn-small" data-act="unequip" data-slot="${selSlot}">卸下</button>
        ${rerollBtnHtml(worn)}
        ${enhanceBtnHtml(worn)}
      </div>
      <div class="inspect-body">
        <div class="cmp-row">${itemCardHtml(worn, '已装备', { hero })}</div>
        ${worn.setId ? inspectSetHtml(hero, worn.setId) : ''}
      </div>`;
  } else {
    html += '<p class="hint">空部位。点击背包格子选择装备。</p>';
  }
  return html;
}

function renderCombatHud() {
  const pack = (combatState?.monsters || []).filter(m => m && m.hp > 0);
  const m = combatState?.target && combatState.target.hp > 0 ? combatState.target : pack[0];
  const bar = document.getElementById('monster-hp-bar');
  const name = document.getElementById('monster-name');
  const hpText = document.getElementById('monster-hp-text');
  const kindEl = document.getElementById('monster-kind');
  const hero = getActiveHero(gameState);
  const map = getCurrentMap(hero, gameState);
  if (!m) {
    name.textContent = '搜寻目标…';
    bar.style.width = '0%';
    hpText.textContent = '—';
    kindEl.textContent = '';
  } else {
    name.textContent = `${m.name}  Lv.${m.level}${pack.length > 1 ? `  · 群 ${pack.length}` : ''}`;
    bar.style.width = `${m.hp / m.maxHp * 100}%`;
    hpText.textContent = `${Math.floor(m.hp)} / ${m.maxHp}`;
    const kn = { normal: '普通', elite: '精英', rare: '稀有', hidden: '隐藏', goblin: '宝藏哥布林', rareBoss: '稀有 Boss', actBoss: '章节 Boss', riftBoss: '秘境守护', boss: 'Boss' }[m.kind] || '';
    kindEl.textContent = kn + (m.ranged ? ' · 远程' : m.flee ? ' · 逃跑中' : '');
    kindEl.style.color = m.kind === 'goblin' ? '#ffd24a'
      : m.kind === 'hidden' ? '#c080ff'
      : m.kind === 'riftBoss' ? '#ff7a6a'
      : QUALITY[m.kind === 'rare' ? 'rare' : m.kind === 'elite' ? 'magic' : 'normal']?.color || '#c8c0b0';
  if (m.isBoss) {
      const rate = estimateBossWinRate(hero, m);
      document.getElementById('boss-winrate').textContent = `预计通过率 ${rate}%`;
    document.getElementById('boss-winrate').style.display = 'block';
  } else {
    document.getElementById('boss-winrate').style.display = 'none';
    }
  }
  const p = mapClearProgress(gameState, map);
  let label = map.isRift
    ? (hero.riftBossReady ? '守护者就绪' : '秘境进度')
    : (map.isBoss ? (p.ready ? '首领就绪' : 'Boss 进度') : '巡游');
  if (map.isBoss && p.ready && gameState.bossesKilled?.[map.bossId]) {
    const chance = chapterBossAppearChance(gameState, map, combatState?.bossPity || 0);
    label = `首领 ${Math.round(chance * 100)}%`;
  }
  document.getElementById('kill-counter').innerHTML =
    `${label} ${p.have} / ${p.need}` +
    `<div class="map-prog"><div class="map-prog-fill" style="width:${p.pct}%"></div></div>`;
  const buffsEl = document.getElementById('combat-buffs');
  if (buffsEl) {
    const list = collectHudBuffs(hero, combatState?.buffs);
    buffsEl.innerHTML = list.map(b =>
      `<div class="buff-chip ${b.kind}">
        <span class="buff-name">${b.name}</span>
        <span class="buff-lv">${b.lv}</span>
        <span class="buff-time">${b.time}</span>
      </div>`
    ).join('');
  }
  renderCombatSkills(hero);
}

function combatUsableSkillIds(hero) {
  const tree = SKILLS[hero.charId] || {};
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs });
  const equipped = hero.equippedSkills || [];
  return combatSkillQueue(hero).filter(id => {
    const skill = tree[id];
    if (!skill || (skill.type !== 'active' && skill.type !== 'buff')) return false;
    if (combatSkillLevel(hero, id, stats) <= 0) return false;
    const granted = (stats.skillGrant?.[id] || 0) > 0;
    if (equipped.length && skill.type === 'active' && !equipped.includes(id) && !granted) return false;
    return true;
  });
}

function renderCombatSkills(hero) {
  const el = document.getElementById('combat-skills');
  if (!el || !hero) return;
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs });
  const ids = combatUsableSkillIds(hero);
  const key = `v2:${ids.join(',')}`;
  if (el.dataset.ids !== key) {
    el.dataset.ids = key;
    el.innerHTML = ids.length
      ? ids.map(id => {
        const skill = SKILLS[hero.charId][id];
        return `<button type="button" class="csk" data-uid="${id}" data-skill-tip="${id}" title="${skill.name}">
          ${skillIconHtml(skill, 1)}
          <span class="csk-cd-fill"></span>
          <span class="csk-name">${skill.name}</span>
          <span class="csk-st">—</span>
        </button>`;
      }).join('')
      : '<div class="csk-empty">暂无已学主动技能</div>';
  }
  for (const id of ids) {
    const btn = el.querySelector(`[data-uid="${id}"]`);
    const skill = SKILLS[hero.charId]?.[id];
    if (!btn || !skill) continue;
    const on = isSkillEnabled(hero, id);
    const remain = combatState?.skillCooldowns?.[id] || 0;
    const ch = combatState?.channel;
    const channeling = ch?.id === id && (ch.t || 0) > 0;
    const cost = skillResCost(hero, skill, stats);
    const resOk = cost <= 0 || (hero.currentRes || 0) >= cost;
    let st = '就绪';
    let cls = 'ready';
    if (!on) {
      st = '已停用';
      cls = 'off';
    } else if (hero.isDead) {
      st = '倒地';
      cls = 'off';
    } else if (channeling) {
      st = `释放 ${Math.ceil(ch.t)}s`;
      cls = 'cast';
    } else if (remain > 0.05) {
      st = `CD ${remain.toFixed(1)}s`;
      cls = 'cd';
    } else if (!resOk) {
      st = `${stats.resName}不足`;
      cls = 'oom';
    }
    btn.className = `csk ${cls}`;
    const stEl = btn.querySelector('.csk-st');
    const nameEl = btn.querySelector('.csk-name');
    if (stEl) stEl.textContent = st;
    if (nameEl) nameEl.textContent = skill.name;
    const fill = btn.querySelector('.csk-cd-fill');
    if (fill) {
      const maxCd = skill.cooldown > 0 ? Math.max(skill.cooldown * 1.25, 4) : Math.max(ch?.t || 0, 0.01);
      const pct = channeling
        ? Math.min(100, (ch.t / (skill.channel || 1)) * 100)
        : (remain > 0 && maxCd > 0 ? Math.min(100, remain / maxCd * 100) : 0);
      fill.style.height = `${pct}%`;
    }
  }
}

function renderStatsPanel() {
  const hero = getActiveHero(gameState);
  const map = getCurrentMap(hero, gameState);
  const kpm = document.getElementById('stat-kpm');
  const eph = document.getElementById('stat-eph');
  if (kpm) kpm.textContent = killsPerMinute(hero, map);
  if (eph) eph.textContent = expPerHour(hero, map).toLocaleString();
  const hpEl = document.getElementById('stat-hp-pots');
  const manaEl = document.getElementById('stat-mana-pots');
  if (hpEl) hpEl.textContent = gameState.hpPotions || 0;
  if (manaEl) manaEl.textContent = gameState.manaPotions || 0;
}

function renderLog() {
  const logEl = document.getElementById('combat-log');
  if (!combatState?.log?.length) return;
  logEl.innerHTML = combatState.log.slice(-24).reverse().map(entry => {
    return `<div class="log-entry ${entry.type}">${entry.text}</div>`;
  }).join('');
}

function fillMapScore(btn, map, heroScore) {
  if (!btn || !map) return;
  let el = btn.querySelector('.map-score');
  if (!el) {
    el = document.createElement('span');
    el.className = 'map-score';
    const hint = btn.querySelector('.map-hint');
    if (hint) btn.insertBefore(el, hint);
    else btn.appendChild(el);
  }
  const rec = mapRecommendScore(map, gameState);
  el.textContent = `推荐 ${formatCompactNum(rec)}`;
  el.classList.toggle('ok', heroScore >= rec);
  el.classList.toggle('mid', heroScore >= rec * 0.75 && heroScore < rec);
  el.classList.toggle('low', heroScore < rec * 0.75);
}

function renderMapSelect() {
  const hero = getActiveHero(gameState);
  const actsEl = document.getElementById('map-acts');
  const container = document.getElementById('map-list');
  const diffEl = document.getElementById('diff-select');
  if (!actsEl || !container) return;
  ensureWorldDiff(gameState);
  if (diffEl) {
    const cur = getWorldDiff(gameState);
    diffEl.innerHTML = WORLD_DIFFS.map(d => {
      const open = diffUnlocked(gameState, d.id);
      const title = open
        ? `${d.name}：怪物 Lv.${d.lvMin}–${d.lvMax}，×${d.monsterMult}，掉落属性 ×${d.lootMult}`
        : `击败${WORLD_DIFFS.find(x => x.tier === d.tier - 1)?.name || '上一'}难度的巴尔后解锁`;
      return `<button type="button" class="diff-tab diff-${d.id}${cur.id === d.id ? ' active' : ''}${open ? '' : ' locked'}" data-diff="${d.id}" title="${title}">${d.name}</button>`;
    }).join('');
  }
  gameState.mapsEntered = gameState.mapsEntered || {};
  if (hero.currentMap) gameState.mapsEntered[hero.currentMap] = true;
  const heroAct = hero.currentMap === 'rift' ? 6 : (getMap(hero.currentMap)?.act || 1);
  if (!mapActTab || mapActFollow) mapActTab = heroAct;

  if (!knownMapUnlocks) {
    knownMapUnlocks = new Set(MAPS.filter(m => mapUnlocked(gameState, m)).map(m => m.id));
  } else {
    for (const map of MAPS) {
      if (!mapUnlocked(gameState, map) || knownMapUnlocks.has(map.id)) continue;
      knownMapUnlocks.add(map.id);
      mapActTab = map.act;
      mapActFollow = false;
      addLog({ type: 'level', text: `新地图可进入：${map.name}` });
    }
  }

  const acts = [1, 2, 3, 4, 5, 6];
  if (actsEl.childElementCount !== acts.length) {
    actsEl.innerHTML = acts.map(a =>
      `<button type="button" class="act-tab" data-act="${a}">
        ${ACT_TAB_NAMES[a]}
        <span class="act-dot" hidden></span>
      </button>`
    ).join('');
  }

  acts.forEach((a, i) => {
    const tab = actsEl.children[i];
    const rift = a === 6;
    const maps = rift ? [] : MAPS.filter(m => m.act === a);
    const anyOpen = rift ? riftUnlocked(gameState) : maps.some(m => mapUnlocked(gameState, m));
    const anyNew = rift
      ? (riftUnlocked(gameState) && !gameState.mapsEntered.rift && hero.currentMap !== 'rift')
      : maps.some(m => mapUnlocked(gameState, m)
        && !gameState.mapsEntered[m.id]
        && m.id !== hero.currentMap);
    tab.classList.toggle('active', mapActTab === a);
    tab.classList.toggle('locked', !anyOpen);
    tab.classList.toggle('act-new', anyNew);
    tab.classList.toggle('here', heroAct === a);
    const dot = tab.querySelector('.act-dot');
    if (dot) dot.hidden = !anyNew;
  });

  if (mapActTab === 6) {
    ensureRiftHero(hero);
    const rmap = withDiffLevels(makeRiftMap(hero.riftFloor), gameState);
    const locked = !riftUnlocked(gameState);
    const p = mapClearProgress(gameState, rmap);
    if (container.dataset.act !== '6' || container.childElementCount !== 1) {
      container.dataset.act = '6';
      container.innerHTML = `<button type="button" class="map-btn boss" data-map="rift">
        <div class="map-btn-row">
          <span class="map-name"></span>
          <span class="map-lv"></span>
        </div>
        <span class="map-score"></span>
        <div class="map-prog"><div class="map-prog-fill"></div></div>
        <span class="map-hint"></span>
        <span class="map-new-tag" hidden>新解锁</span>
        <span class="map-new-dot" hidden></span>
    </button>`;
    }
    const btn = container.children[0];
    const isNew = !locked && !gameState.mapsEntered.rift && hero.currentMap !== 'rift';
    btn.classList.toggle('locked', locked);
    btn.classList.toggle('active', hero.currentMap === 'rift');
    btn.classList.toggle('map-new', isNew);
    btn.querySelector('.map-name').textContent = `${rmap.name}${hero.riftBest ? ` · 最高 ${hero.riftBest} 层` : ''}`;
    btn.querySelector('.map-lv').textContent = `Lv.${rmap.levelMin}–${rmap.levelMax}`;
    btn.querySelector('.map-prog-fill').style.width = `${locked ? 0 : p.pct}%`;
    btn.querySelector('.map-hint').textContent = locked
      ? '未解锁 · 需开放世界之石要塞'
      : (hero.riftBossReady ? '守护者就绪' : (hero.currentMap === 'rift' ? `${p.have}/${p.need}` : '打怪积攒进度，满后刷新强力首领'));
    const tag = btn.querySelector('.map-new-tag');
    const dot = btn.querySelector('.map-new-dot');
    if (tag) tag.hidden = !isNew;
    if (dot) dot.hidden = !isNew;
    fillMapScore(btn, rmap, heroGearScore(hero));
    return;
  }

  const visible = MAPS.filter(m => m.act === mapActTab);
  if (container.dataset.act !== String(mapActTab) || container.childElementCount !== visible.length) {
    container.dataset.act = String(mapActTab);
    container.innerHTML = visible.map(map =>
      `<button type="button" class="map-btn${map.isBoss ? ' boss' : ''}" data-map="${map.id}">
        <div class="map-btn-row">
          <span class="map-name"></span>
          <span class="map-lv"></span>
        </div>
        <span class="map-score"></span>
        <div class="map-prog"><div class="map-prog-fill"></div></div>
        <span class="map-hint"></span>
        <span class="map-new-tag" hidden>新解锁</span>
        <span class="map-new-dot" hidden></span>
      </button>`
    ).join('');
  }

  visible.forEach((raw, i) => {
    const map = withDiffLevels(raw, gameState);
    const btn = container.children[i];
    const locked = !mapUnlocked(gameState, raw);
    const p = mapClearProgress(gameState, map);
    const isNew = !locked && !gameState.mapsEntered[map.id] && map.id !== hero.currentMap;
    btn.disabled = false;
    btn.classList.toggle('locked', locked);
    btn.classList.toggle('active', map.id === hero.currentMap);
    btn.classList.toggle('map-new', isNew);
    btn.classList.toggle('boss', !!map.isBoss);
    btn.querySelector('.map-name').textContent = map.name + (map.isBoss ? ' · Boss' : '');
    btn.querySelector('.map-lv').textContent = `Lv.${map.levelMin}–${map.levelMax}`;
    btn.querySelector('.map-prog-fill').style.width = `${locked ? 0 : p.pct}%`;
    btn.querySelector('.map-hint').textContent = locked
      ? (`未解锁 · ${mapUnlockHint(gameState, map) || '尚未开放'}`)
      : (isNew ? '可进入' : (map.isBoss && p.ready ? '首领可挑战' : `${p.have}/${p.need}`));
    const tag = btn.querySelector('.map-new-tag');
    const dot = btn.querySelector('.map-new-dot');
    if (tag) tag.hidden = !isNew;
    if (dot) dot.hidden = !isNew;
    fillMapScore(btn, map, heroGearScore(hero));
  });
}

function checkOfflineReward() {
  const rewards = calcOfflineRewards(gameState);
  const btn = document.getElementById('btn-offline');
  if (rewards && rewards.hours >= 0.1 && !gameState.offlineClaimed) btn.classList.add('glow');
  else btn.classList.remove('glow');
}

function showOfflineModal() {
  const rewards = calcOfflineRewards(gameState);
  if (!rewards || rewards.hours < 0.1) {
    showModal('离线收益', '<p>离线不足 6 分钟。</p><p class="hint">上限 12 小时：前 2h 100%，2–8h 70%，8–12h 40%。装备走自动出售后再进背包。</p>');
    return;
  }
  const itemsHtml = rewards.items.slice(0, 12).map(item => {
    const q = QUALITY[item.quality];
    return `<div class="loot-item" style="color:${q.color}">${itemDisplayName(item)} (${q.name})</div>`;
  }).join('');
  showModal('离线收益', `
    <p>离线 <strong>${rewards.hours}</strong> 小时 · 效率 ${rewards.eff}%${rewards.expPen ? ` · <span class="exp-pen">${rewards.expPen}</span>` : ''}</p>
    <div class="reward-grid">
      <div class="reward-item">经验 <strong>+${rewards.exp.toLocaleString()}</strong></div>
      <div class="reward-item">金币 <strong>+${rewards.gold.toLocaleString()}</strong></div>
      <div class="reward-item">击杀 <strong>${rewards.kills}</strong></div>
      <div class="reward-item">匣内装备 <strong>${rewards.items.length}</strong></div>
    </div>
    <div class="loot-list">${itemsHtml}</div>
    <button class="btn-primary" id="claim-offline">领取（套用自动出售）</button>
  `);
  document.getElementById('claim-offline')?.addEventListener('click', () => {
    claimOfflineRewards(gameState, rewards);
    addLog({ type: 'loot', text: `领取离线：经验 +${rewards.exp} 金币 +${rewards.gold}` });
    closeModal();
    renderAll();
  });
}

function showSkillModal(keepId) {
  const hero = getActiveHero(gameState);
  if (keepId) selSkillId = keepId;
  if (selSkillId && !SKILLS[hero.charId]?.[selSkillId]) selSkillId = null;
  hideItemTip();
  const trees = SKILL_TREES[hero.charId];
  const tags = getTagCounts(hero);
  const tagStr = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(' · ');
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combatState?.buffs || {} });
  let treesHtml = '';
  for (const tree of Object.values(trees)) {
    treesHtml += `<div class="skill-tree"><h3>${tree.name}</h3><div class="skill-icon-grid">`;
    for (const skillId of tree.skills) {
      const skill = SKILLS[hero.charId][skillId];
      const lv = hero.skillLevels[skillId] || 0;
      const parts = skillLevelParts(hero, skillId, stats);
      const granted = (parts.grant || 0) > 0;
      const preOk = !skill.prereq || (hero.skillLevels[skill.prereq] || 0) > 0 || granted;
      const lvOk = hero.level >= (skill.reqLevel || 1);
      const usable = skill.type !== 'passive';
      const on = skill.type === 'aura' && skill.auraSlot ? isAuraOn(hero, skillId) : isSkillEnabled(hero, skillId);
      const toggleLab = skill.type === 'aura' && skill.auraSlot ? (on ? '当前' : '切换') : (on ? '使用中' : '已停用');
      treesHtml += `<div type="button" class="skill-icon-cell ${lv > 0 || granted ? 'learned' : ''} ${!preOk || !lvOk ? 'locked' : ''} ${(lv > 0 || granted) && usable && !on ? 'skill-off' : ''} ${selSkillId === skillId ? 'sel-skill' : ''}" data-skill-tip="${skillId}">
        ${skillIconHtml(skill, Math.max(lv, parts.grant || 0))}
        <span class="skill-ic-name">${skill.name}</span>
        <span class="skill-ic-lv">${formatSkillLevelHtml(parts)}</span>
        ${(lv > 0 || granted) && usable ? `<button type="button" class="skill-use ${on ? 'on' : 'off'}" data-act="toggle-skill" data-uid="${skillId}">${toggleLab}</button>` : ''}
        ${canLearnSkill(hero, skillId, gameState).ok ? `<button type="button" class="skill-add" data-act="learn" data-uid="${skillId}">+</button>` : ''}
      </div>`;
    }
    treesHtml += '</div></div>';
  }
  showModal('技能', `
    <p class="skill-points-display">技能点 <strong>${hero.skillPoints || 0}</strong> · 金 ${formatCompactNum(gameState.gold)} · 水晶 ${formatCompactNum(ensureMats(gameState).crystal)}</p>
    <p class="hint">学习技能同时消耗技能点与金币/材料。高等级技能与高阶解锁更贵。</p>
    <p class="hint">标签共鸣：${tagStr || '无'}（4/6/8 层激活）</p>
    <p class="hint">弓弩技能需装备弓/弩，标枪技能需装备标枪。额外等级（如战斗命令）显示为 1+3。</p>
    <p class="hint">圣骑士进攻/防守光环各只能启用一道，点「切换」更换。主动 / 光环 / 增益可开关。终结技在资源足够时优先释放。</p>
    <div class="skill-modal-layout">
      <div class="skill-modal-trees">${treesHtml}</div>
      <aside class="skill-inspect" id="skill-inspect">${selSkillId ? skillInspectHtml(selSkillId) : '<p class="hint">悬停或点击左侧技能查看说明，可连续点 + 加点。</p>'}</aside>
    </div>
  `, true);
}

function affixTierColor(tier) {
  if (tier <= 2) return '#ff7a6a';
  if (tier <= 5) return '#ffb040';
  if (tier <= 9) return '#ffe45a';
  if (tier <= 12) return '#8ec8ff';
  return '#a8a090';
}

function formatAffixLine(a, qColor, exclusive = false, delta = null) {
  const suffix = a.suffix || '';
  const def = findAffixDef(a);
  const tier = a.tier || (def ? affixTierFromValue(def, a.value) : affixTier(a.value, a.min ?? a.value, a.max ?? a.value));
  return `<div class="affix-line ${exclusive ? 'ex-affix' : ''}" style="color:${exclusive ? '#ffb040' : qColor}">
    <span>${exclusive ? '专属 · ' : ''}+${a.value}${suffix} ${a.name || a.stat}</span>
    <span class="affix-tier" style="color:${affixTierColor(tier)}">T${tier}</span>
    ${delta != null ? deltaSpan(delta, suffix) : ''}
  </div>`;
}

function itemLine(item, opts = {}) {
  const q = QUALITY[item.quality] || QUALITY.normal;
  const vs = opts.vs || null;
  const affixHtml = (item.affixes || []).map(a => formatAffixLine(shownAffix(item, a), q.color, false, vs ? affixValueDelta(item, a, vs) : null)).join('')
    + (item.exclusiveAffix ? formatAffixLine(shownAffix(item, item.exclusiveAffix), q.color, true, vs ? affixValueDelta(item, item.exclusiveAffix, vs) : null) : '');
  const morph = item.morphId ? MORPHS[item.morphId] : null;
  const morphStr = morph ? `<div class="morph-line">性态·${morph.name}：${morph.desc}${item.morphSkill ? `（${item.morphSkill}）` : ''}</div>` : '';
  let setStr = '';
  if (item.setId && SETS[item.setId]) {
    const def = SETS[item.setId];
    const hero = opts.hero || getActiveHero(gameState);
    const n = countSetOn(hero?.equipment, item.setId);
    setStr = opts.setDetails
      ? `<div class="set-bonus">${def.name}（${n}/${def.pieceCount}）</div>${setBonusTiersHtml(def, n)}`
      : setNameHoverHtml(def, n);
  }
  return { q, affixHtml, morphStr, setStr };
}

function showCharacterModal() {
  const progress = getUnlockProgress(gameState);
  const hero = getActiveHero(gameState);
  let html = `<div class="stats-detail">
    <div>${CHARACTERS[hero.charId].name} Lv.${hero.level} · 总评分 ${formatCompactNum(heroGearScore(hero))} · DPS ${calcDPS(hero).toLocaleString()} · EHP ${calcEHP(hero).toLocaleString()}</div>
    <div>召唤物 ${(() => { const r = getSummonRoster(hero); const m = r.filter(s => s.role === 'melee').length; const n = r.filter(s => s.role === 'ranged').length; return `${r.length}（近战 ${m} · 远程 ${n}）`; })()} · 技能点 ${hero.skillPoints || 0}</div>
  </div><div class="char-list">`;
  for (const [id, char] of Object.entries(CHARACTERS)) {
    const unlocked = gameState.unlockedChars.includes(id);
    const active = gameState.activeCharId === id;
    const h = gameState.heroes[id];
    let unlockText = '初始';
    if (char.unlock?.boss) {
      const b = BOSSES[char.unlock.boss];
      unlockText = progress[char.unlock.boss] ? '已解锁' : `击败 ${b.name}`;
    }
    html += `<div class="char-card ${unlocked ? '' : 'locked'} ${active ? 'active' : ''}">
      <div class="char-icon">${char.icon}</div>
      <div class="char-info">
        <div class="char-name">${char.name}</div>
        <div class="char-desc">${char.desc}</div>
        ${unlocked ? `<div class="char-lv">Lv.${h?.level || 1} · ${formatCompactNum(heroGearScore(h))}</div>` : `<div class="char-unlock">${unlockText}</div>`}
      </div>
      ${unlocked && !active ? `<button class="btn-small btn-switch" data-char="${id}">出战</button>` : ''}
    </div>`;
  }
  html += '</div>';
  showModal('切换角色', html);
  document.querySelectorAll('.btn-switch').forEach(btn => {
    btn.addEventListener('click', () => {
      gameState.activeCharId = btn.dataset.char;
      const nh = getActiveHero(gameState);
      nh.currentHp = calcHeroStats(nh).maxHp;
      clampHeroResource(nh);
      selSlot = 'weapon';
      selInvUid = null;
      lastCampSig = '';
      closeModal();
      onUpdate?.();
        renderAll();
    });
  });
}

function showShopModal() {
  const hero = getActiveHero(gameState);
  showModal('商店', shopPanelHtml(hero));
  bindShopPanel(showShopModal);
}

function potionShopCardsHtml() {
  ensurePotionState(gameState);
  const hpTier = potionTierDef(gameState, 'hp');
  const manaTier = potionTierDef(gameState, 'mana');
  const a = gameState.potionAuto;
  const hall = getHallLevel(gameState);
  const autoBtn = (id, on, label) =>
    `<button type="button" class="btn-small ${on ? 'on' : ''}" id="${id}">${label}${on ? ' · 开' : ' · 关'}</button>`;
  const upCard = (kind, tier, title) => {
    const maxed = (gameState[potionKindKey(kind)] || 1) >= POTION_TIERS.length;
    const block = potionUpgradeBlocked(gameState, kind);
    const cost = maxed ? null : potionUpgradeCost(gameState, kind);
    const pct = kind === 'mana' ? Math.round(tier.manaPct * 100) : Math.round(tier.healPct * 100);
    return `<div class="inv-item">
      <div class="inv-item-header"><span>${title} ${tier.lv}/${POTION_TIERS.length} · ${tier.name}</span><span>${maxed ? '已满级' : `议事厅 ${hall} 级`}</span></div>
      <div class="inv-affixes">恢复 ${pct}%${kind === 'mana' ? ' 最大魔法' : ' 最大生命'}。升级消耗随等级成长，且受议事厅等级限制。</div>
      ${maxed
        ? '<p class="hint">已满级</p>'
        : (block && block !== '药水已达最高级'
          ? `<p class="hall-gate-note">${block}</p>`
          : payActionHtml(kind === 'mana' ? 'potion-up-mana' : 'potion-up-hp', '', `升级${title}`, cost))}
    </div>`;
  };
  const hpPack = hpTier.unitCost * POTION_PACK;
  const manaPack = manaTier.unitCost * POTION_PACK;
  return `
    <p class="hint">生命药与魔力药分别升级。库存生命药 ${gameState.hpPotions || 0} · 魔力药 ${gameState.manaPotions || 0}</p>
    ${upCard('hp', hpTier, '生命药水')}
    ${upCard('mana', manaTier, '魔力药水')}
    <div class="inv-item">
      <div class="inv-item-header"><span>${hpTier.name}生命药水 ×${POTION_PACK}</span><span>${hpPack} 金</span></div>
      <div class="inv-affixes">恢复 ${Math.round(hpTier.healPct * 100)}% 生命 · 自动维持 ${a.keepHp} 瓶</div>
      <div class="potion-actions">
        <button class="btn-small" id="shop-pots">购买</button>
        ${autoBtn('auto-buy-hp', a.buyHp, '自动购买')}
        ${autoBtn('auto-use-hp', a.useHp, '自动使用')}
      </div>
    </div>
    <div class="inv-item">
      <div class="inv-item-header"><span>${manaTier.name}魔力药水 ×${POTION_PACK}</span><span>${manaPack} 金</span></div>
      <div class="inv-affixes">恢复 ${Math.round(manaTier.manaPct * 100)}% 魔法（仅魔法职业自动购买）· 自动维持 ${a.keepMana} 瓶</div>
      <div class="potion-actions">
        <button class="btn-small" id="shop-mana-pots">购买</button>
        ${autoBtn('auto-buy-mana', a.buyMana, '自动购买')}
        ${autoBtn('auto-use-mana', a.useMana, '自动使用')}
      </div>
    </div>
  `;
}

function shopPanelHtml(hero) {
  const resetCost = skillResetCost(hero);
  const mats = ensureMats(gameState);
  return `
    <p class="hint">金币 ${formatCompactNum(gameState.gold)} · 金属 ${formatCompactNum(mats.metal)} · 布料 ${formatCompactNum(mats.cloth)} · 水晶 ${formatCompactNum(mats.crystal)}</p>
    ${potionShopCardsHtml()}
    <div class="inv-item">
      <div class="inv-item-header"><span>重置技能点</span><span>${resetCost} 金</span></div>
      <div class="inv-affixes">返还已投入点数，保留开局基础技能。永久属性请去训练场。</div>
      <button class="btn-small" id="shop-reset">购买</button>
    </div>
  `;
}

function bindShopPanel(afterBuy) {
  const buy = (fn, okText) => {
    const r = fn();
    if (!r.ok) {
      addLog({ type: 'info', text: r.reason || '无法购买' });
      return;
    }
    addLog({ type: 'loot', text: okText });
    afterBuy?.();
    renderAll();
  };
  document.getElementById('shop-pots')?.addEventListener('click', () => buy(() => buyPotions(gameState, POTION_PACK, 'hp'), `购入${potionTierDef(gameState, 'hp').name}生命药水 ×${POTION_PACK}`));
  document.getElementById('shop-mana-pots')?.addEventListener('click', () => buy(() => buyPotions(gameState, POTION_PACK, 'mana'), `购入${potionTierDef(gameState, 'mana').name}魔力药水 ×${POTION_PACK}`));
  const toggle = (id, key) => {
    document.getElementById(id)?.addEventListener('click', () => {
      togglePotionAuto(gameState, key);
      afterBuy?.();
      renderAll();
    });
  };
  toggle('auto-buy-hp', 'buyHp');
  toggle('auto-use-hp', 'useHp');
  toggle('auto-buy-mana', 'buyMana');
  toggle('auto-use-mana', 'useMana');
  document.getElementById('shop-reset')?.addEventListener('click', () => buy(() => buySkillReset(gameState), '技能已重置'));
}

function syncTownButton() {
  const btn = document.getElementById('btn-shop');
  if (!btn || !gameState) return;
}

function openTown() {
  if (!townUnlocked(gameState)) return;
  townOpen = true;
  townBuilding = townBuilding || 'hall';
  document.getElementById('town-overlay')?.classList.add('open');
  renderTown();
}

function closeTown() {
  townOpen = false;
  selTownUid = null;
  selTownUids = new Set();
  document.getElementById('town-overlay')?.classList.remove('open');
}

function notifyTownUnlock() {
  syncTownButton();
  showModal('据点开放', '<p>血沼已经肃清。荒村据点可用：仓库、铁匠、商会。左上「据点」可进入。战斗不会暂停。</p>');
}

function townList() {
  const town = ensureTown(gameState);
  return townInvTab === 'ware' ? (town.warehouse || []) : (gameState.inventory || []);
}

function pickTownItem(uid, e) {
  const list = townList();
  if (e.shiftKey && lastTownClickUid) {
    townMultiMode = true;
    const a = list.findIndex(i => i.uid === lastTownClickUid);
    const b = list.findIndex(i => i.uid === uid);
    if (a >= 0 && b >= 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) selTownUids.add(list[i].uid);
    } else selTownUids.add(uid);
  } else if (e.metaKey || e.ctrlKey || townMultiMode) {
    if (selTownUids.has(uid)) selTownUids.delete(uid);
    else selTownUids.add(uid);
  } else {
    selTownUids = new Set([uid]);
  }
  lastTownClickUid = uid;
  selTownUid = selTownUids.has(uid) ? uid : ([...selTownUids][0] || null);
}

function runBulkTown(mode) {
  const pool = [...(ensureTown(gameState).warehouse || []), ...(gameState.inventory || [])];
  const items = pool.filter(i => selTownUids.has(i.uid));
  const verb = mode === 'salvage' ? '分解' : '出售';
  if (!items.length) return;
  if (!confirmValuableDispose(items, verb)) return;
  const r = bulkDisposeLoose(gameState, [...selTownUids], mode);
  if (!r.n) {
    addLog({ type: 'info', text: r.skipped ? '选中装备已锁定' : '没有可处理的装备' });
    return;
  }
  const extra = r.skipped ? `（跳过锁定 ${r.skipped}）` : '';
  addLog({
    type: 'loot',
    text: mode === 'salvage'
      ? formatSalvageLog(`分解 ${r.n} 件`, r) + extra
      : `出售 ${r.n} 件 +${r.gold}金${extra}`,
  });
  selTownUids = new Set();
  selTownUid = null;
}

function townBulkBarHtml() {
  const n = selTownUids.size;
  const pool = [...(ensureTown(gameState).warehouse || []), ...(gameState.inventory || [])];
  const items = pool.filter(i => selTownUids.has(i.uid) && !i.locked);
  const gold = items.reduce((s, it) => s + sellValue(it), 0);
  return `<div class="bulk-bar">
    <button type="button" class="btn-small ${townMultiMode ? 'on' : ''}" data-act="town-multi">多选</button>
    <span>已选 ${n}</span>
    <button type="button" class="btn-small" data-act="town-page">全选本页</button>
    <button type="button" class="btn-small" data-act="town-clear">取消</button>
    <button type="button" class="btn-small" data-act="town-sell" ${items.length ? '' : 'disabled'}>出售 ${formatCompactNum(gold)}金</button>
    <button type="button" class="btn-small" data-act="town-salvage" ${items.length ? '' : 'disabled'}>${salvageBtnText(items)}</button>
    </div>`;
  }

function onTownClick(e) {
  if (e.target.closest('#town-close')) return;
  const bldg = e.target.closest('[data-town-bldg]');
  if (bldg) {
    townBuilding = bldg.dataset.townBldg;
    selTownUid = null;
    selTownUids = new Set();
    townPage = 0;
    renderTown();
    return;
  }
  const tab = e.target.closest('[data-town-tab]');
  if (tab) {
    townInvTab = tab.dataset.townTab;
    townPage = 0;
    renderTown();
    return;
  }
  const pager = e.target.closest('[data-town-page]');
  if (pager) {
    townPage = Math.max(0, townPage + (pager.dataset.townPage === 'prev' ? -1 : 1));
    renderTown();
    return;
  }
  const cell = e.target.closest('[data-wh], [data-inv]');
  if (cell && !e.target.closest('[data-act]')) {
    const uid = cell.dataset.wh || cell.dataset.inv;
    pickTownItem(uid, e);
    renderTown();
    tipPinned = true;
    if (uid) {
      const again = document.querySelector(
        `[data-wh="${CSS.escape(uid)}"], #town-overlay [data-inv="${CSS.escape(uid)}"]`
      );
      if (again) showPeekTip(again, true);
    }
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const uid = btn.dataset.uid;
  if (act === 'town-multi') {
    townMultiMode = !townMultiMode;
    if (!townMultiMode && selTownUids.size > 1) {
      const keep = selTownUid && selTownUids.has(selTownUid) ? selTownUid : [...selTownUids][0];
      selTownUids = keep ? new Set([keep]) : new Set();
      selTownUid = keep || null;
    }
  } else if (act === 'town-page') {
    townMultiMode = true;
    const start = townPage * INV_PAGE;
    townList().slice(start, start + INV_PAGE).forEach(i => selTownUids.add(i.uid));
    if (!selTownUid && selTownUids.size) selTownUid = [...selTownUids][0];
  } else if (act === 'town-clear') {
    selTownUids = new Set();
    selTownUid = null;
  } else if (act === 'town-sell') {
    runBulkTown('sell');
  } else if (act === 'town-salvage') {
    runBulkTown('salvage');
  } else if (act === 'withdraw') {
    const r = withdrawFromWarehouse(gameState, uid);
    if (!r.ok) addLog({ type: 'info', text: r.reason });
    else {
      addLog({ type: 'loot', text: `取出 ${itemDisplayName(r.item)}` });
      selTownUid = r.item.uid;
      townInvTab = 'bag';
    }
  } else if (act === 'stash') {
    const r = stashToWarehouse(gameState, uid);
    if (!r.ok) addLog({ type: 'info', text: r.reason });
    else {
      addLog({ type: 'loot', text: `存入仓库 ${itemDisplayName(r.item)}` });
      selTownUid = r.item.uid;
      townInvTab = 'ware';
    }
  } else if (act === 'wh-sell') {
    const owned = findOwnedItem(gameState, uid);
    if (!owned || owned.locked) return;
    const it = takeOwnedLooseItem(gameState, uid);
    if (!it) return;
    const gold = sellValue(it);
    gameState.gold += gold;
    addLog({ type: 'loot', text: `出售 ${it.name} +${gold}` });
    selTownUid = null;
  } else if (act === 'wh-salvage') {
    const owned = findOwnedItem(gameState, uid);
    if (!owned || owned.locked) return;
    const it = takeOwnedLooseItem(gameState, uid);
    if (!it) return;
    const r = salvageItem(gameState, it);
    addLog({ type: 'loot', text: formatSalvageLog(`分解 ${it.name}`, r) });
    selTownUid = null;
  } else if (act === 'enhance') {
    const it = findOwnedItem(gameState, uid);
    const r = enhanceItem(gameState, it);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '强化') });
    else addLog({ type: 'loot', text: `强化 ${it.name} +${r.enhance}/10（+${Math.round(r.bonus * 100)}%）` });
  } else if (act === 'train-unlock') {
    const r = unlockTrainStat(gameState, uid);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '解锁') });
    else addLog({ type: 'loot', text: `解锁训练：${TRAIN_DEFS.find(d => d.id === uid)?.name || uid}` });
  } else if (act === 'train-up') {
    const r = upgradeTrainStat(gameState, uid);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '升级') });
    else addLog({ type: 'loot', text: `训练 ${TRAIN_DEFS.find(d => d.id === uid)?.name || uid} 至 ${r.lv} 级` });
  } else if (act === 'hall-up') {
    const r = upgradeHall(gameState);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '升级') });
    else addLog({ type: 'loot', text: `议事厅升至 ${r.lv} 级` });
  } else if (act === 'potion-up-hp' || act === 'potion-up-mana') {
    const kind = act === 'potion-up-mana' ? 'mana' : 'hp';
    const r = upgradePotionTier(gameState, kind);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '升级') });
    else addLog({ type: 'loot', text: `${kind === 'mana' ? '魔力' : '生命'}药水升至 ${r.tier.name}（${r.tier.lv} 级）` });
  } else if (act === 'wh-lock') {
    const it = findOwnedItem(gameState, uid);
    if (it) it.locked = !it.locked;
  } else if (act === 'reroll') {
    const it = findOwnedItem(gameState, uid);
    const r = rerollItemAffix(gameState, it);
    if (!r.ok) addLog({ type: 'info', text: failActText(r.reason, '洗练') });
    else {
      addLog({
        type: 'loot',
        text: `洗练 ${it.name}：${r.prev.name} T${r.prev.tier} → ${r.next.name} T${r.next.tier}`,
      });
    }
  } else return;
  renderTown();
  lastCampSig = '';
  renderAll();
}

function townGridHtml(items, cap, dataAttr) {
  const pages = Math.max(1, Math.ceil(Math.max(items.length, 1) / INV_PAGE));
  if (townPage >= pages) townPage = pages - 1;
  const start = townPage * INV_PAGE;
  const pageItems = items.slice(start, start + INV_PAGE);
  const cells = [];
  for (let i = 0; i < INV_PAGE; i++) {
    const item = pageItems[i];
    if (!item) {
      cells.push('<div class="inv-cell empty-cell"></div>');
      continue;
    }
    const sel = selTownUid === item.uid ? 'sel' : '';
    const picked = selTownUids.has(item.uid) ? 'picked' : '';
    cells.push(`<button type="button" class="inv-cell ${sel} ${picked}" ${dataAttr}="${item.uid}">${itemIconHtml(item)}</button>`);
  }
  return `
    <div class="inv-pager">
      <button type="button" class="btn-small" data-town-page="prev">上一页</button>
      <span>${townPage + 1}/${pages} · ${items.length}/${cap}</span>
      <button type="button" class="btn-small" data-town-page="next">下一页</button>
    </div>
    <div class="inv-grid town-inv">${cells.join('')}</div>
  `;
}

function townTabsHtml(town) {
  const w = (town.warehouse || []).length;
  const b = (gameState.inventory || []).length;
  return `<div class="town-tabs">
    <button type="button" class="town-tab ${townInvTab === 'ware' ? 'on' : ''}" data-town-tab="ware">仓库 ${w}/${getWarehouseCap(gameState)}</button>
    <button type="button" class="town-tab ${townInvTab === 'bag' ? 'on' : ''}" data-town-tab="bag">背包 ${b}/${getInvCap(gameState)}</button>
  </div>`;
}

function townInvPanel(town) {
  const ware = townInvTab === 'ware';
  const items = ware ? (town.warehouse || []) : (gameState.inventory || []);
  const cap = ware ? getWarehouseCap(gameState) : getInvCap(gameState);
  return `${townTabsHtml(town)}${townBulkBarHtml()}${townGridHtml(items, cap, ware ? 'data-wh' : 'data-inv')}`;
}

function townItemActions(item, fromWare) {
  const picked = [...(ensureTown(gameState).warehouse || []), ...(gameState.inventory || [])]
    .filter(i => selTownUids.has(i.uid));
  if (picked.length > 1) {
    const free = picked.filter(i => !i.locked);
    const gold = free.reduce((s, it) => s + sellValue(it), 0);
    return `<p class="hint">已选 ${picked.length} 件（锁 ${picked.length - free.length}）。锁定的不会被出售/分解。</p>
      <div class="inspect-actions">
        <button type="button" class="btn-small" data-act="town-sell" ${free.length ? '' : 'disabled'}>出售 ${formatCompactNum(gold)}金</button>
        <button type="button" class="btn-small" data-act="town-salvage" ${free.length ? '' : 'disabled'}>${salvageBtnText(free)}</button>
      </div>`;
  }
  if (!item) return '<p class="hint">点格子选装备。多选后可批量出售或分解。</p>';
  const hero = getActiveHero(gameState);
  return `
    <div class="inspect-actions">
      ${fromWare
        ? `<button type="button" class="btn-small" data-act="withdraw" data-uid="${item.uid}">取出到背包</button>`
        : `<button type="button" class="btn-small" data-act="stash" data-uid="${item.uid}">存入仓库</button>`}
      <button type="button" class="btn-small" data-act="wh-lock" data-uid="${item.uid}">${item.locked ? '解锁' : '锁定'}</button>
      <button type="button" class="btn-small" data-act="wh-sell" data-uid="${item.uid}">出售 ${formatCompactNum(sellValue(item))}金</button>
      <button type="button" class="btn-small" data-act="wh-salvage" data-uid="${item.uid}">分解</button>
      ${rerollBtnHtml(item)}
      ${enhanceBtnHtml(item)}
    </div>
    ${itemCardHtml(item, fromWare ? '仓库' : '背包', { hero, compact: true })}
  `;
}

function renderTown() {
  const overlay = document.getElementById('town-overlay');
  const nav = document.getElementById('town-nav');
  const room = document.getElementById('town-room');
  if (!overlay || !nav || !room || !townOpen) return;
  overlay.classList.add('open');
  const hero = getActiveHero(gameState);
  nav.innerHTML = TOWN_BUILDINGS.map(b =>
    `<button type="button" class="town-pin ${townBuilding === b.id ? 'on' : ''}" data-town-bldg="${b.id}" style="left:${b.x}%;top:${b.y}%">
      <span class="town-bldg-name">${b.name}</span>
      <span class="town-bldg-blurb">${b.blurb}</span>
    </button>`
  ).join('');
  const bdef = TOWN_BUILDINGS.find(b => b.id === townBuilding);
  const title = document.getElementById('town-title');
  if (title) title.textContent = bdef ? `荒村据点 · ${bdef.name}` : '荒村据点';
  const town = ensureTown(gameState);
  let body = '';
  if (townBuilding === 'hall') {
    const mats = ensureMats(gameState);
    const hall = getHallLevel(gameState);
    const openAct = highestOpenAct(gameState);
    const actNames = { 1: '一章', 2: '二章', 3: '三章', 4: '四章', 5: '五章', 6: '秘境' };
    const unlocks = TRAIN_DEFS.map(d => {
      const ok = hall >= d.hall;
      return `<div class="reward-item">Lv.${d.hall} ${d.name} <strong class="${ok ? '' : 'hall-gate'}">${ok ? '可解锁' : '议事厅条件不满足'}</strong></div>`;
    }).join('');
    const hallCost = hall < HALL_MAX ? hallUpgradeCost(hall) : null;
    const hallBlock = hallUpgradeBlocked(gameState);
    body = `<h3>议事厅 ${hall}/${HALL_MAX}</h3>
      <p>议事厅随章节解锁。当前可挑战至${actNames[openAct] || openAct}。升级消耗按等级成长，药水升级也受议事厅限制。</p>
      <div class="reward-grid">
        <div class="reward-item">金币 <strong title="${gameState.gold.toLocaleString()}">${formatCompactNum(gameState.gold)}</strong></div>
        <div class="reward-item">金属 <strong title="${mats.metal.toLocaleString()}">${formatCompactNum(mats.metal)}</strong></div>
        <div class="reward-item">布料 <strong title="${mats.cloth.toLocaleString()}">${formatCompactNum(mats.cloth)}</strong></div>
        <div class="reward-item">水晶 <strong title="${mats.crystal.toLocaleString()}">${formatCompactNum(mats.crystal)}</strong></div>
        <div class="reward-item">生命药 <strong>${gameState.hpPotions || 0}</strong></div>
        <div class="reward-item">魔力药 <strong>${gameState.manaPotions || 0}</strong></div>
        <div class="reward-item">仓库 <strong>${town.warehouse.length}/${getWarehouseCap(gameState)}</strong></div>
      </div>
      <h3>训练解锁</h3>
      <div class="reward-grid">${unlocks}</div>
      ${hallCost && !hallBlock
        ? payActionHtml('hall-up', '', `升级议事厅至 ${hall + 1} 级`, hallCost)
        : `<p class="hint">${hallBlock || '议事厅已满级。'}</p>`}`;
  } else if (townBuilding === 'warehouse') {
    const item = (town.warehouse || []).find(i => i.uid === selTownUid)
      || (gameState.inventory || []).find(i => i.uid === selTownUid);
    const fromWare = !!(town.warehouse || []).find(i => i.uid === selTownUid);
    body = `<div class="town-work">
      <p class="hint">跨职业存放。背包满时可卸装进仓库。</p>
      ${townInvPanel(town)}
      <div class="town-dock">${townItemActions(item, fromWare)}</div>
    </div>`;
  } else if (townBuilding === 'smith') {
    const item = findOwnedItem(gameState, selTownUid);
    const fromWare = !!(town.warehouse || []).find(i => i.uid === selTownUid);
    body = `<div class="town-work">
      <p class="hint">强化（稀有及以上）：武器/副手耗金属，防具耗布料，饰品耗水晶。普通/魔法无法强化。</p>
      ${townInvPanel(town)}
      <div class="town-dock">${townItemActions(item, fromWare)}</div>
    </div>`;
  } else if (townBuilding === 'market') {
    body = `<h3>商会</h3>${shopPanelHtml(hero)}`;
  } else if (townBuilding === 'clinic') {
    body = `<h3>药房</h3>
      <p>升级药水等级、维持库存，战斗中自动购买与饮用。怒气/能量职业不会自动买魔力药水。</p>
      ${potionShopCardsHtml()}`;
  } else if (townBuilding === 'yard') {
    body = trainPanelHtml(hero);
  } else if (townBuilding === 'shrine') {
    body = `<h3>神龛</h3><p>祭坛尚未完工。用金属/布料/水晶换取抗性与生命将在后续开放。</p>`;
  }
  room.innerHTML = body;
  if (townBuilding === 'market' || townBuilding === 'smith' || townBuilding === 'clinic') {
    bindShopPanel(() => renderTown());
  }
}

function showModal(title, content, wide) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.querySelector('.modal-content')?.classList.toggle('wide', !!wide);
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function addLog(entry) {
  if (!combatState) return;
  combatState.log.push(entry);
  if (combatState.log.length > 60) combatState.log.shift();
  if (entry.type === 'loot' || entry.type === 'level') lastCampSig = '';
}

function showBossReward(reward) {
  let msg = '章节首领首通';
  if (reward.act) msg += `<br>第 ${reward.act} 章已通关`;
  if (reward.nextAct) msg += `<br>解锁第 ${reward.nextAct} 章地图`;
  if (reward.unlockChars?.length) {
    msg += `<br>解锁职业：${reward.unlockChars.map(id => CHARACTERS[id].name).join('、')}`;
  }
  if (reward.loot) msg += `<br>掉落 ${reward.loot.name}`;
  showModal('Boss 击破', msg);
}

window.initUI = initUI;
window.setCombatState = setCombatState;
window.renderAll = renderAll;
window.addLog = addLog;
window.showBossReward = showBossReward;
window.notifyTownUnlock = notifyTownUnlock;
})();
