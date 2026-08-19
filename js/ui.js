import {
  CHARACTERS, SKILLS, SKILL_TREES, MAPS, BOSSES, QUALITY, SETS, SLOTS, SLOT_NAMES,
  expForLevel, MORPHS,
} from './data.js';
import {
  calcHeroStats, calcDPS, calcEHP, estimateBossWinRate, killsPerMinute, expPerHour,
  getTagCounts, synergyMult, getEquippedMorphs,
} from './combat.js';
import {
  getActiveHero, getCurrentMap, allocateSkillPoint, equipItem, compareDPS,
  calcOfflineRewards, claimOfflineRewards, getUnlockProgress, mapUnlocked,
  sortInventory, sellValue, KILLS_FOR_BOSS, INV_CAP,
} from './game.js';
import { IsoField } from './iso.js';

let gameState = null;
let combatState = null;
let onUpdate = null;
export let isoField = null;

export function initUI(state, updateCallback) {
  gameState = state;
  onUpdate = updateCallback;
  const canvas = document.getElementById('iso-canvas');
  isoField = new IsoField(canvas);
  isoField.resize();
  bindEvents();
  renderAll();
}

export function setCombatState(cs) {
  combatState = cs;
}

export function renderAll() {
  if (!gameState) return;
  renderHeader();
  renderHeroPanel();
  renderCombatHud();
  renderStatsPanel();
  renderLog();
  renderMapSelect();
  checkOfflineReward();
}

function bindEvents() {
  document.getElementById('btn-offline')?.addEventListener('click', showOfflineModal);
  document.getElementById('btn-skills')?.addEventListener('click', showSkillModal);
  document.getElementById('btn-inventory')?.addEventListener('click', showInventoryModal);
  document.getElementById('btn-equipment')?.addEventListener('click', showEquipmentModal);
  document.getElementById('btn-characters')?.addEventListener('click', showCharacterModal);
  document.getElementById('btn-autosell')?.addEventListener('click', showAutoSellModal);
  document.querySelector('.modal-overlay')?.addEventListener('click', () => closeModal());
  document.getElementById('map-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.map-btn');
    if (!btn || btn.disabled) return;
    const hero = getActiveHero(gameState);
    hero.currentMap = btn.dataset.map;
    if (combatState) {
      combatState.killCount = 0;
      combatState.monster = null;
      combatState.spawnTimer = 0.2;
    }
    renderAll();
  });
}

function renderHeader() {
  const hero = getActiveHero(gameState);
  const charDef = CHARACTERS[hero.charId];
  document.getElementById('hero-name').textContent = `${charDef.name}  Lv.${hero.level}`;
  document.getElementById('gold-amount').textContent = gameState.gold.toLocaleString();
  const expForLv = expForLevel(hero.level);
  const pct = Math.floor(hero.exp / expForLv * 100);
  document.getElementById('exp-bar').style.width = `${pct}%`;
  document.getElementById('exp-text').textContent = `经验 ${hero.exp.toLocaleString()} / ${expForLv.toLocaleString()}`;
}

function renderHeroPanel() {
  const hero = getActiveHero(gameState);
  const stats = calcHeroStats(hero);
  const map = getCurrentMap(hero);
  document.getElementById('hero-hp-bar').style.width = `${Math.max(0, hero.currentHp / stats.maxHp * 100)}%`;
  document.getElementById('hero-hp-text').textContent = `${Math.floor(Math.max(0, hero.currentHp))} / ${stats.maxHp}`;
  document.getElementById('equip-slots').innerHTML = SLOTS.map(slot => {
    const item = hero.equipment[slot];
    const qColor = item ? QUALITY[item.quality]?.color : '#333';
    return `<div class="equip-slot" title="${SLOT_NAMES[slot]}">
      <span class="slot-label">${SLOT_NAMES[slot]}</span>
      ${item ? `<span class="item-name" style="color:${qColor}">${item.name}</span>` : '<span class="empty">空</span>'}
    </div>`;
  }).join('');
  document.getElementById('current-map-name').textContent = map.name;
  document.getElementById('map-level-range').textContent = `Lv.${map.levelMin}–${map.levelMax} · Act ${map.act}`;
  if (hero.isDead) {
    document.getElementById('hero-status').textContent = `复活 ${Math.ceil(hero.respawnTimer)}s`;
    document.getElementById('hero-status').className = 'status dead';
  } else {
    document.getElementById('hero-status').textContent = '自动战斗';
    document.getElementById('hero-status').className = 'status fighting';
  }
}

