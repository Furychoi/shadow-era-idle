// 暗影纪元：放置编年史 — GDD v1.1 数据

export const QUALITY = {
  normal: { id: 'normal', name: '普通', color: '#c8c8c8', affixCount: [0, 0] },
  magic: { id: 'magic', name: '魔法', color: '#4488ff', affixCount: [1, 2] },
  rare: { id: 'rare', name: '稀有', color: '#e8d44a', affixCount: [3, 4] },
  set: { id: 'set', name: '套装', color: '#22cc55', affixCount: [2, 3] },
  unique: { id: 'unique', name: '暗金', color: '#c7a24a', affixCount: [4, 6] },
  legendary: { id: 'legendary', name: '传奇', color: '#ff8800', affixCount: [3, 5] },
  ancient: { id: 'ancient', name: '远古传奇', color: '#ff4444', affixCount: [4, 6] },
};

export const QUALITY_WEIGHTS = [
  { quality: 'normal', weight: 42 },
  { quality: 'magic', weight: 28 },
  { quality: 'rare', weight: 14 },
  { quality: 'set', weight: 6 },
  { quality: 'unique', weight: 4 },
  { quality: 'legendary', weight: 4.5 },
  { quality: 'ancient', weight: 1.5 },
];

export const SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'necklace', 'ring1', 'ring2', 'offhand'];
export const SLOT_NAMES = {
  weapon: '武器', helmet: '头盔', chest: '胸甲', gloves: '手套', boots: '靴子',
  belt: '腰带', necklace: '项链', ring1: '戒指', ring2: '戒指', offhand: '副手',
};

