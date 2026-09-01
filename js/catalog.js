// 套装 / 暗金 / 传奇扩展目录
function ax(stat, value, name) {
  return { stat, value, name };
}

function addSet(def, pieces) {
  SETS[def.id] = { pieceCount: pieces.length, ...def };
  for (const p of pieces) {
    LEGENDARY_ITEMS.push({
      quality: 'set',
      setId: def.id,
      reqClass: def.reqClass,
      ...p,
    });
  }
}

addSet(
  { id: 'immortal', name: '不朽之王', reqClass: 'berserker', color: '#c8a060', bonuses: {
    2: { desc: '生命 +70；授予旋风斩，旋风伤害 +25%', hp: 70, skillGrant: { whirlwind: 1 }, skillDmg: { whirlwind: 0.25 } },
    4: { desc: '物理 +20%，减伤 7%；旋风额外 2 段打击并吸血，怒气消耗 -35%', physDmgPct: 0.2, damageReduction: 0.07, skillDmg: { whirlwind: 0.5 }, skillCostPct: { whirlwind: 0.35 }, power: { skillHits: { whirlwind: 2 }, wwLifesteal: 0.04 } },
  } },
  [
    { id: 'ik_maul', name: '不朽战锤', slot: 'weapon', weaponClass: 'melee', icon: 'hammer', baseDamage: 28, affixes: [ax('str', 12, '力量'), ax('physDmgPct', 14, '物理伤害')] },
    { id: 'ik_helm', name: '不朽头盔', slot: 'helmet', icon: 'helm', armor: 14, affixes: [ax('hp', 36, '生命'), ax('armor', 10, '护甲')] },
    { id: 'ik_chest', name: '不朽胸甲', slot: 'chest', armor: 24, affixes: [ax('hp', 50, '生命')] },
    { id: 'ik_belt', name: '不朽腰带', slot: 'belt', armor: 7, affixes: [ax('str', 8, '力量')] },
  ]
);
addSet(
  { id: 'wreckage', name: '破军狂澜', reqClass: 'berserker', color: '#e05030', bonuses: {
    2: { desc: '攻速 +12%；猛击伤害 +20%', attackSpeed: 0.12, skillDmg: { smash: 0.2 } },
    4: { desc: '范围 +12%，物理 +16%；授予狂乱并额外连击，狂乱伤害 +40%', aoePct: 0.12, physDmgPct: 0.16, skillGrant: { frenzy: 1 }, skillDmg: { frenzy: 0.4 }, power: { skillHits: { frenzy: 2 } } },
  } },
  [
    { id: 'wr_helm', name: '破军盔', slot: 'helmet', icon: 'helm', armor: 12, affixes: [ax('critRate', 6, '暴击率')] },
    { id: 'wr_chest', name: '破军甲', slot: 'chest', armor: 20, affixes: [ax('hp', 40, '生命')] },
    { id: 'wr_gloves', name: '破军手套', slot: 'gloves', armor: 6, affixes: [ax('attackSpeed', 10, '攻击速度'), ax('str', 6, '力量')] },
    { id: 'wr_boots', name: '破军靴', slot: 'boots', armor: 7, affixes: [ax('hp', 24, '生命')] },
  ]
);
addSet(
  { id: 'sky', name: '苍穹猎手', reqClass: 'amazon', color: '#88b8e0', bonuses: {
    2: { desc: '攻击距离 +12%；多重射击伤害 +20%', attackRange: 0.12, skillDmg: { multiShot: 0.2 } },
    4: { desc: '攻速 +10%，物理 +18%；授予扫射；击杀精英重置扫射冷却，扫射伤害 +45%', attackSpeed: 0.1, physDmgPct: 0.18, skillGrant: { strafe: 1 }, skillDmg: { strafe: 0.45 }, power: { killReset: 'strafe' } },
  } },
  [
    { id: 'sky_xbow', name: '苍穹十字弩', slot: 'weapon', weaponClass: 'bow', icon: 'crossbow', baseDamage: 22, affixes: [ax('agi', 10, '敏捷'), ax('attackRange', 12, '攻击距离')] },
    { id: 'sky_gloves', name: '苍穹手套', slot: 'gloves', armor: 5, affixes: [ax('attackSpeed', 9, '攻击速度')] },
    { id: 'sky_boots', name: '苍穹靴', slot: 'boots', armor: 5, affixes: [ax('agi', 8, '敏捷')] },
    { id: 'sky_quiver', name: '苍穹箭袋', slot: 'offhand', offhandClass: 'quiver', icon: 'quiver', armor: 3, attackSpeed: 0.08, affixes: [ax('physDmgPct', 10, '物理伤害')] },
  ]
);
addSet(
  { id: 'javelin', name: '女武神投枪', reqClass: 'amazon', color: '#d4c060', bonuses: {
    2: { desc: '电伤 +16%；充能一击伤害 +20%', lightningDmgPct: 0.16, skillDmg: { chargedStrike: 0.2 } },
    4: { desc: '穿透 +10%，技能 +1；授予闪电之怒并额外电球，其伤害 +40%', pierceBonus: 0.1, skillLevel: 1, skillGrant: { lightningFury: 1 }, skillDmg: { lightningFury: 0.4 }, power: { skillHits: { lightningFury: 2 } } },
  } },
  [
    { id: 'jv_spear', name: '女武神投枪', slot: 'weapon', weaponClass: 'javelin', icon: 'javelin', baseDamage: 20, affixes: [ax('str', 8, '力量'), ax('lightningDmgPct', 12, '电系伤害')] },
    { id: 'jv_helm', name: '女武神盔', slot: 'helmet', icon: 'helm', armor: 9, affixes: [ax('critRate', 5, '暴击率')] },
    { id: 'jv_chest', name: '女武神甲', slot: 'chest', armor: 15, affixes: [ax('hp', 38, '生命')] },
    { id: 'jv_gloves', name: '女武神手套', slot: 'gloves', armor: 5, affixes: [ax('attackSpeed', 8, '攻击速度')] },
  ]
);
addSet(
  { id: 'orbiter', name: '奥比特雷纹', reqClass: 'sorceress', color: '#ffe060', bonuses: {
    2: { desc: '电伤 +20%；连锁闪电伤害 +20%', lightningDmgPct: 0.2, skillDmg: { chainLightning: 0.2 } },
    4: { desc: '范围 +14%，冷却 8%；授予雷暴；连锁闪电额外跳跃，雷暴伤害 +40%', aoePct: 0.14, cdrPct: 0.08, skillGrant: { thunderstorm: 1 }, skillDmg: { thunderstorm: 0.4, chainLightning: 0.2 }, power: { skillHits: { chainLightning: 2 } } },
  } },
  [
    { id: 'ob_staff', name: '雷纹法杖', slot: 'weapon', weaponClass: 'caster', icon: 'staff', baseDamage: 16, affixes: [ax('int', 12, '智力'), ax('lightningDmgPct', 14, '电系伤害')] },
    { id: 'ob_helm', name: '雷纹帽', slot: 'helmet', icon: 'magehat', armor: 5, affixes: [ax('int', 8, '智力')] },
    { id: 'ob_chest', name: '雷纹袍', slot: 'chest', icon: 'robe', armor: 7, affixes: [ax('hp', 30, '生命')] },
    { id: 'ob_gloves', name: '雷纹手套', slot: 'gloves', armor: 3, affixes: [ax('attackSpeed', 8, '攻击速度')] },
  ]
);
addSet(
  { id: 'frostveil', name: '霜帷法仪', reqClass: 'sorceress', color: '#80d8ff', bonuses: {
    2: { desc: '冰伤 +20%；冰枪伤害 +20%', iceDmgPct: 0.2, skillDmg: { glacial: 0.2 } },
    4: { desc: '全抗 +10%，技能 +1；授予暴风雪并留下冰面，暴风雪伤害 +45%', allRes: 0.1, skillLevel: 1, skillGrant: { blizzard: 1 }, skillDmg: { blizzard: 0.45 }, power: { skillTrail: { blizzard: true } } },
  } },
  [
    { id: 'fv_orb', name: '霜帷法珠', slot: 'offhand', offhandClass: 'orb', icon: 'orb', armor: 3, baseDamage: 8, affixes: [ax('int', 11, '智力'), ax('iceDmgPct', 14, '冰系伤害')] },
    { id: 'fv_helm', name: '霜帷冠', slot: 'helmet', icon: 'magehat', armor: 5, affixes: [ax('allRes', 6, '全抗性')] },
    { id: 'fv_chest', name: '霜帷袍', slot: 'chest', icon: 'robe', armor: 7, affixes: [ax('hp', 32, '生命'), ax('int', 6, '智力')] },
    { id: 'fv_belt', name: '霜帷腰带', slot: 'belt', armor: 3, affixes: [ax('iceDmgPct', 8, '冰系伤害')] },
  ]
);
addSet(
  { id: 'werehide', name: '兽皮图腾', reqClass: 'druid', color: '#8a6030', bonuses: {
    2: { desc: '生命 +80；狼人期间伤害生效更快', hp: 80, skillDmg: { fury: 0.2 } },
    4: { desc: '物理 +16%，护甲 +20；授予狂怒；变形中可施放元素技能', physDmgPct: 0.16, armor: 20, skillGrant: { fury: 1 }, skillDmg: { fury: 0.4 }, power: { shapecast: true } },
  } },
  [
    { id: 'wh_totem', name: '兽皮图腾', slot: 'weapon', weaponClass: 'caster', icon: 'totem', baseDamage: 18, affixes: [ax('str', 8, '力量'), ax('physDmgPct', 10, '物理伤害')] },
    { id: 'wh_pelt', name: '兽皮盔', slot: 'helmet', icon: 'pelt', armor: 9, affixes: [ax('hp', 34, '生命')] },
    { id: 'wh_chest', name: '兽皮甲', slot: 'chest', icon: 'robe', armor: 16, affixes: [ax('armor', 12, '护甲')] },
    { id: 'wh_boots', name: '兽皮靴', slot: 'boots', armor: 6, affixes: [ax('hp', 22, '生命')] },
  ]
);
addSet(
  { id: 'packlord', name: '狼群领主', reqClass: 'druid', color: '#6a8a40', bonuses: {
    2: { desc: '召唤伤害 +16%；飓风伤害 +15%', summonBonus: 0.16, skillDmg: { hurricane: 0.15 } },
    4: { desc: '技能 +1，生命 +70%；授予飓风；龙卷风命中后续飓风', skillLevel: 1, hp: 70, skillGrant: { hurricane: 1 }, skillDmg: { hurricane: 0.35 }, power: { echoSkill: { tornado: 'hurricane' } } },
  } },
  [
    { id: 'pl_staff', name: '领主图腾', slot: 'weapon', weaponClass: 'caster', icon: 'totem', baseDamage: 17, affixes: [ax('int', 10, '智力')] },
    { id: 'pl_helm', name: '领主盔', slot: 'helmet', icon: 'pelt', armor: 8, affixes: [ax('summonBonus', 10, '召唤伤害')] },
    { id: 'pl_chest', name: '领主袍', slot: 'chest', icon: 'robe', armor: 13, affixes: [ax('hp', 40, '生命')] },
    { id: 'pl_amu', name: '领主护符', slot: 'necklace', affixes: [ax('int', 8, '智力'), ax('allRes', 6, '全抗性')] },
  ]
);
addSet(
  { id: 'trapsmith', name: '机关师', reqClass: 'assassin', color: '#d4a040', bonuses: {
    2: { desc: '电/火 +12%；闪电守卫伤害 +20%', lightningDmgPct: 0.12, fireDmgPct: 0.12, skillDmg: { lightningSentry: 0.2 } },
    4: { desc: '冷却 10%，范围 10%；授予死亡守卫；闪电守卫触发死亡守卫', cdrPct: 0.1, aoePct: 0.1, skillGrant: { deathSentry: 1 }, skillDmg: { deathSentry: 0.4 }, power: { echoSkill: { lightningSentry: 'deathSentry' } } },
  } },
  [
    { id: 'ts_claw', name: '机关拳刃', slot: 'weapon', weaponClass: 'claw', icon: 'claw', baseDamage: 18, affixes: [ax('agi', 10, '敏捷')] },
    { id: 'ts_helm', name: '机关面罩', slot: 'helmet', icon: 'helm', armor: 8, affixes: [ax('critRate', 5, '暴击率')] },
    { id: 'ts_chest', name: '机关影衣', slot: 'chest', icon: 'robe', armor: 12, affixes: [ax('hp', 32, '生命')] },
    { id: 'ts_belt', name: '机关腰带', slot: 'belt', armor: 4, affixes: [ax('attackSpeed', 8, '攻击速度')] },
  ]
);
addSet(
  { id: 'clawdance', name: '刃舞', reqClass: 'assassin', color: '#c080e0', bonuses: {
    2: { desc: '攻速 +14%；虎击伤害 +20%', attackSpeed: 0.14, skillDmg: { tigerStrike: 0.2 } },
    4: { desc: '暴击 +6%，物理 +14%；授予凤凰打击并延长连招窗口，其伤害 +40%', critRate: 0.06, physDmgPct: 0.14, skillGrant: { phoenix: 1 }, skillDmg: { phoenix: 0.4 }, power: { windowBonus: 1.5, skillHits: { phoenix: 1 } } },
  } },
  [
    { id: 'cd_claw', name: '刃舞拳刃', slot: 'weapon', weaponClass: 'claw', icon: 'claw', baseDamage: 21, affixes: [ax('agi', 12, '敏捷'), ax('attackSpeed', 10, '攻击速度')] },
    { id: 'cd_gloves', name: '刃舞手套', slot: 'gloves', armor: 5, affixes: [ax('critDmg', 9, '暴击伤害')] },
    { id: 'cd_boots', name: '刃舞靴', slot: 'boots', armor: 5, affixes: [ax('agi', 8, '敏捷')] },
    { id: 'cd_ring', name: '刃舞戒指', slot: 'ring1', affixes: [ax('critRate', 6, '暴击率')] },
  ]
);
addSet(
  { id: 'hammerdin', name: '圣锤仪仗', reqClass: 'paladin', color: '#f0e8c8', bonuses: {
    2: { desc: '物理近似 +12%；神圣之锤伤害 +25%', physDmgPct: 0.12, skillDmg: { blessedHammer: 0.25 } },
    4: { desc: '技能 +1，范围 +12%；授予神圣之锤并环绕自身，其伤害 +45%', skillLevel: 1, aoePct: 0.12, skillGrant: { blessedHammer: 1 }, skillDmg: { blessedHammer: 0.45 }, power: { skillNova: { blessedHammer: true } } },
  } },
  [
    { id: 'hd_scepter', name: '仪仗权杖', slot: 'weapon', weaponClass: 'melee', icon: 'scepter', baseDamage: 22, affixes: [ax('str', 10, '力量')] },
    { id: 'hd_helm', name: '仪仗冠', slot: 'helmet', icon: 'crown', armor: 11, affixes: [ax('allRes', 7, '全抗性')] },
    { id: 'hd_chest', name: '仪仗甲', slot: 'chest', armor: 18, affixes: [ax('hp', 42, '生命')] },
    { id: 'hd_shield', name: '仪仗盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', armor: 14, affixes: [ax('armor', 12, '护甲')] },
  ]
);
addSet(
  { id: 'zealot', name: '热诚十字军', reqClass: 'paladin', color: '#d4b050', bonuses: {
    2: { desc: '攻速 +12%；热诚伤害 +20%', attackSpeed: 0.12, skillDmg: { zeal: 0.2 } },
    4: { desc: '物理 +18%，全抗 +8%；授予牺牲；热诚额外连击，牺牲伤害 +35%', physDmgPct: 0.18, allRes: 0.08, skillGrant: { sacrifice: 1 }, skillDmg: { sacrifice: 0.35 }, power: { skillHits: { zeal: 2 } } },
  } },
  [
    { id: 'zl_sword', name: '十字军剑', slot: 'weapon', weaponClass: 'melee', icon: 'sword', baseDamage: 24, affixes: [ax('str', 11, '力量'), ax('physDmgPct', 10, '物理伤害')] },
    { id: 'zl_helm', name: '十字军盔', slot: 'helmet', icon: 'crown', armor: 10, affixes: [ax('hp', 28, '生命')] },
    { id: 'zl_gloves', name: '十字军手套', slot: 'gloves', armor: 6, affixes: [ax('attackSpeed', 9, '攻击速度')] },
    { id: 'zl_boots', name: '十字军靴', slot: 'boots', armor: 7, affixes: [ax('armor', 8, '护甲')] },
  ]
);
addSet(
  { id: 'bonearmy', name: '白骨军团', reqClass: 'necro', color: '#c8c8b0', bonuses: {
    2: { desc: '召唤 +20%；骨矛伤害 +20%', summonBonus: 0.2, skillDmg: { boneSpear: 0.2 } },
    4: { desc: '技能 +1，生命 +60%；授予尸爆；骨矛命中后追加尸爆', skillLevel: 1, hp: 60, skillGrant: { corpseExplosion: 1 }, skillDmg: { corpseExplosion: 0.4 }, power: { echoSkill: { boneSpear: 'corpseExplosion' } } },
  } },
  [
    { id: 'ba_wand', name: '军团魔杖', slot: 'weapon', weaponClass: 'caster', icon: 'wand', baseDamage: 14, affixes: [ax('int', 11, '智力')] },
    { id: 'ba_helm', name: '军团颅盔', slot: 'helmet', icon: 'bonehelm', armor: 7, affixes: [ax('summonBonus', 10, '召唤伤害')] },
    { id: 'ba_chest', name: '军团骨甲', slot: 'chest', icon: 'chest', armor: 12, affixes: [ax('hp', 36, '生命')] },
    { id: 'ba_amu', name: '军团护符', slot: 'necklace', affixes: [ax('int', 8, '智力')] },
  ]
);
addSet(
  { id: 'venom', name: '剧毒仪典', reqClass: 'necro', color: '#70e040', bonuses: {
    2: { desc: '毒素 +22%；毒新星伤害 +20%', poisonDmgPct: 0.22, skillDmg: { poisonNova: 0.2 } },
    4: { desc: '范围 +10%，冷却 8%；授予毒新星并留下毒池，其伤害 +40%', aoePct: 0.1, cdrPct: 0.08, skillGrant: { poisonNova: 1 }, skillDmg: { poisonNova: 0.4 }, power: { skillNova: { poisonNova: true }, skillTrail: { poisonNova: true } } },
  } },
  [
    { id: 'vn_wand', name: '毒仪魔杖', slot: 'weapon', weaponClass: 'caster', icon: 'wand', baseDamage: 15, affixes: [ax('int', 10, '智力'), ax('poisonDmgPct', 12, '毒素伤害')] },
    { id: 'vn_helm', name: '毒仪盔', slot: 'helmet', icon: 'bonehelm', armor: 6, affixes: [ax('int', 7, '智力')] },
    { id: 'vn_chest', name: '毒仪袍', slot: 'chest', icon: 'robe', armor: 9, affixes: [ax('hp', 30, '生命')] },
    { id: 'vn_gloves', name: '毒仪手套', slot: 'gloves', armor: 3, affixes: [ax('poisonDmgPct', 8, '毒素伤害')] },
  ]
);

