// 暗影防线 — 规则与数值（可在 Node 与浏览器共用）
(function (root) {
  const TD = root.TD || {};
  root.TD = TD;

  TD.SAVE_KEY = 'shadow-defense-best-v1';
  TD.GRID = 21;
  TD.CORE_R = 1;
  TD.MAX_TOWER_LV = 5;
  TD.START_GOLD = 160;
  TD.CORE_HP = 100;
  TD.ARMOR_K = 40;

  TD.RES_KEYS = ['gold', 'stone', 'mineral', 'wood', 'mana'];
  TD.RES = {
    gold: { id: 'gold', name: '金币', color: '#d4a843', hint: '基础资源。建造、升级都要用。击杀与金矿产出。' },
    stone: { id: 'stone', name: '石材', color: '#9a968c', hint: '2 级资源。主要给近战升级。击杀小概率掉落，石场为主要来源。' },
    mineral: { id: 'mineral', name: '矿物', color: '#7aa0c4', hint: '2 级资源。近战、远程升级。击杀小概率掉落，矿场为主要来源。' },
    wood: { id: 'wood', name: '木材', color: '#7a9a4a', hint: '2 级资源。远程、魔法升级。击杀小概率掉落，伐木场为主要来源。' },
    mana: { id: 'mana', name: '魔能', color: '#8a74e0', hint: '2 级资源。魔法升级。精英/Boss 概率掉落，魔能炉为主要来源。' },
  };

  TD.DIRS = [
    { id: 'n', x: 10, y: 0, name: '上', dx: 0, dy: 1 },
    { id: 'ne', x: 20, y: 0, name: '右上', dx: -1, dy: 1 },
    { id: 'e', x: 20, y: 10, name: '右', dx: -1, dy: 0 },
    { id: 'se', x: 20, y: 20, name: '右下', dx: -1, dy: -1 },
    { id: 's', x: 10, y: 20, name: '下', dx: 0, dy: -1 },
    { id: 'sw', x: 0, y: 20, name: '左下', dx: 1, dy: -1 },
    { id: 'w', x: 0, y: 10, name: '左', dx: 1, dy: 0 },
    { id: 'nw', x: 0, y: 0, name: '左上', dx: 1, dy: 1 },
  ];
  TD.DIR_IDS = TD.DIRS.map((d) => d.id);

  // 体型倍率遵循需求：普通 1 / 精英 2 / 小 Boss 3 / Boss 4 / 强力 Boss 6
  // n、m 为相对普通怪的生命、防御系数；Boss 与强力 Boss 再乘 1.5 / 2
  TD.N = 2.4;
  TD.M = 2.0;
  TD.KINDS = {
    normal: { id: 'normal', name: '普通', size: 1, hpN: 1, defM: 1, leak: 4, gold: 5, color: '#b8c4a8', speed: 1.28 },
    elite: { id: 'elite', name: '精英', size: 2, hpN: TD.N, defM: 1, leak: 8, gold: 14, color: '#6ea8ff', speed: 1.12 },
    miniBoss: { id: 'miniBoss', name: '小Boss', size: 3, hpN: TD.N * 3.2, defM: TD.M, leak: 16, gold: 36, color: '#e0b84a', speed: 0.92 },
    boss: { id: 'boss', name: 'Boss', size: 4, hpN: TD.N * 3.2 * 1.5, defM: TD.M * 1.5, leak: 28, gold: 70, color: '#ff6a4a', speed: 0.78 },
    powerBoss: { id: 'powerBoss', name: '强力Boss', size: 6, hpN: TD.N * 3.2 * 2, defM: TD.M * 2, leak: 45, gold: 140, color: '#c060ff', speed: 0.62 },
  };

  TD.TOWERS = {
    blade: {
      id: 'blade', name: '剑卫塔', icon: '⚔',
      category: 'combat', combatType: 'melee',
      blurb: '近战 · 范围小 · 范围内 AOE · 伤害高 · 攻速普通',
      range: 1.85, interval: 1.05, damage: 26, aoe: 'inRange',
      color: '#c45a3a', color2: '#e8c090',
      build: { gold: 65 },
      upgradeRes: { stone: 5, mineral: 3 },
    },
    archer: {
      id: 'archer', name: '连弩塔', icon: '🏹',
      category: 'combat', combatType: 'ranged',
      blurb: '远程 · 范围大 · 单体 · 伤害低 · 攻速高',
      range: 4.8, interval: 0.38, damage: 9, aoe: null,
      color: '#3a6a4a', color2: '#c8d090',
      build: { gold: 55 },
      upgradeRes: { mineral: 4, wood: 5 },
    },
    flame: {
      id: 'flame', name: '炎爆塔', icon: '🔥',
      category: 'combat', combatType: 'magic', magicMode: 'aoe',
      blurb: '魔法 · 范围中 · AOE 中伤 · 攻速低',
      range: 3.15, interval: 1.85, damage: 22, aoe: 'splash', splash: 1.35,
      color: '#c04020', color2: '#ffb070',
      build: { gold: 80 },
      upgradeRes: { wood: 4, mana: 4 },
    },
    frost: {
      id: 'frost', name: '霜噬塔', icon: '❄',
      category: 'combat', combatType: 'magic', magicMode: 'single',
      blurb: '魔法 · 单体极高伤害并减速 · 攻速普通',
      range: 3.25, interval: 1.05, damage: 48, aoe: null,
      slow: { pct: 0.42, dur: 2.2 },
      color: '#3a6aaa', color2: '#a8e0ff',
      build: { gold: 90 },
      upgradeRes: { wood: 3, mana: 5 },
    },
    storm: {
      id: 'storm', name: '雷罚塔', icon: '⚡',
      category: 'combat', combatType: 'magic', magicMode: 'single',
      blurb: '魔法 · 单体极高伤害并连锁 · 攻速普通',
      range: 3.05, interval: 1.12, damage: 62, aoe: null,
      chain: { extra: 2, falloff: 0.55, radius: 2.2 },
      color: '#6a4ac8', color2: '#e8d060',
      build: { gold: 100 },
      upgradeRes: { wood: 3, mana: 6 },
    },
    drum: {
      id: 'drum', name: '战鼓塔', icon: '🥁',
      category: 'support', supportType: 'buff', buff: 'attackSpeed',
      blurb: '辅助 · 范围内战斗塔攻速 +18%/级',
      range: 3.4, buffValue: 0.18,
      color: '#8a5a28', color2: '#e0b070',
      build: { gold: 70 },
      upgradeRes: { wood: 4, stone: 2 },
    },
    hawk: {
      id: 'hawk', name: '鹰眼塔', icon: '👁',
      category: 'support', supportType: 'buff', buff: 'range',
      blurb: '辅助 · 范围内战斗塔攻击范围 +12%/级',
      range: 3.4, buffValue: 0.12,
      color: '#4a6a88', color2: '#c0d8e8',
      build: { gold: 70 },
      upgradeRes: { mineral: 3, wood: 3 },
    },
    whetstone: {
      id: 'whetstone', name: '砺石塔', icon: '◆',
      category: 'support', supportType: 'buff', buff: 'damage',
      blurb: '辅助 · 范围内战斗塔伤害 +16%/级',
      range: 3.4, buffValue: 0.16,
      color: '#6a3030', color2: '#e0a060',
      build: { gold: 75 },
      upgradeRes: { stone: 4, mineral: 3 },
    },
    goldmine: {
      id: 'goldmine', name: '金矿', icon: '◎',
      category: 'support', supportType: 'resource', resource: 'gold',
      blurb: '资源 · 周期产出金币',
      range: 0, produce: 4, interval: 3.6,
      color: '#8a6a20', color2: '#f0d060',
      build: { gold: 80 },
      upgradeRes: { stone: 3, mineral: 3 },
    },
    quarry: {
      id: 'quarry', name: '石场', icon: '▣',
      category: 'support', supportType: 'resource', resource: 'stone',
      blurb: '资源 · 石材主要来源',
      range: 0, produce: 2, interval: 5.2,
      color: '#5a5850', color2: '#c8c4b8',
      build: { gold: 95 },
      upgradeRes: { stone: 2, mineral: 2 },
    },
    mine: {
      id: 'mine', name: '矿场', icon: '⛏',
      category: 'support', supportType: 'resource', resource: 'mineral',
      blurb: '资源 · 矿物主要来源',
      range: 0, produce: 2, interval: 5.2,
      color: '#3a4a5a', color2: '#90b8d0',
      build: { gold: 95 },
      upgradeRes: { mineral: 2, stone: 2 },
    },
    lumber: {
      id: 'lumber', name: '伐木场', icon: '🌲',
      category: 'support', supportType: 'resource', resource: 'wood',
      blurb: '资源 · 木材主要来源',
      range: 0, produce: 2, interval: 5.0,
      color: '#2a4a28', color2: '#8ab060',
      build: { gold: 95 },
      upgradeRes: { wood: 2 },
    },
    furnace: {
      id: 'furnace', name: '魔能炉', icon: '✧',
      category: 'support', supportType: 'resource', resource: 'mana',
      blurb: '资源 · 魔能主要来源',
      range: 0, produce: 1, interval: 6.4,
      color: '#3a2a5a', color2: '#b090ff',
      build: { gold: 120 },
      upgradeRes: { mana: 2, wood: 3 },
    },
  };

  TD.SHOP_ORDER = [
    'blade', 'archer', 'flame', 'frost', 'storm',
    'drum', 'hawk', 'whetstone',
    'goldmine', 'quarry', 'mine', 'lumber', 'furnace',
  ];

  TD.COMBAT_TYPES = {
    melee: { name: '近战', hint: '攻击范围小，AOE，伤害高，攻速普通。升级主耗石材、矿物。' },
    ranged: { name: '远程', hint: '攻击范围大，单体，伤害低，攻速高。升级主耗矿物、木材。' },
    magic: { name: '魔法', hint: '范围中。炎爆为 AOE；霜噬/雷罚为单体极高伤害或特效。升级主耗木材、魔能。' },
  };

  function emptyCost() {
    return { gold: 0, stone: 0, mineral: 0, wood: 0, mana: 0 };
  }

  TD.emptyCost = emptyCost;

  TD.waveHpScale = function waveHpScale(wave) {
    const w = Math.max(1, wave);
    return 1 + (w - 1) * 0.16 + Math.max(0, w - 8) * 0.04;
  };

  TD.waveDefScale = function waveDefScale(wave) {
    const w = Math.max(1, wave);
    return 1 + (w - 1) * 0.11 + Math.max(0, w - 8) * 0.03;
  };

  TD.waveSpecials = function waveSpecials(wave) {
    const w = Math.max(1, Math.floor(wave));
    const powerBoss = w % 10 === 0;
    const boss = !powerBoss && w % 5 === 0;
    const miniBoss = !powerBoss && !boss && (w % 10 === 3 || w % 10 === 7);
    return { elite: true, miniBoss, boss, powerBoss };
  };

  TD.normalBaseStats = function normalBaseStats(wave) {
    const w = Math.max(1, wave);
    return {
      hp: Math.round((42 + w * 6) * TD.waveHpScale(w)),
      def: Math.round((2 + w * 0.55) * TD.waveDefScale(w)),
    };
  };

  TD.monsterStats = function monsterStats(kind, wave) {
    const k = TD.KINDS[kind] || TD.KINDS.normal;
    const base = TD.normalBaseStats(wave);
    return {
      kind: k.id,
      name: k.name,
      size: k.size,
      hp: Math.max(1, Math.round(base.hp * k.hpN)),
      def: Math.max(0, Math.round(base.def * k.defM)),
      speed: k.speed,
      leak: k.leak,
      gold: Math.round(k.gold * (1 + (wave - 1) * 0.08)),
      color: k.color,
    };
  };

  TD.towerLevelMult = function towerLevelMult(level) {
    const lv = Math.max(1, Math.min(TD.MAX_TOWER_LV, level));
    return 1 + (lv - 1) * 0.28;
  };

  TD.buildCost = function buildCost(towerId) {
    const t = TD.TOWERS[towerId];
    const c = emptyCost();
    if (!t) return c;
    Object.assign(c, t.build || {});
    return c;
  };

  TD.upgradeCost = function upgradeCost(towerId, fromLevel) {
    const t = TD.TOWERS[towerId];
    const c = emptyCost();
    if (!t) return c;
    const lv = Math.max(1, fromLevel);
    const gold = Math.floor((t.build.gold || 50) * (0.7 + lv * 0.65));
    c.gold = gold;
    for (const [k, v] of Object.entries(t.upgradeRes || {})) {
      if (v) c[k] = (c[k] || 0) + v * lv;
    }
    return c;
  };

  TD.canPay = function canPay(wallet, cost) {
    return TD.RES_KEYS.every((k) => (wallet[k] || 0) >= (cost[k] || 0));
  };

  TD.pay = function pay(wallet, cost) {
    const next = { ...wallet };
    for (const k of TD.RES_KEYS) next[k] = (next[k] || 0) - (cost[k] || 0);
    return next;
  };

  TD.addRes = function addRes(wallet, gain) {
    const next = { ...wallet };
    for (const k of TD.RES_KEYS) {
      if (gain[k]) next[k] = (next[k] || 0) + gain[k];
    }
    return next;
  };

  TD.applyArmor = function applyArmor(damage, defense) {
    const dmg = Math.max(0, damage);
    const def = Math.max(0, defense);
    return Math.max(1, Math.round(dmg * TD.ARMOR_K / (TD.ARMOR_K + def)));
  };

  TD.combatStats = function combatStats(towerId, level, buffs) {
    const def = TD.TOWERS[towerId];
    const lvMul = TD.towerLevelMult(level);
    const b = buffs || {};
    const sealed = !!b.sealed;
    const weaken = sealed ? 1 : Math.max(0, 1 - (b.weaken || 0));
    const asBonus = sealed ? 0 : (b.attackSpeed || 0);
    const rangeBonus = sealed ? 0 : (b.range || 0);
    const dmgBonus = sealed ? 0 : (b.damage || 0);
    return {
      range: def.range * (1 + Math.min(0.7, rangeBonus)) * (1 + (level - 1) * 0.04),
      interval: def.interval / (1 + Math.min(0.85, asBonus)),
      damage: def.damage * lvMul * (1 + Math.min(1.2, dmgBonus)) * weaken,
      splash: (def.splash || 0) * (1 + (level - 1) * 0.06),
      sealed,
    };
  };

  TD.resourceYield = function resourceYield(towerId, level) {
    const def = TD.TOWERS[towerId];
    const lv = Math.max(1, level);
    return {
      resource: def.resource,
      amount: (def.produce || 0) + (lv - 1),
      interval: Math.max(1.6, (def.interval || 4) * (1 - (lv - 1) * 0.06)),
    };
  };

  TD.buffValue = function buffValue(towerId, level) {
    const def = TD.TOWERS[towerId];
    return (def.buffValue || 0) * Math.max(1, level);
  };

  TD.killDrops = function killDrops(kind, rng) {
    const r = rng || Math.random;
    const drop = { gold: 0, stone: 0, mineral: 0, wood: 0, mana: 0 };
    const roll = () => r();
    if (kind === 'normal') {
      if (roll() < 0.08) drop.stone += 1;
      if (roll() < 0.08) drop.mineral += 1;
      if (roll() < 0.08) drop.wood += 1;
    } else if (kind === 'elite') {
      if (roll() < 0.22) drop.stone += 1;
      if (roll() < 0.22) drop.mineral += 1;
      if (roll() < 0.22) drop.wood += 1;
      if (roll() < 0.28) drop.mana += 1;
    } else if (kind === 'miniBoss') {
      drop.stone += roll() < 0.7 ? 2 : 1;
      drop.mineral += roll() < 0.7 ? 2 : 1;
      drop.wood += roll() < 0.7 ? 2 : 1;
      if (roll() < 0.55) drop.mana += 2;
    } else if (kind === 'boss') {
      drop.stone += 3;
      drop.mineral += 3;
      drop.wood += 3;
      if (roll() < 0.75) drop.mana += 3;
    } else if (kind === 'powerBoss') {
      drop.stone += 5;
      drop.mineral += 5;
      drop.wood += 5;
      drop.mana += 6;
    }
    return drop;
  };

  TD.dirCountForWave = function dirCountForWave(wave) {
    return Math.min(8, 2 + Math.floor((wave - 1) / 2));
  };

  TD.pickDirs = function pickDirs(wave) {
    const count = TD.dirCountForWave(wave);
    const start = (wave - 1) % 8;
    const out = [];
    for (let i = 0; i < count; i++) out.push(TD.DIR_IDS[(start + i * 3) % 8]);
    return out;
  };

  TD.composeWave = function composeWave(wave) {
    const specials = TD.waveSpecials(wave);
    const dirs = TD.pickDirs(wave);
    const normals = 8 + wave * 2 + (specials.boss || specials.powerBoss ? 4 : 0);
    const queue = [];
    for (let i = 0; i < normals; i++) {
      queue.push({ kind: 'normal', dir: dirs[i % dirs.length], delay: i === 0 ? 0.2 : 0.36 });
    }
    queue.push({ kind: 'elite', dir: dirs[0], delay: 0.85 });
    if (specials.miniBoss) queue.push({ kind: 'miniBoss', dir: dirs[0], delay: 1.35 });
    if (specials.boss) queue.push({ kind: 'boss', dir: dirs[Math.floor(dirs.length / 2)], delay: 1.6 });
    if (specials.powerBoss) queue.push({ kind: 'powerBoss', dir: dirs[0], delay: 2.1 });
    return { wave, queue, dirs, specials, normals };
  };

  TD.waveLabel = function waveLabel(wave) {
    const s = TD.waveSpecials(wave);
    const bits = ['精英'];
    if (s.miniBoss) bits.push('小Boss');
    if (s.boss) bits.push('Boss');
    if (s.powerBoss) bits.push('强力Boss');
    return bits.join(' · ');
  };

  TD.sellRefund = function sellRefund(tower) {
    const spentGold = (tower.spent && tower.spent.gold) || TD.buildCost(tower.type).gold;
    return { gold: Math.floor(spentGold * 0.6) };
  };

  TD.isCore = function isCore(x, y) {
    const c = (TD.GRID - 1) / 2;
    return Math.abs(x - c) <= TD.CORE_R && Math.abs(y - c) <= TD.CORE_R;
  };

  TD.coreCenter = function coreCenter() {
    const c = (TD.GRID - 1) / 2;
    return { x: c, y: c };
  };

  TD.lineCells = function lineCells(x0, y0, x1, y1) {
    const pts = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    while (true) {
      pts.push({ x, y });
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return pts;
  };

  TD.buildMap = function buildMap() {
    const n = TD.GRID;
    const tiles = [];
    for (let y = 0; y < n; y++) {
      const row = [];
      for (let x = 0; x < n; x++) {
        row.push({ x, y, kind: 'grass', walk: false, build: true });
      }
      tiles.push(row);
    }
    const cc = TD.coreCenter();
    const paths = {};
    for (const dir of TD.DIRS) {
      const cells = TD.lineCells(dir.x, dir.y, cc.x, cc.y)
        .filter((p) => !TD.isCore(p.x, p.y));
      paths[dir.id] = cells.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5, tx: p.x, ty: p.y }));
      for (const p of cells) {
        const t = tiles[p.y][p.x];
        t.kind = 'path';
        t.walk = true;
        t.build = false;
      }
      const spawn = tiles[dir.y][dir.x];
      spawn.kind = 'spawn';
      spawn.dir = dir.id;
      spawn.walk = true;
      spawn.build = false;
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!TD.isCore(x, y)) continue;
        const t = tiles[y][x];
        t.kind = 'core';
        t.walk = false;
        t.build = false;
      }
    }
    return { tiles, paths, n };
  };

  TD.formatCost = function formatCost(cost) {
    return TD.RES_KEYS.filter((k) => cost[k] > 0).map((k) => `${TD.RES[k].name}${cost[k]}`).join(' · ');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