export const MORPHS = {
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

export const CHARACTERS = {
  berserker: {
    id: 'berserker', name: '狂战士', mainStat: 'str', icon: '斧',
    desc: '近战物理、怒气旋风、战吼减伤',
    unlock: null, palette: ['#6a3030', '#c45a3a', '#e8c090'],
    baseHp: 130, baseDamage: 16, baseArmor: 9, attackInterval: 1.15,
  },
  amazon: {
    id: 'amazon', name: '亚马逊', mainStat: 'agi', icon: '弓',
    desc: '弓弩/标枪远程，穿透层与女武神',
    unlock: null, palette: ['#2a4a6a', '#c8a050', '#f0d8a0'],
    baseHp: 95, baseDamage: 14, baseArmor: 5, attackInterval: 0.95,
  },
  sorceress: {
    id: 'sorceress', name: '元素师', mainStat: 'int', icon: '法',
    desc: '火冰电三系爆发，玻璃大炮',
    unlock: { type: 'boss', boss: 'visna' }, palette: ['#3a2a6a', '#8860d0', '#d0c8f0'],
    baseHp: 72, baseDamage: 13, baseArmor: 3, attackInterval: 1.0,
  },
  druid: {
    id: 'druid', name: '德鲁伊', mainStat: 'int', icon: '德',
    desc: '风暴元素、狼熊变形、召唤灵兽',
    unlock: { type: 'boss', boss: 'duriel' }, palette: ['#2a4a2a', '#6a8a40', '#c8d090'],
    baseHp: 100, baseDamage: 13, baseArmor: 6, attackInterval: 1.1,
  },
  assassin: {
    id: 'assassin', name: '暗影刺客', mainStat: 'agi', icon: '刺',
    desc: '陷阱铺场、武学聚气、影子分身',
    unlock: { type: 'boss', boss: 'duriel' }, palette: ['#1a1a2a', '#4a3a6a', '#c0a0d0'],
    baseHp: 88, baseDamage: 15, baseArmor: 5, attackInterval: 0.9,
  },
  paladin: {
    id: 'paladin', name: '圣骑士', mainStat: 'str', icon: '圣',
    desc: '双光环、热诚连锁、裁决降抗',
    unlock: { type: 'boss', boss: 'council' }, palette: ['#3a3a1a', '#d4b050', '#f0e8c8'],
    baseHp: 115, baseDamage: 14, baseArmor: 10, attackInterval: 1.05,
  },
  necro: {
    id: 'necro', name: '死灵法师', mainStat: 'int', icon: '灵',
    desc: '尸潮、毒素、诅咒降抗',
    unlock: { type: 'boss', boss: 'diablo' }, palette: ['#2a1a2a', '#6a4a6a', '#b09090'],
    baseHp: 80, baseDamage: 12, baseArmor: 4, attackInterval: 1.05,
  },
};

function S(id, name, tree, type, extra) {
  return { id, name, tree, type, maxLevel: 10, prereq: extra.prereq ?? null, ...extra };
}

export const SKILLS = {
  berserker: {
    smash: S('smash', '猛击', 'combat', 'active', { tags: ['melee', 'phys', 'opener'], desc: '武器伤害打击，可击晕', damageMult: 1.6, cooldown: 0, stunChance: 0.2, synergy: [{ skill: 'leap', pct: 8 }, { skill: 'stun', pct: 4 }] }),
    leap: S('leap', '跃击', 'combat', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '跳砸周围敌人', damageMult: 1.9, cooldown: 5, aoe: true, prereq: 'smash', synergy: [{ skill: 'smash', pct: 10 }] }),
    stun: S('stun', '击晕', 'combat', 'active', { tags: ['melee', 'control', 'window'], desc: '高硬直打击，开启旋风窗口', damageMult: 1.4, cooldown: 6, prereq: 'leap', synergy: [{ skill: 'smash', pct: 8 }] }),
    whirlwind: S('whirlwind', '旋风斩', 'combat', 'active', { tags: ['melee', 'aoe', 'phys', 'finisher'], desc: '持续旋转，消耗怒气感（CD）', damageMult: 0.9, cooldown: 9, aoe: true, dot: true, prereq: 'stun', synergy: [{ skill: 'leap', pct: 7 }, { skill: 'weaponMastery', pct: 5 }] }),
    howl: S('howl', '嚎叫', 'warcry', 'active', { tags: ['control', 'opener'], desc: '小怪短暂溃逃，降低其伤害', damageMult: 0.3, cooldown: 8, synergy: [{ skill: 'taunt', pct: 5 }] }),
    taunt: S('taunt', '嘲讽', 'warcry', 'aura', { tags: ['aura'], desc: '拉怪，自身减伤', damageReduction: 0.04, prereq: 'howl' }),
    battleOrders: S('battleOrders', '战斗体制', 'warcry', 'buff', { tags: ['buff'], desc: '最大生命提升', hpBonus: 0.06, cooldown: 30, prereq: 'taunt' }),
    battleCommand: S('battleCommand', '战斗命令', 'warcry', 'buff', { tags: ['buff'], desc: '全技能等级 +1（每 5 级再 +1）', skillBonus: 1, cooldown: 40, prereq: 'battleOrders' }),
    weaponMastery: S('weaponMastery', '武器精通', 'mastery', 'passive', { tags: ['phys', 'melee'], desc: '近战伤害', damageBonus: 0.08 }),
    tenacity: S('tenacity', '钢铁之肤', 'mastery', 'passive', { tags: ['melee'], desc: '护甲与生命', armorBonus: 0.1, hpBonus: 0.04, prereq: 'weaponMastery' }),
    bloodthirst: S('bloodthirst', '嗜血', 'mastery', 'passive', { tags: ['melee'], desc: '吸血', lifesteal: 0.018, prereq: 'tenacity' }),
    battleMastery: S('battleMastery', '战斗精通', 'mastery', 'passive', { tags: ['melee', 'phys'], desc: '命中与暴击', critBonus: 0.012, prereq: 'bloodthirst' }),
  },
  amazon: {
    magicArrow: S('magicArrow', '魔法箭', 'bow', 'active', { tags: ['projectile', 'magic', 'opener'], desc: '不耗箭的魔法箭', damageMult: 1.3, cooldown: 0, element: 'magic', synergy: [{ skill: 'multiShot', pct: 4 }] }),
    multiShot: S('multiShot', '多重射击', 'bow', 'active', { tags: ['projectile', 'aoe', 'phys'], desc: '分裂箭矢清场', damageMult: 0.85, cooldown: 3, aoe: true, hits: 3, prereq: 'magicArrow', synergy: [{ skill: 'magicArrow', pct: 7 }, { skill: 'pierce', pct: 4 }] }),
    strafe: S('strafe', '扫射', 'bow', 'active', { tags: ['projectile', 'aoe', 'phys', 'finisher'], desc: '对场上逐个点射', damageMult: 1.1, cooldown: 7, aoe: true, prereq: 'multiShot', synergy: [{ skill: 'guided', pct: 8 }] }),
    freezeArrow: S('freezeArrow', '冻结箭', 'bow', 'active', { tags: ['projectile', 'ice', 'aoe'], desc: '爆炸冻结', damageMult: 1.6, cooldown: 8, aoe: true, element: 'ice', prereq: 'strafe', synergy: [{ skill: 'magicArrow', pct: 6 }] }),
    poisonJav: S('poisonJav', '毒枪', 'javelin', 'active', { tags: ['projectile', 'poison', 'dot', 'opener'], desc: '直线毒云', damageMult: 1.2, cooldown: 4, element: 'poison', synergy: [{ skill: 'plagueJav', pct: 12 }] }),
    plagueJav: S('plagueJav', '瘟疫标枪', 'javelin', 'active', { tags: ['projectile', 'poison', 'aoe', 'window'], desc: '落地毒池', damageMult: 1.4, cooldown: 7, aoe: true, element: 'poison', prereq: 'poisonJav', synergy: [{ skill: 'poisonJav', pct: 10 }] }),
    chargedStrike: S('chargedStrike', '充能一击', 'javelin', 'active', { tags: ['melee', 'lightning'], desc: '近战闪电充能', damageMult: 1.7, cooldown: 5, element: 'lightning', prereq: 'plagueJav', synergy: [{ skill: 'lightningFury', pct: 8 }] }),
    lightningFury: S('lightningFury', '闪电之怒', 'javelin', 'active', { tags: ['projectile', 'lightning', 'aoe', 'finisher'], desc: '标枪爆炸放出电球', damageMult: 2.2, cooldown: 10, aoe: true, element: 'lightning', hits: 4, prereq: 'chargedStrike', synergy: [{ skill: 'poisonJav', pct: 6 }, { skill: 'chargedStrike', pct: 7 }] }),
    pierce: S('pierce', '穿透', 'passive', 'passive', { tags: ['projectile', 'pierce'], desc: '投射穿透率', pierceBonus: 0.06 }),
    critStrike: S('critStrike', '致命打击', 'passive', 'passive', { tags: ['phys'], desc: '独立物理暴击', critBonus: 0.02, prereq: 'pierce' }),
    innerSight: S('innerSight', '内视', 'passive', 'active', { tags: ['curse'], desc: '降低敌人闪避', damageMult: 0.2, cooldown: 10, prereq: 'critStrike' }),
    valkyrie: S('valkyrie', '女武神', 'passive', 'passive', { tags: ['summon'], desc: '召唤物伤害与生命（计入技能 DPS）', summonBonus: 0.12, prereq: 'innerSight' }),
  },
  sorceress: {
    fireBolt: S('fireBolt', '火弹', 'fire', 'active', { tags: ['projectile', 'fire', 'opener'], desc: '快速火弹', damageMult: 1.2, cooldown: 0, element: 'fire', synergy: [{ skill: 'fireball', pct: 8 }] }),
    fireball: S('fireball', '火球', 'fire', 'active', { tags: ['projectile', 'fire', 'aoe'], desc: '爆炸火球', damageMult: 1.8, cooldown: 2, aoe: true, element: 'fire', prereq: 'fireBolt', synergy: [{ skill: 'fireBolt', pct: 10 }, { skill: 'meteor', pct: 6 }] }),
    fireWall: S('fireWall', '火墙', 'fire', 'active', { tags: ['dot', 'fire', 'aoe'], desc: '地面火墙', damageMult: 0.7, cooldown: 8, aoe: true, element: 'fire', prereq: 'fireball', synergy: [{ skill: 'fireball', pct: 8 }] }),
    meteor: S('meteor', '陨石', 'fire', 'active', { tags: ['aoe', 'fire', 'finisher'], desc: '延迟巨石', damageMult: 3.0, cooldown: 10, aoe: true, element: 'fire', prereq: 'fireWall', synergy: [{ skill: 'fireball', pct: 8 }, { skill: 'fireWall', pct: 7 }] }),
    iceBolt: S('iceBolt', '冰弹', 'ice', 'active', { tags: ['projectile', 'ice', 'opener'], desc: '减速冰弹', damageMult: 1.3, cooldown: 0, element: 'ice', synergy: [{ skill: 'glacial', pct: 8 }] }),
    frostNova: S('frostNova', '冰霜新星', 'ice', 'active', { tags: ['aoe', 'ice', 'control'], desc: '环状冻结', damageMult: 1.1, cooldown: 6, aoe: true, element: 'ice', prereq: 'iceBolt', synergy: [{ skill: 'blizzard', pct: 6 }] }),
    glacial: S('glacial', '冰枪', 'ice', 'active', { tags: ['projectile', 'ice', 'pierce'], desc: '穿透冰枪', damageMult: 1.7, cooldown: 3, element: 'ice', prereq: 'frostNova', synergy: [{ skill: 'iceBolt', pct: 10 }] }),
    blizzard: S('blizzard', '暴风雪', 'ice', 'active', { tags: ['aoe', 'dot', 'ice', 'finisher'], desc: '持续落冰', damageMult: 1.0, cooldown: 11, aoe: true, element: 'ice', prereq: 'glacial', synergy: [{ skill: 'frostNova', pct: 8 }, { skill: 'glacial', pct: 6 }] }),
    chargedBolt: S('chargedBolt', '充能弹', 'lightning', 'active', { tags: ['projectile', 'lightning', 'opener'], desc: '多颗电弹', damageMult: 0.7, cooldown: 0, hits: 3, element: 'lightning', synergy: [{ skill: 'chainLightning', pct: 6 }] }),
    staticField: S('staticField', '静态力场', 'lightning', 'active', { tags: ['aoe', 'lightning', 'window'], desc: '削减当前生命（Boss 衰减）', damageMult: 0.9, cooldown: 7, aoe: true, element: 'lightning', prereq: 'chargedBolt', static: true }),
    chainLightning: S('chainLightning', '连锁闪电', 'lightning', 'active', { tags: ['projectile', 'lightning', 'aoe'], desc: '跳跃闪电', damageMult: 1.9, cooldown: 6, chain: 5, element: 'lightning', prereq: 'staticField', synergy: [{ skill: 'chargedBolt', pct: 7 }] }),
    energyShield: S('energyShield', '能量护盾', 'lightning', 'buff', { tags: ['buff'], desc: '部分伤害由护盾承担', shieldPct: 0.08, cooldown: 35, prereq: 'chainLightning' }),
  },
  druid: {
    firestorm: S('firestorm', '火风暴', 'elem', 'active', { tags: ['aoe', 'fire', 'opener'], desc: '螺旋火浪', damageMult: 1.4, cooldown: 3, aoe: true, element: 'fire', synergy: [{ skill: 'fissure', pct: 8 }] }),
    fissure: S('fissure', '裂地术', 'elem', 'active', { tags: ['aoe', 'fire'], desc: '地面喷火', damageMult: 1.6, cooldown: 6, aoe: true, element: 'fire', prereq: 'firestorm', synergy: [{ skill: 'firestorm', pct: 8 }] }),
    tornado: S('tornado', '龙卷风', 'elem', 'active', { tags: ['projectile', 'phys', 'aoe', 'window'], desc: '小型气旋', damageMult: 1.5, cooldown: 4, aoe: true, synergy: [{ skill: 'hurricane', pct: 10 }] }),
    hurricane: S('hurricane', '飓风', 'elem', 'active', { tags: ['aoe', 'ice', 'finisher'], desc: '环绕暴风', damageMult: 1.3, cooldown: 12, aoe: true, element: 'ice', prereq: 'tornado', synergy: [{ skill: 'tornado', pct: 10 }, { skill: 'firestorm', pct: 5 }] }),
    werewolf: S('werewolf', '狼人', 'shape', 'buff', { tags: ['shape', 'opener'], desc: '攻速与伤害（变形）', damageBonus: 0.05, cooldown: 20 }),
    fury: S('fury', '狂怒', 'shape', 'active', { tags: ['melee', 'phys', 'finisher'], desc: '对周围撕咬', damageMult: 1.2, cooldown: 6, aoe: true, prereq: 'werewolf', synergy: [{ skill: 'werewolf', pct: 10 }] }),
    werebear: S('werebear', '熊人', 'shape', 'buff', { tags: ['shape'], desc: '生命与护甲', hpBonus: 0.08, armorBonus: 0.08, cooldown: 20, prereq: 'fury' }),
    shockwave: S('shockwave', '冲击波', 'shape', 'active', { tags: ['aoe', 'phys', 'control'], desc: '波状眩晕', damageMult: 1.3, cooldown: 8, aoe: true, prereq: 'werebear', synergy: [{ skill: 'werebear', pct: 9 }] }),
    raven: S('raven', '乌鸦', 'summon', 'passive', { tags: ['summon', 'projectile'], desc: '群鸦啄击', summonBonus: 0.08 }),
    spiritWolf: S('spiritWolf', '灵狼', 'summon', 'passive', { tags: ['summon'], desc: '灵狼伤害', summonBonus: 0.1, prereq: 'raven' }),
    oakSage: S('oakSage', '橡木智者', 'summon', 'passive', { tags: ['summon', 'aura'], desc: '生命光环', hpBonus: 0.05, prereq: 'spiritWolf' }),
    grizzly: S('grizzly', '召唤巨熊', 'summon', 'passive', { tags: ['summon', 'finisher'], desc: '巨熊坦克与输出', summonBonus: 0.15, prereq: 'oakSage' }),
  },
  assassin: {
    fireBlast: S('fireBlast', '火焰爆弹', 'trap', 'active', { tags: ['trap', 'fire', 'opener'], desc: '触发爆炸陷阱', damageMult: 1.5, cooldown: 2, aoe: true, element: 'fire', synergy: [{ skill: 'lightningSentry', pct: 6 }] }),
    lightningSentry: S('lightningSentry', '闪电守卫', 'trap', 'active', { tags: ['trap', 'lightning', 'dot'], desc: '图腾放电', damageMult: 0.8, cooldown: 9, aoe: true, element: 'lightning', prereq: 'fireBlast', synergy: [{ skill: 'fireBlast', pct: 8 }] }),
    deathSentry: S('deathSentry', '死亡守卫', 'trap', 'active', { tags: ['trap', 'fire', 'poison'], desc: '死亡爆炸+毒', damageMult: 2.0, cooldown: 12, aoe: true, element: 'fire', prereq: 'lightningSentry', synergy: [{ skill: 'fireBlast', pct: 9 }] }),
    bladeFury: S('bladeFury', '刀刃之井', 'trap', 'active', { tags: ['trap', 'phys', 'aoe', 'finisher'], desc: '旋转刀刃', damageMult: 1.1, cooldown: 10, aoe: true, prereq: 'deathSentry', synergy: [{ skill: 'lightningSentry', pct: 7 }] }),
    tigerStrike: S('tigerStrike', '虎击', 'martial', 'active', { tags: ['melee', 'combo', 'opener'], desc: '叠充能层', damageMult: 1.2, cooldown: 0 }),
    dragonTalon: S('dragonTalon', '龙爪', 'martial', 'active', { tags: ['melee', 'phys'], desc: '踢击破甲', damageMult: 1.6, cooldown: 5, prereq: 'tigerStrike', synergy: [{ skill: 'phoenix', pct: 6 }] }),
    phoenix: S('phoenix', '凤凰打击', 'martial', 'active', { tags: ['melee', 'fire', 'ice', 'lightning', 'finisher'], desc: '消耗层数三元素波', damageMult: 2.4, cooldown: 8, aoe: true, prereq: 'dragonTalon', synergy: [{ skill: 'tigerStrike', pct: 12 }] }),
    fists: S('fists', '拳刃风暴', 'martial', 'active', { tags: ['melee', 'aoe', 'phys'], desc: '快速多段', damageMult: 0.9, cooldown: 6, aoe: true, hits: 3, prereq: 'phoenix', synergy: [{ skill: 'tigerStrike', pct: 5 }] }),
    cloak: S('cloak', '暗影斗篷', 'shadow', 'buff', { tags: ['buff'], desc: '降低敌命中（减伤）', damageReduction: 0.03, cooldown: 16 }),
    fade: S('fade', '消隐', 'shadow', 'buff', { tags: ['buff'], desc: '抗性与减伤', allResBonus: 0.04, prereq: 'cloak' }),
    shadowWarrior: S('shadowWarrior', '影子战士', 'shadow', 'passive', { tags: ['summon'], desc: '分身输出', summonBonus: 0.12, prereq: 'fade' }),
    shadowMaster: S('shadowMaster', '影子大师', 'shadow', 'passive', { tags: ['summon', 'trap'], desc: '更强分身，继承陷阱', summonBonus: 0.1, prereq: 'shadowWarrior' }),
  },
  paladin: {
    might: S('might', '力量', 'off', 'aura', { tags: ['aura', 'phys'], desc: '物理伤害光环', damageBonus: 0.06 }),
    holyFire: S('holyFire', '圣火', 'off', 'aura', { tags: ['aura', 'fire', 'aoe'], desc: '近身火圈', damageBonus: 0.03, prereq: 'might' }),
    fanaticism: S('fanaticism', '狂热', 'off', 'aura', { tags: ['aura'], desc: '攻速与伤害', damageBonus: 0.04, prereq: 'holyFire' }),
    concentration: S('concentration', '专注', 'off', 'aura', { tags: ['aura'], desc: '破防（技能伤）', damageBonus: 0.05, prereq: 'fanaticism' }),
    resistFire: S('resistFire', '抵抗火焰', 'def', 'aura', { tags: ['aura'], desc: '火抗（全抗近似）', allResBonus: 0.03 }),
    salvation: S('salvation', '拯救', 'def', 'aura', { tags: ['aura'], desc: '全抗、降诅咒', allResBonus: 0.05, prereq: 'resistFire' }),
    vigor: S('vigor', '活力', 'def', 'aura', { tags: ['aura'], desc: '移速（攻速近似）', prereq: 'salvation' }),
    holyShield: S('holyShield', '神圣庇护', 'def', 'buff', { tags: ['buff'], desc: '格挡减伤', damageReduction: 0.04, cooldown: 25, prereq: 'vigor' }),
    zeal: S('zeal', '热诚', 'combat', 'active', { tags: ['melee', 'phys', 'combo', 'opener'], desc: '连锁打击', damageMult: 1.1, cooldown: 0, hits: 2, synergy: [{ skill: 'sacrifice', pct: 8 }] }),
    sacrifice: S('sacrifice', '牺牲', 'combat', 'active', { tags: ['melee', 'phys'], desc: '高伤自损', damageMult: 2.0, cooldown: 5, hpCost: 0.04, prereq: 'zeal', synergy: [{ skill: 'zeal', pct: 6 }] }),
    blessedHammer: S('blessedHammer', '神圣之锤', 'combat', 'active', { tags: ['aoe', 'magic', 'window'], desc: '旋转圣锤', damageMult: 1.4, cooldown: 4, aoe: true, element: 'magic', prereq: 'sacrifice', synergy: [{ skill: 'concentration', pct: 7 }] }),
    fistOfHeavens: S('fistOfHeavens', '天堂之拳', 'combat', 'active', { tags: ['aoe', 'lightning', 'finisher'], desc: '对恶魔额外的砸地', damageMult: 2.6, cooldown: 9, aoe: true, element: 'lightning', prereq: 'blessedHammer', synergy: [{ skill: 'blessedHammer', pct: 6 }] }),
  },
  necro: {
    raiseSkeleton: S('raiseSkeleton', '骷髅复苏', 'summon', 'passive', { tags: ['summon'], desc: '骷髅数量与伤害', summonBonus: 0.1 }),
    skeletonMastery: S('skeletonMastery', '骷髅掌握', 'summon', 'passive', { tags: ['summon'], desc: '召唤物生命与伤', summonBonus: 0.08, hpBonus: 0.03, prereq: 'raiseSkeleton' }),
    clayGolem: S('clayGolem', '黏土石魔', 'summon', 'passive', { tags: ['summon'], desc: '坦克石魔', summonBonus: 0.06, prereq: 'skeletonMastery' }),
    revive: S('revive', '复活', 'summon', 'passive', { tags: ['summon', 'finisher'], desc: '复活伤害', summonBonus: 0.12, prereq: 'clayGolem' }),
    teeth: S('teeth', '牙', 'poison', 'active', { tags: ['projectile', 'magic', 'opener'], desc: '骨牙', damageMult: 1.1, cooldown: 0, hits: 3, element: 'magic', synergy: [{ skill: 'boneSpear', pct: 8 }] }),
    poisonNova: S('poisonNova', '毒新星', 'poison', 'active', { tags: ['aoe', 'poison', 'dot', 'finisher'], desc: '环状毒', damageMult: 1.5, cooldown: 8, aoe: true, element: 'poison', prereq: 'teeth', synergy: [{ skill: 'teeth', pct: 8 }] }),
    boneSpear: S('boneSpear', '骨矛', 'poison', 'active', { tags: ['projectile', 'magic', 'pierce'], desc: '穿透骨矛', damageMult: 1.8, cooldown: 4, element: 'magic', prereq: 'poisonNova', synergy: [{ skill: 'teeth', pct: 7 }] }),
    corpseExplosion: S('corpseExplosion', '尸爆', 'poison', 'active', { tags: ['aoe', 'fire', 'finisher'], desc: '尸体爆炸（无尸时降系数）', damageMult: 2.2, cooldown: 5, aoe: true, element: 'fire', prereq: 'boneSpear' }),
    amplify: S('amplify', '增幅伤害', 'curse', 'active', { tags: ['curse', 'window'], desc: '敌人受物理增加（乘区）', damageMult: 0.4, cooldown: 8 }),
    weaken: S('weaken', '削弱', 'curse', 'active', { tags: ['curse'], desc: '降低敌伤（减伤）', damageMult: 0.2, cooldown: 10, prereq: 'amplify' }),
    decrepify: S('decrepify', '衰老', 'curse', 'active', { tags: ['curse', 'control'], desc: '三维削弱', damageMult: 0.3, cooldown: 12, prereq: 'weaken' }),
    lowerResist: S('lowerResist', '降低抗性', 'curse', 'active', { tags: ['curse', 'window'], desc: '降低元素抗', damageMult: 0.5, cooldown: 10, prereq: 'decrepify' }),
  },
};

