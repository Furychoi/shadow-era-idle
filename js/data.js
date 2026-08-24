// 暗影纪元：放置编年史 — GDD v1.1 数据

const QUALITY = {
  normal: { id: 'normal', name: '普通', color: '#f0ebe3', affixCount: [0, 0] },
  magic: { id: 'magic', name: '魔法', color: '#8ec8ff', affixCount: [1, 2] },
  rare: { id: 'rare', name: '稀有', color: '#fff06a', affixCount: [3, 6] },
  set: { id: 'set', name: '套装', color: '#5cff88', affixCount: [3, 5] },
  unique: { id: 'unique', name: '暗金', color: '#c8aa6e', affixCount: [5, 6] },
  legendary: { id: 'legendary', name: '传奇', color: '#ffb040', affixCount: [4, 5] },
  ancient: { id: 'ancient', name: '远古传奇', color: '#ff7a6a', affixCount: [5, 5] },
  ancientSet: { id: 'ancientSet', name: '远古套装', color: '#c8ff6a', affixCount: [5, 5] },
  ancientUnique: { id: 'ancientUnique', name: '远古暗金', color: '#ffe08a', affixCount: [6, 6] },
};

const WEAPON_CLASS_NAMES = {
  melee: '近战武器',
  bow: '弓/弩',
  javelin: '标枪',
  caster: '法杖/法珠/图腾',
  claw: '拳刃',
};

const JUNK_FILTER_MODES = [
  { id: 'normal', name: '普通' },
  { id: 'magic', name: '魔法及以下' },
  { id: 'rare', name: '稀有及以下' },
  { id: 'unique', name: '暗金' },
  { id: 'set', name: '套装' },
  { id: 'legendary', name: '传奇' },
];

const WORLD_DIFFS = [
  { id: 'normal', name: '普通', tier: 0, monsterMult: 1, lootMult: 1, lvMin: 1, lvMax: 88 },
  { id: 'hard', name: '困难', tier: 1, monsterMult: 1.5, lootMult: 2, lvMin: 60, lvMax: 95 },
  { id: 'nightmare', name: '噩梦', tier: 2, monsterMult: 2.25, lootMult: 4, lvMin: 70, lvMax: 100 },
  { id: 'hell', name: '地狱', tier: 3, monsterMult: 3.375, lootMult: 8, lvMin: 80, lvMax: 105 },
];
const CAMPAIGN_LV_MIN = 1;
const CAMPAIGN_LV_MAX = 88;

function getDiffById(id) {
  return WORLD_DIFFS.find(d => d.id === id) || WORLD_DIFFS[0];
}

function scaleWorldLevel(lv, diff) {
  const d = typeof diff === 'string' ? getDiffById(diff) : (diff || WORLD_DIFFS[0]);
  const n = Math.max(1, Number(lv) || 1);
  const span = Math.max(1, CAMPAIGN_LV_MAX - CAMPAIGN_LV_MIN);
  if (n <= CAMPAIGN_LV_MAX) {
    const t = (n - CAMPAIGN_LV_MIN) / span;
    return Math.round(d.lvMin + t * (d.lvMax - d.lvMin));
  }
  return d.lvMax + (n - CAMPAIGN_LV_MAX);
}

function withDiffLevels(map, stateOrDiff) {
  if (!map) return map;
  const d = stateOrDiff?.monsterMult != null && stateOrDiff.lvMin != null
    ? stateOrDiff
    : getDiffById(stateOrDiff?.diffId || stateOrDiff?.id || stateOrDiff);
  const min = scaleWorldLevel(map.levelMin, d);
  const max = Math.max(min, scaleWorldLevel(map.levelMax, d));
  if (min === map.levelMin && max === map.levelMax) return map;
  return { ...map, levelMin: min, levelMax: max };
}

function itemLootMult(item) {
  if (!item?.diffId) return 1;
  return getDiffById(item.diffId).lootMult || 1;
}

function itemStatMult(item) {
  return itemEnhanceMult(item) * itemLootMult(item);
}

function itemAffixQualityMult(item) {
  const q = item?.quality;
  if (q === 'rare') return 1.2;
  if (q === 'set' || q === 'ancientSet') return 0.85;
  return 1;
}

function itemAffixStatMult(item, stat) {
  if (stat === 'critRate') return itemEnhanceMult(item);
  return itemStatMult(item) * itemAffixQualityMult(item);
}

function itemDisplayName(item) {
  if (!item) return '';
  const base = item.name || '';
  if (!item.diffId) return base;
  const tag = `${getDiffById(item.diffId).name}难度`;
  if (base.endsWith(`-${tag}`)) return base;
  return `${base}-${tag}`;
}

const AUTO_SELL_MODES = [
  { id: 'normal', name: '普通' },
  { id: 'magic', name: '魔法及以下' },
  { id: 'rare', name: '稀有及以下' },
  { id: 'uniqueDown', name: '暗金及以下', hint: '不含套装和传奇' },
  { id: 'setDown', name: '套装及以下', hint: '不含暗金和传奇' },
  { id: 'legendaryDown', name: '传奇及以下', hint: '不含暗金和套装' },
  { id: 'belowAncient', name: '远古以下', hint: '只保留远古' },
];

const QUALITY_WEIGHTS = [
  { quality: 'normal', weight: 68.96 },
  { quality: 'magic', weight: 24 },
  { quality: 'rare', weight: 6.5 },
  { quality: 'set', weight: 0.43 },
  { quality: 'unique', weight: 0.088 },
  { quality: 'legendary', weight: 0.132 },
  { quality: 'ancient', weight: 0.025 },
  { quality: 'ancientSet', weight: 0.018 },
  { quality: 'ancientUnique', weight: 0.014 },
];

const SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'necklace', 'ring1', 'ring2', 'offhand'];
const SLOT_NAMES = {
  weapon: '武器', helmet: '头盔', chest: '胸甲', gloves: '手套', boots: '靴子',
  belt: '腰带', necklace: '项链', ring1: '左戒', ring2: '右戒', offhand: '副手',
};

const MORPHS = {
  pierce: { id: 'pierce', name: '穿刺', desc: '投射穿透 +2，逐目标伤害 85%' },
  split: { id: 'split', name: '分裂', desc: '命中再分裂 2 支（50% 伤）' },
  nova: { id: 'nova', name: '新星化', desc: '改为自身环状释放，打全体' },
  chain: { id: 'chain', name: '连锁', desc: '额外跳跃 +2' },
  trail: { id: 'trail', name: '轨迹残留', desc: '弹道留下 DOT 地面' },
  convert: { id: 'convert', name: '元素转化', desc: '物理伤害转为火焰' },
  proc: { id: 'proc', name: '击中施放', desc: '普攻 20% 触发该技能半系数' },
  reset: { id: 'reset', name: '收招重置', desc: '击杀精英/稀有时重置该技能冷却' },
  shapecast: { id: 'shapecast', name: '人兽施法', desc: '变形中仍可释放元素技能' },
  window: { id: 'window', name: '窗口延长', desc: '连招窗口 +1.5 秒' },
};

const CLASS_UNLOCKS = [
  { charId: 'sorceress', diffId: 'normal', act: 1, bossId: 'visna' },
  { charId: 'paladin', diffId: 'normal', act: 3, bossId: 'council' },
  { charId: 'necro', diffId: 'normal', act: 5, bossId: 'baal' },
  { charId: 'amazon', diffId: 'hard', act: 1, bossId: 'visna' },
  { charId: 'assassin', diffId: 'hard', act: 3, bossId: 'council' },
  { charId: 'druid', diffId: 'hard', act: 5, bossId: 'baal' },
];

const CHAR_TABS = [
  { id: 'berserker', short: '狂战士' },
  { id: 'sorceress', short: '元素师' },
  { id: 'paladin', short: '圣骑士' },
  { id: 'necro', short: '死灵' },
  { id: 'amazon', short: '亚马逊' },
  { id: 'assassin', short: '刺客' },
  { id: 'druid', short: '德鲁伊' },
];

const CHARACTERS = {
  berserker: {
    id: 'berserker', name: '狂战士', mainStat: 'str', icon: '斧',
    desc: '近战物理、怒气旋风、战吼减伤',
    unlock: null, palette: ['#6a3030', '#c45a3a', '#e8c090'],
    baseHp: 130, baseDamage: 16, baseArmor: 9, attackInterval: 1.15, attackRange: 1.35,
    resource: { id: 'rage', name: '怒气', color: '#e05030', maxBase: 100, regen: 4, startFull: false, onHit: 6, onKill: 5 },
    weaponClasses: ['melee'],
  },
  amazon: {
    id: 'amazon', name: '亚马逊', mainStat: 'agi', icon: '弓',
    desc: '弓弩/标枪远程，穿透层与女武神',
    unlock: { type: 'act', diffId: 'hard', act: 1 }, palette: ['#2a4a6a', '#c8a050', '#f0d8a0'],
    baseHp: 95, baseDamage: 14, baseArmor: 5, attackInterval: 0.95, attackRange: 4.4,
    resource: { id: 'mana', name: '魔法', color: '#4a8cee', maxBase: 25, maxPerLevel: 5, fromInt: 1.6, regen: 4.2, startFull: true },
    weaponClasses: ['bow', 'javelin'],
  },
  sorceress: {
    id: 'sorceress', name: '元素师', mainStat: 'int', icon: '法',
    desc: '火冰电三系爆发，玻璃大炮',
    unlock: { type: 'act', diffId: 'normal', act: 1 }, palette: ['#3a2a6a', '#8860d0', '#d0c8f0'],
    baseHp: 72, baseDamage: 13, baseArmor: 3, attackInterval: 1.0, attackRange: 4.8,
    resource: { id: 'mana', name: '魔法', color: '#7a8cff', maxBase: 35, maxPerLevel: 8, fromInt: 2.2, regen: 5.5, startFull: true },
    weaponClasses: ['caster'],
  },
  druid: {
    id: 'druid', name: '德鲁伊', mainStat: 'int', icon: '德',
    desc: '风暴元素、狼熊变形、召唤灵兽',
    unlock: { type: 'act', diffId: 'hard', act: 5 }, palette: ['#2a4a2a', '#6a8a40', '#c8d090'],
    baseHp: 100, baseDamage: 13, baseArmor: 6, attackInterval: 1.1, attackRange: 3.4,
    resource: { id: 'mana', name: '魔法', color: '#4aaa88', maxBase: 30, maxPerLevel: 6, fromInt: 1.8, regen: 4.6, startFull: true },
    weaponClasses: ['caster'],
  },
  assassin: {
    id: 'assassin', name: '暗影刺客', mainStat: 'agi', icon: '刺',
    desc: '陷阱铺场、武学聚气、影子分身',
    unlock: { type: 'act', diffId: 'hard', act: 3 }, palette: ['#1a1a2a', '#4a3a6a', '#c0a0d0'],
    baseHp: 88, baseDamage: 15, baseArmor: 5, attackInterval: 0.9, attackRange: 1.5,
    resource: { id: 'energy', name: '能量', color: '#d4a040', maxBase: 100, regen: 18, startFull: true },
    weaponClasses: ['claw'],
  },
  paladin: {
    id: 'paladin', name: '圣骑士', mainStat: 'str', icon: '圣',
    desc: '攻防双光环切换、热诚/圣锤/天堂之拳分流',
    unlock: { type: 'act', diffId: 'normal', act: 3 }, palette: ['#3a3a1a', '#d4b050', '#f0e8c8'],
    baseHp: 115, baseDamage: 14, baseArmor: 10, attackInterval: 1.05, attackRange: 1.45,
    resource: { id: 'mana', name: '魔法', color: '#e8d070', maxBase: 22, maxPerLevel: 4, fromInt: 1.2, regen: 3.8, startFull: true },
    weaponClasses: ['melee'],
  },
  necro: {
    id: 'necro', name: '死灵法师', mainStat: 'int', icon: '灵',
    desc: '尸潮、毒素、诅咒降抗',
    unlock: { type: 'act', diffId: 'normal', act: 5 }, palette: ['#2a1a2a', '#6a4a6a', '#b09090'],
    baseHp: 80, baseDamage: 12, baseArmor: 4, attackInterval: 1.05, attackRange: 4.2,
    resource: { id: 'mana', name: '魔法', color: '#a070c0', maxBase: 32, maxPerLevel: 7, fromInt: 2.0, regen: 4.8, startFull: true },
    weaponClasses: ['caster'],
  },
};

function S(id, name, tree, type, extra) {
  return { id, name, tree, type, maxLevel: 10, prereq: extra.prereq ?? null, ...extra };
}