addSet(
  { id: 'angelic', name: '天使的光辉', color: '#e8e0c8', bonuses: {
    2: { desc: '生命 +50，护甲 +15', hp: 50, armor: 15 },
    4: { desc: '全抗 +10%，减伤 5%', allRes: 0.1, damageReduction: 0.05 },
  } },
  [
    { id: 'ag_amu', name: '天使护符', slot: 'necklace', affixes: [ax('hp', 28, '生命')] },
    { id: 'ag_ring', name: '天使戒指', slot: 'ring1', affixes: [ax('allRes', 6, '全抗性')] },
    { id: 'ag_helm', name: '天使盔', slot: 'helmet', icon: 'helm', armor: 8, affixes: [ax('armor', 8, '护甲')] },
    { id: 'ag_chest', name: '天使甲', slot: 'chest', armor: 16, affixes: [ax('hp', 40, '生命')] },
  ]
);
addSet(
  { id: 'cathan', name: '卡珊的法环', color: '#c06040', bonuses: {
    2: { desc: '火伤 +14%；火球伤害 +18%', fireDmgPct: 0.14, skillDmg: { fireball: 0.18 } },
    4: { desc: '生命 +40，攻速 8%；授予火球', hp: 40, attackSpeed: 0.08, skillGrant: { fireball: 1 } },
  } },
  [
    { id: 'ct_ring', name: '卡珊戒指', slot: 'ring1', affixes: [ax('int', 8, '智力')] },
    { id: 'ct_amu', name: '卡珊护符', slot: 'necklace', affixes: [ax('fireDmgPct', 8, '火系伤害')] },
    { id: 'ct_helm', name: '卡珊帽', slot: 'helmet', icon: 'magehat', armor: 4, affixes: [ax('int', 6, '智力')] },
    { id: 'ct_gloves', name: '卡珊手套', slot: 'gloves', armor: 3, affixes: [ax('attackSpeed', 7, '攻击速度')] },
  ]
);
addSet(
  { id: 'arctic', name: '极地行者', color: '#a0d8ff', bonuses: {
    2: { desc: '冰伤 +14%；冰霜新星伤害 +18%', iceDmgPct: 0.14, skillDmg: { frostNova: 0.18 } },
    4: { desc: '全抗 +8%，生命 +45；授予冰霜新星', allRes: 0.08, hp: 45, skillGrant: { frostNova: 1 } },
  } },
  [
    { id: 'ar_belt', name: '极地带', slot: 'belt', armor: 4, affixes: [ax('hp', 20, '生命')] },
    { id: 'ar_gloves', name: '极地手套', slot: 'gloves', armor: 4, affixes: [ax('iceDmgPct', 7, '冰系伤害')] },
    { id: 'ar_boots', name: '极地靴', slot: 'boots', armor: 5, affixes: [ax('allRes', 5, '全抗性')] },
    { id: 'ar_amu', name: '极地护符', slot: 'necklace', affixes: [ax('int', 7, '智力')] },
  ]
);
addSet(
  { id: 'infernal', name: '地狱火炬', color: '#ff6a30', bonuses: {
    2: { desc: '火伤 +16%；火墙伤害 +18%', fireDmgPct: 0.16, skillDmg: { fireWall: 0.18 } },
    4: { desc: '对精英 +12%，技能 +1；授予陨石，陨石伤害 +30%', eliteDmgPct: 0.12, skillLevel: 1, skillGrant: { meteor: 1 }, skillDmg: { meteor: 0.3 } },
  } },
  [
    { id: 'in_belt', name: '地狱腰带', slot: 'belt', armor: 4, affixes: [ax('fireDmgPct', 8, '火系伤害')] },
    { id: 'in_ring', name: '地狱戒指', slot: 'ring1', affixes: [ax('critRate', 5, '暴击率')] },
    { id: 'in_helm', name: '地狱盔', slot: 'helmet', icon: 'helm', armor: 7, affixes: [ax('hp', 24, '生命')] },
    { id: 'in_gloves', name: '地狱手套', slot: 'gloves', armor: 4, affixes: [ax('attackSpeed', 7, '攻击速度')] },
  ]
);
addSet(
  { id: 'deaths', name: '死神的拥抱', color: '#705060', bonuses: {
    2: { desc: '吸血 +4%', lifesteal: 0.04 },
    4: { desc: '物理 +14%，击杀回血 +8%', physDmgPct: 0.14, killHeal: 0.08 },
  } },
  [
    { id: 'dt_gloves', name: '死神手套', slot: 'gloves', armor: 5, affixes: [ax('lifesteal', 3, '吸血')] },
    { id: 'dt_belt', name: '死神腰带', slot: 'belt', armor: 5, affixes: [ax('hp', 22, '生命')] },
    { id: 'dt_helm', name: '死神面甲', slot: 'helmet', icon: 'helm', armor: 9, affixes: [ax('critDmg', 8, '暴击伤害')] },
    { id: 'dt_ring', name: '死神戒指', slot: 'ring1', affixes: [ax('physDmgPct', 8, '物理伤害')] },
  ]
);
addSet(
  { id: 'hsarus', name: '萨拉斯铁壁', color: '#909090', bonuses: {
    2: { desc: '护甲 +35', armor: 35 },
    4: { desc: '减伤 6%，生命 +70', damageReduction: 0.06, hp: 70 },
  } },
  [
    { id: 'hs_boots', name: '铁壁靴', slot: 'boots', armor: 8, affixes: [ax('armor', 10, '护甲')] },
    { id: 'hs_belt', name: '铁壁腰带', slot: 'belt', armor: 6, affixes: [ax('hp', 26, '生命')] },
    { id: 'hs_shield', name: '铁壁盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', armor: 18, affixes: [ax('allRes', 7, '全抗性')] },
    { id: 'hs_chest', name: '铁壁甲', slot: 'chest', armor: 22, affixes: [ax('armor', 12, '护甲')] },
  ]
);
addSet(
  { id: 'vidala', name: '维达拉的捕猎', color: '#60a060', bonuses: {
    2: { desc: '攻击距离 +14%', attackRange: 0.14 },
    4: { desc: '攻速 +10%，敏捷等效暴击', attackSpeed: 0.1, critRate: 0.05 },
  } },
  [
    { id: 'vd_amu', name: '捕猎护符', slot: 'necklace', affixes: [ax('agi', 8, '敏捷')] },
    { id: 'vd_boots', name: '捕猎靴', slot: 'boots', armor: 5, affixes: [ax('attackRange', 10, '攻击距离')] },
    { id: 'vd_belt', name: '捕猎腰带', slot: 'belt', armor: 4, affixes: [ax('attackSpeed', 7, '攻击速度')] },
    { id: 'vd_bowg', name: '捕猎手套', slot: 'gloves', armor: 4, affixes: [ax('critRate', 5, '暴击率')] },
  ]
);
addSet(
  { id: 'disciple', name: '门徒的戒律', color: '#a09070', bonuses: {
    2: { desc: '技能冷却 8%', cdrPct: 0.08 },
    4: { desc: '全技能 +1，资源回复 +10%', skillLevel: 1, resRegenPct: 0.1 },
  } },
  [
    { id: 'dc_amu', name: '门徒护符', slot: 'necklace', affixes: [ax('int', 8, '智力')] },
    { id: 'dc_ring', name: '门徒戒指', slot: 'ring1', affixes: [ax('resRegenPct', 8, '资源回复')] },
    { id: 'dc_gloves', name: '门徒手套', slot: 'gloves', armor: 4, affixes: [ax('attackSpeed', 7, '攻击速度')] },
    { id: 'dc_belt', name: '门徒腰带', slot: 'belt', armor: 4, affixes: [ax('hp', 20, '生命')] },
  ]
);
addSet(
  { id: 'guardian', name: '守护者壁垒', color: '#708090', bonuses: {
    2: { desc: '生命 +90', hp: 90 },
    4: { desc: '全抗 +12%，减伤 6%', allRes: 0.12, damageReduction: 0.06 },
  } },
  [
    { id: 'gd_chest', name: '壁垒胸甲', slot: 'chest', armor: 20, affixes: [ax('hp', 48, '生命')] },
    { id: 'gd_helm', name: '壁垒头盔', slot: 'helmet', icon: 'helm', armor: 11, affixes: [ax('armor', 10, '护甲')] },
    { id: 'gd_boots', name: '壁垒靴', slot: 'boots', armor: 7, affixes: [ax('allRes', 6, '全抗性')] },
    { id: 'gd_belt', name: '壁垒腰带', slot: 'belt', armor: 6, affixes: [ax('lifeRegen', 4, '每秒回血')] },
  ]
);
addSet(
  { id: 'wanderer', name: '流浪者行囊', color: '#c8aa6e', bonuses: {
    2: { desc: '对精英 +10%', eliteDmgPct: 0.1 },
    4: { desc: '攻速 +8%，生命 +55，全抗 +6%', attackSpeed: 0.08, hp: 55, allRes: 0.06 },
  } },
  [
    { id: 'wn_boots', name: '流浪靴', slot: 'boots', armor: 6, affixes: [ax('hp', 22, '生命')] },
    { id: 'wn_belt', name: '流浪腰带', slot: 'belt', armor: 5, affixes: [ax('allRes', 5, '全抗性')] },
    { id: 'wn_gloves', name: '流浪手套', slot: 'gloves', armor: 4, affixes: [ax('attackSpeed', 8, '攻击速度')] },
    { id: 'wn_amu', name: '流浪护符', slot: 'necklace', affixes: [ax('eliteDmgPct', 8, '对精英伤害')] },
  ]
);