export const SKILL_TREES = {
  berserker: {
    combat: { name: '战斗', skills: ['smash', 'leap', 'stun', 'whirlwind'] },
    warcry: { name: '战吼', skills: ['howl', 'taunt', 'battleOrders', 'battleCommand'] },
    mastery: { name: '精通', skills: ['weaponMastery', 'tenacity', 'bloodthirst', 'battleMastery'] },
  },
  amazon: {
    bow: { name: '弓弩', skills: ['magicArrow', 'multiShot', 'strafe', 'freezeArrow'] },
    javelin: { name: '标枪', skills: ['poisonJav', 'plagueJav', 'chargedStrike', 'lightningFury'] },
    passive: { name: '被动', skills: ['pierce', 'critStrike', 'innerSight', 'valkyrie'] },
  },
  sorceress: {
    fire: { name: '火系', skills: ['fireBolt', 'fireball', 'fireWall', 'meteor'] },
    ice: { name: '冰系', skills: ['iceBolt', 'frostNova', 'glacial', 'blizzard'] },
    lightning: { name: '电系', skills: ['chargedBolt', 'staticField', 'chainLightning', 'energyShield'] },
  },
  druid: {
    elem: { name: '元素', skills: ['firestorm', 'fissure', 'tornado', 'hurricane'] },
    shape: { name: '变形', skills: ['werewolf', 'fury', 'werebear', 'shockwave'] },
    summon: { name: '召唤', skills: ['raven', 'spiritWolf', 'oakSage', 'grizzly'] },
  },
  assassin: {
    trap: { name: '陷阱', skills: ['fireBlast', 'lightningSentry', 'deathSentry', 'bladeFury'] },
    martial: { name: '武学', skills: ['tigerStrike', 'dragonTalon', 'phoenix', 'fists'] },
    shadow: { name: '影子', skills: ['cloak', 'fade', 'shadowWarrior', 'shadowMaster'] },
  },
  paladin: {
    off: { name: '进攻光环', skills: ['might', 'holyFire', 'fanaticism', 'concentration'] },
    def: { name: '防守光环', skills: ['resistFire', 'salvation', 'vigor', 'holyShield'] },
    combat: { name: '战斗', skills: ['zeal', 'sacrifice', 'blessedHammer', 'fistOfHeavens'] },
  },
  necro: {
    summon: { name: '召唤', skills: ['raiseSkeleton', 'skeletonMastery', 'clayGolem', 'revive'] },
    poison: { name: '毒骨', skills: ['teeth', 'poisonNova', 'boneSpear', 'corpseExplosion'] },
    curse: { name: '诅咒', skills: ['amplify', 'weaken', 'decrepify', 'lowerResist'] },
  },
};