const SKILLS = {
  berserker: {
    smash: S('smash', '猛击', 'combat', 'active', { tags: ['melee', 'phys', 'opener'], desc: '武器伤害打击，可击晕并积攒怒气', damageMult: 1.6, cooldown: 0, stunChance: 0.2, resGain: 18, synergy: [{ skill: 'leap', pct: 8 }, { skill: 'stun', pct: 4 }] }),
    leap: S('leap', '跃击', 'combat', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '跳砸周围敌人', damageMult: 1.9, cooldown: 5, aoe: true, aoeRadius: 2.2, resCost: 14, prereq: 'smash', synergy: [{ skill: 'smash', pct: 10 }] }),
    stun: S('stun', '击晕', 'combat', 'active', { tags: ['melee', 'control', 'window'], desc: '高硬直打击，开启旋风窗口', damageMult: 1.4, cooldown: 6, resCost: 12, prereq: 'leap', synergy: [{ skill: 'smash', pct: 8 }] }),
    whirlwind: S('whirlwind', '旋风斩', 'combat', 'active', { tags: ['melee', 'aoe', 'phys', 'finisher'], desc: '持续旋转，对周围敌人反复造成范围伤害', damageMult: 0.5, cooldown: 0, aoe: true, aoeRadius: 2.45, channel: 2.3, channelTick: 0.32, resCost: 28, prereq: 'leap', synergy: [{ skill: 'leap', pct: 7 }, { skill: 'weaponMastery', pct: 5 }] }),
    frenzy: S('frenzy', '狂乱', 'combat', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '连续挥砍周围敌人并叠攻速', damageMult: 1.35, cooldown: 3.2, aoe: true, aoeRadius: 2.15, hits: 2, resCost: 16, prereq: 'whirlwind', synergy: [{ skill: 'whirlwind', pct: 6 }] }),
    howl: S('howl', '嚎叫', 'warcry', 'aura', { tags: ['aura', 'control'], desc: '光环：周围小怪周期溃逃，并降低其伤害', enemyDmgDown: 0.05, auraPulse: { interval: 7, radius: 5.5, flee: true, fleeDur: 2.2 }, synergy: [{ skill: 'taunt', pct: 5 }] }),
    taunt: S('taunt', '嘲讽', 'warcry', 'aura', { tags: ['aura', 'control', 'aoe', 'nova'], desc: '光环：持续减伤；周期怒吼强制周围敌人近身进攻', damageReduction: 0.04, taunt: true, tauntDuration: 5.5, aoe: true, aoeRadius: 7, auraPulse: { interval: 6, radius: 7, taunt: true } }),
    battleOrders: S('battleOrders', '战斗体制', 'warcry', 'aura', { tags: ['aura', 'buff'], desc: '光环：最大生命提升', hpBonus: 0.06, prereq: 'taunt' }),
    battleCommand: S('battleCommand', '战斗命令', 'warcry', 'aura', { tags: ['aura', 'buff'], desc: '光环：全技能等级 +1/级，每 5 级再额外 +1', skillBonus: 1, prereq: 'battleOrders' }),
    warCry: S('warCry', '战吼', 'warcry', 'aura', { tags: ['aura', 'control', 'aoe', 'nova'], desc: '光环：周期怒吼眩晕周围敌人', aoe: true, aoeRadius: 4.2, prereq: 'battleCommand', synergy: [{ skill: 'howl', pct: 6 }], auraPulse: { interval: 7, radius: 4.2, stun: true, stunDur: 1.2 } }),
    weaponMastery: S('weaponMastery', '武器精通', 'mastery', 'passive', { tags: ['phys', 'melee'], desc: '近战伤害', damageBonus: 0.08 }),
    tenacity: S('tenacity', '钢铁之肤', 'mastery', 'passive', { tags: ['melee'], desc: '护甲与生命', armorBonus: 0.1, hpBonus: 0.04, prereq: 'weaponMastery' }),
    bloodthirst: S('bloodthirst', '嗜血', 'mastery', 'passive', { tags: ['melee'], desc: '吸血', lifesteal: 0.018, prereq: 'tenacity' }),
    battleMastery: S('battleMastery', '战斗精通', 'mastery', 'passive', { tags: ['melee', 'phys'], desc: '命中与暴击', critBonus: 0.012, prereq: 'bloodthirst' }),
    deepWounds: S('deepWounds', '深度创伤', 'mastery', 'passive', { tags: ['melee', 'phys'], desc: '物理伤害与吸血', damageBonus: 0.05, lifesteal: 0.01, prereq: 'battleMastery' }),
  },
  amazon: {
    magicArrow: S('magicArrow', '魔法箭', 'bow', 'active', { tags: ['projectile', 'magic', 'opener'], desc: '不耗箭的魔法箭', damageMult: 1.3, cooldown: 0, element: 'magic', synergy: [{ skill: 'multiShot', pct: 4 }] }),
    multiShot: S('multiShot', '多重射击', 'bow', 'active', { tags: ['projectile', 'aoe', 'phys'], desc: '分裂箭矢清场', damageMult: 0.85, cooldown: 3, aoe: true, hits: 3, prereq: 'magicArrow', synergy: [{ skill: 'magicArrow', pct: 7 }, { skill: 'pierce', pct: 4 }] }),
    strafe: S('strafe', '扫射', 'bow', 'active', { tags: ['projectile', 'aoe', 'phys', 'finisher'], desc: '对场上逐个点射', damageMult: 1.1, cooldown: 7, aoe: true, prereq: 'multiShot', synergy: [{ skill: 'guided', pct: 8 }] }),
    freezeArrow: S('freezeArrow', '冻结箭', 'bow', 'active', { tags: ['projectile', 'ice', 'aoe'], desc: '爆炸冻结', damageMult: 1.6, cooldown: 8, aoe: true, element: 'ice', prereq: 'strafe', synergy: [{ skill: 'magicArrow', pct: 6 }] }),
    guided: S('guided', '导引箭', 'bow', 'active', { tags: ['projectile', 'phys', 'aoe'], desc: '追踪箭，弹射附近目标', damageMult: 1.45, cooldown: 4.5, aoe: true, hits: 2, prereq: 'freezeArrow', synergy: [{ skill: 'strafe', pct: 7 }] }),
    poisonJav: S('poisonJav', '毒枪', 'javelin', 'active', { tags: ['projectile', 'poison', 'dot', 'opener'], desc: '直线毒云', damageMult: 1.2, cooldown: 4, element: 'poison', synergy: [{ skill: 'plagueJav', pct: 12 }] }),
    plagueJav: S('plagueJav', '瘟疫标枪', 'javelin', 'active', { tags: ['projectile', 'poison', 'aoe', 'window'], desc: '落地毒池', damageMult: 1.4, cooldown: 7, aoe: true, element: 'poison', prereq: 'poisonJav', synergy: [{ skill: 'poisonJav', pct: 10 }] }),
    chargedStrike: S('chargedStrike', '充能一击', 'javelin', 'active', { tags: ['melee', 'lightning'], desc: '近战闪电充能', damageMult: 1.7, cooldown: 5, element: 'lightning', prereq: 'plagueJav', synergy: [{ skill: 'lightningFury', pct: 8 }] }),
    lightningFury: S('lightningFury', '闪电之怒', 'javelin', 'active', { tags: ['projectile', 'lightning', 'aoe', 'finisher'], desc: '标枪爆炸放出电球', damageMult: 2.2, cooldown: 10, aoe: true, element: 'lightning', hits: 4, prereq: 'chargedStrike', synergy: [{ skill: 'poisonJav', pct: 6 }, { skill: 'chargedStrike', pct: 7 }] }),
    fend: S('fend', '疾刺', 'javelin', 'active', { tags: ['melee', 'phys', 'aoe'], desc: '对周围连续突刺', damageMult: 1.25, cooldown: 4, aoe: true, hits: 3, prereq: 'lightningFury', synergy: [{ skill: 'chargedStrike', pct: 6 }] }),
    pierce: S('pierce', '穿透', 'passive', 'passive', { tags: ['projectile', 'pierce'], desc: '投射穿透率与攻击距离', pierceBonus: 0.06, rangeBonus: 0.08 }),
    critStrike: S('critStrike', '致命打击', 'passive', 'passive', { tags: ['phys'], desc: '独立物理暴击', critBonus: 0.02, prereq: 'pierce' }),
    innerSight: S('innerSight', '内视', 'passive', 'active', { tags: ['curse'], desc: '揭示弱点：降低敌人护甲', damageMult: 0.2, cooldown: 10, prereq: 'critStrike', curse: { id: 'innerSight', dur: 8, armorDown: 0.22 } }),
    valkyrie: S('valkyrie', '女武神', 'passive', 'passive', { tags: ['summon'], desc: '召唤近战女武神协同作战，穿刺敌人', summonBonus: 0.12, prereq: 'innerSight', summonKind: 'valkyrie', summonCount: () => 1, summonPal: ['#3a4a6a', '#d4b050', '#f0e0c0'], summonScale: 0.95 }),
    dodge: S('dodge', '躲避', 'passive', 'passive', { tags: ['def'], desc: '减伤与生命', damageReduction: 0.012, hpBonus: 0.03, prereq: 'valkyrie' }),
  },
  sorceress: {
    fireBolt: S('fireBolt', '火弹', 'fire', 'active', { tags: ['projectile', 'fire', 'opener'], desc: '快速火弹', damageMult: 1.35, cooldown: 0, element: 'fire', synergy: [{ skill: 'fireball', pct: 8 }] }),
    fireball: S('fireball', '火球', 'fire', 'active', { tags: ['projectile', 'fire', 'aoe'], desc: '大范围爆炸火球', damageMult: 2.05, cooldown: 0.5, aoe: true, aoeRadius: 2.85, aoePerLevel: 0.08, element: 'fire', prereq: 'fireBolt', synergy: [{ skill: 'fireBolt', pct: 10 }, { skill: 'meteor', pct: 6 }] }),
    fireWall: S('fireWall', '火墙', 'fire', 'active', { tags: ['dot', 'fire', 'aoe'], desc: '宽幅地面火墙', damageMult: 0.95, cooldown: 6, aoe: true, aoeRadius: 3.4, aoePerLevel: 0.06, element: 'fire', prereq: 'fireball', synergy: [{ skill: 'fireball', pct: 8 }] }),
    meteor: S('meteor', '陨石', 'fire', 'active', { tags: ['aoe', 'fire', 'finisher'], desc: '大范围延迟陨石', damageMult: 3.25, cooldown: 7, aoe: true, aoeRadius: 3.55, aoePerLevel: 0.1, element: 'fire', prereq: 'fireWall', synergy: [{ skill: 'fireball', pct: 8 }, { skill: 'fireWall', pct: 7 }] }),
    hydra: S('hydra', '九头蛇', 'fire', 'active', { tags: ['summon', 'fire', 'dot', 'aoe'], desc: '在目标处召唤喷火九头蛇，驻守持续攻击', damageMult: 0.9, cooldown: 6, duration: 10, lingerTick: 0.5, plantSummon: true, summonCap: 3, aoe: true, aoeRadius: 2.1, aoePerLevel: 0.05, element: 'fire', prereq: 'meteor', synergy: [{ skill: 'fireball', pct: 7 }, { skill: 'fireWall', pct: 6 }] }),
    iceBolt: S('iceBolt', '冰弹', 'ice', 'active', { tags: ['projectile', 'ice', 'opener'], desc: '减速冰弹', damageMult: 1.4, cooldown: 0, element: 'ice', synergy: [{ skill: 'glacial', pct: 8 }] }),
    frostNova: S('frostNova', '冰霜新星', 'ice', 'active', { tags: ['aoe', 'ice', 'control', 'nova'], desc: '大环冻结', damageMult: 1.5, cooldown: 4, aoe: true, aoeRadius: 4.6, aoePerLevel: 0.12, element: 'ice', prereq: 'iceBolt', synergy: [{ skill: 'blizzard', pct: 6 }] }),
    glacial: S('glacial', '冰枪', 'ice', 'active', { tags: ['projectile', 'ice', 'pierce'], desc: '穿透冰枪', damageMult: 1.85, cooldown: 2.4, element: 'ice', prereq: 'frostNova', synergy: [{ skill: 'iceBolt', pct: 10 }] }),
    blizzard: S('blizzard', '暴风雪', 'ice', 'active', { tags: ['aoe', 'dot', 'ice', 'finisher'], desc: '大范围持续落冰，覆盖整段冷却', damageMult: 0.55, cooldown: 8, duration: 8, lingerTick: 0.45, aoe: true, aoeRadius: 3.8, aoePerLevel: 0.09, element: 'ice', prereq: 'glacial', synergy: [{ skill: 'frostNova', pct: 8 }, { skill: 'glacial', pct: 6 }] }),
    frozenOrb: S('frozenOrb', '冰封球', 'ice', 'active', { tags: ['projectile', 'ice', 'aoe', 'finisher'], desc: '旋转冰球向外散射', damageMult: 1.65, cooldown: 5, aoe: true, aoeRadius: 3.1, hits: 4, element: 'ice', prereq: 'blizzard', synergy: [{ skill: 'blizzard', pct: 8 }, { skill: 'glacial', pct: 6 }] }),
    chargedBolt: S('chargedBolt', '充能弹', 'lightning', 'active', { tags: ['projectile', 'lightning', 'opener'], desc: '多颗电弹', damageMult: 0.75, cooldown: 0, hits: 5, element: 'lightning', synergy: [{ skill: 'chainLightning', pct: 6 }] }),
    staticField: S('staticField', '静态力场', 'lightning', 'active', { tags: ['aoe', 'lightning', 'window', 'nova'], desc: '大范围削当前生命（Boss 衰减）', damageMult: 1.05, cooldown: 5, aoe: true, aoeRadius: 5.1, aoePerLevel: 0.08, element: 'lightning', prereq: 'chargedBolt', static: true }),
    chainLightning: S('chainLightning', '连锁闪电', 'lightning', 'active', { tags: ['projectile', 'lightning', 'aoe'], desc: '高跳跃闪电', damageMult: 2.15, cooldown: 3.8, chain: 8, aoe: true, aoeRadius: 2.4, element: 'lightning', prereq: 'staticField', synergy: [{ skill: 'chargedBolt', pct: 7 }] }),
    energyShield: S('energyShield', '能量护盾', 'lightning', 'buff', { tags: ['buff'], desc: '部分伤害由护盾承担', shieldPct: 0.08, cooldown: 8, buffDuration: 28, prereq: 'chainLightning' }),
    thunderstorm: S('thunderstorm', '雷暴', 'lightning', 'active', { tags: ['aoe', 'lightning', 'finisher'], desc: '环绕落雷清场', damageMult: 1.45, cooldown: 6.5, aoe: true, aoeRadius: 4.8, aoePerLevel: 0.1, element: 'lightning', prereq: 'energyShield', synergy: [{ skill: 'chainLightning', pct: 8 }, { skill: 'staticField', pct: 5 }] }),
  },
  druid: {
    firestorm: S('firestorm', '火风暴', 'elem', 'active', { tags: ['aoe', 'fire', 'opener'], desc: '螺旋火浪', damageMult: 1.4, cooldown: 3, aoe: true, element: 'fire', synergy: [{ skill: 'fissure', pct: 8 }] }),
    fissure: S('fissure', '裂地术', 'elem', 'active', { tags: ['aoe', 'fire'], desc: '地面喷火', damageMult: 1.6, cooldown: 6, aoe: true, element: 'fire', prereq: 'firestorm', synergy: [{ skill: 'firestorm', pct: 8 }] }),
    tornado: S('tornado', '龙卷风', 'elem', 'active', { tags: ['projectile', 'phys', 'aoe', 'window'], desc: '小型气旋', damageMult: 1.5, cooldown: 4, aoe: true, synergy: [{ skill: 'hurricane', pct: 10 }] }),
    hurricane: S('hurricane', '飓风', 'elem', 'active', { tags: ['aoe', 'ice', 'finisher'], desc: '环绕暴风', damageMult: 1.3, cooldown: 12, aoe: true, element: 'ice', prereq: 'tornado', synergy: [{ skill: 'tornado', pct: 10 }, { skill: 'firestorm', pct: 5 }] }),
    volcano: S('volcano', '火山', 'elem', 'active', { tags: ['aoe', 'fire', 'finisher'], desc: '喷发岩浆柱', damageMult: 1.7, cooldown: 8, aoe: true, aoeRadius: 2.8, element: 'fire', prereq: 'hurricane', synergy: [{ skill: 'fissure', pct: 8 }] }),
    werewolf: S('werewolf', '狼人', 'shape', 'buff', { tags: ['shape', 'opener'], desc: '攻速与伤害（变形）', damageBonus: 0.05, attackSpeed: 0.02, cooldown: 6, buffDuration: 30, exclusive: 'shape' }),
    fury: S('fury', '狂怒', 'shape', 'active', { tags: ['melee', 'phys', 'finisher'], desc: '对周围撕咬', damageMult: 1.2, cooldown: 6, aoe: true, prereq: 'werewolf', synergy: [{ skill: 'werewolf', pct: 10 }] }),
    werebear: S('werebear', '熊人', 'shape', 'buff', { tags: ['shape'], desc: '生命与护甲', hpBonus: 0.08, armorBonus: 0.08, cooldown: 6, buffDuration: 30, exclusive: 'shape', prereq: 'fury' }),
    shockwave: S('shockwave', '冲击波', 'shape', 'active', { tags: ['aoe', 'phys', 'control'], desc: '波状眩晕', damageMult: 1.3, cooldown: 8, aoe: true, prereq: 'werebear', synergy: [{ skill: 'werebear', pct: 9 }] }),
    maul: S('maul', '重殴', 'shape', 'active', { tags: ['melee', 'phys', 'aoe'], desc: '熊形态重殴周围', damageMult: 1.8, cooldown: 5, aoe: true, prereq: 'shockwave', synergy: [{ skill: 'werebear', pct: 10 }] }),
    raven: S('raven', '乌鸦', 'summon', 'passive', { tags: ['summon', 'projectile'], desc: '远程群鸦啄击', summonBonus: 0.08, summonKind: 'raven', summonCount: (lv) => Math.min(5, 2 + Math.floor(lv / 3)), summonPal: ['#1a1a22', '#4a4a58', '#c0c0d0'], summonScale: 0.42 }),
    spiritWolf: S('spiritWolf', '灵狼', 'summon', 'passive', { tags: ['summon'], desc: '近战灵狼撕咬', summonBonus: 0.1, prereq: 'raven', summonKind: 'wolf', summonCount: (lv) => Math.min(3, 1 + Math.floor(lv / 4)), summonPal: ['#6a7a8a', '#c8d0e0', '#e8f0ff'], summonScale: 0.72 }),
    oakSage: S('oakSage', '橡木智者', 'summon', 'passive', { tags: ['summon', 'aura'], desc: '远程生命脉冲，治疗主人', hpBonus: 0.05, prereq: 'spiritWolf', summonKind: 'sage', summonCount: () => 1, summonPal: ['#2a4a20', '#80c040', '#d0f090'], summonScale: 0.8 }),
    grizzly: S('grizzly', '召唤巨熊', 'summon', 'passive', { tags: ['summon', 'finisher'], desc: '近战巨熊坦克，重击可打断', summonBonus: 0.15, prereq: 'oakSage', summonKind: 'bear', summonCount: () => 1, summonPal: ['#4a3018', '#8a6030', '#e0b070'], summonScale: 1.15 }),
    carrion: S('carrion', '食腐藤', 'summon', 'passive', { tags: ['summon'], desc: '生命与回血', hpBonus: 0.04, prereq: 'grizzly' }),
  },
  assassin: {
    fireBlast: S('fireBlast', '火焰爆弹', 'trap', 'active', { tags: ['trap', 'fire', 'opener'], desc: '触发爆炸陷阱', damageMult: 1.5, cooldown: 2, aoe: true, element: 'fire', synergy: [{ skill: 'lightningSentry', pct: 6 }] }),
    lightningSentry: S('lightningSentry', '闪电守卫', 'trap', 'active', { tags: ['trap', 'lightning', 'dot'], desc: '图腾放电', damageMult: 0.8, cooldown: 9, aoe: true, element: 'lightning', prereq: 'fireBlast', synergy: [{ skill: 'fireBlast', pct: 8 }] }),
    deathSentry: S('deathSentry', '死亡守卫', 'trap', 'active', { tags: ['trap', 'fire', 'poison'], desc: '死亡爆炸+毒', damageMult: 2.0, cooldown: 12, aoe: true, element: 'fire', prereq: 'lightningSentry', synergy: [{ skill: 'fireBlast', pct: 9 }] }),
    bladeFury: S('bladeFury', '刀刃之井', 'trap', 'active', { tags: ['trap', 'phys', 'aoe', 'finisher'], desc: '旋转刀刃', damageMult: 1.1, cooldown: 10, aoe: true, prereq: 'deathSentry', synergy: [{ skill: 'lightningSentry', pct: 7 }] }),
    wakeOfFire: S('wakeOfFire', '火焰之浪', 'trap', 'active', { tags: ['trap', 'fire', 'aoe'], desc: '波浪火墙陷阱', damageMult: 1.2, cooldown: 7, aoe: true, aoeRadius: 3.0, element: 'fire', prereq: 'bladeFury', synergy: [{ skill: 'fireBlast', pct: 8 }] }),
    tigerStrike: S('tigerStrike', '虎击', 'martial', 'active', { tags: ['melee', 'combo', 'opener'], desc: '叠充能层', damageMult: 1.2, cooldown: 0 }),
    dragonTalon: S('dragonTalon', '龙爪', 'martial', 'active', { tags: ['melee', 'phys'], desc: '踢击破甲', damageMult: 1.6, cooldown: 5, prereq: 'tigerStrike', synergy: [{ skill: 'phoenix', pct: 6 }] }),
    phoenix: S('phoenix', '凤凰打击', 'martial', 'active', { tags: ['melee', 'fire', 'ice', 'lightning', 'finisher'], desc: '消耗层数三元素波', damageMult: 2.4, cooldown: 8, aoe: true, prereq: 'dragonTalon', synergy: [{ skill: 'tigerStrike', pct: 12 }] }),
    fists: S('fists', '拳刃风暴', 'martial', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '快速多段', damageMult: 0.9, cooldown: 6, aoe: true, hits: 3, prereq: 'phoenix', synergy: [{ skill: 'tigerStrike', pct: 5 }] }),
    dragonFlight: S('dragonFlight', '龙飞', 'martial', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '踢击溅射周围', damageMult: 1.7, cooldown: 6, aoe: true, prereq: 'fists', synergy: [{ skill: 'phoenix', pct: 6 }] }),
    cloak: S('cloak', '暗影斗篷', 'shadow', 'buff', { tags: ['buff'], desc: '降低敌命中（减伤）', damageReduction: 0.03, cooldown: 6, buffDuration: 12 }),
    fade: S('fade', '消隐', 'shadow', 'buff', { tags: ['buff'], desc: '抗性与减伤', allResBonus: 0.04, cooldown: 8, buffDuration: 18, prereq: 'cloak' }),
    shadowWarrior: S('shadowWarrior', '影子战士', 'shadow', 'passive', { tags: ['summon'], desc: '近战分身影袭', summonBonus: 0.12, prereq: 'fade', summonKind: 'shadow', summonCount: () => 1, summonPal: ['#1a1a2a', '#5a4a7a', '#c0a0e0'], summonScale: 0.88 }),
    shadowMaster: S('shadowMaster', '影子大师', 'shadow', 'passive', { tags: ['summon', 'trap'], desc: '远程影刃分身，仿陷阱打击', summonBonus: 0.1, prereq: 'shadowWarrior', summonKind: 'shadow', summonCount: () => 1, summonPal: ['#101018', '#3a2a5a', '#a080d0'], summonScale: 0.95 }),
    mindBlast: S('mindBlast', '心灵震爆', 'shadow', 'active', { tags: ['aoe', 'magic', 'control', 'nova'], desc: '精神冲击周围敌人', damageMult: 1.15, cooldown: 7, aoe: true, aoeRadius: 3.4, element: 'magic', prereq: 'shadowMaster' }),
  },
  paladin: {
    might: S('might', '力量', 'off', 'aura', { tags: ['aura', 'phys'], desc: '物理光环。牺牲伤害提高；与热诚组成近战路线', damageBonus: 0.055, sacrificeAmp: 0.06, auraSlot: 'off' }),
    holyFire: S('holyFire', '圣火', 'off', 'aura', { tags: ['aura', 'fire', 'aoe'], desc: '近身火环持续灼烧，火伤提高。适合清场', fireDmgBonus: 0.045, auraSlot: 'off', prereq: 'might', auraPulse: { element: 'fire', radius: 2.35, mult: 0.28, interval: 1.05 } }),
    fanaticism: S('fanaticism', '狂热', 'off', 'aura', { tags: ['aura'], desc: '攻速与伤害。启用时热诚额外连锁', damageBonus: 0.035, attackSpeed: 0.016, zealExtra: 1, auraSlot: 'off', prereq: 'holyFire' }),
    concentration: S('concentration', '信念', 'off', 'aura', { tags: ['aura'], desc: '降低敌人抗性；圣锤/圣光弹无视护甲并扩大范围', enemyResDown: 0.035, eliteDmgPct: 0.025, magicIgnoreArmor: 0.12, hammerAoe: 0.12, auraSlot: 'off', prereq: 'fanaticism' }),
    holyShock: S('holyShock', '神圣冲击', 'off', 'aura', { tags: ['aura', 'lightning', 'aoe'], desc: '近身电环。启用时天堂之拳额外落雷', lightningDmgBonus: 0.05, auraSlot: 'off', prereq: 'concentration', auraPulse: { element: 'lightning', radius: 2.5, mult: 0.32, interval: 0.95 }, fohExtra: 0.18 }),
    resistFire: S('resistFire', '神圣冰冻', 'def', 'aura', { tags: ['aura', 'ice', 'aoe'], desc: '冰环减速敌人，并提供抗性', allResBonus: 0.028, slowAura: 0.22, auraSlot: 'def', auraPulse: { element: 'ice', radius: 2.7, mult: 0.16, interval: 1.15 } }),
    salvation: S('salvation', '冥想', 'def', 'aura', { tags: ['aura'], desc: '回蓝与冷却。支撑圣锤/天堂之拳循环', allResBonus: 0.02, resRegenPct: 0.08, cdrPct: 0.035, auraSlot: 'def', prereq: 'resistFire' }),
    vigor: S('vigor', '救赎', 'def', 'aura', { tags: ['aura'], desc: '击杀回复生命与魔法，降低牺牲自损', killHeal: 0.012, rangeBonus: 0.03, hpCostReduce: 0.08, resOnKill: 5, auraSlot: 'def', prereq: 'salvation' }),
    holyShield: S('holyShield', '神圣庇护', 'def', 'buff', { tags: ['buff'], desc: '格挡减伤；受击时有几率震慑来犯', damageReduction: 0.045, cooldown: 8, buffDuration: 26, blockStun: 0.18, prereq: 'vigor' }),
    defiance: S('defiance', '圣所', 'def', 'aura', { tags: ['aura'], desc: '护甲与荆棘；对亡灵/恶魔额外伤害并压制亡灵', armorBonus: 0.07, reflectPct: 0.12, vsUndead: 0.18, vsDemon: 0.12, auraSlot: 'def', prereq: 'holyShield' }),
    zeal: S('zeal', '热诚', 'combat', 'active', { tags: ['melee', 'phys', 'combo', 'opener'], desc: '连锁打击。狂热光环下额外连击', damageMult: 1.1, cooldown: 0, hits: 2, synergy: [{ skill: 'sacrifice', pct: 8 }, { skill: 'fanaticism', pct: 6 }] }),
    sacrifice: S('sacrifice', '牺牲', 'combat', 'active', { tags: ['melee', 'phys'], desc: '自损换高伤。力量提高输出，救赎减轻自损', damageMult: 2.05, cooldown: 5, hpCost: 0.045, prereq: 'zeal', synergy: [{ skill: 'zeal', pct: 6 }, { skill: 'might', pct: 7 }] }),
    blessedHammer: S('blessedHammer', '神圣之锤', 'combat', 'active', { tags: ['aoe', 'magic', 'window'], desc: '旋转圣锤。信念下无视护甲、范围更大', damageMult: 1.45, cooldown: 4, aoe: true, aoeRadius: 2.6, aoePerLevel: 0.06, element: 'magic', prereq: 'sacrifice', synergy: [{ skill: 'concentration', pct: 9 }, { skill: 'holyBolt', pct: 5 }] }),
    fistOfHeavens: S('fistOfHeavens', '天堂之拳', 'combat', 'active', { tags: ['aoe', 'lightning', 'finisher'], desc: '天罚落雷，对恶魔更高。神圣冲击下额外电击', damageMult: 2.55, cooldown: 9, aoe: true, aoeRadius: 2.8, element: 'lightning', prereq: 'blessedHammer', synergy: [{ skill: 'holyShock', pct: 8 }, { skill: 'concentration', pct: 5 }] }),
    holyBolt: S('holyBolt', '圣光弹', 'combat', 'active', { tags: ['projectile', 'magic', 'aoe'], desc: '弹跳圣光。命中亡灵/恶魔时治疗自己', damageMult: 1.5, cooldown: 3.5, aoe: true, hits: 2, element: 'magic', holyHeal: 0.03, prereq: 'fistOfHeavens', synergy: [{ skill: 'blessedHammer', pct: 6 }, { skill: 'concentration', pct: 4 }] }),
  },
  necro: {
    raiseSkeleton: S('raiseSkeleton', '骷髅复苏', 'summon', 'passive', { tags: ['summon'], desc: '近战骷髅骨刃，数量与伤害', summonBonus: 0.1, summonKind: 'skel', summonCount: (lv) => Math.min(8, 2 + Math.floor(lv / 2)), summonPal: ['#6a6a58', '#c8c8b0', '#88aa66'], summonScale: 0.62 }),
    skeletonMastery: S('skeletonMastery', '骷髅掌握', 'summon', 'passive', { tags: ['summon'], desc: '召唤物生命与伤', summonBonus: 0.08, hpBonus: 0.03, prereq: 'raiseSkeleton' }),
    clayGolem: S('clayGolem', '黏土石魔', 'summon', 'passive', { tags: ['summon'], desc: '近战坦克石魔，碾压减速', summonBonus: 0.06, prereq: 'skeletonMastery', summonKind: 'golem', summonCount: () => 1, summonPal: ['#5a4030', '#8a6850', '#c4a080'], summonScale: 1.2 }),
    revive: S('revive', '复活', 'summon', 'passive', { tags: ['summon', 'finisher'], desc: '近战尸袭，复活伤害', summonBonus: 0.12, prereq: 'clayGolem', summonKind: 'revived', summonCount: (lv) => Math.min(3, 1 + Math.floor(lv / 4)), summonPal: ['#4a2030', '#a05070', '#e090a0'], summonScale: 0.78 }),
    fireGolem: S('fireGolem', '火焰石魔', 'summon', 'passive', { tags: ['summon', 'fire'], desc: '远程喷火石魔', summonBonus: 0.09, prereq: 'revive', summonKind: 'golem', summonCount: () => 1, summonPal: ['#6a2010', '#e05020', '#ffb070'], summonScale: 1.1 }),
    teeth: S('teeth', '牙', 'poison', 'active', { tags: ['projectile', 'magic', 'opener'], desc: '骨牙', damageMult: 1.1, cooldown: 0, hits: 3, element: 'magic', synergy: [{ skill: 'boneSpear', pct: 8 }] }),
    poisonNova: S('poisonNova', '毒新星', 'poison', 'active', { tags: ['aoe', 'poison', 'dot', 'finisher'], desc: '环状毒', damageMult: 1.5, cooldown: 8, aoe: true, element: 'poison', prereq: 'teeth', synergy: [{ skill: 'teeth', pct: 8 }] }),
    boneSpear: S('boneSpear', '骨矛', 'poison', 'active', { tags: ['projectile', 'magic', 'pierce'], desc: '穿透骨矛', damageMult: 1.8, cooldown: 4, element: 'magic', prereq: 'poisonNova', synergy: [{ skill: 'teeth', pct: 7 }] }),
    corpseExplosion: S('corpseExplosion', '尸爆', 'poison', 'active', { tags: ['aoe', 'fire', 'finisher'], desc: '尸体爆炸（无尸时降系数）', damageMult: 2.2, cooldown: 5, aoe: true, element: 'fire', prereq: 'boneSpear' }),
    boneSpirit: S('boneSpirit', '骨魂', 'poison', 'active', { tags: ['projectile', 'magic'], desc: '追踪骨魂', damageMult: 2.0, cooldown: 5, element: 'magic', prereq: 'corpseExplosion', synergy: [{ skill: 'boneSpear', pct: 8 }] }),
    amplify: S('amplify', '增幅伤害', 'curse', 'active', { tags: ['curse', 'window'], desc: '诅咒：敌人受到的物理伤害提高（唯一诅咒）', damageMult: 0.25, cooldown: 8, curse: { id: 'amplify', dur: 8, physTaken: 0.2 } }),
    weaken: S('weaken', '削弱', 'curse', 'active', { tags: ['curse'], desc: '诅咒：降低敌人攻击力', damageMult: 0.15, cooldown: 10, prereq: 'amplify', curse: { id: 'weaken', dur: 9, dmgDown: 0.16 } }),
    decrepify: S('decrepify', '衰老', 'curse', 'active', { tags: ['curse', 'control'], desc: '诅咒：减速并削弱攻防', damageMult: 0.2, cooldown: 12, prereq: 'weaken', curse: { id: 'decrepify', dur: 7, slow: 0.45, dmgDown: 0.1, physTaken: 0.1 } }),
    lowerResist: S('lowerResist', '降低抗性', 'curse', 'active', { tags: ['curse', 'window'], desc: '诅咒：降低元素抗性，强化毒骨与召唤', damageMult: 0.3, cooldown: 10, prereq: 'decrepify', curse: { id: 'lowerResist', dur: 9, resDown: 0.22 } }),
    lifeTap: S('lifeTap', '生命偷取', 'curse', 'active', { tags: ['curse'], desc: '诅咒：你的伤害按比例吸血', damageMult: 0.22, cooldown: 9, prereq: 'lowerResist', curse: { id: 'lifeTap', dur: 10, leech: 0.1 } }),
  },
};