UNIQUE_ITEMS.push(
  { id: 'shako', name: '谐角之冠', slot: 'helmet', icon: 'magehat', quality: 'unique', armor: 10, legendaryEffect: '全技能与生命', affixes: [ax('skillLevel', 1, '全技能等级'), ax('hp', 55, '生命'), ax('allRes', 8, '全抗性')] },
  { id: 'arreats', name: '亚瑞特的面容', slot: 'helmet', icon: 'helm', reqClass: 'berserker', quality: 'unique', armor: 16, legendaryEffect: '普攻触发旋风斩', morphId: 'proc', morphSkill: 'whirlwind', affixes: [ax('str', 14, '力量'), ax('hp', 45, '生命'), ax('lifesteal', 4, '吸血')] },
  { id: 'andariel', name: '安达利尔的面容', slot: 'helmet', icon: 'helm', quality: 'unique', armor: 11, legendaryEffect: '毒素与攻速', affixes: [ax('poisonDmgPct', 16, '毒素伤害'), ax('attackSpeed', 12, '攻击速度'), ax('allRes', 7, '全抗性')] },
  { id: 'nightwing', name: '夜翼面纱', slot: 'helmet', icon: 'magehat', reqClass: 'sorceress', quality: 'unique', armor: 6, legendaryEffect: '冰封球留下冰轨', morphId: 'trail', morphSkill: 'frozenOrb', affixes: [ax('iceDmgPct', 20, '冰系伤害'), ax('int', 12, '智力')] },
  { id: 'jalal', name: '加尔的鬃毛', slot: 'helmet', icon: 'pelt', reqClass: 'druid', quality: 'unique', armor: 12, legendaryEffect: '变形中仍可释放元素技能', morphId: 'shapecast', morphSkill: 'hurricane', affixes: [ax('hp', 50, '生命'), ax('summonBonus', 12, '召唤伤害')] },
  { id: 'vampiregaze', name: '吸血鬼的凝视', slot: 'helmet', icon: 'helm', quality: 'unique', armor: 13, legendaryEffect: '高吸血', affixes: [ax('lifesteal', 6, '吸血'), ax('damageReduction', 5, '伤害减免'), ax('hp', 30, '生命')] },
  { id: 'crowbill', name: '渡鸦喙斧', slot: 'weapon', weaponClass: 'melee', icon: 'axe', reqClass: 'berserker', quality: 'unique', baseDamage: 34, legendaryEffect: '攻速与暴击', affixes: [ax('attackSpeed', 14, '攻击速度'), ax('critRate', 8, '暴击率'), ax('str', 10, '力量')] },
  { id: 'grief', name: '悔恨', slot: 'weapon', weaponClass: 'melee', icon: 'sword', quality: 'unique', baseDamage: 40, legendaryEffect: '无视部分护甲', affixes: [ax('physDmgPct', 24, '物理伤害'), ax('attackSpeed', 12, '攻击速度'), ax('str', 8, '力量')] },
  { id: 'insight', name: '洞察', slot: 'weapon', weaponClass: 'melee', icon: 'hammer', quality: 'unique', baseDamage: 26, legendaryEffect: '资源回复光环', affixes: [ax('resRegenPct', 16, '资源回复'), ax('hp', 40, '生命')] },
  { id: 'obedience', name: '顺从', slot: 'weapon', weaponClass: 'melee', icon: 'hammer', quality: 'unique', baseDamage: 30, legendaryEffect: '全抗与破甲', affixes: [ax('allRes', 12, '全抗性'), ax('physDmgPct', 14, '物理伤害')] },
  { id: 'riphook', name: '撕钩', slot: 'weapon', weaponClass: 'bow', icon: 'bow', reqClass: 'amazon', quality: 'unique', baseDamage: 28, legendaryEffect: '扫射穿透', morphId: 'pierce', morphSkill: 'strafe', affixes: [ax('agi', 12, '敏捷'), ax('attackSpeed', 11, '攻击速度')] },
  { id: 'lycander', name: '莱坎德的瞄准', slot: 'weapon', weaponClass: 'bow', icon: 'bow', reqClass: 'amazon', quality: 'unique', baseDamage: 32, legendaryEffect: '导引箭穿透', morphId: 'pierce', morphSkill: 'guided', affixes: [ax('skillLevel', 1, '全技能等级'), ax('physDmgPct', 16, '物理伤害'), ax('agi', 10, '敏捷')] },
  { id: 'thunderstroke', name: '雷击', slot: 'weapon', weaponClass: 'javelin', icon: 'javelin', reqClass: 'amazon', quality: 'unique', baseDamage: 27, legendaryEffect: '电枪连锁', morphId: 'chain', morphSkill: 'lightningFury', affixes: [ax('lightningDmgPct', 18, '电系伤害'), ax('str', 8, '力量')] },
  { id: 'deathsweb', name: '死亡之网', slot: 'weapon', weaponClass: 'caster', icon: 'wand', reqClass: 'necro', quality: 'unique', baseDamage: 18, legendaryEffect: '毒新星环状扩大', morphId: 'nova', morphSkill: 'poisonNova', affixes: [ax('poisonDmgPct', 20, '毒素伤害'), ax('int', 14, '智力')] },
  { id: 'boneshade', name: '骨影', slot: 'weapon', weaponClass: 'caster', icon: 'wand', reqClass: 'necro', quality: 'unique', baseDamage: 17, legendaryEffect: '骨矛穿透', morphId: 'pierce', morphSkill: 'boneSpear', affixes: [ax('int', 12, '智力'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'heartot', name: '橡树之心', slot: 'weapon', weaponClass: 'caster', icon: 'totem', reqClass: 'druid', quality: 'unique', baseDamage: 21, legendaryEffect: '飓风留下风暴轨迹', morphId: 'trail', morphSkill: 'hurricane', affixes: [ax('int', 12, '智力'), ax('summonBonus', 12, '召唤伤害'), ax('physDmgPct', 10, '物理伤害')] },
  { id: 'oculus', name: '核瞳', slot: 'offhand', offhandClass: 'orb', icon: 'orb', reqClass: 'sorceress', quality: 'unique', armor: 3, baseDamage: 10, legendaryEffect: '全技能与传送感（攻速）', affixes: [ax('skillLevel', 1, '全技能等级'), ax('int', 16, '智力'), ax('allRes', 8, '全抗性')] },
  { id: 'deathsfathom', name: '死亡深度', slot: 'offhand', offhandClass: 'orb', icon: 'orb', reqClass: 'sorceress', quality: 'unique', armor: 3, baseDamage: 10, legendaryEffect: '冰封球新星化', morphId: 'nova', morphSkill: 'frozenOrb', affixes: [ax('iceDmgPct', 24, '冰系伤害'), ax('int', 12, '智力')] },
  { id: 'wizspike', name: '巫师之刺', slot: 'weapon', weaponClass: 'caster', icon: 'staff', reqClass: 'sorceress', quality: 'unique', baseDamage: 14, legendaryEffect: '极高回复与全抗', affixes: [ax('resRegenPct', 18, '资源回复'), ax('allRes', 12, '全抗性'), ax('int', 10, '智力')] },
  { id: 'stormlash', name: '风暴之笞', slot: 'weapon', weaponClass: 'melee', icon: 'scepter', reqClass: 'paladin', quality: 'unique', baseDamage: 28, legendaryEffect: '天堂之拳连锁', morphId: 'chain', morphSkill: 'fistOfHeavens', affixes: [ax('lightningDmgPct', 16, '电系伤害'), ax('str', 10, '力量')] },
  { id: 'grizwold', name: '格里斯沃尔德之刃', slot: 'weapon', weaponClass: 'melee', icon: 'sword', reqClass: 'paladin', quality: 'unique', baseDamage: 32, legendaryEffect: '延长热诚连招窗口', morphId: 'window', morphSkill: 'zeal', affixes: [ax('str', 12, '力量'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'natalya', name: '娜塔亚的印记', slot: 'weapon', weaponClass: 'claw', icon: 'claw', reqClass: 'assassin', quality: 'unique', baseDamage: 30, legendaryEffect: '闪电守卫连锁', morphId: 'chain', morphSkill: 'lightningSentry', affixes: [ax('agi', 14, '敏捷'), ax('lightningDmgPct', 12, '电系伤害'), ax('attackSpeed', 10, '攻击速度')] },
  { id: 'firelizards', name: '火蜥蜴之爪', slot: 'weapon', weaponClass: 'claw', icon: 'claw', reqClass: 'assassin', quality: 'unique', baseDamage: 26, legendaryEffect: '火焰爆弹新星化', morphId: 'nova', morphSkill: 'fireBlast', affixes: [ax('fireDmgPct', 18, '火系伤害'), ax('agi', 10, '敏捷')] },
  { id: 'skullders', name: '斯考尔德的艾恩', slot: 'chest', quality: 'unique', armor: 20, legendaryEffect: '击杀获得更多经验感（精英伤）', affixes: [ax('eliteDmgPct', 16, '对精英伤害'), ax('hp', 40, '生命'), ax('allRes', 8, '全抗性')] },
  { id: 'tyrael', name: '泰瑞尔之力', slot: 'chest', quality: 'unique', armor: 28, legendaryEffect: '无法冻结，全抗', affixes: [ax('allRes', 14, '全抗性'), ax('hp', 60, '生命'), ax('str', 10, '力量')] },
  { id: 'shaftstop', name: '箭止', slot: 'chest', quality: 'unique', armor: 24, legendaryEffect: '高减伤', affixes: [ax('damageReduction', 7, '伤害减免'), ax('hp', 50, '生命')] },
  { id: 'quehegans', name: '柯赫甘的智慧', slot: 'chest', icon: 'robe', reqClass: 'sorceress', quality: 'unique', armor: 9, legendaryEffect: '能量护盾更强', affixes: [ax('int', 14, '智力'), ax('hp', 35, '生命')] },
  { id: 'crowcaw', name: '鸦鸣', slot: 'chest', icon: 'robe', reqClass: 'assassin', quality: 'unique', armor: 14, legendaryEffect: '攻速与暴击', affixes: [ax('attackSpeed', 12, '攻击速度'), ax('critRate', 8, '暴击率'), ax('agi', 10, '敏捷')] },
  { id: 'spiritforge', name: '灵魂熔炉', slot: 'chest', quality: 'unique', armor: 22, legendaryEffect: '生命与力量', affixes: [ax('hp', 70, '生命'), ax('str', 12, '力量')] },
  { id: 'magefist', name: '法师之拳', slot: 'gloves', quality: 'unique', armor: 5, legendaryEffect: '火伤与回复', affixes: [ax('fireDmgPct', 14, '火系伤害'), ax('attackSpeed', 12, '攻击速度'), ax('resRegenPct', 10, '资源回复')] },
  { id: 'chanceguards', name: '机会之守', slot: 'gloves', quality: 'unique', armor: 6, legendaryEffect: '更易出好装备（精英伤）', affixes: [ax('eliteDmgPct', 12, '对精英伤害'), ax('hp', 22, '生命')] },
  { id: 'dracs', name: '德拉古尔之握', slot: 'gloves', quality: 'unique', armor: 7, legendaryEffect: '生命偷取诅咒感', affixes: [ax('lifesteal', 5, '吸血'), ax('str', 8, '力量')] },
  { id: 'loath', name: '憎恶之握', slot: 'gloves', reqClass: 'necro', quality: 'unique', armor: 4, legendaryEffect: '诅咒更狠', affixes: [ax('int', 10, '智力'), ax('poisonDmgPct', 10, '毒素伤害')] },
  { id: 'goblintoe', name: '哥布林脚趾', slot: 'boots', quality: 'unique', armor: 8, legendaryEffect: '踢击与生命', affixes: [ax('hp', 30, '生命'), ax('armor', 10, '护甲')] },
  { id: 'wartrav', name: '战争旅者', slot: 'boots', quality: 'unique', armor: 9, legendaryEffect: '属性与生命', affixes: [ax('str', 8, '力量'), ax('agi', 8, '敏捷'), ax('hp', 28, '生命')] },
  { id: 'sandstorm', name: '沙暴旅者', slot: 'boots', quality: 'unique', armor: 8, legendaryEffect: '中毒与体力感（回血）', affixes: [ax('poisonDmgPct', 12, '毒素伤害'), ax('lifeRegen', 5, '每秒回血')] },
  { id: 'marrowwalk', name: '骨髓行走', slot: 'boots', reqClass: 'necro', quality: 'unique', armor: 6, legendaryEffect: '召唤技能', affixes: [ax('summonBonus', 14, '召唤伤害'), ax('hp', 26, '生命')] },
  { id: 'arachnid', name: '蛛网之网', slot: 'belt', quality: 'unique', armor: 4, legendaryEffect: '全技能与减速感（冷却）', affixes: [ax('skillLevel', 1, '全技能等级'), ax('cdrPct', 8, '冷却缩减')] },
  { id: 'thundergods', name: '雷神之力', slot: 'belt', quality: 'unique', armor: 6, legendaryEffect: '电抗与电伤', affixes: [ax('lightningDmgPct', 14, '电系伤害'), ax('hp', 30, '生命')] },
  { id: 'nosferatu', name: '诺斯费拉图', slot: 'belt', quality: 'unique', armor: 5, legendaryEffect: '吸血与减速', affixes: [ax('lifesteal', 5, '吸血'), ax('attackSpeed', 8, '攻击速度')] },
  { id: 'highlord', name: '大君之怒', slot: 'necklace', quality: 'unique', legendaryEffect: '等级越高暴击越高', affixes: [ax('critRate', 10, '暴击率'), ax('lightningDmgPct', 10, '电系伤害'), ax('attackSpeed', 8, '攻击速度')] },
  { id: 'maras', name: '马拉的万花筒', slot: 'necklace', quality: 'unique', legendaryEffect: '全技能与全抗', affixes: [ax('skillLevel', 1, '全技能等级'), ax('allRes', 12, '全抗性'), ax('hp', 25, '生命')] },
  { id: 'atmas', name: '亚特玛的疤痕', slot: 'necklace', quality: 'unique', legendaryEffect: '对首领增伤', affixes: [ax('eliteDmgPct', 18, '对精英伤害'), ax('hp', 30, '生命')] },
  { id: 'nagelring', name: '纳格尔之戒', slot: 'ring1', quality: 'unique', legendaryEffect: '减伤', affixes: [ax('damageReduction', 4, '伤害减免'), ax('armor', 8, '护甲')] },
  { id: 'manald', name: '玛那德的治疗', slot: 'ring1', quality: 'unique', legendaryEffect: '回蓝与吸血', affixes: [ax('resRegenPct', 12, '资源回复'), ax('lifesteal', 4, '吸血')] },
  { id: 'bk_ring', name: '布尔凯索的婚戒', slot: 'ring1', quality: 'unique', legendaryEffect: '全技能与生命', affixes: [ax('skillLevel', 1, '全技能等级'), ax('hp', 40, '生命'), ax('str', 6, '力量')] },
  { id: 'ravenfrost', name: '鸦霜', slot: 'ring1', quality: 'unique', legendaryEffect: '无法冻结，冰伤', affixes: [ax('iceDmgPct', 12, '冰系伤害'), ax('agi', 10, '敏捷'), ax('hp', 20, '生命')] },
  { id: 'dwarfstar', name: '矮人之星', slot: 'ring1', quality: 'unique', legendaryEffect: '吸收火伤（全抗）', affixes: [ax('allRes', 8, '全抗性'), ax('hp', 28, '生命')] },
  { id: 'homun_shield', name: '颅骨盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', reqClass: 'necro', quality: 'unique', armor: 12, legendaryEffect: '召唤与诅咒', affixes: [ax('summonBonus', 10, '召唤伤害'), ax('int', 10, '智力')] },
  { id: 'herald', name: '扎卡兰的使者', slot: 'offhand', offhandClass: 'shield', icon: 'shield', reqClass: 'paladin', quality: 'unique', armor: 18, legendaryEffect: '光环与全抗', affixes: [ax('allRes', 12, '全抗性'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'lidless', name: '无目之墙', slot: 'offhand', offhandClass: 'shield', icon: 'shield', quality: 'unique', armor: 14, legendaryEffect: '能量与技能', affixes: [ax('resRegenPct', 10, '资源回复'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'stormshield', name: '暴风盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', quality: 'unique', armor: 22, legendaryEffect: '极高减伤', affixes: [ax('damageReduction', 8, '伤害减免'), ax('str', 10, '力量'), ax('allRes', 8, '全抗性')] }
);

LEGENDARY_ITEMS.push(
  { id: 'infinity', name: '无限', slot: 'weapon', weaponClass: 'melee', icon: 'hammer', quality: 'legendary', baseDamage: 33, legendaryEffect: '降低敌人抗性 15%', itemPower: { enemyResDown: 0.15 }, affixes: [ax('lightningDmgPct', 16, '电系伤害'), ax('str', 10, '力量')] },
  { id: 'fortitude', name: '刚毅', slot: 'chest', quality: 'legendary', armor: 26, legendaryEffect: '高生命与物伤', affixes: [ax('hp', 80, '生命'), ax('physDmgPct', 14, '物理伤害')] },
  { id: 'enigma', name: '谜团', slot: 'chest', icon: 'robe', quality: 'legendary', armor: 14, legendaryEffect: '技能与移速感（攻速）', affixes: [ax('skillLevel', 1, '全技能等级'), ax('attackSpeed', 10, '攻击速度'), ax('str', 8, '力量')] },
  { id: 'chains_honor', name: '荣耀之链', slot: 'chest', quality: 'legendary', armor: 21, legendaryEffect: '全抗与物伤', affixes: [ax('allRes', 12, '全抗性'), ax('physDmgPct', 12, '物理伤害'), ax('hp', 45, '生命')] },
  { id: 'phoenix_armor', name: '凤凰甲', slot: 'chest', quality: 'legendary', armor: 20, legendaryEffect: '火伤与生命', affixes: [ax('fireDmgPct', 16, '火系伤害'), ax('hp', 50, '生命')] },
  { id: 'lastwish', name: '最后的愿望', slot: 'weapon', weaponClass: 'melee', icon: 'sword', reqClass: 'berserker', quality: 'legendary', baseDamage: 38, legendaryEffect: '猛击环状爆裂', morphId: 'nova', morphSkill: 'smash', affixes: [ax('physDmgPct', 20, '物理伤害'), ax('hp', 30, '生命')] },
  { id: 'beast', name: '野兽', slot: 'weapon', weaponClass: 'melee', icon: 'axe', quality: 'legendary', baseDamage: 35, legendaryEffect: '狂乱光环感（攻速）', affixes: [ax('attackSpeed', 16, '攻击速度'), ax('str', 14, '力量')] },
  { id: 'doom', name: '末日', slot: 'weapon', weaponClass: 'melee', icon: 'axe', quality: 'legendary', baseDamage: 36, legendaryEffect: '冰冻与冰伤', affixes: [ax('iceDmgPct', 16, '冰系伤害'), ax('physDmgPct', 12, '物理伤害')] },
  { id: 'calltoarms', name: '战争召唤', slot: 'weapon', weaponClass: 'melee', icon: 'axe', reqClass: 'berserker', quality: 'legendary', baseDamage: 30, legendaryEffect: '战吼技能', affixes: [ax('skillLevel', 1, '全技能等级'), ax('hp', 40, '生命')] },
  { id: 'faith', name: '信念', slot: 'weapon', weaponClass: 'bow', icon: 'bow', reqClass: 'amazon', quality: 'legendary', baseDamage: 34, legendaryEffect: '多重射击再分裂', morphId: 'split', morphSkill: 'multiShot', affixes: [ax('attackSpeed', 14, '攻击速度'), ax('agi', 12, '敏捷'), ax('physDmgPct', 14, '物理伤害')] },
  { id: 'wrath_bow', name: '愤怒之弓', slot: 'weapon', weaponClass: 'bow', icon: 'bow', reqClass: 'amazon', quality: 'legendary', baseDamage: 31, legendaryEffect: '对恶魔增伤', affixes: [ax('eliteDmgPct', 18, '对精英伤害'), ax('lightningDmgPct', 12, '电系伤害')] },
  { id: 'phoenix_orb', name: '凤凰法珠', slot: 'offhand', offhandClass: 'orb', icon: 'orb', reqClass: 'sorceress', quality: 'legendary', armor: 3, baseDamage: 12, legendaryEffect: '陨石环状砸落', morphId: 'nova', morphSkill: 'meteor', affixes: [ax('fireDmgPct', 18, '火系伤害'), ax('int', 14, '智力')] },
  { id: 'crescent', name: '新月', slot: 'weapon', weaponClass: 'caster', icon: 'staff', quality: 'legendary', baseDamage: 17, legendaryEffect: '魔法箭转化感', affixes: [ax('int', 12, '智力'), ax('lifesteal', 4, '吸血')] },
  { id: 'spirit_keeper', name: '灵魂守护', slot: 'helmet', icon: 'pelt', reqClass: 'druid', quality: 'legendary', armor: 11, legendaryEffect: '元素抗与召唤', affixes: [ax('allRes', 10, '全抗性'), ax('summonBonus', 10, '召唤伤害')] },
  { id: 'runemaster', name: '符文大师', slot: 'helmet', icon: 'helm', quality: 'legendary', armor: 14, legendaryEffect: '全抗随时间（全抗）', affixes: [ax('allRes', 14, '全抗性'), ax('armor', 12, '护甲')] },
  { id: 'steelshade', name: '钢影', slot: 'helmet', icon: 'helm', reqClass: 'assassin', quality: 'legendary', armor: 10, legendaryEffect: '吸收法力感（回复）', affixes: [ax('resRegenPct', 10, '资源回复'), ax('agi', 10, '敏捷')] },
  { id: 'draculgrasp', name: '德古拉之握', slot: 'gloves', quality: 'legendary', armor: 7, legendaryEffect: '击中生命偷取', affixes: [ax('lifesteal', 6, '吸血'), ax('str', 8, '力量')] },
  { id: 'soulfeeder', name: '噬魂者', slot: 'gloves', reqClass: 'necro', quality: 'legendary', armor: 4, legendaryEffect: '击杀回复', affixes: [ax('killHeal', 10, '击杀回血'), ax('int', 8, '智力')] },
  { id: 'shadowdancer', name: '影舞者靴', slot: 'boots', reqClass: 'assassin', quality: 'legendary', armor: 7, legendaryEffect: '武学技能', affixes: [ax('agi', 12, '敏捷'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'gorefoot', name: '血脚', slot: 'boots', quality: 'legendary', armor: 8, legendaryEffect: '踢击溅射', affixes: [ax('attackSpeed', 10, '攻击速度'), ax('hp', 24, '生命')] },
  { id: 'verdungo', name: '沃尔顿戈的心结', slot: 'belt', quality: 'legendary', armor: 6, legendaryEffect: '减伤与生命', affixes: [ax('damageReduction', 6, '伤害减免'), ax('hp', 40, '生命')] },
  { id: 'string', name: '黄金裹腰', slot: 'belt', quality: 'legendary', armor: 4, legendaryEffect: '更易出装备（精英）', affixes: [ax('eliteDmgPct', 10, '对精英伤害'), ax('hp', 18, '生命')] },
  { id: 'metalgrid', name: '金属网格', slot: 'necklace', quality: 'legendary', legendaryEffect: '防御与全抗', affixes: [ax('armor', 16, '护甲'), ax('allRes', 10, '全抗性')] },
  { id: 'seraph', name: '炽天使之翼', slot: 'necklace', reqClass: 'paladin', quality: 'legendary', legendaryEffect: '光环与生命', affixes: [ax('skillLevel', 1, '全技能等级'), ax('hp', 35, '生命')] },
  { id: 'wisp', name: '灯灵投射者', slot: 'ring1', quality: 'legendary', legendaryEffect: '闪电吸收与电伤', affixes: [ax('lightningDmgPct', 12, '电系伤害'), ax('allRes', 6, '全抗性')] },
  { id: 'nature_peace', name: '自然和平', slot: 'ring1', reqClass: 'druid', quality: 'legendary', legendaryEffect: '阻止怪物回复', affixes: [ax('hp', 30, '生命'), ax('poisonDmgPct', 10, '毒素伤害')] },
  { id: 'darkforce', name: '黑暗力量', slot: 'ring1', reqClass: 'necro', quality: 'legendary', legendaryEffect: '骨魂连锁', morphId: 'chain', morphSkill: 'boneSpirit', affixes: [ax('int', 12, '智力'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'stormshield_lg', name: '王者盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', quality: 'legendary', armor: 20, legendaryEffect: '格挡减伤', affixes: [ax('damageReduction', 6, '伤害减免'), ax('allRes', 9, '全抗性')] },
  { id: 'spirit_shield', name: '精神盾', slot: 'offhand', offhandClass: 'shield', icon: 'shield', quality: 'legendary', armor: 12, legendaryEffect: '快速施法感（攻速）', affixes: [ax('attackSpeed', 12, '攻击速度'), ax('resRegenPct', 10, '资源回复'), ax('skillLevel', 1, '全技能等级')] },
  { id: 'exile', name: '流放', slot: 'offhand', offhandClass: 'shield', icon: 'shield', reqClass: 'paladin', quality: 'legendary', armor: 17, legendaryEffect: '生命光环感', affixes: [ax('hp', 50, '生命'), ax('lifesteal', 4, '吸血')] },
  { id: 'rorg', name: '皇家华戒', slot: 'ring1', quality: 'legendary', legendaryEffect: '套装效果所需件数 -1（最少仍需 2 件）', itemPower: { setReqReduce: 1 }, affixes: [ax('hp', 40, '生命'), ax('allRes', 10, '全抗性'), ax('str', 8, '力量')] },
  { id: 'unity_ring', name: '合一之戒', slot: 'ring1', quality: 'legendary', legendaryEffect: '减伤与生命', affixes: [ax('damageReduction', 6, '伤害减免'), ax('hp', 50, '生命')] }
);

(function applyThreePieceSetBonuses() {
  const three = {
    immortal: { desc: '授予旋风斩；旋风伤害再 +20%，范围 +8%', skillGrant: { whirlwind: 1 }, skillDmg: { whirlwind: 0.2 }, aoePct: 0.08 },
    wreckage: { desc: '授予狂乱，狂乱伤害 +20%', skillGrant: { frenzy: 1 }, skillDmg: { frenzy: 0.2 } },
    sky: { desc: '授予扫射，扫射伤害 +20%', skillGrant: { strafe: 1 }, skillDmg: { strafe: 0.2 } },
    javelin: { desc: '授予闪电之怒，其伤害 +18%', skillGrant: { lightningFury: 1 }, skillDmg: { lightningFury: 0.18 } },
    orbiter: { desc: '授予雷暴；连锁闪电伤害 +15%', skillGrant: { thunderstorm: 1 }, skillDmg: { chainLightning: 0.15 } },
    frostveil: { desc: '授予暴风雪，暴风雪伤害 +18%', skillGrant: { blizzard: 1 }, skillDmg: { blizzard: 0.18 } },
    werehide: { desc: '授予狂怒，狂怒伤害 +18%', skillGrant: { fury: 1 }, skillDmg: { fury: 0.18 } },
    packlord: { desc: '授予飓风，飓风伤害 +18%', skillGrant: { hurricane: 1 }, skillDmg: { hurricane: 0.18 } },
    trapsmith: { desc: '授予死亡守卫，其伤害 +18%', skillGrant: { deathSentry: 1 }, skillDmg: { deathSentry: 0.18 } },
    clawdance: { desc: '授予凤凰打击，其伤害 +18%', skillGrant: { phoenix: 1 }, skillDmg: { phoenix: 0.18 } },
    hammerdin: { desc: '授予神圣之锤，其伤害 +20%', skillGrant: { blessedHammer: 1 }, skillDmg: { blessedHammer: 0.2 } },
    zealot: { desc: '授予牺牲，热诚伤害 +12%', skillGrant: { sacrifice: 1 }, skillDmg: { zeal: 0.12 } },
    bonearmy: { desc: '授予尸爆，尸爆伤害 +18%', skillGrant: { corpseExplosion: 1 }, skillDmg: { corpseExplosion: 0.18 } },
    venom: { desc: '授予毒新星，其伤害 +18%', skillGrant: { poisonNova: 1 }, skillDmg: { poisonNova: 0.18 } },
    sigons: { desc: '授予旋风斩，旋风伤害 +15%', skillGrant: { whirlwind: 1 }, skillDmg: { whirlwind: 0.15 } },
    talrasha: { desc: '授予陨石，陨石伤害 +18%', skillGrant: { meteor: 1 }, skillDmg: { meteor: 0.18 } },
    glory: { desc: '授予导引箭，多重射击伤害 +12%', skillGrant: { guided: 1 }, skillDmg: { multiShot: 0.12 } },
    windwalk: { desc: '授予飓风，龙卷风伤害 +12%', skillGrant: { hurricane: 1 }, skillDmg: { tornado: 0.12 } },
    shadow: { desc: '授予刀刃之井，其伤害 +18%', skillGrant: { bladeFury: 1 }, skillDmg: { bladeFury: 0.18 } },
    hallowed: { desc: '授予天堂之拳，其伤害 +18%', skillGrant: { fistOfHeavens: 1 }, skillDmg: { fistOfHeavens: 0.18 } },
    trangeir: { desc: '授予骨矛，骨矛伤害 +18%', skillGrant: { boneSpear: 1 }, skillDmg: { boneSpear: 0.18 } },
    cathan: { desc: '授予火球，火球伤害 +12%', skillGrant: { fireball: 1 }, skillDmg: { fireball: 0.12 } },
    arctic: { desc: '授予冰霜新星，其伤害 +12%', skillGrant: { frostNova: 1 }, skillDmg: { frostNova: 0.12 } },
    infernal: { desc: '授予陨石，火墙伤害 +12%', skillGrant: { meteor: 1 }, skillDmg: { fireWall: 0.12 } },
    angelic: { desc: '生命 +35，全抗 +5%', hp: 35, allRes: 0.05 },
    deaths: { desc: '吸血 +2%，物理 +8%', lifesteal: 0.02, physDmgPct: 0.08 },
    hsarus: { desc: '护甲 +20，生命 +30', armor: 20, hp: 30 },
    vidala: { desc: '攻速 +6%，攻击距离 +6%', attackSpeed: 0.06, attackRange: 0.06 },
    disciple: { desc: '冷却缩减 +5%，资源回复 +6%', cdrPct: 0.05, resRegenPct: 0.06 },
    guardian: { desc: '生命 +40，减伤 3%', hp: 40, damageReduction: 0.03 },
    wanderer: { desc: '对精英 +6%，生命 +25', eliteDmgPct: 0.06, hp: 25 },
  };
  for (const [id, bonus] of Object.entries(three)) {
    if (SETS[id]) SETS[id].bonuses[3] = bonus;
  }
  for (const set of Object.values(SETS)) {
    if (set?.bonuses && !set.bonuses[3] && set.bonuses[2] && set.bonuses[4]) {
      set.bonuses[3] = { desc: '生命 +36，护甲 +10', hp: 36, armor: 10 };
    }
  }
})();