export const RACES = {
  undead: { id: 'undead', name: '亡灵', res: { poison: 0.35, fire: -0.1, physical: 0.05 } },
  demon: { id: 'demon', name: '恶魔', res: { fire: 0.3, ice: 0.1, physical: 0.05 } },
  beast: { id: 'beast', name: '野兽', res: { physical: 0.1 } },
  humanoid: { id: 'humanoid', name: '人型', res: {} },
  insect: { id: 'insect', name: '昆虫', res: { poison: 0.6, fire: -0.15 } },
  construct: { id: 'construct', name: '构造体', res: { physical: 0.35, lightning: -0.2, poison: 0.9 } },
  elemental: { id: 'elemental', name: '元素', res: { fire: 0.4, ice: 0.2 } },
};

export const MONSTER_TYPES = {
  normal: { id: 'normal', name: '普通', hp: 1, dmg: 1, exp: 1, color: '#c8c0b0' },
  elite: { id: 'elite', name: '精英', hp: 2.5, dmg: 1.5, exp: 3, color: '#88aaff' },
  rare: { id: 'rare', name: '稀有', hp: 6, dmg: 2.2, exp: 8, color: '#ffe060' },
  boss: { id: 'boss', name: 'Boss', hp: 1, dmg: 1, exp: 12, color: '#ff6644' },
  rareBoss: { id: 'rareBoss', name: '稀有 Boss', hp: 1.4, dmg: 1.25, exp: 18, color: '#ffaa33' },
  actBoss: { id: 'actBoss', name: '章节 Boss', hp: 1, dmg: 1, exp: 30, color: '#ff2266' },
};