const SKILL_TREES = {
  berserker: {
    combat: { name: '战斗', skills: ['smash', 'leap', 'stun', 'whirlwind', 'frenzy'] },
    warcry: { name: '战吼', skills: ['howl', 'taunt', 'battleOrders', 'battleCommand', 'warCry'] },
    mastery: { name: '精通', skills: ['weaponMastery', 'tenacity', 'bloodthirst', 'battleMastery', 'deepWounds'] },
  },
  amazon: {
    bow: { name: '弓弩', skills: ['magicArrow', 'multiShot', 'strafe', 'freezeArrow', 'guided'] },
    javelin: { name: '标枪', skills: ['poisonJav', 'plagueJav', 'chargedStrike', 'lightningFury', 'fend'] },
    passive: { name: '被动', skills: ['pierce', 'critStrike', 'innerSight', 'valkyrie', 'dodge'] },
  },
  sorceress: {
    fire: { name: '火系', skills: ['fireBolt', 'fireball', 'fireWall', 'meteor', 'hydra'] },
    ice: { name: '冰系', skills: ['iceBolt', 'frostNova', 'glacial', 'blizzard', 'frozenOrb'] },
    lightning: { name: '电系', skills: ['chargedBolt', 'staticField', 'chainLightning', 'energyShield', 'thunderstorm'] },
  },
  druid: {
    elem: { name: '元素', skills: ['firestorm', 'fissure', 'tornado', 'hurricane', 'volcano'] },
    shape: { name: '变形', skills: ['werewolf', 'fury', 'werebear', 'shockwave', 'maul'] },
    summon: { name: '召唤', skills: ['raven', 'spiritWolf', 'oakSage', 'grizzly', 'carrion'] },
  },
  assassin: {
    trap: { name: '陷阱', skills: ['fireBlast', 'lightningSentry', 'deathSentry', 'bladeFury', 'wakeOfFire'] },
    martial: { name: '武学', skills: ['tigerStrike', 'dragonTalon', 'phoenix', 'fists', 'dragonFlight'] },
    shadow: { name: '影子', skills: ['cloak', 'fade', 'shadowWarrior', 'shadowMaster', 'mindBlast'] },
  },
  paladin: {
    off: { name: '进攻光环（择一）', skills: ['might', 'holyFire', 'fanaticism', 'concentration', 'holyShock'] },
    def: { name: '防守光环（择一）', skills: ['resistFire', 'salvation', 'vigor', 'holyShield', 'defiance'] },
    combat: { name: '战斗', skills: ['zeal', 'sacrifice', 'blessedHammer', 'fistOfHeavens', 'holyBolt'] },
  },
  necro: {
    summon: { name: '召唤', skills: ['raiseSkeleton', 'skeletonMastery', 'clayGolem', 'revive', 'fireGolem'] },
    poison: { name: '毒骨', skills: ['teeth', 'poisonNova', 'boneSpear', 'corpseExplosion', 'boneSpirit'] },
    curse: { name: '诅咒', skills: ['amplify', 'weaken', 'decrepify', 'lowerResist', 'lifeTap'] },
  },
};