function renderCombatHud() {
  const m = combatState?.monster;
  const bar = document.getElementById('monster-hp-bar');
  const name = document.getElementById('monster-name');
  const hpText = document.getElementById('monster-hp-text');
  const kindEl = document.getElementById('monster-kind');
  if (!m) {
    name.textContent = '搜寻目标…';
    bar.style.width = '0%';
    hpText.textContent = '—';
    kindEl.textContent = '';
  } else {
    name.textContent = `${m.name}  Lv.${m.level}`;
    bar.style.width = `${m.hp / m.maxHp * 100}%`;
    hpText.textContent = `${Math.floor(m.hp)} / ${m.maxHp}`;
    const kn = { normal: '普通', elite: '精英', rare: '稀有', rareBoss: '稀有 Boss', actBoss: '章节 Boss', boss: 'Boss' }[m.kind] || '';
    kindEl.textContent = kn;
    kindEl.style.color = QUALITY[m.kind === 'rare' ? 'rare' : m.kind === 'elite' ? 'magic' : 'normal']?.color || '#c8c0b0';
    if (m.isBoss) {
      const rate = estimateBossWinRate(getActiveHero(gameState), m);
      document.getElementById('boss-winrate').textContent = `预计通过率 ${rate}%`;
      document.getElementById('boss-winrate').style.display = 'block';
    } else {
      document.getElementById('boss-winrate').style.display = 'none';
    }
  }
  document.getElementById('kill-counter').textContent = `击杀 ${combatState?.killCount || 0} / ${KILLS_FOR_BOSS} 触发巡游 Boss`;
  document.getElementById('inv-count').textContent = `${gameState.inventory.length}/${INV_CAP}`;
}

function renderStatsPanel() {
  const hero = getActiveHero(gameState);
  const map = getCurrentMap(hero);
  document.getElementById('stat-dps').textContent = calcDPS(hero).toLocaleString();
  document.getElementById('stat-ehp').textContent = calcEHP(hero, (map.levelMin + map.levelMax) / 2).toLocaleString();
  document.getElementById('stat-kpm').textContent = killsPerMinute(hero, map);
  document.getElementById('stat-eph').textContent = expPerHour(hero, map).toLocaleString();
  document.getElementById('stat-combo').textContent = hero.combo || 0;
  document.getElementById('skill-points').textContent = hero.skillPoints || 0;
}

function renderLog() {
  const logEl = document.getElementById('combat-log');
  if (!combatState?.log?.length) return;
  logEl.innerHTML = combatState.log.slice(-24).reverse().map(entry => {
    return `<div class="log-entry ${entry.type}">${entry.text}</div>`;
  }).join('');
}