export const ELITE_AFFIXES = [
  { id: 'extraStrong', name: '超强', dmg: 1.75 },
  { id: 'fast', name: '额外快速', speed: 1.4 },
  { id: 'stoneSkin', name: '石肤', hp: 1.4 },
  { id: 'fireEnchant', name: '火焰增强', fire: 0.3 },
  { id: 'coldEnchant', name: '冰冷增强', ice: 0.3 },
  { id: 'lightningEnchant', name: '闪电增强', lightning: 0.3 },
  { id: 'regen', name: '生命回复', regen: 0.012 },
  { id: 'cursed', name: '诅咒' },
];

export const MAPS = [
  { id: 'wasteland', name: '荒芜平原', act: 1, levelMin: 1, levelMax: 6, tiles: 'dirt', monsters: [{ name: '僵尸', race: 'undead' }, { name: '沉沦魔', race: 'demon' }] },
  { id: 'frost_wilderness', name: '霜寒荒野', act: 1, levelMin: 5, levelMax: 11, tiles: 'snow', monsters: [{ name: '堕落游侠', race: 'humanoid' }, { name: '骷髅', race: 'undead' }] },
  { id: 'rock_highland', name: '碎石高地', act: 1, levelMin: 10, levelMax: 16, tiles: 'rock', monsters: [{ name: '哥布林', race: 'humanoid' }, { name: '山犬', race: 'beast' }] },
  { id: 'ancient_temple', name: '古老神殿', act: 1, levelMin: 15, levelMax: 21, tiles: 'temple', monsters: [{ name: '骷髅法师', race: 'undead' }, { name: '黑暗猎手', race: 'humanoid' }] },
  { id: 'dark_crypt', name: '幽暗墓穴', act: 1, levelMin: 20, levelMax: 22, tiles: 'crypt', isBoss: true, bossId: 'visna', monsters: [{ name: '毒蜘蛛', race: 'insect' }, { name: '墓穴骷髅', race: 'undead' }] },
  { id: 'dry_dunes', name: '干裂沙丘', act: 2, levelMin: 22, levelMax: 30, tiles: 'sand', unlockBoss: 'visna', monsters: [{ name: '圣甲虫', race: 'insect' }, { name: '沙虫', race: 'beast' }] },
  { id: 'lost_tomb', name: '失落古墓', act: 2, levelMin: 28, levelMax: 34, tiles: 'tomb', unlockBoss: 'visna', isBoss: true, bossId: 'duriel', monsters: [{ name: '木乃伊', race: 'undead' }, { name: '机关守卫', race: 'construct' }] },
  { id: 'jungle_trail', name: '丛林小径', act: 3, levelMin: 34, levelMax: 44, tiles: 'jungle', unlockBoss: 'duriel', monsters: [{ name: '羊头人', race: 'demon' }, { name: '巨蚊', race: 'insect' }] },
  { id: 'travincal', name: '崔凡克议会', act: 3, levelMin: 44, levelMax: 48, tiles: 'temple', unlockBoss: 'duriel', isBoss: true, bossId: 'council', monsters: [{ name: '议会卫士', race: 'demon' }] },
  { id: 'chaos_sanctum', name: '混沌避难所', act: 4, levelMin: 50, levelMax: 62, tiles: 'hell', unlockBoss: 'council', isBoss: true, bossId: 'diablo', monsters: [{ name: '末日骑士', race: 'demon' }, { name: '火灵', race: 'elemental' }] },
];