(function applySkillReqLevels() {
  const tiers = [1, 6, 12, 18, 24];
  for (const [cid, trees] of Object.entries(SKILL_TREES)) {
    for (const tree of Object.values(trees)) {
      (tree.skills || []).forEach((id, i) => {
        const skill = SKILLS[cid]?.[id];
        if (skill && skill.reqLevel == null) skill.reqLevel = tiers[i] || (1 + i * 6);
      });
    }
  }
})();

(function applySkillWeapons() {
  const treeWeapon = {
    amazon: { bow: 'bow', javelin: 'javelin' },
    berserker: { combat: 'melee' },
    paladin: { combat: 'melee' },
    assassin: { martial: 'melee' },
  };
  for (const [cid, trees] of Object.entries(treeWeapon)) {
    for (const [treeId, wclass] of Object.entries(trees)) {
      for (const sid of SKILL_TREES[cid][treeId].skills) {
        const skill = SKILLS[cid]?.[sid];
        if (skill && skill.type === 'active') skill.reqWeapon = wclass;
      }
    }
  }
})();

const RACES = {
  undead: { id: 'undead', name: '亡灵', res: { poison: 0.35, fire: -0.1, physical: 0.05 } },
  demon: { id: 'demon', name: '恶魔', res: { fire: 0.3, ice: 0.1, physical: 0.05 } },
  beast: { id: 'beast', name: '野兽', res: { physical: 0.1 } },
  humanoid: { id: 'humanoid', name: '人型', res: {} },
  insect: { id: 'insect', name: '昆虫', res: { poison: 0.6, fire: -0.15 } },
  construct: { id: 'construct', name: '构造体', res: { physical: 0.35, lightning: -0.2, poison: 0.9 } },
  elemental: { id: 'elemental', name: '元素', res: { fire: 0.4, ice: 0.2 } },
};