function renderMapSelect() {
  const hero = getActiveHero(gameState);
  const container = document.getElementById('map-list');
  container.innerHTML = MAPS.map(map => {
    const locked = !mapUnlocked(gameState, map);
    const active = map.id === hero.currentMap ? 'active' : '';
    return `<button class="map-btn ${active} ${locked ? 'locked' : ''}" data-map="${map.id}" ${locked ? 'disabled' : ''}>
      ${map.name}${map.isBoss ? ' · Boss' : ''}<span class="map-lv">A${map.act} Lv.${map.levelMin}–${map.levelMax}</span>
    </button>`;
  }).join('');
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
    return `<div class="loot-item" style="color:${q.color}">${item.name} (${q.name})</div>`;
  }).join('');
  showModal('离线收益', `
    <p>离线 <strong>${rewards.hours}</strong> 小时 · 效率 ${rewards.eff}%</p>
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

function showSkillModal() {
  const hero = getActiveHero(gameState);
  const trees = SKILL_TREES[hero.charId];
  const tags = getTagCounts(hero);
  const tagStr = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(' · ');
  let html = `<p class="skill-points-display">技能点 <strong>${hero.skillPoints || 0}</strong></p>
    <p class="hint">标签共鸣：${tagStr || '无'}（4/6/8 层激活）</p>
    <p class="hint">联动按投入点数计算，不必装备到循环。挂机栏：${(hero.equippedSkills || []).map(id => SKILLS[hero.charId][id]?.name).join('、')}</p>`;
  for (const tree of Object.values(trees)) {
    html += `<div class="skill-tree"><h3>${tree.name}</h3><div class="skill-list">`;
    for (const skillId of tree.skills) {
      const skill = SKILLS[hero.charId][skillId];
      const lv = hero.skillLevels[skillId] || 0;
      const canLearn = (hero.skillPoints || 0) > 0 && lv < skill.maxLevel &&
        (!skill.prereq || (hero.skillLevels[skill.prereq] || 0) > 0);
      const locked = skill.prereq && !(hero.skillLevels[skill.prereq] || 0);
      const syn = synergyMult(hero, skill);
      const synTxt = syn > 1.01 ? `联动 ×${syn.toFixed(2)}` : '';
      html += `<div class="skill-item ${locked ? 'locked' : ''} ${lv > 0 ? 'learned' : ''}">
        <div class="skill-header">
          <span class="skill-name">${skill.name}</span>
          <span class="skill-lv">${lv}/${skill.maxLevel}</span>
          <span class="skill-type">${skill.tags?.join(' ') || skill.type}</span>
        </div>
        <div class="skill-desc">${skill.desc} ${synTxt}</div>
        ${canLearn ? `<button class="btn-small btn-learn" data-skill="${skillId}">+1</button>` : ''}
      </div>`;
    }
    html += '</div></div>';
  }
  showModal('技能与联动', html);
  document.querySelectorAll('.btn-learn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (allocateSkillPoint(hero, btn.dataset.skill)) {
        addLog({ type: 'skill', text: `学习 ${SKILLS[hero.charId][btn.dataset.skill].name}` });
        showSkillModal();
        renderAll();
      }
    });
  });
}

function itemLine(item) {
  const q = QUALITY[item.quality];
  const affixStr = (item.affixes || []).map(a => `+${a.value} ${a.name || a.stat}`).join(' · ');
  const morph = item.morphId ? MORPHS[item.morphId] : null;
  const morphStr = morph ? `<div class="morph-line">性态·${morph.name}：${morph.desc}${item.morphSkill ? `（${item.morphSkill}）` : ''}</div>` : '';
  return { q, affixStr, morphStr };
}

function showInventoryModal() {
  const hero = getActiveHero(gameState);
  const filter = gameState.invFilter || 'all';
  let items = gameState.inventory;
  if (filter !== 'all') items = items.filter(i => i.quality === filter || (filter === 'gear' && i.slot));
  let html = `<div class="inv-toolbar">
    <span>背包 ${gameState.inventory.length}/${INV_CAP}</span>
    <button class="btn-small" id="btn-sort">一键整理</button>
    <button class="btn-small" id="btn-sell-junk">出售垃圾</button>
  </div>
  <div class="inv-filters" id="inv-filters">
    ${['all', 'magic', 'rare', 'set', 'unique', 'legendary'].map(f =>
      `<button class="btn-small ${filter === f ? 'on' : ''}" data-f="${f}">${f === 'all' ? '全部' : QUALITY[f]?.name || f}</button>`
    ).join('')}
  </div>`;
  if (!items.length) html += '<p class="empty-msg">没有符合筛选的物品</p>';
  items.forEach((item) => {
    const idx = gameState.inventory.indexOf(item);
    const { q, affixStr, morphStr } = itemLine(item);
    const compare = compareDPS(hero, item);
    const diffStr = compare.diff >= 0
      ? `<span class="dps-up">DPS ${compare.newDps} (+${compare.diffPct.toFixed(1)}%)</span>`
      : `<span class="dps-down">DPS ${compare.newDps} (${compare.diffPct.toFixed(1)}%)</span>`;
    html += `<div class="inv-item ${item.locked ? 'locked-item' : ''}">
      <div class="inv-item-header">
        <span style="color:${q.color}">${item.locked ? '锁 ' : ''}${item.name}</span>
        <span class="quality-tag" style="color:${q.color}">${q.name} · ${SLOT_NAMES[item.slot] || item.slot}</span>
      </div>
      <div class="inv-affixes">${affixStr || '无词缀'}</div>
      ${item.legendaryEffect ? `<div class="legendary-effect">${item.legendaryEffect}</div>` : ''}
      ${morphStr}
      <div class="inv-compare">${diffStr}</div>
      <div class="inv-actions">
        <button class="btn-small btn-equip" data-idx="${idx}">装备</button>
        <button class="btn-small btn-lock" data-idx="${idx}">${item.locked ? '解锁' : '锁定'}</button>
        <button class="btn-small btn-sell" data-idx="${idx}">出售 ${sellValue(item)}</button>
      </div>
    </div>`;
  });
  showModal('背包', html);
  document.getElementById('btn-sort')?.addEventListener('click', () => { sortInventory(gameState); showInventoryModal(); });
  document.getElementById('btn-sell-junk')?.addEventListener('click', () => {
    let gold = 0;
    gameState.inventory = gameState.inventory.filter(it => {
      if (it.locked || (QUALITY[it.quality] && ['unique', 'legendary', 'ancient', 'set'].includes(it.quality))) return true;
      if (['normal', 'magic'].includes(it.quality)) { gold += sellValue(it); return false; }
      return true;
    });
    gameState.gold += gold;
    addLog({ type: 'loot', text: `出售垃圾 +${gold} 金` });
    showInventoryModal();
    renderAll();
  });
  document.getElementById('inv-filters')?.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => { gameState.invFilter = b.dataset.f; showInventoryModal(); });
  });
  document.querySelectorAll('.btn-equip').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = gameState.inventory[idx];
      const prev = equipItem(hero, item);
      gameState.inventory.splice(idx, 1);
      if (prev) gameState.inventory.push(prev);
      addLog({ type: 'loot', text: `装备 ${item.name}` });
      showInventoryModal();
      renderAll();
    });
  });
  document.querySelectorAll('.btn-lock').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = gameState.inventory[parseInt(btn.dataset.idx, 10)];
      it.locked = !it.locked;
      showInventoryModal();
    });
  });
  document.querySelectorAll('.btn-sell').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const it = gameState.inventory[idx];
      if (it.locked) return;
      gameState.gold += sellValue(it);
      gameState.inventory.splice(idx, 1);
      showInventoryModal();
      renderAll();
    });
  });
}

function showEquipmentModal() {
  const hero = getActiveHero(gameState);
  const stats = calcHeroStats(hero);
  let html = `<div class="stats-detail">
    <div>力 ${stats.str} · 敏 ${stats.agi} · 智 ${stats.int} · 护甲 ${stats.armor}</div>
    <div>暴击 ${(stats.critRate * 100).toFixed(0)}% · 攻速 +${(stats.attackSpeed * 100).toFixed(0)}% · 全抗 ${(stats.allRes * 100).toFixed(0)}%</div>
  </div>`;
  const morphs = getEquippedMorphs(hero);
  if (morphs.length) {
    html += '<div class="set-bonus">技能性态</div>';
    for (const m of morphs) {
      html += `<div class="morph-line">${m.itemName} → ${m.def?.name} ${m.skillId || ''}</div>`;
    }
  }
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const { q, affixStr, morphStr } = itemLine(item);
    html += `<div class="equip-detail">
      <span style="color:${q.color}">[${SLOT_NAMES[slot]}] ${item.name}</span>
      <div class="affix-list">${affixStr}</div>
      ${item.legendaryEffect ? `<div class="legendary-effect">${item.legendaryEffect}</div>` : ''}
      ${morphStr}
    </div>`;
  }
  const setCounts = {};
  for (const item of Object.values(hero.equipment)) {
    if (item?.setId) setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
  }
  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = SETS[setId];
    html += `<div class="set-bonus">${setDef.name}（${count}/${setDef.pieceCount}）</div>`;
    for (const [pieces, bonus] of Object.entries(setDef.bonuses)) {
      html += `<div class="set-tier ${count >= parseInt(pieces, 10) ? 'active' : ''}">${pieces}件：${bonus.desc}</div>`;
    }
  }
  showModal('装备与套装', html);
}

function showCharacterModal() {
  const progress = getUnlockProgress(gameState);
  let html = '<div class="char-list">';
  for (const [id, char] of Object.entries(CHARACTERS)) {
    const unlocked = gameState.unlockedChars.includes(id);
    const active = gameState.activeCharId === id;
    const hero = gameState.heroes[id];
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
        ${unlocked ? `<div class="char-lv">Lv.${hero?.level || 1}</div>` : `<div class="char-unlock">${unlockText}</div>`}
      </div>
      ${unlocked && !active ? `<button class="btn-small btn-switch" data-char="${id}">出战</button>` : ''}
    </div>`;
  }
  html += '</div>';
  showModal('角色', html);
  document.querySelectorAll('.btn-switch').forEach(btn => {
    btn.addEventListener('click', () => {
      gameState.activeCharId = btn.dataset.char;
      const h = getActiveHero(gameState);
      h.currentHp = calcHeroStats(h).maxHp;
      closeModal();
      onUpdate?.();
      renderAll();
    });
  });
}