export const BOSSES = {
  visna: {
    id: 'visna', name: '毒后·薇斯娜', level: 22, hp: 5200, damage: 48, armor: 16,
    race: 'insect', type: 'actBoss',
    resistances: { poison: 0.5, physical: 0.1 },
    phases: [
      { threshold: 1.0, desc: '近战毒爪' },
      { threshold: 0.6, desc: '召唤毒蛛，释放毒雾' },
      { threshold: 0.3, desc: '狂暴：攻速与毒伤提升' },
    ],
    firstKillReward: { unlockChars: ['sorceress'], legendary: true },
  },
  duriel: {
    id: 'duriel', name: '沙虫王·杜瑞尔', level: 34, hp: 14000, damage: 72, armor: 28,
    race: 'beast', type: 'actBoss',
    resistances: { physical: 0.2, ice: -0.2 },
    phases: [
      { threshold: 1.0, desc: '冲锋砸击' },
      { threshold: 0.5, desc: '地震与减速光环' },
    ],
    firstKillReward: { unlockChars: ['druid', 'assassin'], legendary: true },
  },
  council: {
    id: 'council', name: '议会三魔', level: 48, hp: 22000, damage: 90, armor: 32,
    race: 'demon', type: 'actBoss',
    resistances: { fire: 0.4, lightning: 0.2 },
    phases: [
      { threshold: 1.0, desc: '三魔轮转攻击' },
      { threshold: 0.4, desc: '合体狂暴' },
    ],
    firstKillReward: { unlockChars: ['paladin'], legendary: true },
  },
  diablo: {
    id: 'diablo', name: '迪亚波罗', level: 62, hp: 40000, damage: 120, armor: 40,
    race: 'demon', type: 'actBoss',
    resistances: { fire: 0.5, physical: 0.15 },
    phases: [
      { threshold: 1.0, desc: '火骨与闪电' },
      { threshold: 0.5, desc: '红闪冲锋' },
      { threshold: 0.2, desc: '炼狱全屏' },
    ],
    firstKillReward: { unlockChars: ['necro'], legendary: true },
  },
};