const MONSTER_TYPES = {
  normal: { id: 'normal', name: '普通', hp: 1, dmg: 1, exp: 1, color: '#c8c0b0' },
  elite: { id: 'elite', name: '精英', hp: 2.5, dmg: 1.5, exp: 3, color: '#88aaff' },
  rare: { id: 'rare', name: '稀有', hp: 6, dmg: 2.2, exp: 8, color: '#ffe060' },
  hidden: { id: 'hidden', name: '隐藏', hp: 8.5, dmg: 2.5, exp: 14, color: '#c080ff' },
  goblin: { id: 'goblin', name: '宝藏哥布林', hp: 2.2, dmg: 0.35, exp: 6, color: '#ffd24a' },
  boss: { id: 'boss', name: 'Boss', hp: 1, dmg: 1, exp: 12, color: '#ff6644' },
  rareBoss: { id: 'rareBoss', name: '稀有 Boss', hp: 1.4, dmg: 1.25, exp: 18, color: '#ffaa33' },
  actBoss: { id: 'actBoss', name: '章节 Boss', hp: 1, dmg: 1, exp: 30, color: '#ff2266' },
};

const HIDDEN_BY_ACT = {
  1: [
    { name: '荒原影魔', race: 'demon' },
    { name: '被遗忘者', race: 'undead' },
    { name: '沼底潜伏者', race: 'beast' },
    { name: '神殿窃魂', race: 'undead' },
  ],
  2: [
    { name: '沙海幽魂', race: 'undead' },
    { name: '古墓潜行者', race: 'construct' },
    { name: '干尸王卫', race: 'undead' },
  ],
  3: [
    { name: '密林食魂', race: 'demon' },
    { name: '蛛后残影', race: 'insect' },
    { name: '议会暗探', race: 'demon' },
  ],
  4: [
    { name: '狱隙游荡者', race: 'demon' },
    { name: '天谴残响', race: 'elemental' },
    { name: '混沌裂片', race: 'construct' },
  ],
  5: [
    { name: '冰原猎魂', race: 'undead' },
    { name: '世界石窥视者', race: 'construct' },
    { name: '巴尔暗嗣', race: 'demon' },
  ],
};

const ELITE_AFFIXES = [
  { id: 'extraStrong', name: '超强', dmg: 1.75 },
  { id: 'fast', name: '额外快速', speed: 1.4 },
  { id: 'stoneSkin', name: '石肤', hp: 1.4 },
  { id: 'fireEnchant', name: '火焰增强', fire: 0.3 },
  { id: 'coldEnchant', name: '冰冷增强', ice: 0.3 },
  { id: 'lightningEnchant', name: '闪电增强', lightning: 0.3 },
  { id: 'regen', name: '生命回复', regen: 0.012 },
  { id: 'cursed', name: '诅咒' },
];

const MAPS = [
  { id: 'wasteland', name: '荒芜平原', act: 1, levelMin: 1, levelMax: 4, tiles: 'dirt', packMin: 1, packMax: 2, clearKills: 140, roamKills: 180, monsters: [{ name: '僵尸', race: 'undead' }, { name: '沉沦魔', race: 'demon' }, { name: '腐弓手', race: 'undead', ranged: true }] },
  { id: 'blood_fen', name: '血沼', act: 1, levelMin: 3, levelMax: 7, tiles: 'swamp', packMin: 1, packMax: 3, clearKills: 150, roamKills: 190, unlockPrev: 'wasteland', monsters: [{ name: '沼蛙', race: 'beast' }, { name: '腐尸', race: 'undead' }, { name: '沼地射手', race: 'humanoid', ranged: true }] },
  { id: 'frost_wilderness', name: '霜寒荒野', act: 1, levelMin: 7, levelMax: 12, tiles: 'snow', packMin: 2, packMax: 4, clearKills: 160, roamKills: 200, unlockPrev: 'blood_fen', monsters: [{ name: '堕落游侠', race: 'humanoid', ranged: true }, { name: '骷髅', race: 'undead' }, { name: '冰矛手', race: 'humanoid', ranged: true }] },
  { id: 'cave_ice', name: '寒冰洞窟', act: 1, levelMin: 10, levelMax: 15, tiles: 'ice', packMin: 3, packMax: 4, clearKills: 170, roamKills: 210, unlockPrev: 'frost_wilderness', monsters: [{ name: '冰狼', race: 'beast' }, { name: '洞穴魔', race: 'demon' }, { name: '冰霜法师', race: 'undead', ranged: true }] },
  { id: 'rock_highland', name: '碎石高地', act: 1, levelMin: 13, levelMax: 18, tiles: 'rock', packMin: 3, packMax: 5, clearKills: 180, roamKills: 220, unlockPrev: 'cave_ice', monsters: [{ name: '哥布林', race: 'humanoid' }, { name: '山犬', race: 'beast' }, { name: '投石怪', race: 'humanoid', ranged: true }] },
  { id: 'black_wood', name: '黑森林', act: 1, levelMin: 16, levelMax: 21, tiles: 'forest', packMin: 3, packMax: 5, clearKills: 190, roamKills: 230, unlockPrev: 'rock_highland', monsters: [{ name: '树魔', race: 'beast' }, { name: '黑暗猎手', race: 'humanoid', ranged: true }, { name: '毒弓手', race: 'humanoid', ranged: true }] },
  { id: 'ancient_temple', name: '古老神殿', act: 1, levelMin: 19, levelMax: 23, tiles: 'temple', packMin: 3, packMax: 4, clearKills: 200, roamKills: 240, unlockPrev: 'black_wood', monsters: [{ name: '骷髅法师', race: 'undead', ranged: true }, { name: '神殿卫士', race: 'construct' }] },
  { id: 'dark_crypt', name: '幽暗墓穴', act: 1, levelMin: 22, levelMax: 24, tiles: 'crypt', packMin: 3, packMax: 5, clearKills: 80, roamKills: 80, bossKills: 50, isBoss: true, bossId: 'visna', unlockPrev: 'ancient_temple', monsters: [{ name: '毒蜘蛛', race: 'insect' }, { name: '墓穴骷髅', race: 'undead' }, { name: '墓弓手', race: 'undead', ranged: true }] },
  { id: 'dry_dunes', name: '干裂沙丘', act: 2, levelMin: 24, levelMax: 30, tiles: 'sand', packMin: 3, packMax: 5, clearKills: 200, roamKills: 240, unlockBoss: 'visna', monsters: [{ name: '圣甲虫', race: 'insect' }, { name: '沙虫', race: 'beast' }, { name: '沙弓手', race: 'humanoid', ranged: true }] },
  { id: 'lut_sewer', name: '鲁高因下水道', act: 2, levelMin: 28, levelMax: 33, tiles: 'sewer', packMin: 3, packMax: 5, clearKills: 210, roamKills: 250, unlockPrev: 'dry_dunes', unlockBoss: 'visna', monsters: [{ name: '污水魔', race: 'demon' }, { name: '巨鼠', race: 'beast' }, { name: '瘟疫投掷者', race: 'demon', ranged: true }] },
  { id: 'palace_hall', name: '沙漠王宫', act: 2, levelMin: 31, levelMax: 36, tiles: 'sand', packMin: 3, packMax: 4, clearKills: 220, roamKills: 250, unlockPrev: 'lut_sewer', unlockBoss: 'visna', monsters: [{ name: '卫兵', race: 'humanoid' }, { name: '沙蝎', race: 'insect' }, { name: '宫廷弓手', race: 'humanoid', ranged: true }] },
  { id: 'lost_tomb', name: '失落古墓', act: 2, levelMin: 34, levelMax: 38, tiles: 'tomb', packMin: 3, packMax: 4, clearKills: 90, roamKills: 90, bossKills: 55, isBoss: true, bossId: 'duriel', unlockPrev: 'palace_hall', unlockBoss: 'visna', monsters: [{ name: '木乃伊', race: 'undead' }, { name: '机关守卫', race: 'construct' }, { name: '古墓法师', race: 'undead', ranged: true }] },
  { id: 'jungle_trail', name: '丛林小径', act: 3, levelMin: 38, levelMax: 44, tiles: 'jungle', packMin: 3, packMax: 5, clearKills: 220, roamKills: 260, unlockBoss: 'duriel', monsters: [{ name: '羊头人', race: 'demon' }, { name: '巨蚊', race: 'insect' }, { name: '吹箭野人', race: 'humanoid', ranged: true }] },
  { id: 'spider_forest', name: '蜘蛛森林', act: 3, levelMin: 42, levelMax: 48, tiles: 'jungle', packMin: 4, packMax: 6, clearKills: 230, roamKills: 270, unlockPrev: 'jungle_trail', unlockBoss: 'duriel', monsters: [{ name: '巨蛛', race: 'insect' }, { name: '树精', race: 'beast' }, { name: '蛛网射手', race: 'insect', ranged: true }] },
  { id: 'flayer_dungeon', name: '剥皮魔巢穴', act: 3, levelMin: 46, levelMax: 51, tiles: 'swamp', packMin: 4, packMax: 6, clearKills: 240, roamKills: 280, unlockPrev: 'spider_forest', unlockBoss: 'duriel', monsters: [{ name: '剥皮魔', race: 'demon' }, { name: '巫毒师', race: 'humanoid', ranged: true }] },
  { id: 'kurast_docks', name: '库拉斯特码头', act: 3, levelMin: 49, levelMax: 54, tiles: 'temple', packMin: 3, packMax: 5, clearKills: 250, roamKills: 280, unlockPrev: 'flayer_dungeon', unlockBoss: 'duriel', monsters: [{ name: '泽地魔', race: 'demon' }, { name: '祭师', race: 'humanoid', ranged: true }] },
  { id: 'travincal', name: '崔凡克议会', act: 3, levelMin: 52, levelMax: 56, tiles: 'temple', packMin: 3, packMax: 4, clearKills: 100, roamKills: 100, bossKills: 60, isBoss: true, bossId: 'council', unlockPrev: 'kurast_docks', unlockBoss: 'duriel', monsters: [{ name: '议会卫士', race: 'demon' }, { name: '议会法师', race: 'demon', ranged: true }] },
  { id: 'outer_hell', name: '外围炼狱', act: 4, levelMin: 56, levelMax: 62, tiles: 'hell', packMin: 3, packMax: 5, clearKills: 250, roamKills: 300, unlockBoss: 'council', monsters: [{ name: '末日骑士', race: 'demon' }, { name: '火灵', race: 'elemental', ranged: true }] },
  { id: 'city_damned', name: '天谴之城', act: 4, levelMin: 60, levelMax: 66, tiles: 'hell', packMin: 4, packMax: 6, clearKills: 260, roamKills: 310, unlockPrev: 'outer_hell', unlockBoss: 'council', monsters: [{ name: '恶鬼', race: 'demon' }, { name: '骨魔', race: 'undead' }, { name: '狱火法师', race: 'demon', ranged: true }] },
  { id: 'river_flame', name: '火焰之河', act: 4, levelMin: 64, levelMax: 70, tiles: 'hell', packMin: 4, packMax: 5, clearKills: 270, roamKills: 320, unlockPrev: 'city_damned', unlockBoss: 'council', monsters: [{ name: '熔岩魔', race: 'elemental' }, { name: '深渊骑士', race: 'demon' }, { name: '火雨魔', race: 'elemental', ranged: true }] },
  { id: 'chaos_sanctum', name: '混沌避难所', act: 4, levelMin: 68, levelMax: 74, tiles: 'hell', packMin: 3, packMax: 4, clearKills: 110, roamKills: 110, bossKills: 70, isBoss: true, bossId: 'diablo', unlockPrev: 'river_flame', unlockBoss: 'council', monsters: [{ name: '混沌骑士', race: 'demon' }, { name: '火灵', race: 'elemental', ranged: true }] },
  { id: 'frigid_highlands', name: '冰冻高地', act: 5, levelMin: 72, levelMax: 78, tiles: 'snow', packMin: 4, packMax: 6, clearKills: 280, roamKills: 330, unlockBoss: 'diablo', monsters: [{ name: '狂战士亡魂', race: 'undead' }, { name: '冰魔', race: 'elemental', ranged: true }] },
  { id: 'ancients_way', name: '先祖之路', act: 5, levelMin: 76, levelMax: 82, tiles: 'rock', packMin: 4, packMax: 6, clearKills: 290, roamKills: 340, unlockPrev: 'frigid_highlands', unlockBoss: 'diablo', monsters: [{ name: '长毛象', race: 'beast' }, { name: '冰窟魔', race: 'demon' }, { name: '霜弓亡魂', race: 'undead', ranged: true }] },
  { id: 'worldstone', name: '世界之石要塞', act: 5, levelMin: 80, levelMax: 88, tiles: 'crypt', packMin: 3, packMax: 5, clearKills: 120, roamKills: 120, bossKills: 80, isBoss: true, bossId: 'baal', unlockPrev: 'ancients_way', unlockBoss: 'diablo', monsters: [{ name: '巴尔爪牙', race: 'demon' }, { name: '魂晶守卫', race: 'construct' }, { name: '魂晶法师', race: 'construct', ranged: true }] },
];

