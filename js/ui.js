// 暗影防线 — HUD / 商店 / 选中塔
(function () {
  const TD = window.TD;
  let game;
  let renderer;

  function $(id) { return document.getElementById(id); }

  function bind(_game, _renderer) {
    game = _game;
    renderer = _renderer;
    renderShop();
    wire();
    refresh();
    if (!game.bestWave) $('help-overlay').classList.add('open');
  }

  function wire() {
    $('btn-wave').onclick = () => { game.startWave(); refresh(); };
    $('btn-pause').onclick = () => {
      if (game.phase === 'gameover') return;
      game.paused = !game.paused;
      refresh();
    };
    $('btn-speed').onclick = () => {
      game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
      refresh();
    };
    $('btn-help').onclick = () => $('help-overlay').classList.add('open');
    $('help-close').onclick = () => $('help-overlay').classList.remove('open');
    $('btn-restart').onclick = restart;
    $('go-restart').onclick = restart;
    $('btn-upgrade').onclick = () => { game.upgradeSelected(); refresh(); };
    $('btn-sell').onclick = () => { game.sellSelected(); refresh(); };
    $('btn-target').onclick = () => {
      const t = game.selected();
      if (!t) return;
      t.targetMode = t.targetMode === 'first' ? 'strong' : t.targetMode === 'strong' ? 'close' : 'first';
      refresh();
    };
    document.querySelectorAll('.shop-tab').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.shop-tab').forEach((b) => b.classList.toggle('on', b === btn));
        $('shop-list').dataset.tab = btn.dataset.tab;
      };
    });
    window.addEventListener('keydown', onKey);
  }

  function restart() {
    game.reset();
    $('go-overlay').classList.remove('open');
    refresh();
  }

  function onKey(e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (game.phase !== 'gameover') game.paused = !game.paused; }
    if (k === 'n') game.startWave();
    if (k === 'escape') { game.buildId = null; game.selectedId = null; }
    if (k === 'u') game.upgradeSelected();
    if (k === 'delete' || k === 'backspace') game.sellSelected();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const idx = keys.indexOf(k);
    if (idx >= 0 && TD.SHOP_ORDER[idx]) game.selectBuild(TD.SHOP_ORDER[idx]);
    refresh();
  }

  function renderShop() {
    const combat = $('shop-combat');
    const support = $('shop-support');
    combat.innerHTML = '';
    support.innerHTML = '';
    for (const id of TD.SHOP_ORDER) {
      const def = TD.TOWERS[id];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'shop-card';
      el.dataset.id = id;
      el.innerHTML = `
        <span class="sc-icon" style="--c:${def.color}">${def.icon}</span>
        <span class="sc-body">
          <span class="sc-name">${def.name}</span>
          <span class="sc-cost">${TD.formatCost(TD.buildCost(id))}</span>
        </span>`;
      el.onclick = () => {
        game.selectBuild(id);
        refresh();
      };
      (def.category === 'combat' ? combat : support).appendChild(el);
    }
  }

  function refresh() {
    if (!game) return;
    for (const k of TD.RES_KEYS) {
      const el = $(`res-${k}`);
      if (el) el.textContent = String(game.res[k] || 0);
    }
    $('wave-num').textContent = String(game.wave);
    const preview = game.waveAlive ? TD.composeWave(game.wave) : game.nextWavePreview();
    const dirNames = preview.dirs.map((id) => TD.DIRS.find((d) => d.id === id).name).join('、');
    const nextNo = game.waveAlive ? game.wave : game.wave + 1;
    $('wave-next').textContent = game.waveAlive
      ? `进行中 · ${TD.waveLabel(game.wave)} · ${dirNames}`
      : `下一波 ${nextNo} · ${TD.waveLabel(nextNo)} · ${dirNames}`;
    $('core-hp').textContent = `${game.coreHp} / ${game.coreMax}`;
    $('core-bar').style.width = `${(100 * game.coreHp / game.coreMax)}%`;
    $('stat-kills').textContent = String(game.kills);
    $('stat-leaked').textContent = String(game.leaked);
    $('stat-best').textContent = String(game.bestWave);
    $('btn-pause').textContent = game.paused ? '继续' : '暂停';
    $('btn-speed').textContent = `${game.speed}×`;
    $('btn-wave').disabled = game.waveAlive || game.phase === 'gameover';
    $('btn-wave').textContent = game.wave === 0 ? '开始第 1 波' : (game.waveAlive ? '波次进行中' : '下一波');
    const prep = $('prepare');
    if (!game.waveAlive && game.wave > 0 && game.phase === 'ready') {
      prep.hidden = false;
      prep.textContent = `休整 ${Math.ceil(game.prepareLeft)} 秒 · 提前开战可获金币`;
    } else {
      prep.hidden = true;
    }
    document.querySelectorAll('.shop-card').forEach((el) => {
      const id = el.dataset.id;
      const cost = TD.buildCost(id);
      el.classList.toggle('on', game.buildId === id);
      el.classList.toggle('no', !TD.canPay(game.res, cost));
    });
    renderDetail();
    renderLog();
    if (game.phase === 'gameover') {
      $('go-overlay').classList.add('open');
      $('go-text').textContent = `坚持到第 ${game.wave} 波 · 击杀 ${game.kills} · 漏怪 ${game.leaked}`;
    }
    const hint = $('build-hint');
    if (game.buildId) {
      const def = TD.TOWERS[game.buildId];
      hint.hidden = false;
      hint.textContent = `放置 ${def.name}：${def.blurb}`;
    } else {
      hint.hidden = true;
    }
  }

  function renderDetail() {
    const box = $('tower-detail');
    const t = game.selected();
    if (!t) {
      const preview = game.buildId ? TD.TOWERS[game.buildId] : null;
      box.innerHTML = preview
        ? `<h3>${preview.icon} ${preview.name}</h3><p>${preview.blurb}</p><p class="dim">${TD.formatCost(TD.buildCost(preview.id))}</p>`
        : `<h3>未选中</h3><p class="dim">点商店选塔，再点草地建造。点已有塔可升级或拆除。</p>`;
      $('btn-upgrade').disabled = true;
      $('btn-sell').disabled = true;
      $('btn-target').disabled = true;
      return;
    }
    const def = TD.TOWERS[t.type];
    const buffs = game.towerBuffs(t);
    const stats = def.category === 'combat' ? TD.combatStats(t.type, t.level, buffs) : null;
    const up = t.level < TD.MAX_TOWER_LV ? TD.upgradeCost(t.type, t.level) : null;
    const tags = [];
    if (def.combatType) tags.push(TD.COMBAT_TYPES[def.combatType].name);
    if (def.supportType === 'buff') tags.push('Buff 强化');
    if (def.supportType === 'resource') tags.push('资源加速');
    let extra = '';
    if (stats) {
      extra = `<dl>
        <div><dt>伤害</dt><dd>${Math.round(stats.damage)}</dd></div>
        <div><dt>攻速</dt><dd>${(1 / stats.interval).toFixed(2)}/秒</dd></div>
        <div><dt>范围</dt><dd>${stats.range.toFixed(2)}</dd></div>
      </dl>`;
      if (buffs.sealed) extra += `<p class="warn">已被封印</p>`;
      else if (buffs.weaken) extra += `<p class="warn">被弱化 -${Math.round(buffs.weaken * 100)}%</p>`;
    } else if (def.supportType === 'resource') {
      const y = TD.resourceYield(t.type, t.level);
      extra = `<p>每 ${y.interval.toFixed(1)} 秒产出 ${y.amount} ${TD.RES[y.resource].name}</p>`;
    } else {
      extra = `<p>光环 ${def.buff} +${Math.round(TD.buffValue(t.type, t.level) * 100)}%</p>`;
    }
    box.innerHTML = `
      <h3>${def.icon} ${def.name} · ${t.level} 级</h3>
      <p class="tags">${tags.join(' · ')}</p>
      <p>${def.blurb}</p>
      ${extra}
      <p class="dim">${up ? `升级 ${TD.formatCost(up)}` : '已满级'} · 拆除返还 ${TD.sellRefund(t).gold} 金</p>`;
    $('btn-upgrade').disabled = !up || !TD.canPay(game.res, up);
    $('btn-sell').disabled = false;
    $('btn-target').disabled = def.category !== 'combat';
    const mode = { first: '首只（近核心）', strong: '血厚', close: '最近' }[t.targetMode] || '首只';
    $('btn-target').textContent = `目标：${mode}`;
  }

  function renderLog() {
    const el = $('combat-log');
    el.innerHTML = game.log.slice(0, 12).map((row) => `<div>${row.text}</div>`).join('');
  }

  window.TDUI = { bind, refresh };
})();