export const SETS = {
  sigons: {
    id: 'sigons', name: '西刚的守护', pieceCount: 4,
    bonuses: {
      2: { desc: '+15% 攻击速度', attackSpeed: 0.15 },
      4: { desc: '+2 狂战士技能 / +200 生命', skillLevel: 2, hp: 200 },
    },
  },
  talrasha: {
    id: 'talrasha', name: '塔拉夏的法理', pieceCount: 4,
    bonuses: {
      2: { desc: '+20% 元素伤害', fireDmgPct: 0.2 },
      4: { desc: '技能耗蓝降低（攻速补偿）', attackSpeed: 0.1 },
    },
  },
  glory: {
    id: 'glory', name: '亚马逊的荣光', pieceCount: 4,
    bonuses: {
      2: { desc: '穿透率 +15%', pierceBonus: 0.15 },
      4: { desc: '投射伤害 +20%', physDmgPct: 0.2 },
    },
  },
  windwalk: {
    id: 'windwalk', name: '风行者之息', pieceCount: 4,
    bonuses: {
      2: { desc: '龙卷/飓风伤害', physDmgPct: 0.12 },
      4: { desc: '元素技能等级 +1', skillLevel: 1 },
    },
  },
};

export const AFFIX_POOL = {
  prefix: [
    { id: 'str', name: '力量', stat: 'str', min: 3, max: 18 },
    { id: 'agi', name: '敏捷', stat: 'agi', min: 3, max: 18 },
    { id: 'int', name: '智力', stat: 'int', min: 3, max: 18 },
    { id: 'physDmg', name: '物理伤害', stat: 'physDmgPct', min: 5, max: 22, suffix: '%' },
    { id: 'fireDmg', name: '火系伤害', stat: 'fireDmgPct', min: 5, max: 22, suffix: '%' },
    { id: 'iceDmg', name: '冰系伤害', stat: 'iceDmgPct', min: 5, max: 22, suffix: '%' },
    { id: 'lightDmg', name: '电系伤害', stat: 'lightningDmgPct', min: 5, max: 22, suffix: '%' },
    { id: 'critRate', name: '暴击率', stat: 'critRate', min: 3, max: 12, suffix: '%' },
    { id: 'atkSpd', name: '攻击速度', stat: 'attackSpeed', min: 5, max: 16, suffix: '%' },
  ],
  suffix: [
    { id: 'hp', name: '生命', stat: 'hp', min: 12, max: 90 },
    { id: 'armor', name: '护甲', stat: 'armor', min: 5, max: 32 },
    { id: 'lifeRegen', name: '每秒回血', stat: 'lifeRegen', min: 1, max: 8 },
    { id: 'killHeal', name: '击杀回血', stat: 'killHeal', min: 3, max: 15, suffix: '%' },
    { id: 'critDmg', name: '暴击伤害', stat: 'critDmg', min: 12, max: 45, suffix: '%' },
    { id: 'allRes', name: '全抗性', stat: 'allRes', min: 5, max: 16, suffix: '%' },
  ],
};

export const UNIQUE_ITEMS = [
  { id: 'windforce', name: '风之力', slot: 'weapon', quality: 'unique', baseDamage: 38, legendaryEffect: '多重射击额外分裂', morphId: 'pierce', morphSkill: 'multiShot', affixes: [{ stat: 'physDmgPct', value: 22, name: '物理伤害' }, { stat: 'agi', value: 14, name: '敏捷' }, { stat: 'attackSpeed', value: 12, name: '攻击速度' }] },
  { id: 'titans', name: '泰坦之纪', slot: 'weapon', quality: 'unique', baseDamage: 34, legendaryEffect: '标枪伤害与回复', morphId: 'trail', morphSkill: 'lightningFury', affixes: [{ stat: 'str', value: 12, name: '力量' }, { stat: 'hp', value: 40, name: '生命' }] },
  { id: 'frostburn', name: '霜燃', slot: 'gloves', quality: 'unique', armor: 8, legendaryEffect: '冰系技能更易冻结', morphId: 'trail', morphSkill: 'blizzard', affixes: [{ stat: 'int', value: 10, name: '智力' }, { stat: 'critRate', value: 8, name: '暴击率' }] },
  { id: 'duriel_shell', name: '督瑞尔的壳', slot: 'chest', quality: 'unique', armor: 32, legendaryEffect: '致命伤害留 1 血并无敌 3 秒（60s）', affixes: [{ stat: 'armor', value: 25, name: '护甲' }, { stat: 'hp', value: 70, name: '生命' }] },
  { id: 'death_mask', name: '死亡之眼', slot: 'helmet', quality: 'unique', armor: 14, legendaryEffect: '对稀有/Boss 暴击提升', morphId: 'reset', morphSkill: 'whirlwind', affixes: [{ stat: 'critRate', value: 10, name: '暴击率' }, { stat: 'critDmg', value: 30, name: '暴击伤害' }] },
  { id: 'ape_hide', name: '人猿之皮', slot: 'chest', quality: 'unique', armor: 22, legendaryEffect: '变形生命提升', morphId: 'shapecast', morphSkill: 'hurricane', affixes: [{ stat: 'hp', value: 80, name: '生命' }, { stat: 'str', value: 10, name: '力量' }] },
];