const BOSSES = {
  visna: {
    id: 'visna', name: '毒后·薇斯娜', level: 22, hp: 9800, damage: 52, armor: 18,
    race: 'insect', type: 'actBoss',
    resistances: { poison: 0.5, physical: 0.1 },
    phases: [
      { threshold: 1.0, desc: '近战毒爪' },
      { threshold: 0.6, desc: '召唤毒蛛，释放毒雾' },
      { threshold: 0.3, desc: '狂暴：攻速与毒伤提升' },
    ],
    firstKillReward: { unlockChars: [], legendary: true },
  },
  duriel: {
    id: 'duriel', name: '沙虫王·杜瑞尔', level: 34, hp: 26000, damage: 78, armor: 30,
    race: 'beast', type: 'actBoss',
    resistances: { physical: 0.2, ice: -0.2 },
    phases: [
      { threshold: 1.0, desc: '冲锋砸击' },
      { threshold: 0.5, desc: '地震与减速光环' },
    ],
    firstKillReward: { unlockChars: [], legendary: true },
  },
  council: {
    id: 'council', name: '议会三魔', level: 48, hp: 42000, damage: 98, armor: 36,
    race: 'demon', type: 'actBoss',
    resistances: { fire: 0.4, lightning: 0.2 },
    phases: [
      { threshold: 1.0, desc: '三魔轮转攻击' },
      { threshold: 0.4, desc: '合体狂暴' },
    ],
    firstKillReward: { unlockChars: [], legendary: true },
  },
  diablo: {
    id: 'diablo', name: '迪亚波罗', level: 62, hp: 78000, damage: 132, armor: 44,
    race: 'demon', type: 'actBoss',
    resistances: { fire: 0.5, physical: 0.15 },
    phases: [
      { threshold: 1.0, desc: '火骨与闪电' },
      { threshold: 0.5, desc: '红闪冲锋' },
      { threshold: 0.2, desc: '炼狱全屏' },
    ],
    firstKillReward: { unlockChars: [], legendary: true },
  },
  baal: {
    id: 'baal', name: '巴尔', level: 84, hp: 72000, damage: 155, armor: 52,
    race: 'demon', type: 'actBoss',
    resistances: { ice: 0.35, fire: 0.25, physical: 0.2 },
    phases: [
      { threshold: 1.0, desc: '寒冰与分身' },
      { threshold: 0.6, desc: '召唤爪牙浪潮' },
      { threshold: 0.25, desc: '世界之石共鸣' },
    ],
    firstKillReward: { unlockChars: [], legendary: true },
  },
};

const SETS = {
  sigons: {
    id: 'sigons', name: '西刚的守护', pieceCount: 4, reqClass: 'berserker', color: '#c45a3a',
    bonuses: {
      2: { desc: '攻击速度 +15%，护甲 +25；猛击伤害 +20%', attackSpeed: 0.15, armor: 25, skillDmg: { smash: 0.2 } },
      4: { desc: '+2 全技能、生命 +200、减伤 8%；授予旋风斩，旋风伤害 +30%', skillLevel: 2, hp: 200, damageReduction: 0.08, skillGrant: { whirlwind: 1 }, skillDmg: { whirlwind: 0.3 } },
    },
  },
  talrasha: {
    id: 'talrasha', name: '塔拉夏的法理', pieceCount: 4, reqClass: 'sorceress', color: '#8860d0',
    bonuses: {
      2: { desc: '火/冰/电伤害 +18%；火球伤害 +20%', fireDmgPct: 0.18, iceDmgPct: 0.18, lightningDmgPct: 0.18, skillDmg: { fireball: 0.2 } },
      4: { desc: '攻速 +10%、生命 +80、全抗 +12%；授予陨石，陨石伤害 +35%', attackSpeed: 0.1, hp: 80, allRes: 0.12, skillGrant: { meteor: 1 }, skillDmg: { meteor: 0.35 } },
    },
  },
  glory: {
    id: 'glory', name: '亚马逊的荣光', pieceCount: 4, reqClass: 'amazon', color: '#c8a050',
    bonuses: {
      2: { desc: '穿透 +15%，暴击 +6%；多重射击伤害 +20%', pierceBonus: 0.15, critRate: 0.06, skillDmg: { multiShot: 0.2 } },
      4: { desc: '物理伤害 +22%，攻速 +8%；授予导引箭，其伤害 +35%', physDmgPct: 0.22, attackSpeed: 0.08, skillGrant: { guided: 1 }, skillDmg: { guided: 0.35 } },
    },
  },
  windwalk: {
    id: 'windwalk', name: '风行者之息', pieceCount: 4, reqClass: 'druid', color: '#6a8a40',
    bonuses: {
      2: { desc: '物理伤害 +14%，生命 +60；龙卷风伤害 +20%', physDmgPct: 0.14, hp: 60, skillDmg: { tornado: 0.2 } },
      4: { desc: '技能等级 +1，全抗 +10%，召唤伤害 +20%；授予飓风，飓风伤害 +35%', skillLevel: 1, allRes: 0.1, summonBonus: 0.2, skillGrant: { hurricane: 1 }, skillDmg: { hurricane: 0.35 } },
    },
  },
  shadow: {
    id: 'shadow', name: '影舞者套装', pieceCount: 4, reqClass: 'assassin', color: '#a070c0',
    bonuses: {
      2: { desc: '攻速 +12%，暴击 +5%；龙爪伤害 +20%', attackSpeed: 0.12, critRate: 0.05, skillDmg: { dragonTalon: 0.2 } },
      4: { desc: '陷阱与武学伤害 +20%；授予刀刃之井，其伤害 +35%', physDmgPct: 0.12, lightningDmgPct: 0.12, skillGrant: { bladeFury: 1 }, skillDmg: { bladeFury: 0.35 } },
    },
  },
  hallowed: {
    id: 'hallowed', name: '圣光裁决', pieceCount: 4, reqClass: 'paladin', color: '#e8d070',
    bonuses: {
      2: { desc: '护甲 +30，全抗 +8%；热诚伤害 +15%', armor: 30, allRes: 0.08, skillDmg: { zeal: 0.15 } },
      4: { desc: '光环与战斗技能 +1，减伤 6%；授予天堂之拳，其伤害 +35%', skillLevel: 1, damageReduction: 0.06, skillGrant: { fistOfHeavens: 1 }, skillDmg: { fistOfHeavens: 0.35 } },
    },
  },
  trangeir: {
    id: 'trangeir', name: '特兰基尔骨仪', pieceCount: 4, reqClass: 'necro', color: '#b09090',
    bonuses: {
      2: { desc: '召唤伤害 +18%，生命 +50；牙伤害 +20%', summonBonus: 0.18, hp: 50, skillDmg: { teeth: 0.2 } },
      4: { desc: '毒素伤害 +20%，技能等级 +1；授予骨矛，骨矛伤害 +35%', poisonDmgPct: 0.2, skillLevel: 1, skillGrant: { boneSpear: 1 }, skillDmg: { boneSpear: 0.35 } },
    },
  },
};

const AFFIX_KIND = {
  str: 'attr', agi: 'attr', int: 'attr', vit: 'attr', wis: 'attr',
  physDmgPct: 'atk', fireDmgPct: 'atk', iceDmgPct: 'atk', lightningDmgPct: 'atk', poisonDmgPct: 'atk',
  critRate: 'atk', critDmg: 'atk', attackSpeed: 'atk', attackRange: 'atk',
  skillLevel: 'atk', eliteDmgPct: 'atk', resRegenPct: 'atk', aoePct: 'atk', cdrPct: 'atk', summonBonus: 'atk',
  hp: 'def', armor: 'def', lifeRegen: 'def', killHeal: 'def', allRes: 'def',
  lifesteal: 'def', damageReduction: 'def',
};
const AFFIX_SLOT_ATK = ['weapon', 'offhand'];
const AFFIX_SLOT_DEF = ['chest', 'boots'];
const AFFIX_KIND_CAP = 3;

const AFFIX_POOL = {
  prefix: [
    { id: 'str', name: '力量', stat: 'str', min: 10, max: 48, kind: 'attr' },
    { id: 'agi', name: '敏捷', stat: 'agi', min: 10, max: 48, kind: 'attr' },
    { id: 'int', name: '智力', stat: 'int', min: 10, max: 48, kind: 'attr' },
    { id: 'vit', name: '体力', stat: 'vit', min: 10, max: 48, kind: 'attr' },
    { id: 'wis', name: '智慧', stat: 'wis', min: 10, max: 48, kind: 'attr' },
    { id: 'physDmg', name: '物理伤害', stat: 'physDmgPct', min: 5, max: 22, suffix: '%', kind: 'atk' },
    { id: 'fireDmg', name: '火系伤害', stat: 'fireDmgPct', min: 5, max: 22, suffix: '%', kind: 'atk' },
    { id: 'iceDmg', name: '冰系伤害', stat: 'iceDmgPct', min: 5, max: 22, suffix: '%', kind: 'atk' },
    { id: 'lightDmg', name: '电系伤害', stat: 'lightningDmgPct', min: 5, max: 22, suffix: '%', kind: 'atk' },
    { id: 'critRate', name: '暴击率', stat: 'critRate', min: 3, max: 15, suffix: '%', kind: 'atk' },
    { id: 'atkSpd', name: '攻击速度', stat: 'attackSpeed', min: 5, max: 16, suffix: '%', kind: 'atk' },
    { id: 'range', name: '攻击距离', stat: 'attackRange', min: 8, max: 24, suffix: '%', kind: 'atk' },
    { id: 'critDmg', name: '暴击伤害', stat: 'critDmg', min: 12, max: 45, suffix: '%', kind: 'atk' },
  ],
  suffix: [
    { id: 'hp', name: '生命', stat: 'hp', min: 40, max: 220, kind: 'def' },
    { id: 'armor', name: '护甲', stat: 'armor', min: 14, max: 72, kind: 'def' },
    { id: 'lifeRegen', name: '每秒回血', stat: 'lifeRegen', min: 4, max: 20, kind: 'def' },
    { id: 'killHeal', name: '击杀回血', stat: 'killHeal', min: 3, max: 15, suffix: '%', kind: 'def' },
    { id: 'allRes', name: '全抗性', stat: 'allRes', min: 5, max: 16, suffix: '%', kind: 'def' },
  ],
};

const AFFIX_TIER_MAX = 15;
const NAMED_AFFIX_TIER_BANDS = [
  { maxLevel: 10, best: 5, mode: 10 },
  { maxLevel: 20, best: 5, mode: 9 },
  { maxLevel: 30, best: 5, mode: 8 },
  { maxLevel: 40, best: 3, mode: 8 },
  { maxLevel: 50, best: 3, mode: 7 },
  { maxLevel: 60, best: 3, mode: 6 },
  { maxLevel: 70, best: 1, mode: 7 },
  { maxLevel: 80, best: 1, mode: 5 },
  { maxLevel: 110, best: 1, mode: 3 },
];

