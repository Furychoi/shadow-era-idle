import {
  CHARACTERS, SKILLS, SETS, MORPHS, RACES, MONSTER_TYPES, ELITE_AFFIXES,
  monsterStats, BOSSES, MAPS,
} from './data.js';

export function getTagCounts(hero) {
  const counts = {};
  for (const [id, lv] of Object.entries(hero.skillLevels || {})) {
    if (lv < 1) continue;
    const skill = SKILLS[hero.charId]?.[id];
    if (!skill?.tags) continue;
    for (const t of skill.tags) counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

export function resonanceBonus(hero) {
  const c = getTagCounts(hero);
  const bonus = { dmg: 1, pierce: 0, aoe: 1, summon: 1 };
  const bump = (tag) => {
    const n = c[tag] || 0;
    if (n >= 8) return 0.22;
    if (n >= 6) return 0.12;
    if (n >= 4) return 0.06;
    return 0;
  };
  bonus.dmg += bump('projectile') + bump('melee') + bump('fire') + bump('ice') + bump('lightning') + bump('poison');
  if ((c.projectile || 0) >= 6) bonus.pierce += 1;
  if ((c.aoe || 0) >= 6) bonus.aoe += 0.15;
  if ((c.summon || 0) >= 6) bonus.summon += 0.3;
  return bonus;
}

export function synergyMult(hero, skill) {
  if (!skill?.synergy) return 1;
  let add = 0;
  for (const s of skill.synergy) {
    add += ((hero.skillLevels?.[s.skill] || 0) * (s.pct || 0)) / 100;
  }
  return 1 + Math.min(add, 2.8);
}

export function getEquippedMorphs(hero) {
  const morphs = [];
  for (const item of Object.values(hero.equipment || {})) {
    if (item?.morphId) {
      morphs.push({
        id: item.morphId,
        skillId: item.morphSkill || null,
        def: MORPHS[item.morphId],
        itemName: item.name,
      });
    }
  }
  return morphs;
}

export function morphForSkill(hero, skillId) {
  const list = getEquippedMorphs(hero);
  return list.find(m => m.skillId === skillId) || list.find(m => !m.skillId) || null;
}

export function calcHeroStats(hero) {
  const charDef = CHARACTERS[hero.charId];
  const level = hero.level;
  const reso = resonanceBonus(hero);
  let stats = {
    str: 10 + level * 2,
    agi: 10 + (charDef.mainStat === 'agi' ? level * 2 : 0),
    int: 10 + (charDef.mainStat === 'int' ? level * 2 : 0),
    vit: 10,
    hp: 0, maxHp: 0,
    damage: charDef.baseDamage + level * 1.5,
    armor: charDef.baseArmor + level * 0.5,
    attackSpeed: 0,
    critRate: 0.05,
    critDmg: 1.5,
    physDmgPct: 0, fireDmgPct: 0, iceDmgPct: 0, lightningDmgPct: 0, poisonDmgPct: 0,
    lifeRegen: 0, killHeal: 0, lifesteal: 0,
    damageReduction: 0, allRes: 0,
    skillLevelBonus: 0,
    pierceBonus: 0,
    summonBonus: 0,
    attackInterval: charDef.attackInterval,
    reso,
  };

  if (charDef.mainStat === 'str') stats.str += level * 2;

  stats.maxHp = charDef.baseHp + level * 8 + stats.vit * 2;

  const skillLevels = hero.skillLevels || {};
  for (const [skillId, lv] of Object.entries(skillLevels)) {
    if (lv <= 0) continue;
    const skill = SKILLS[hero.charId]?.[skillId];
    if (!skill) continue;
    if (skill.damageBonus) stats.physDmgPct += skill.damageBonus * lv;
    if (skill.armorBonus) stats.armor *= (1 + skill.armorBonus * lv);
    if (skill.hpBonus) stats.maxHp *= (1 + skill.hpBonus * lv);
    if (skill.lifesteal) stats.lifesteal += skill.lifesteal * lv;
    if (skill.damageReduction) stats.damageReduction += skill.damageReduction * Math.max(lv, 1);
    if (skill.critBonus) stats.critRate += skill.critBonus * lv;
    if (skill.pierceBonus) stats.pierceBonus += skill.pierceBonus * lv;
    if (skill.summonBonus) stats.summonBonus += skill.summonBonus * lv;
    if (skill.allResBonus) stats.allRes += skill.allResBonus * lv;
    if (skill.skillBonus) stats.skillLevelBonus += skill.skillBonus * Math.ceil(lv / 5);
  }

  for (const item of Object.values(hero.equipment || {})) {
    if (!item) continue;
    applyItemStats(stats, item);
  }
  applySetBonuses(stats, hero.equipment);

  stats.physDmgPct += (reso.dmg - 1) * 0.5;
  stats.pierceBonus += reso.pierce * 0.15;
  stats.summonBonus *= reso.summon;

  stats.maxHp = Math.floor(stats.maxHp);
  stats.damage = Math.floor(stats.damage);
  stats.armor = Math.floor(stats.armor);
  stats.attackInterval = Math.max(0.25, stats.attackInterval / (1 + stats.attackSpeed));
  stats.damageReduction = Math.min(0.75, stats.damageReduction);
  return stats;
}

function applyItemStats(stats, item) {
  if (item.baseDamage) stats.damage += item.baseDamage;
  if (item.armor) stats.armor += item.armor;
  for (const affix of item.affixes || []) {
    const val = affix.value;
    switch (affix.stat) {
      case 'str': stats.str += val; break;
      case 'agi': stats.agi += val; break;
      case 'int': stats.int += val; break;
      case 'hp': stats.maxHp += val; break;
      case 'armor': stats.armor += val; break;
      case 'physDmgPct': stats.physDmgPct += val / 100; break;
      case 'fireDmgPct': stats.fireDmgPct += val / 100; break;
      case 'iceDmgPct': stats.iceDmgPct += val / 100; break;
      case 'lightningDmgPct': stats.lightningDmgPct += val / 100; break;
      case 'critRate': stats.critRate += val / 100; break;
      case 'critDmg': stats.critDmg += val / 100; break;
      case 'attackSpeed': stats.attackSpeed += val / 100; break;
      case 'lifeRegen': stats.lifeRegen += val; break;
      case 'killHeal': stats.killHeal += val / 100; break;
      case 'allRes': stats.allRes += val / 100; break;
    }
  }
}

function applySetBonuses(stats, equipment) {
  const setCounts = {};
  for (const item of Object.values(equipment || {})) {
    if (item?.setId) setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
  }
  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = SETS[setId];
    if (!setDef) continue;
    for (const [pieces, bonus] of Object.entries(setDef.bonuses)) {
      if (count >= parseInt(pieces, 10)) {
        if (bonus.attackSpeed) stats.attackSpeed += bonus.attackSpeed;
        if (bonus.hp) stats.maxHp += bonus.hp;
        if (bonus.skillLevel) stats.skillLevelBonus += bonus.skillLevel;
        if (bonus.fireDmgPct) stats.fireDmgPct += bonus.fireDmgPct;
        if (bonus.physDmgPct) stats.physDmgPct += bonus.physDmgPct;
        if (bonus.pierceBonus) stats.pierceBonus += bonus.pierceBonus;
      }
    }
  }
}

export function calcDPS(hero) {
  const stats = calcHeroStats(hero);
  const charDef = CHARACTERS[hero.charId];
  const mainStat = stats[charDef.mainStat] || 10;
  const baseDmg = stats.damage * (1 + mainStat / 100) * (1 + stats.physDmgPct);
  const critMod = 1 + stats.critRate * (stats.critDmg - 1);
  let dps = baseDmg * critMod / stats.attackInterval;

  const equipped = hero.equippedSkills || [];
  for (const skillId of equipped) {
    const skill = SKILLS[hero.charId]?.[skillId];
    if (!skill || skill.type === 'passive' || skill.type === 'aura') continue;
    const lv = (hero.skillLevels?.[skillId] || 0) + stats.skillLevelBonus;
    if (lv <= 0 && skill.type !== 'buff') continue;
    const mult = (skill.damageMult || 1) * (1 + Math.max(lv, 1) * 0.08) * synergyMult(hero, skill);
    const cd = Math.max(skill.cooldown || 1, 0.6);
    dps += (baseDmg * mult) / cd;
  }
  dps *= (1 + (stats.summonBonus || 0));
  return Math.floor(dps);
}

export function calcEHP(hero, monsterLevel = 10) {
  const stats = calcHeroStats(hero);
  const armorFactor = 1 + stats.armor / (stats.armor + 50 * monsterLevel);
  return Math.floor(stats.maxHp * armorFactor / Math.max(0.25, 1 - stats.damageReduction));
}

export function calcDamage(hero, monster, skill = null) {
  const stats = calcHeroStats(hero);
  const charDef = CHARACTERS[hero.charId];
  const mainStat = stats[charDef.mainStat] || 10;
  let skillMult = 1;
  let element = 'physical';
  let aoe = false;
  let hits = 1;

  if (skill) {
    const lv = (hero.skillLevels?.[skill.id] || 0) + stats.skillLevelBonus;
    skillMult = (skill.damageMult || 1) * (1 + Math.max(lv, 1) * 0.08) * synergyMult(hero, skill);
    element = skill.element || 'physical';
    hits = skill.hits || 1;
    aoe = !!skill.aoe;
    const morph = morphForSkill(hero, skill.id);
    if (morph) {
      if (morph.id === 'nova') { aoe = true; skillMult *= 0.85; }
      if (morph.id === 'split') hits += 2;
      if (morph.id === 'chain') hits += 2;
      if (morph.id === 'pierce') skillMult *= 0.85 + stats.pierceBonus;
      if (morph.id === 'convert') element = 'fire';
      if (morph.id === 'trail') skillMult *= 1.15;
    }
    if (skill.static && monster.isBoss) skillMult *= 0.35;
  }

  let dmgBonus = stats.physDmgPct;
  if (element === 'fire') dmgBonus += stats.fireDmgPct;
  if (element === 'ice') dmgBonus += stats.iceDmgPct;
  if (element === 'lightning') dmgBonus += stats.lightningDmgPct;
  if (element === 'poison') dmgBonus += stats.poisonDmgPct;

  let damage = stats.damage * (1 + mainStat / 100) * skillMult * (1 + dmgBonus) * hits;
  const isCrit = Math.random() < stats.critRate;
  if (isCrit) damage *= stats.critDmg;
  if (monster.kind === 'rare' || monster.kind === 'rareBoss' || monster.isBoss) {
    if (isCrit) damage *= 1.1;
  }

  const monsterRes = monster.resistances?.[element] || 0;
  const resCap = Math.min(0.75, monsterRes - stats.allRes * 0.5);
  damage *= (1 - resCap);
  damage *= 0.9 + Math.random() * 0.2;
  if (aoe) damage *= stats.reso.aoe;
  damage *= 1 + (stats.summonBonus || 0) * 0.25;
  return { damage: Math.max(1, Math.floor(damage)), isCrit, element, aoe };
}

export function calcMonsterDamage(monster, hero) {
  const stats = calcHeroStats(hero);
  let dmg = monster.damage;
  const armorFactor = stats.armor / (stats.armor + 50 * monster.level);
  dmg *= (1 - armorFactor);
  dmg *= (1 - stats.damageReduction);
  dmg *= (1 - stats.allRes * 0.5);
  return Math.max(1, Math.floor(dmg));
}

function rollKind() {
  const r = Math.random();
  if (r < 0.72) return 'normal';
  if (r < 0.88) return 'elite';
  if (r < 0.97) return 'rare';
  return 'elite';
}

export function createMonster(map, opts = {}) {
  const { forceBoss = false, bossId = null, forceRareBoss = false } = opts;
  if (forceBoss && bossId) {
    const boss = BOSSES[bossId];
    const kind = forceRareBoss ? 'rareBoss' : (boss.type || 'actBoss');
    const t = MONSTER_TYPES[kind] || MONSTER_TYPES.actBoss;
    const hp = Math.floor(boss.hp * (forceRareBoss ? 1.4 : 1));
    return {
      name: forceRareBoss ? `稀有·${boss.name}` : boss.name,
      level: boss.level, hp, maxHp: hp, damage: Math.floor(boss.damage * (forceRareBoss ? 1.25 : 1)),
      armor: boss.armor, resistances: { ...boss.resistances },
      isBoss: true, bossId, kind, race: boss.race, phase: 1,
      eliteAffixes: forceRareBoss ? rollEliteAffixes(2) : [],
      iso: { x: 5.5, y: 3.2 },
    };
  }

  const kind = rollKind();
  const t = MONSTER_TYPES[kind];
  const level = map.levelMin + Math.floor(Math.random() * (map.levelMax - map.levelMin + 1));
  const ms = monsterStats(level);
  const mdef = map.monsters[Math.floor(Math.random() * map.monsters.length)];
  const race = RACES[mdef.race] || RACES.humanoid;
  const affixes = kind === 'elite' ? rollEliteAffixes(1) : kind === 'rare' ? rollEliteAffixes(2 + (Math.random() < 0.5 ? 1 : 0)) : [];
  let hp = ms.hp * t.hp;
  let dmg = ms.damage * t.dmg;
  for (const a of affixes) {
    if (a.hp) hp *= a.hp;
    if (a.dmg) dmg *= a.dmg;
  }
  const prefix = affixes.map(a => a.name).filter(Boolean).join('·');
  const name = prefix ? `${prefix} ${mdef.name}` : mdef.name;
  return {
    name, level,
    hp: Math.floor(hp), maxHp: Math.floor(hp),
    damage: Math.floor(dmg), armor: ms.armor,
    exp: Math.floor(ms.exp * t.exp), gold: Math.floor(ms.gold * t.exp * 0.6),
    isBoss: false, kind, race: mdef.race,
    resistances: { ...race.res },
    eliteAffixes: affixes,
    iso: { x: 4 + Math.random() * 3, y: 1.5 + Math.random() * 3 },
  };
}

function rollEliteAffixes(n) {
  const pool = [...ELITE_AFFIXES];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function estimateBossWinRate(hero, boss) {
  const dps = calcDPS(hero);
  const ehp = calcEHP(hero, boss.level);
  const timeToKill = (boss.maxHp || boss.hp) / Math.max(dps, 1);
  const stats = calcHeroStats(hero);
  const monsterDmg = boss.damage * (1 - stats.armor / (stats.armor + 50 * boss.level));
  const timeToDie = (ehp / Math.max(monsterDmg, 1)) * 1.5;
  if (timeToKill <= timeToDie * 0.5) return Math.min(95, 60 + ((timeToDie - timeToKill) / timeToDie) * 40);
  if (timeToKill <= timeToDie) return Math.floor(30 + ((timeToDie - timeToKill) / timeToDie) * 50);
  return Math.max(5, Math.floor(30 * timeToDie / timeToKill));
}

export function killsPerMinute(hero, map) {
  const avgLevel = (map.levelMin + map.levelMax) / 2;
  const dps = calcDPS(hero);
  const ms = monsterStats(Math.floor(avgLevel));
  const killTime = ms.hp / Math.max(dps, 1) + 0.4;
  return Math.max(1, Math.floor(60 / killTime));
}

export function expPerHour(hero, map) {
  const kpm = killsPerMinute(hero, map);
  const avgLevel = (map.levelMin + map.levelMax) / 2;
  const ms = monsterStats(Math.floor(avgLevel));
  return kpm * 60 * ms.exp;
}

export function getMap(id) {
  return MAPS.find(m => m.id === id) || MAPS[0];
}

export { MAPS };