export const LEGENDARY_ITEMS = [
  { id: 'butcher_cleaver', name: '屠夫的砍刀', slot: 'weapon', quality: 'legendary', baseDamage: 36, legendaryEffect: '攻击 25% 流血', morphId: 'convert', morphSkill: 'smash', affixes: [{ stat: 'physDmgPct', value: 18, name: '物理伤害' }, { stat: 'str', value: 12, name: '力量' }] },
  { id: 'soj', name: '乔丹之石', slot: 'ring1', quality: 'legendary', legendaryEffect: '技能更频繁（攻速）', morphId: 'proc', affixes: [{ stat: 'int', value: 16, name: '智力' }, { stat: 'fireDmgPct', value: 12, name: '火系伤害' }] },
  { id: 'shadowdance', name: '影舞者披风', slot: 'chest', quality: 'legendary', armor: 18, legendaryEffect: '闪避后下次必暴', affixes: [{ stat: 'agi', value: 14, name: '敏捷' }, { stat: 'critRate', value: 10, name: '暴击率' }] },
  { id: 'sigons_helm', name: '西刚的头盔', slot: 'helmet', quality: 'set', setId: 'sigons', armor: 12, affixes: [{ stat: 'hp', value: 30, name: '生命' }, { stat: 'armor', value: 10, name: '护甲' }] },
  { id: 'sigons_gloves', name: '西刚的手套', slot: 'gloves', quality: 'set', setId: 'sigons', armor: 6, affixes: [{ stat: 'attackSpeed', value: 10, name: '攻击速度' }, { stat: 'str', value: 5, name: '力量' }] },
  { id: 'sigons_boots', name: '西刚的靴子', slot: 'boots', quality: 'set', setId: 'sigons', armor: 7, affixes: [{ stat: 'hp', value: 22, name: '生命' }] },
  { id: 'sigons_belt', name: '西刚的腰带', slot: 'belt', quality: 'set', setId: 'sigons', armor: 5, affixes: [{ stat: 'armor', value: 8, name: '护甲' }, { stat: 'lifeRegen', value: 3, name: '每秒回血' }] },
  { id: 'glory_bow', name: '荣光长弓', slot: 'weapon', quality: 'set', setId: 'glory', baseDamage: 24, affixes: [{ stat: 'agi', value: 10, name: '敏捷' }, { stat: 'physDmgPct', value: 12, name: '物理伤害' }] },
  { id: 'glory_helm', name: '荣光头盔', slot: 'helmet', quality: 'set', setId: 'glory', armor: 9, affixes: [{ stat: 'critRate', value: 6, name: '暴击率' }] },
  { id: 'glory_chest', name: '荣光胸甲', slot: 'chest', quality: 'set', setId: 'glory', armor: 16, affixes: [{ stat: 'hp', value: 40, name: '生命' }] },
  { id: 'glory_gloves', name: '荣光手套', slot: 'gloves', quality: 'set', setId: 'glory', armor: 5, affixes: [{ stat: 'attackSpeed', value: 8, name: '攻击速度' }] },
  { id: 'tal_orb', name: '塔拉夏法珠', slot: 'weapon', quality: 'set', setId: 'talrasha', baseDamage: 18, affixes: [{ stat: 'int', value: 12, name: '智力' }, { stat: 'fireDmgPct', value: 10, name: '火系伤害' }] },
  { id: 'tal_chest', name: '塔拉夏法袍', slot: 'chest', quality: 'set', setId: 'talrasha', armor: 8, affixes: [{ stat: 'hp', value: 35, name: '生命' }, { stat: 'int', value: 8, name: '智力' }] },
  { id: 'tal_belt', name: '塔拉夏腰带', slot: 'belt', quality: 'set', setId: 'talrasha', armor: 4, affixes: [{ stat: 'allRes', value: 8, name: '全抗性' }] },
  { id: 'tal_helm', name: '塔拉夏头饰', slot: 'helmet', quality: 'set', setId: 'talrasha', armor: 6, affixes: [{ stat: 'int', value: 6, name: '智力' }] },
  { id: 'wind_staff', name: '风行者图腾', slot: 'weapon', quality: 'set', setId: 'windwalk', baseDamage: 22, affixes: [{ stat: 'int', value: 10, name: '智力' }, { stat: 'physDmgPct', value: 10, name: '物理伤害' }] },
  { id: 'wind_pelt', name: '风行者皮甲', slot: 'chest', quality: 'set', setId: 'windwalk', armor: 14, affixes: [{ stat: 'hp', value: 45, name: '生命' }] },
  { id: 'wind_boots', name: '风行者靴', slot: 'boots', quality: 'set', setId: 'windwalk', armor: 6, affixes: [{ stat: 'attackSpeed', value: 8, name: '攻击速度' }] },
  { id: 'wind_helm', name: '风行者盔', slot: 'helmet', quality: 'set', setId: 'windwalk', armor: 8, affixes: [{ stat: 'allRes', value: 7, name: '全抗性' }] },
];

export const BASE_ITEMS = {
  weapon: [
    { name: '短剑', baseDamage: 8 }, { name: '长剑', baseDamage: 13 },
    { name: '重斧', baseDamage: 18 }, { name: '战锤', baseDamage: 22 },
    { name: '短弓', baseDamage: 11 }, { name: '标枪', baseDamage: 12 },
    { name: '法杖', baseDamage: 10 }, { name: '图腾', baseDamage: 11 },
  ],
  helmet: [{ name: '皮帽', armor: 3 }, { name: '铁盔', armor: 9 }, { name: '法师帽', armor: 2 }],
  chest: [{ name: '皮甲', armor: 11 }, { name: '锁甲', armor: 22 }, { name: '法袍', armor: 6 }],
  gloves: [{ name: '皮手套', armor: 2 }, { name: '铁手套', armor: 6 }],
  boots: [{ name: '皮靴', armor: 3 }, { name: '铁靴', armor: 7 }],
  belt: [{ name: '皮腰带', armor: 2 }, { name: '铁腰带', armor: 5 }],
  necklace: [{ name: '铜项链' }, { name: '银项链' }],
  ring1: [{ name: '铜戒指' }, { name: '银戒指' }],
  ring2: [{ name: '铜戒指' }, { name: '银戒指' }],
  offhand: [{ name: '木盾', armor: 9 }, { name: '铁盾', armor: 16 }, { name: '箭袋', armor: 2 }],
};

export function expForLevel(level) {
  return Math.floor(420 * Math.pow(1.18, level));
}

export function monsterStats(level) {
  return {
    hp: Math.floor(28 + level * 22 + level * level * 0.45),
    damage: Math.floor(5 + level * 2.4),
    armor: Math.floor(level * 0.85),
    exp: Math.floor(18 + level * 11),
    gold: Math.floor(5 + level * 3),
  };
}

export const DEFAULT_SKILLS = {
  berserker: ['smash', 'leap', 'whirlwind', 'taunt'],
  amazon: ['magicArrow', 'multiShot', 'lightningFury', 'pierce'],
  sorceress: ['fireball', 'meteor', 'frostNova', 'chainLightning'],
  druid: ['tornado', 'hurricane', 'fury', 'spiritWolf'],
  assassin: ['fireBlast', 'lightningSentry', 'phoenix', 'tigerStrike'],
  paladin: ['zeal', 'blessedHammer', 'fistOfHeavens', 'fanaticism'],
  necro: ['teeth', 'poisonNova', 'corpseExplosion', 'amplify'],
};