function showAutoSellModal() {
  const a = gameState.autoSell;
  showModal('自动出售', `
    <label class="hint"><input type="checkbox" id="as-en" ${a.enabled ? 'checked' : ''}> 启用自动出售</label>
    <p class="hint">品质不超过此级的未锁定装备将被卖掉（暗金/传奇/远古始终保留）。</p>
    <select id="as-q" class="sel">
      ${['normal', 'magic', 'rare'].map(q => `<option value="${q}" ${a.maxQuality === q ? 'selected' : ''}>${QUALITY[q].name}及以下</option>`).join('')}
    </select>
    <label class="hint"><input type="checkbox" id="as-set" ${a.keepSet ? 'checked' : ''}> 保留套装件</label>
    <label class="hint"><input type="checkbox" id="as-better" ${a.keepBetter ? 'checked' : ''}> 保留比身上 DPS 高 2% 的装备</label>
    <button class="btn-primary" id="as-save">保存规则</button>
  `);
  document.getElementById('as-save')?.addEventListener('click', () => {
    gameState.autoSell.enabled = document.getElementById('as-en').checked;
    gameState.autoSell.maxQuality = document.getElementById('as-q').value;
    gameState.autoSell.keepSet = document.getElementById('as-set').checked;
    gameState.autoSell.keepBetter = document.getElementById('as-better').checked;
    closeModal();
    addLog({ type: 'info', text: '已更新自动出售规则' });
  });
}

function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

export function addLog(entry) {
  if (!combatState) return;
  combatState.log.push(entry);
  if (combatState.log.length > 60) combatState.log.shift();
}

export function showBossReward(reward) {
  let msg = '章节 Boss 首通';
  if (reward.unlockChars?.length) {
    msg += `<br>解锁：${reward.unlockChars.map(id => CHARACTERS[id].name).join('、')}`;
  }
  if (reward.loot) msg += `<br>掉落 ${reward.loot.name}`;
  showModal('Boss 击破', msg);
}

export { renderAll, closeModal };