const EXCLUSIVE_AFFIX_POOL = [
  { id: 'exSkill', name: '全技能等级', stat: 'skillLevel', min: 1, max: 2, kind: 'atk' },
  { id: 'exElite', name: '对精英伤害', stat: 'eliteDmgPct', min: 12, max: 35, suffix: '%', kind: 'atk' },
  { id: 'exRes', name: '资源回复', stat: 'resRegenPct', min: 8, max: 22, suffix: '%', kind: 'atk' },
  { id: 'exAoe', name: '范围半径', stat: 'aoePct', min: 8, max: 22, suffix: '%', kind: 'atk' },
  { id: 'exCdr', name: '冷却缩减', stat: 'cdrPct', min: 6, max: 15, suffix: '%', kind: 'atk' },
  { id: 'exSummon', name: '召唤伤害', stat: 'summonBonus', min: 10, max: 28, suffix: '%', kind: 'atk' },
  { id: 'exLife', name: '吸血', stat: 'lifesteal', min: 3, max: 8, suffix: '%', kind: 'def' },
  { id: 'exDr', name: '伤害减免', stat: 'damageReduction', min: 3, max: 8, suffix: '%', kind: 'def' },
];

const UNIQUE_ITEMS = [
  { id: 'windforce', name: '风之力', slot: 'weapon', weaponClass: 'bow', icon: 'bow', reqClass: 'amazon', quality: 'unique', baseDamage: 38, legendaryEffect: '多重射击额外分裂', morphId: 'pierce', morphSkill: 'multiShot', affixes: [{ stat: 'physDmgPct', value: 22, name: '物理伤害' }, { stat: 'agi', value: 14, name: '敏捷' }, { stat: 'attackSpeed', value: 12, name: '攻击速度' }, { stat: 'attackRange', value: 18, name: '攻击距离' }] },
  { id: 'titans', name: '泰坦之纪', slot: 'weapon', weaponClass: 'javelin', icon: 'javelin', reqClass: 'amazon', quality: 'unique', baseDamage: 34, legendaryEffect: '标枪伤害与回复', morphId: 'trail', morphSkill: 'lightningFury', affixes: [{ stat: 'str', value: 12, name: '力量' }, { stat: 'hp', value: 40, name: '生命' }] },
  { id: 'frostburn', name: '霜燃', slot: 'gloves', reqClass: 'sorceress', quality: 'unique', armor: 8, legendaryEffect: '冰系技能更易冻结', morphId: 'trail', morphSkill: 'blizzard', affixes: [{ stat: 'int', value: 10, name: '智力' }, { stat: 'critRate', value: 8, name: '暴击率' }] },
  { id: 'duriel_shell', name: '督瑞尔的壳', slot: 'chest', quality: 'unique', armor: 32, legendaryEffect: '致命伤害留 1 血并无敌 3 秒（60s）', affixes: [{ stat: 'armor', value: 25, name: '护甲' }, { stat: 'hp', value: 70, name: '生命' }] },
  { id: 'death_mask', name: '死亡之眼', slot: 'helmet', icon: 'helm', reqClass: 'berserker', quality: 'unique', armor: 14, legendaryEffect: '对稀有/Boss 暴击提升', morphId: 'reset', morphSkill: 'whirlwind', affixes: [{ stat: 'critRate', value: 10, name: '暴击率' }, { stat: 'critDmg', value: 30, name: '暴击伤害' }] },
  { id: 'ape_hide', name: '人猿之皮', slot: 'chest', icon: 'robe', reqClass: 'druid', quality: 'unique', armor: 22, legendaryEffect: '变形生命提升', morphId: 'shapecast', morphSkill: 'hurricane', affixes: [{ stat: 'hp', value: 80, name: '生命' }, { stat: 'str', value: 10, name: '力量' }] },
  { id: 'bartucs', name: '巴图克之爪', slot: 'weapon', weaponClass: 'claw', icon: 'claw', reqClass: 'assassin', quality: 'unique', baseDamage: 32, legendaryEffect: '武学连击额外一层', affixes: [{ stat: 'agi', value: 16, name: '敏捷' }, { stat: 'attackSpeed', value: 14, name: '攻击速度' }] },
  { id: 'eschuta', name: '艾斯屈塔之杖', slot: 'weapon', weaponClass: 'caster', icon: 'orb', reqClass: 'sorceress', quality: 'unique', baseDamage: 20, legendaryEffect: '元素技能互相触发', affixes: [{ stat: 'int', value: 18, name: '智力' }, { stat: 'fireDmgPct', value: 16, name: '火系伤害' }, { stat: 'lightningDmgPct', value: 16, name: '电系伤害' }] },
  { id: 'heaven_scepter', name: '天堂权杖', slot: 'weapon', weaponClass: 'melee', icon: 'scepter', reqClass: 'paladin', quality: 'unique', baseDamage: 30, legendaryEffect: '圣锤环绕半径增加', affixes: [{ stat: 'str', value: 12, name: '力量' }, { stat: 'allRes', value: 10, name: '全抗性' }] },
  { id: 'homunculus', name: '魔身之颅', slot: 'weapon', weaponClass: 'caster', icon: 'wand', reqClass: 'necro', quality: 'unique', baseDamage: 19, legendaryEffect: '召唤上限提升', affixes: [{ stat: 'int', value: 14, name: '智力' }, { stat: 'hp', value: 50, name: '生命' }] },
];

const LEGENDARY_ITEMS = [
  { id: 'butcher_cleaver', name: '屠夫的砍刀', slot: 'weapon', weaponClass: 'melee', icon: 'axe', reqClass: 'berserker', quality: 'legendary', baseDamage: 36, legendaryEffect: '攻击 25% 流血', morphId: 'convert', morphSkill: 'smash', affixes: [{ stat: 'physDmgPct', value: 18, name: '物理伤害' }, { stat: 'str', value: 12, name: '力量' }] },
  { id: 'soj', name: '乔丹之石', slot: 'ring1', quality: 'legendary', legendaryEffect: '技能更频繁（攻速）', morphId: 'proc', affixes: [{ stat: 'int', value: 16, name: '智力' }, { stat: 'fireDmgPct', value: 12, name: '火系伤害' }] },
  { id: 'shadowdance', name: '影舞者披风', slot: 'chest', icon: 'robe', reqClass: 'assassin', quality: 'legendary', armor: 18, legendaryEffect: '闪避后下次必暴', affixes: [{ stat: 'agi', value: 14, name: '敏捷' }, { stat: 'critRate', value: 10, name: '暴击率' }] },
  { id: 'sigons_helm', name: '西刚的头盔', slot: 'helmet', icon: 'helm', quality: 'set', setId: 'sigons', reqClass: 'berserker', armor: 12, affixes: [{ stat: 'hp', value: 30, name: '生命' }, { stat: 'armor', value: 10, name: '护甲' }] },
  { id: 'sigons_gloves', name: '西刚的手套', slot: 'gloves', quality: 'set', setId: 'sigons', reqClass: 'berserker', armor: 6, affixes: [{ stat: 'attackSpeed', value: 10, name: '攻击速度' }, { stat: 'str', value: 5, name: '力量' }] },
  { id: 'sigons_boots', name: '西刚的靴子', slot: 'boots', quality: 'set', setId: 'sigons', reqClass: 'berserker', armor: 7, affixes: [{ stat: 'hp', value: 22, name: '生命' }] },
  { id: 'sigons_belt', name: '西刚的腰带', slot: 'belt', quality: 'set', setId: 'sigons', reqClass: 'berserker', armor: 5, affixes: [{ stat: 'armor', value: 8, name: '护甲' }, { stat: 'lifeRegen', value: 3, name: '每秒回血' }] },
  { id: 'glory_bow', name: '荣光长弓', slot: 'weapon', weaponClass: 'bow', icon: 'bow', quality: 'set', setId: 'glory', reqClass: 'amazon', baseDamage: 24, affixes: [{ stat: 'agi', value: 10, name: '敏捷' }, { stat: 'physDmgPct', value: 12, name: '物理伤害' }] },
  { id: 'glory_helm', name: '荣光头盔', slot: 'helmet', icon: 'helm', quality: 'set', setId: 'glory', reqClass: 'amazon', armor: 9, affixes: [{ stat: 'critRate', value: 6, name: '暴击率' }] },
  { id: 'glory_chest', name: '荣光胸甲', slot: 'chest', quality: 'set', setId: 'glory', reqClass: 'amazon', armor: 16, affixes: [{ stat: 'hp', value: 40, name: '生命' }] },
  { id: 'glory_gloves', name: '荣光手套', slot: 'gloves', quality: 'set', setId: 'glory', reqClass: 'amazon', armor: 5, affixes: [{ stat: 'attackSpeed', value: 8, name: '攻击速度' }] },
  { id: 'tal_orb', name: '塔拉夏法珠', slot: 'weapon', weaponClass: 'caster', icon: 'orb', quality: 'set', setId: 'talrasha', reqClass: 'sorceress', baseDamage: 18, affixes: [{ stat: 'int', value: 12, name: '智力' }, { stat: 'fireDmgPct', value: 10, name: '火系伤害' }] },
  { id: 'tal_chest', name: '塔拉夏法袍', slot: 'chest', icon: 'robe', quality: 'set', setId: 'talrasha', reqClass: 'sorceress', armor: 8, affixes: [{ stat: 'hp', value: 35, name: '生命' }, { stat: 'int', value: 8, name: '智力' }] },
  { id: 'tal_belt', name: '塔拉夏腰带', slot: 'belt', quality: 'set', setId: 'talrasha', reqClass: 'sorceress', armor: 4, affixes: [{ stat: 'allRes', value: 8, name: '全抗性' }] },
  { id: 'tal_helm', name: '塔拉夏头饰', slot: 'helmet', icon: 'magehat', quality: 'set', setId: 'talrasha', reqClass: 'sorceress', armor: 6, affixes: [{ stat: 'int', value: 6, name: '智力' }] },
  { id: 'wind_staff', name: '风行者图腾', slot: 'weapon', weaponClass: 'caster', icon: 'totem', quality: 'set', setId: 'windwalk', reqClass: 'druid', baseDamage: 22, affixes: [{ stat: 'int', value: 10, name: '智力' }, { stat: 'physDmgPct', value: 10, name: '物理伤害' }] },
  { id: 'wind_pelt', name: '风行者皮甲', slot: 'chest', icon: 'robe', quality: 'set', setId: 'windwalk', reqClass: 'druid', armor: 14, affixes: [{ stat: 'hp', value: 45, name: '生命' }] },
  { id: 'wind_boots', name: '风行者靴', slot: 'boots', quality: 'set', setId: 'windwalk', reqClass: 'druid', armor: 6, affixes: [{ stat: 'attackSpeed', value: 8, name: '攻击速度' }] },
  { id: 'wind_helm', name: '风行者盔', slot: 'helmet', icon: 'pelt', quality: 'set', setId: 'windwalk', reqClass: 'druid', armor: 8, affixes: [{ stat: 'allRes', value: 7, name: '全抗性' }] },
  { id: 'shadow_claw', name: '影舞者拳刃', slot: 'weapon', weaponClass: 'claw', icon: 'claw', quality: 'set', setId: 'shadow', reqClass: 'assassin', baseDamage: 20, affixes: [{ stat: 'agi', value: 10, name: '敏捷' }, { stat: 'attackSpeed', value: 10, name: '攻击速度' }] },
  { id: 'shadow_helm', name: '影舞者面罩', slot: 'helmet', icon: 'helm', quality: 'set', setId: 'shadow', reqClass: 'assassin', armor: 8, affixes: [{ stat: 'critRate', value: 6, name: '暴击率' }] },
  { id: 'shadow_gloves', name: '影舞者手套', slot: 'gloves', quality: 'set', setId: 'shadow', reqClass: 'assassin', armor: 5, affixes: [{ stat: 'attackSpeed', value: 8, name: '攻击速度' }] },
  { id: 'shadow_boots', name: '影舞者靴', slot: 'boots', quality: 'set', setId: 'shadow', reqClass: 'assassin', armor: 6, affixes: [{ stat: 'agi', value: 8, name: '敏捷' }] },
  { id: 'hall_scepter', name: '圣光权杖', slot: 'weapon', weaponClass: 'melee', icon: 'scepter', quality: 'set', setId: 'hallowed', reqClass: 'paladin', baseDamage: 24, affixes: [{ stat: 'str', value: 10, name: '力量' }, { stat: 'allRes', value: 6, name: '全抗性' }] },
  { id: 'hall_helm', name: '圣光冠冕', slot: 'helmet', icon: 'crown', quality: 'set', setId: 'hallowed', reqClass: 'paladin', armor: 11, affixes: [{ stat: 'armor', value: 10, name: '护甲' }] },
  { id: 'hall_chest', name: '圣光胸甲', slot: 'chest', quality: 'set', setId: 'hallowed', reqClass: 'paladin', armor: 20, affixes: [{ stat: 'hp', value: 40, name: '生命' }] },
  { id: 'hall_gloves', name: '圣光护手', slot: 'gloves', quality: 'set', setId: 'hallowed', reqClass: 'paladin', armor: 7, affixes: [{ stat: 'str', value: 6, name: '力量' }] },
  { id: 'tran_wand', name: '骨仪魔杖', slot: 'weapon', weaponClass: 'caster', icon: 'wand', quality: 'set', setId: 'trangeir', reqClass: 'necro', baseDamage: 16, affixes: [{ stat: 'int', value: 12, name: '智力' }] },
  { id: 'tran_helm', name: '骨仪颅盔', slot: 'helmet', icon: 'bonehelm', quality: 'set', setId: 'trangeir', reqClass: 'necro', armor: 7, affixes: [{ stat: 'hp', value: 28, name: '生命' }] },
  { id: 'tran_chest', name: '骨仪法袍', slot: 'chest', icon: 'robe', quality: 'set', setId: 'trangeir', reqClass: 'necro', armor: 10, affixes: [{ stat: 'int', value: 8, name: '智力' }] },
  { id: 'tran_belt', name: '骨仪腰带', slot: 'belt', quality: 'set', setId: 'trangeir', reqClass: 'necro', armor: 4, affixes: [{ stat: 'allRes', value: 7, name: '全抗性' }] },
];

const BASE_ITEMS = {
  weapon: [
    { name: '短剑', baseDamage: 8, weaponClass: 'melee', icon: 'sword' },
    { name: '长剑', baseDamage: 13, weaponClass: 'melee', icon: 'sword' },
    { name: '重斧', baseDamage: 18, weaponClass: 'melee', icon: 'axe' },
    { name: '战锤', baseDamage: 22, weaponClass: 'melee', icon: 'hammer' },
    { name: '权杖', baseDamage: 16, weaponClass: 'melee', icon: 'scepter', reqClass: 'paladin' },
    { name: '短弓', baseDamage: 11, weaponClass: 'bow', icon: 'bow' },
    { name: '长弓', baseDamage: 16, weaponClass: 'bow', icon: 'bow', reqClass: 'amazon' },
    { name: '轻弩', baseDamage: 14, weaponClass: 'bow', icon: 'crossbow' },
    { name: '十字弩', baseDamage: 20, weaponClass: 'bow', icon: 'crossbow', reqClass: 'amazon' },
    { name: '标枪', baseDamage: 12, weaponClass: 'javelin', icon: 'javelin' },
    { name: '投枪', baseDamage: 17, weaponClass: 'javelin', icon: 'javelin', reqClass: 'amazon' },
    { name: '法杖', baseDamage: 10, weaponClass: 'caster', icon: 'staff' },
    { name: '法珠', baseDamage: 12, weaponClass: 'caster', icon: 'orb', reqClass: 'sorceress' },
    { name: '图腾', baseDamage: 11, weaponClass: 'caster', icon: 'totem', reqClass: 'druid' },
    { name: '魔杖', baseDamage: 9, weaponClass: 'caster', icon: 'wand', reqClass: 'necro' },
    { name: '拳刃', baseDamage: 14, weaponClass: 'claw', icon: 'claw', reqClass: 'assassin' },
    { name: '双刃爪', baseDamage: 19, weaponClass: 'claw', icon: 'claw', reqClass: 'assassin' },
  ],
  helmet: [
    { name: '皮帽', armor: 3, icon: 'helm' },
    { name: '铁盔', armor: 9, icon: 'helm' },
    { name: '法师帽', armor: 2, icon: 'magehat', reqClass: 'sorceress' },
    { name: '德鲁伊头皮', armor: 6, icon: 'pelt', reqClass: 'druid' },
    { name: '圣骑士冠', armor: 8, icon: 'crown', reqClass: 'paladin' },
    { name: '骨盔', armor: 5, icon: 'bonehelm', reqClass: 'necro' },
  ],
  chest: [
    { name: '皮甲', armor: 11, icon: 'chest' },
    { name: '锁甲', armor: 22, icon: 'chest', reqClass: 'berserker' },
    { name: '法袍', armor: 6, icon: 'robe', reqClass: 'sorceress' },
    { name: '影衣', armor: 12, icon: 'robe', reqClass: 'assassin' },
    { name: '骨甲', armor: 14, icon: 'chest', reqClass: 'necro' },
  ],
  gloves: [{ name: '皮手套', armor: 2 }, { name: '铁手套', armor: 6 }, { name: '法师手套', armor: 3, reqClass: 'sorceress' }],
  boots: [{ name: '皮靴', armor: 3 }, { name: '铁靴', armor: 7 }, { name: '猎手靴', armor: 4, reqClass: 'amazon' }],
  belt: [{ name: '皮腰带', armor: 2 }, { name: '铁腰带', armor: 5 }, { name: '战斗腰带', armor: 6, reqClass: 'berserker' }],
  necklace: [{ name: '铜项链' }, { name: '银项链' }],
  ring1: [{ name: '铜戒指' }, { name: '银戒指' }],
  ring2: [{ name: '铜戒指' }, { name: '银戒指' }],
  offhand: [
    { name: '木盾', armor: 9, offhandClass: 'shield', icon: 'shield' },
    { name: '铁盾', armor: 16, offhandClass: 'shield', icon: 'shield', reqClass: 'paladin' },
    { name: '箭袋', armor: 2, offhandClass: 'quiver', icon: 'quiver', attackSpeed: 0.06 },
    { name: '猎手箭袋', armor: 3, offhandClass: 'quiver', icon: 'quiver', attackSpeed: 0.1, reqClass: 'amazon' },
  ],
};

function expForLevel(level) {
  const n = Math.max(1, Math.min(110, level));
  let e = 95 * n + 26 * n * n;
  if (n >= 20) e *= 1 + (n - 19) * 0.05;
  if (n >= 40) e *= 1 + (n - 39) * 0.085;
  if (n >= 60) e *= 1 + Math.min(n - 59, 15) * 0.08;
  if (n >= 75) e *= 1 + (n - 74) * 0.035;
  if (n >= 90) e *= 1 + (n - 89) * 0.05;
  return Math.floor(e);
}

function monsterStats(level) {
  const n = Math.max(1, Math.min(110, level));
  let hp = 38 + n * 18 + n * n * 0.42;
  let dmg = 1.8 + n * 0.58;
  let armor = n * 0.55;
  if (n >= 20) {
    const k = 1 + (n - 19) * 0.04;
    hp *= k; dmg *= 1 + (n - 19) * 0.016;
  }
  if (n >= 40) {
    hp *= 1 + (n - 39) * 0.055;
    dmg *= 1 + (n - 39) * 0.02;
  }
  if (n >= 60) {
    hp *= 1 + (n - 59) * 0.075;
    dmg *= 1 + (n - 59) * 0.026;
  }
  if (n >= 80) {
    hp *= 1 + (n - 79) * 0.1;
    dmg *= 1 + (n - 79) * 0.03;
  }
  if (n >= 100) {
    hp *= 1 + (n - 99) * 0.12;
    dmg *= 1 + (n - 99) * 0.035;
  }
  return {
    hp: Math.floor(hp),
    damage: Math.max(1, Math.floor(dmg)),
    armor: Math.floor(armor),
    exp: Math.floor(4 + n * 2.4 * (n >= 75 ? 1 + (n - 74) * 0.015 : 1)),
    gold: Math.floor(3 + n * 1.6),
  };
}

const TOWN_UNLOCK_MAP = 'blood_fen';
const WAREHOUSE_BASE_CAP = 32;
const POTION_TIERS = [
  { lv: 1, name: '初级', healPct: 0.30, manaPct: 0.30, unitCost: 18 },
  { lv: 2, name: '次级', healPct: 0.45, manaPct: 0.40, unitCost: 32 },
  { lv: 3, name: '中级', healPct: 0.55, manaPct: 0.50, unitCost: 52 },
  { lv: 4, name: '高级', healPct: 0.70, manaPct: 0.65, unitCost: 82 },
  { lv: 5, name: '超级', healPct: 0.85, manaPct: 0.80, unitCost: 125 },
];
const POTION_PACK = 10;
const TOWN_BUILDINGS = [
  { id: 'hall', name: '议事厅', blurb: '升级解锁训练', x: 50, y: 48 },
  { id: 'warehouse', name: '仓库', blurb: '跨职业存放', x: 18, y: 38 },
  { id: 'smith', name: '铁匠铺', blurb: '强化 / 洗练 / 分解', x: 24, y: 72 },
  { id: 'market', name: '商会', blurb: '药水与补给', x: 78, y: 42 },
  { id: 'yard', name: '训练场', blurb: '永久属性', x: 48, y: 18 },
  { id: 'shrine', name: '神龛', blurb: '后续开放', x: 82, y: 18 },
  { id: 'clinic', name: '药房', blurb: '药水与自动补给', x: 76, y: 74 },
];

const WEAPON_SALVAGE_SLOTS = new Set(['weapon', 'offhand']);
const JEWEL_SALVAGE_SLOTS = new Set(['necklace', 'ring1', 'ring2']);

function itemEnhanceCapPct(quality) {
  if (quality === 'rare') return 0.3;
  if (quality === 'set' || quality === 'unique' || quality === 'legendary') return 0.5;
  if (quality === 'ancient' || quality === 'ancientSet' || quality === 'ancientUnique') return 0.75;
  return 0;
}

function itemEnhanceBonus(item) {
  const cap = itemEnhanceCapPct(item?.quality);
  if (!cap) return 0;
  return cap * Math.min(10, item.enhance || 0) / 10;
}

function itemEnhanceMult(item) {
  return 1 + itemEnhanceBonus(item);
}

const TRAIN_MAX = 20;
const TRAIN_DEFS = [
  {
    id: 'hp', name: '生命', desc: '提高最大生命',
    hall: 1, per: 14, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'armor', name: '防御', desc: '提高护甲',
    hall: 2, per: 2.5, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'allRes', name: '全抗性', desc: '提高全元素抗性',
    hall: 3, per: 0.008, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'str', name: '力量', desc: '提高力量',
    hall: 1, per: 2, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'agi', name: '敏捷', desc: '提高敏捷',
    hall: 2, per: 2, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'int', name: '智力', desc: '提高智力',
    hall: 3, per: 2, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'vit', name: '体力', desc: '提高体力（并增加生命）',
    hall: 1, per: 2, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'wisdom', name: '智慧', desc: '提高智慧（资源上限与回复）',
    hall: 4, per: 5, max: TRAIN_MAX, unit: '',
  },
  {
    id: 'damage', name: '攻击力', desc: '提高角色攻击力',
    hall: 1, per: 0.03, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'attackSpeed', name: '攻击速度', desc: '提高攻速',
    hall: 2, per: 0.02, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'physDmg', name: '物理伤害', desc: '提高物理伤害加成',
    hall: 3, per: 0.025, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'elemDmg', name: '元素伤害', desc: '火/冰/电/毒伤害',
    hall: 4, per: 0.025, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'attackRange', name: '攻击范围', desc: '提高普攻与技能射程',
    hall: 5, per: 0.03, max: TRAIN_MAX, unit: '%',
  },
  {
    id: 'cdr', name: '冷却缩减', desc: '缩短技能冷却',
    hall: 6, per: 0.015, max: TRAIN_MAX, unit: '%',
  },
];

const HALL_MAX = 6;

function heroTrainBonuses(hero) {
  const out = {};
  for (const def of TRAIN_DEFS) out[def.id] = 0;
  const t = hero?.train;
  if (!t) return out;
  for (const def of TRAIN_DEFS) {
    if (!t.unlocked?.[def.id]) continue;
    const lv = Math.min(def.max || TRAIN_MAX, Math.max(0, t.lv?.[def.id] || 0));
    out[def.id] = lv * def.per;
  }
  return out;
}

const DEFAULT_SKILLS = {
  berserker: ['smash'],
  amazon: ['magicArrow'],
  sorceress: ['fireBolt'],
  druid: ['raven'],
  assassin: ['tigerStrike'],
  paladin: ['zeal'],
  necro: ['teeth'],
};
