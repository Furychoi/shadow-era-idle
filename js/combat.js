function getTagCounts(hero) {
  const counts = {};
  for (const [id, lv] of Object.entries(hero.skillLevels || {})) {
    if (lv < 1) continue;
    const skill = SKILLS[hero.charId]?.[id];
    if (!skill?.tags) continue;
    for (const t of skill.tags) counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

function resonanceBonus(hero) {
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

function synergyMult(hero, skill) {
  if (!skill?.synergy) return 1;
  let add = 0;
  for (const s of skill.synergy) {
    add += ((hero.skillLevels?.[s.skill] || 0) * (s.pct || 0)) / 100;
  }
  return 1 + Math.min(add, 2.8);
}

function morphAppliesToHero(hero, item) {
  if (!hero || !item?.morphId) return false;
  const def = MORPHS[item.morphId];
  if (!def) return false;
  if (item.reqClass && item.reqClass !== hero.charId) return false;
  if (def.reqClass && def.reqClass !== hero.charId) return false;
  if (def.classes && !def.classes.includes(hero.charId)) return false;
  return true;
}

function getEquippedMorphs(hero) {
  const morphs = [];
  for (const item of Object.values(hero.equipment || {})) {
    if (!morphAppliesToHero(hero, item)) continue;
    morphs.push({
      id: item.morphId,
      skillId: item.morphSkill || null,
      def: MORPHS[item.morphId],
      itemName: item.name,
    });
  }
  return morphs;
}

function morphForSkill(hero, skillId) {
  const list = getEquippedMorphs(hero);
  return list.find(m => m.skillId === skillId) || null;
}

function equipmentSetReduce(equipment) {
  let n = 0;
  for (const item of Object.values(equipment || {})) {
    n += item?.itemPower?.setReqReduce || 0;
  }
  return n;
}

function setPiecesNeeded(need, reduce) {
  const n = parseInt(need, 10) || 0;
  return Math.max(2, n - (reduce || 0));
}

function setBonusEntries(def) {
  return Object.entries(def?.bonuses || {}).sort((a, b) => (parseInt(a[0], 10) || 0) - (parseInt(b[0], 10) || 0));
}

function setBonusActive(count, need, reduce) {
  return (count || 0) >= setPiecesNeeded(need, reduce);
}

function ensurePowerMaps(stats) {
  if (!stats) return;
  stats.skillHits = stats.skillHits || {};
  stats.skillNova = stats.skillNova || {};
  stats.skillTrail = stats.skillTrail || {};
  stats.skillPierce = stats.skillPierce || {};
  stats.skillConvert = stats.skillConvert || {};
  stats.echoSkill = stats.echoSkill || {};
  stats.setReqReduce = stats.setReqReduce || 0;
}

function applyPowerBlob(stats, blob) {
  if (!blob || !stats) return;
  ensurePowerMaps(stats);
  if (blob.setReqReduce) stats.setReqReduce += blob.setReqReduce;
  if (blob.shapecast) stats.shapecast = true;
  if (blob.windowBonus) stats.windowBonus = (stats.windowBonus || 0) + blob.windowBonus;
  if (blob.wwLifesteal) stats.wwLifesteal = (stats.wwLifesteal || 0) + blob.wwLifesteal;
  if (blob.enemyResDown) stats.enemyResDown = (stats.enemyResDown || 0) + blob.enemyResDown;
  if (blob.procEquipped) stats.procEquipped = true;
  if (blob.onHitCast) stats.onHitCast = blob.onHitCast;
  if (blob.killReset) stats.killReset = blob.killReset;
  if (blob.skillHits) mergeSkillMap(stats.skillHits, blob.skillHits, 'add');
  if (blob.echoSkill) Object.assign(stats.echoSkill, blob.echoSkill);
  if (blob.skillNova) {
    for (const id of Object.keys(blob.skillNova)) {
      if (blob.skillNova[id]) stats.skillNova[id] = true;
    }
  }
  if (blob.skillTrail) {
    for (const id of Object.keys(blob.skillTrail)) {
      if (blob.skillTrail[id]) stats.skillTrail[id] = true;
    }
  }
  if (blob.skillPierce) {
    for (const id of Object.keys(blob.skillPierce)) {
      if (blob.skillPierce[id]) stats.skillPierce[id] = true;
    }
  }
  if (blob.skillConvert) Object.assign(stats.skillConvert, blob.skillConvert);
}

function applyMorphPower(stats, morphId, skillId) {
  ensurePowerMaps(stats);
  const sid = skillId;
  switch (morphId) {
    case 'nova': if (sid) stats.skillNova[sid] = true; break;
    case 'split': if (sid) stats.skillHits[sid] = (stats.skillHits[sid] || 0) + 2; break;
    case 'chain': if (sid) stats.skillHits[sid] = (stats.skillHits[sid] || 0) + 2; break;
    case 'pierce': if (sid) stats.skillPierce[sid] = true; break;
    case 'trail': if (sid) stats.skillTrail[sid] = true; break;
    case 'convert': if (sid) stats.skillConvert[sid] = 'fire'; break;
    case 'proc': stats.onHitCast = { skillId: sid || null, chance: 0.2, coeff: 0.5 }; break;
    case 'reset': if (sid) stats.killReset = sid; break;
    case 'shapecast': stats.shapecast = true; break;
    case 'window': stats.windowBonus = (stats.windowBonus || 0) + 1.5; break;
    default: break;
  }
}

function applyEquippedMorphs(stats, hero) {
  for (const item of Object.values(hero.equipment || {})) {
    if (!morphAppliesToHero(hero, item)) continue;
    applyMorphPower(stats, item.morphId, item.morphSkill);
  }
}

function calcHeroStats(hero, opts = {}) {
  const charDef = CHARACTERS[hero.charId];
  const level = hero.level;
  const reso = resonanceBonus(hero);
  const liveBuffs = opts.buffs || {};
  const useLive = !!opts.useCombatBuffs;
  let stats = {
    str: 10 + level * 2,
    agi: 10 + (charDef.mainStat === 'agi' ? level * 2 : 0),
    int: 10 + (charDef.mainStat === 'int' ? level * 2 : 0),
    vit: 10 + level * 2,
    wis: 10 + level * 2,
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
    hitChance: 0,
    pierceBonus: 0,
    summonBonus: 0,
    eliteDmgPct: 0,
    aoePct: 0,
    cdrPct: 0,
    resRegenPct: 0,
    enemyResDown: 0,
    enemyDmgDown: 0,
    vsUndead: 0,
    vsDemon: 0,
    reflectPct: 0,
    slowAura: 0,
    zealExtra: 0,
    sacrificeAmp: 0,
    magicIgnoreArmor: 0,
    hammerAoe: 0,
    fohExtra: 0,
    hpCostReduce: 0,
    skillGrant: {},
    skillDmg: {},
    skillCostPct: {},
    skillHits: {},
    skillNova: {},
    skillTrail: {},
    skillPierce: {},
    skillConvert: {},
    echoSkill: {},
    setReqReduce: 0,
    shapecast: false,
    windowBonus: 0,
    wwLifesteal: 0,
    procEquipped: false,
    onHitCast: null,
    killReset: null,
    attackRange: charDef.attackRange || 1.4,
    rangePct: 0,
    attackInterval: charDef.attackInterval * 2.55,
    reso,
    maxRes: 0, resRegen: 0, resName: '魔法', resId: 'mana', resColor: '#4a8cee',
    resOnHit: 0, resOnKill: 0, resStartFull: true,
  };

  if (charDef.mainStat === 'str') stats.str += level * 2;

  stats.maxHp = charDef.baseHp + level * 8 + stats.vit * 2;

  for (const item of Object.values(hero.equipment || {})) {
    if (!item) continue;
    applyItemStats(stats, item);
    if (item.itemPower) applyPowerBlob(stats, item.itemPower);
  }
  stats.setReqReduce = Math.min(1, stats.setReqReduce || 0);
  applySetBonuses(stats, hero.equipment);
  applyEquippedMorphs(stats, hero);
  applyLearnedSkillStats(hero, stats, { useLive, liveBuffs });

  stats.physDmgPct += (reso.dmg - 1) * 0.5;
  stats.pierceBonus += reso.pierce * 0.15;
  stats.summonBonus *= reso.summon;

  stats.attackSpeed += stats.agi * 0.0015;
  const train = heroTrainBonuses(hero);
  stats.str += train.str || 0;
  stats.agi += train.agi || 0;
  stats.int += train.int || 0;
  stats.vit += train.vit || 0;
  stats.wis += train.wisdom || 0;
  stats.maxHp += (train.hp || 0) + (train.vit || 0) * 2;
  stats.armor += train.armor || 0;
  stats.allRes += train.allRes || 0;
  stats.damage = Math.floor(stats.damage * (1 + (train.damage || 0)));
  stats.attackSpeed += train.attackSpeed || 0;
  stats.fireDmgPct += train.elemDmg || 0;
  stats.iceDmgPct += train.elemDmg || 0;
  stats.lightningDmgPct += train.elemDmg || 0;
  stats.poisonDmgPct += train.elemDmg || 0;
  stats.physDmgPct += train.physDmg || 0;
  stats.cdrPct += train.cdr || 0;
  stats.attackSpeed = Math.min(0.9, stats.attackSpeed);
  stats.attackRange += stats.agi * 0.004;
  stats.attackRange *= (1 + stats.rangePct) * (1 + (train.attackRange || 0));
  stats.attackRange = Math.min(7.2, Math.max(0.9, stats.attackRange));
  stats.maxHp = Math.floor(stats.maxHp);
  stats.damage = Math.floor(stats.damage);
  stats.armor = Math.floor(stats.armor);
  stats.attacksPerSec = 1 / Math.max(1.05, stats.attackInterval / (1 + stats.attackSpeed));
  stats.attackInterval = 1 / stats.attacksPerSec;
  stats.damageReduction = Math.min(0.75, stats.damageReduction);
  applyResourceStats(stats, hero);
  applyCritOverflow(stats);
  return stats;
}

function applyCritOverflow(stats) {
  if (stats.critRate > 1) {
    stats.critDmg += (stats.critRate - 1) * 2;
    stats.critRate = 1;
  }
}

function applyLearnedSkillStats(hero, stats, opts = {}) {
  const tree = SKILLS[hero.charId] || {};
  const levels = hero.skillLevels || {};
  const useLive = !!opts.useLive;
  const liveBuffs = opts.liveBuffs || {};
  const active = (id, skill) => {
    if (!skill) return false;
    if ((levels[id] || 0) <= 0 && !(stats.skillGrant?.[id] > 0)) return false;
    if (skill.type !== 'aura' && !isSkillEnabled(hero, id)) return false;
    if (skill.type === 'buff' && useLive && !isBuffActive(liveBuffs, id)) return false;
    if (skill.type === 'aura' && !isAuraOn(hero, id)) return false;
    return true;
  };
  for (const [id, skill] of Object.entries(tree)) {
    if (!skill?.skillBonus || !active(id, skill)) continue;
    const invested = Math.max(levels[id] || 0, stats.skillGrant?.[id] || 0);
    stats.skillLevelBonus += skillBonusGranted(skill, invested);
  }
  for (const [id, skill] of Object.entries(tree)) {
    if (!active(id, skill)) continue;
    const lv = effectiveSkillLevel(hero, id, stats);
    if (lv <= 0) continue;
    applySkillStatBonuses(stats, skill, lv, { skipSkillBonus: true });
  }
}

function classResource(charId) {
  return CHARACTERS[charId]?.resource || {
    id: 'mana', name: '魔法', color: '#4a8cee', maxBase: 30, maxPerLevel: 4, fromInt: 1.5, regen: 3, startFull: true,
  };
}

function applyResourceStats(stats, hero) {
  const r = classResource(hero.charId);
  const fromWis = r.fromWis != null ? r.fromWis : (r.id === 'mana' ? 0.9 : 0.2);
  const regenFromWis = r.regenFromWis != null ? r.regenFromWis : 0.03;
  const max = Math.floor(
    (r.maxBase || 0) +
    (hero.level || 1) * (r.maxPerLevel || 0) +
    stats.int * (r.fromInt || 0) +
    stats.str * (r.fromStr || 0) +
    (stats.wis || 0) * fromWis
  );
  stats.resId = r.id;
  stats.resName = r.name;
  stats.resColor = r.color || '#4a8cee';
  stats.maxRes = Math.max(1, max);
  stats.resRegen = Math.round((r.regen + stats.int * (r.regenFromInt || 0.03) + (stats.wis || 0) * regenFromWis) * 10) / 10;
  if (stats.resRegenPct) stats.resRegen = Math.round(stats.resRegen * (1 + stats.resRegenPct) * 10) / 10;
  stats.resOnHit = r.onHit || 0;
  stats.resOnKill = r.onKill || 0;
  stats.resStartFull = r.startFull !== false;
}

function clampHeroResource(hero, stats) {
  const st = stats || calcHeroStats(hero);
  if (typeof hero.currentRes !== 'number' || Number.isNaN(hero.currentRes)) {
    hero.currentRes = st.resStartFull ? st.maxRes : 0;
  }
  hero.currentRes = Math.max(0, Math.min(st.maxRes, hero.currentRes));
  return st;
}

function gainResource(hero, stats, amount) {
  if (!amount) return;
  const max = stats?.maxRes || calcHeroStats(hero).maxRes;
  hero.currentRes = Math.min(max, (hero.currentRes || 0) + amount);
}

function skillResCost(hero, skill, stats) {
  if (!skill || skill.type === 'passive' || skill.type === 'aura') return 0;
  let cost = 0;
  if (skill.resCost != null) cost = Math.max(0, Math.floor(skill.resCost));
  else if (skill.resGain) cost = 0;
  else {
    const r = classResource(hero.charId);
    if (r.id === 'rage') cost = 0;
    else {
      const lv = Math.max(1, hero.skillLevels?.[skill.id] || 1);
      const base = (skill.cooldown || 0) > 0 ? skill.cooldown * 4 : 8;
      const dmg = (skill.damageMult || 1) * 6;
      cost = Math.max(6, Math.floor((base + dmg) * (1 - lv * 0.02)));
    }
  }
  const cut = (stats || calcHeroStats(hero)).skillCostPct?.[skill.id] || 0;
  if (cut > 0) cost = Math.max(0, Math.floor(cost * Math.max(0.15, 1 - cut)));
  return cost;
}

function skillResGain(hero, skill) {
  if (!skill) return 0;
  if (skill.resGain != null) return skill.resGain;
  if ((skill.resCost || 0) > 0) return 0;
  const r = classResource(hero.charId);
  if (r.id === 'rage' && skill.tags?.includes('opener')) return 16;
  return 0;
}

function isCombatCastSkill(skill) {
  if (!skill || skill.type !== 'active') return false;
  if (skill.tree === 'warcry') return false;
  return (skill.damageMult || 0) > 0
    || !!skill.channel
    || !!skill.duration
    || !!skill.plantSummon
    || !!skill.curse;
}

function isCoreCombatSkill(skill) {
  if (!isCombatCastSkill(skill)) return false;
  if (skill.channel || skill.tree === 'combat') return true;
  if (skill.duration || skill.plantSummon || skill.curse) return true;
  if ((skill.tags || []).includes('opener')) return true;
  if ((skill.tags || []).includes('trap')) return true;
  if ((skill.hits || 0) > 1) return true;
  return (skill.damageMult || 0) >= 0.7;
}

function pickReadySkill(hero, ready) {
  if (!ready?.length) return null;
  const core = ready.filter(r => isCoreCombatSkill(r.skill));
  const src = core.length ? core : ready;
  const spenders = src.filter(r => r.cost > 0);
  const generators = src.filter(r => r.cost <= 0 && skillResGain(hero, r.skill) > 0);
  const rest = src.filter(r => r.cost <= 0 && skillResGain(hero, r.skill) <= 0);
  const rank = (r) => {
    let n = r.cost;
    if (r.skill.channel) n += 8;
    if ((r.skill.tags || []).includes('finisher')) n += 4;
    if (r.skill.tree === 'combat') n += 2;
    return n;
  };
  const pool = spenders.length ? spenders : (generators.length ? generators : rest);
  return pool.slice().sort((a, b) => rank(b) - rank(a))[0] || src[0] || ready[0];
}

function skillBonusGranted(skill, lv) {
  if (!skill?.skillBonus || lv < 1) return 0;
  return skill.skillBonus * lv + Math.floor(lv / 5);
}

function skillBonusBreakdown(hero, opts = {}) {
  const liveBuffs = opts.buffs || {};
  const useLive = !!opts.useCombatBuffs;
  const parts = [];
  for (const [id, lv] of Object.entries(hero.skillLevels || {})) {
    if (lv < 1) continue;
    const skill = SKILLS[hero.charId]?.[id];
    if (!skill?.skillBonus) continue;
    if (skill.type === 'buff' && useLive && !isBuffActive(liveBuffs, id)) continue;
    if (skill.type === 'aura' && !isAuraOn(hero, id)) continue;
    const add = skillBonusGranted(skill, lv);
    if (add) parts.push({ id, name: skill.name, add });
  }
  for (const s of getSetStatus(hero.equipment)) {
      const reduce = equipmentSetReduce(hero.equipment);
    for (const [n, bonus] of setBonusEntries(s.def)) {
      if (setBonusActive(s.count, n, reduce) && bonus.skillLevel) {
        parts.push({ name: `${s.def.name}${n}件`, add: bonus.skillLevel });
      }
      if (setBonusActive(s.count, n, reduce) && bonus.skillGrant) {
        for (const [id, lv] of Object.entries(bonus.skillGrant)) {
          const nm = SKILLS[hero.charId]?.[id]?.name || id;
          parts.push({ name: `${s.def.name}${n}件授予${nm}`, add: lv });
        }
      }
    }
  }
  return parts;
}

function skillLevelParts(hero, skillId, stats) {
  const skill = SKILLS[hero.charId]?.[skillId];
  const base = hero.skillLevels?.[skillId] || 0;
  const grant = stats?.skillGrant?.[skillId] || 0;
  let bonus = stats?.skillLevelBonus || 0;
  if (skill?.skillBonus) bonus -= skillBonusGranted(skill, Math.max(base, grant));
  bonus = Math.max(0, Math.round(bonus));
  return { base, grant, bonus, max: skill?.maxLevel || 10, skill };
}

function combatSkillLevel(hero, skillId, stats) {
  const invested = hero.skillLevels?.[skillId] || 0;
  const grant = stats?.skillGrant?.[skillId] || 0;
  return Math.max(invested, grant);
}

function effectiveSkillLevel(hero, skillId, stats) {
  const p = skillLevelParts(hero, skillId, stats);
  const usable = p.base + (p.grant || 0);
  return usable > 0 ? Math.max(p.base, p.grant || 0) + p.bonus : 0;
}

function formatSkillLevelHtml(parts) {
  let s = `${parts.base}`;
  if ((parts.grant || 0) > 0) s += `<span class="lv-grant">+${parts.grant}套</span>`;
  if (parts.bonus > 0 && (parts.base > 0 || (parts.grant || 0) > 0)) {
    s += `<span class="lv-bonus">+${parts.bonus}</span>`;
  }
  return `${s}/${parts.max}`;
}

function fmtSkillPct(n) {
  const p = n * 100;
  if (Math.abs(p - Math.round(p)) < 0.05) return `${Math.round(p)}%`;
  return `${p.toFixed(1).replace(/\.0$/, '')}%`;
}

function skillAoeRadius(hero, skill, stats) {
  if (!skill) return 0;
  const tags = skill.tags || [];
  let r = skill.aoeRadius;
  if (r == null) {
    if (tags.includes('melee')) r = 1.45;
    else if (tags.includes('nova') || tags.includes('aoe')) r = 1.9;
    else if (skill.id === 'meteor' || skill.id === 'blizzard' || skill.id === 'fistOfHeavens' || skill.id === 'thunderstorm' || skill.id === 'hydra') r = 2.4;
    else r = 1.6;
  }
  const lv = Math.max(1, effectiveSkillLevel(hero, skill.id, stats) || 1);
  r += (skill.aoePerLevel || 0) * Math.max(0, lv - 1);
  r *= 1 + (stats?.aoePct || 0);
  if (skill.id === 'blessedHammer' && (stats?.hammerAoe || 0) > 0) r *= 1 + stats.hammerAoe;
  return r;
}

function isAroundHeroSkill(skill) {
  if (!skill) return false;
  const tags = skill.tags || [];
  if (skill.channel) return true;
  if (!skill.aoe) return false;
  return tags.includes('melee') || tags.includes('nova') ||
    ['frostNova', 'poisonNova', 'hurricane', 'whirlwind', 'leap', 'fury', 'shockwave', 'fists', 'holyFire', 'thunderstorm', 'warCry', 'mindBlast', 'staticField'].includes(skill.id);
}

function skillEffectLines(hero, skill, parts, stats) {
  const lv = parts.base > 0 ? parts.base + (parts.bonus || 0) : 0;
  const show = Math.max(1, lv);
  const lines = [];
  const nowPer = (label, per, fmt = fmtSkillPct) => {
    if (lv > 0) return `${label} +${fmt(per * lv)}（每级 +${fmt(per)}）`;
    return `${label} 每级 +${fmt(per)}`;
  };

  if (skill.damageMult) {
    const syn = synergyMult(hero, skill);
    const mult = skill.damageMult * (1 + show * 0.08) * syn;
    lines.push(`技能伤害 ×${mult.toFixed(2)}（基础 ${skill.damageMult}，每级 +8% 系数）`);
  }
  if (skill.damageBonus) lines.push(nowPer('物理伤害', skill.damageBonus));
  if (skill.hpBonus) {
    lines.push(lv > 0
      ? `最大生命 +${fmtSkillPct(skill.hpBonus * lv)}（每级 +${fmtSkillPct(skill.hpBonus)}）`
      : `最大生命 每级 +${fmtSkillPct(skill.hpBonus)}`);
  }
  if (skill.armorBonus) {
    lines.push(lv > 0
      ? `护甲 +${fmtSkillPct(skill.armorBonus * lv)}（每级 +${fmtSkillPct(skill.armorBonus)}）`
      : `护甲 每级 +${fmtSkillPct(skill.armorBonus)}`);
  }
  if (skill.lifesteal) lines.push(nowPer('吸血', skill.lifesteal));
  if (skill.critBonus) {
    const cap = 0.25;
    const raw = skill.critBonus * lv;
    const now = Math.min(cap, raw);
    const overflowDmg = skill.type === 'passive' && raw > cap ? (raw - cap) * 2 : 0;
    let line = lv > 0
      ? `暴击率 +${fmtSkillPct(now)}（每级 +${fmtSkillPct(skill.critBonus)}，最多 +${fmtSkillPct(cap)}）`
      : `暴击率 每级 +${fmtSkillPct(skill.critBonus)}，最多 +${fmtSkillPct(cap)}`;
    if (skill.type === 'passive') {
      line += overflowDmg > 0
        ? `；溢出转暴伤 +${fmtSkillPct(overflowDmg)}`
        : '；超出部分 ×2 转为暴击伤害';
    }
    lines.push(line);
  }
  if (skill.hitChance) lines.push(nowPer('命中', skill.hitChance));
  if (skill.attackSpeed) lines.push(nowPer('攻速', skill.attackSpeed));
  if (skill.damageReduction) lines.push(nowPer('减伤', skill.damageReduction));
  if (skill.shieldPct) lines.push(nowPer('护盾减伤', skill.shieldPct));
  if (skill.allResBonus) lines.push(nowPer('全抗', skill.allResBonus));
  if (skill.pierceBonus) lines.push(nowPer('穿透', skill.pierceBonus));
  if (skill.rangeBonus) {
    lines.push(lv > 0
      ? `攻击距离 +${(skill.rangeBonus * lv).toFixed(2)}（每级 +${skill.rangeBonus}）`
      : `攻击距离 每级 +${skill.rangeBonus}`);
  }
  if (skill.summonBonus) lines.push(nowPer('召唤伤害', skill.summonBonus));
  if (typeof skill.summonCount === 'function') {
    lines.push(`召唤数量 ${skill.summonCount(show)}`);
  } else if (skill.summonCount) {
    lines.push(`召唤数量 ${skill.summonCount}`);
  }
  if (skill.summonKind && !skill.plantSummon) {
    const tr = summonTrait(skill);
    const role = tr.role === 'ranged' ? '远程' : '近战';
    lines.push(`召唤体 ${role}`);
    lines.push(`召唤技能：${tr.skillName}（${tr.skillDesc}）`);
    if (stats?.maxHp) lines.push(`召唤生命 ${summonMaxHp(stats, tr, Math.max(1, lv))}`);
  }
  if (skill.skillBonus) {
    const add = skillBonusGranted(skill, Math.max(lv, 1));
    lines.push(lv > 0
      ? `全技能等级 +${skillBonusGranted(skill, lv)}（每级 +${skill.skillBonus}，每 5 级再 +1）`
      : `全技能等级 每级 +${skill.skillBonus}，每 5 级再 +1`);
    if (lv < 1) lines.push(`（1 级时 +${add}）`);
  }
  if (skill.aoe || skill.aoeRadius) {
    const r = skillAoeRadius(hero, skill, stats);
    const extra = skill.aoePerLevel ? `，每级 +${skill.aoePerLevel}` : '';
    lines.push(`作用范围 ${r.toFixed(1)} 格${extra}`);
  }
  if (skill.channel) {
    const ticks = Math.max(1, Math.floor(skill.channel / (skill.channelTick || 0.32)) + 1);
    lines.push(`持续 ${skill.channel}s · 约 ${ticks} 次打击（间隔 ${skill.channelTick || 0.32}s）`);
  }
  if (skill.plantSummon) {
    const tick = skill.lingerTick || 0.5;
    lines.push(`召唤驻守 ${skill.duration}s · 最多 ${skill.summonCap || 3} 只 · 喷火间隔 ${tick}s`);
  } else if (skill.duration) {
    const tick = skill.lingerTick || 0.45;
    const ticks = Math.max(1, Math.floor(skill.duration / tick));
    lines.push(`持续 ${skill.duration}s（≥冷却）· 约 ${ticks} 次（间隔 ${tick}s）`);
  }
  if (skill.hits > 1) lines.push(`命中次数 ${skill.hits}`);
  if (skill.stunChance) lines.push(`击晕 ${fmtSkillPct(skill.stunChance)}`);
  if (skill.tauntDuration) {
    lines.push(`嘲讽持续 ${((skill.tauntDuration || 5) + show * 0.4).toFixed(1)}s（每级 +0.4s）`);
  }
  if (skill.buffDuration) {
    lines.push(`持续时间 ${buffTime(skill, show).toFixed(0)}s`);
  }
  if (skill.cooldown > 0) lines.push(`冷却 ${skill.cooldown}s`);
  if (skill.hpCost) lines.push(`消耗生命 ${fmtSkillPct(skill.hpCost)}`);
  if (skill.auraSlot) {
    lines.push(skill.auraSlot === 'off' ? '进攻光环（同时只能启用一道）' : '防守光环（同时只能启用一道）');
  }
  if (skill.auraPulse) {
    const p = skill.auraPulse;
    const el = { fire: '火焰', ice: '冰霜', lightning: '闪电' }[p.element] || p.element;
    const bits = [];
    if (el) bits.push(`光环脉冲 ${el}`);
    else bits.push('光环脉冲');
    if (p.radius) bits.push(`半径 ${p.radius}`);
    if (p.interval) bits.push(`间隔 ${p.interval}s`);
    if (p.taunt) bits.push('嘲讽');
    if (p.flee) bits.push('溃逃');
    if (p.stun) bits.push('眩晕');
    lines.push(bits.join(' · '));
  }
  if (skill.enemyResDown) lines.push(nowPer('敌人抗性降低', skill.enemyResDown));
  if (skill.enemyDmgDown) lines.push(nowPer('敌人伤害降低', skill.enemyDmgDown));
  if (skill.slowAura) lines.push(nowPer('敌人减速', skill.slowAura));
  if (skill.vsUndead) lines.push(nowPer('对亡灵', skill.vsUndead));
  if (skill.vsDemon) lines.push(nowPer('对恶魔', skill.vsDemon));
  if (skill.reflectPct) lines.push(nowPer('荆棘反伤', skill.reflectPct));
  if (skill.killHeal) lines.push(nowPer('击杀回血', skill.killHeal));
  if (skill.cdrPct) lines.push(nowPer('冷却缩减', skill.cdrPct));
  if (skill.resRegenPct) lines.push(nowPer('资源回复', skill.resRegenPct));
  if (skill.zealExtra) lines.push('启用时：热诚额外连锁');
  if (skill.sacrificeAmp) lines.push(nowPer('牺牲伤害', skill.sacrificeAmp));
  if (skill.hpCostReduce) lines.push(nowPer('牺牲自损减免', skill.hpCostReduce));
  if (skill.magicIgnoreArmor) lines.push(nowPer('魔法无视护甲', skill.magicIgnoreArmor));
  if (skill.fohExtra) lines.push('启用时：天堂之拳额外电击');
  if (skill.holyHeal) lines.push(`命中亡灵/恶魔回复生命 ${fmtSkillPct(skill.holyHeal)}`);
  if (skill.curse) {
    const c = skill.curse;
    const bits = [];
    if (c.physTaken) bits.push(`受伤+${fmtSkillPct(c.physTaken)}`);
    if (c.dmgDown) bits.push(`敌伤-${fmtSkillPct(c.dmgDown)}`);
    if (c.resDown) bits.push(`抗性-${fmtSkillPct(c.resDown)}`);
    if (c.slow) bits.push(`减速${fmtSkillPct(c.slow)}`);
    if (c.leech) bits.push(`吸血${fmtSkillPct(c.leech)}`);
    if (c.armorDown) bits.push(`护甲-${fmtSkillPct(c.armorDown)}`);
    lines.push(`诅咒 ${c.dur}s（唯一）${bits.length ? ' · ' + bits.join('、') : ''}`);
  }
  if (skill.synergy) {
    for (const s of skill.synergy) {
      const n = SKILLS[hero.charId]?.[s.skill]?.name || s.skill;
      const slv = hero.skillLevels?.[s.skill] || 0;
      lines.push(`联动 ${n} 每级 +${s.pct}%${slv ? `（当前 +${s.pct * slv}%）` : ''}`);
    }
  }
  const setDmg = stats?.skillDmg?.[skill.id] || 0;
  if (setDmg > 0) lines.push(`套装技能伤害 +${fmtSkillPct(setDmg)}`);
  const grant = stats?.skillGrant?.[skill.id] || 0;
  if (grant > 0 && (hero.skillLevels?.[skill.id] || 0) < grant) {
    lines.push(`套装授予 ${grant} 级（无需前置即可释放）`);
  }
  const cut = stats?.skillCostPct?.[skill.id] || 0;
  if (cut > 0) lines.push(`套装减少消耗 ${fmtSkillPct(cut)}`);
  return lines;
}

function isSkillEnabled(hero, skillId) {
  return hero?.skillEnabled?.[skillId] !== false;
}

function auraSlotSkills(hero, slot) {
  if (!slot) return [];
  const tree = SKILLS[hero.charId] || {};
  return Object.keys(tree).filter(id => tree[id].auraSlot === slot && (hero.skillLevels?.[id] || 0) >= 1);
}

function getActiveAura(hero, slot) {
  const ids = auraSlotSkills(hero, slot);
  if (!ids.length) return null;
  const pick = hero.auraPick?.[slot];
  if (pick && ids.includes(pick) && isSkillEnabled(hero, pick)) return pick;
  const on = ids.filter(id => isSkillEnabled(hero, id));
  return on[0] || null;
}

function isAuraOn(hero, skillId) {
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill || skill.type !== 'aura') return false;
  if ((hero.skillLevels?.[skillId] || 0) < 1) return false;
  if (!isSkillEnabled(hero, skillId)) return false;
  if (!skill.auraSlot) return true;
  return getActiveAura(hero, skill.auraSlot) === skillId;
}

function toggleSkillEnabled(hero, skillId) {
  if (!hero) return false;
  const skill = SKILLS[hero.charId]?.[skillId];
  hero.skillEnabled = hero.skillEnabled || {};
  const next = !isSkillEnabled(hero, skillId);
  hero.skillEnabled[skillId] = next;
  if (skill?.auraSlot && next) {
    hero.auraPick = hero.auraPick || {};
    hero.auraPick[skill.auraSlot] = skillId;
    for (const id of auraSlotSkills(hero, skill.auraSlot)) {
      if (id !== skillId) hero.skillEnabled[id] = false;
    }
  }
  return isSkillEnabled(hero, skillId);
}

function combatSkillQueue(hero) {
  const tree = SKILLS[hero.charId] || {};
  const order = [...(hero.skillPriorities || hero.equippedSkills || [])];
  const seen = new Set();
  const ids = [];
  for (const id of order) {
    if (!id || seen.has(id) || !tree[id]) continue;
    seen.add(id);
    ids.push(id);
  }
  for (const id of Object.keys(tree)) {
    if (seen.has(id)) continue;
    ids.push(id);
  }
  return ids;
}

function isBuffActive(buffs, skillId) {
  const b = buffs?.[skillId];
  if (!b) return false;
  if (b.perm) return true;
  return (b.t || 0) > 0;
}

function applySkillStatBonuses(stats, skill, lv, opts = {}) {
  if (skill.damageBonus) stats.physDmgPct += skill.damageBonus * lv;
  if (skill.armorBonus) stats.armor *= (1 + skill.armorBonus * lv);
  if (skill.hpBonus) stats.maxHp *= (1 + skill.hpBonus * lv);
  if (skill.lifesteal) stats.lifesteal += skill.lifesteal * lv;
  if (skill.damageReduction) stats.damageReduction += skill.damageReduction * Math.max(lv, 1);
  if (skill.critBonus) {
    const raw = skill.critBonus * lv;
    if (skill.type === 'passive') {
      const cap = 0.25;
      stats.critRate += Math.min(cap, raw);
      if (raw > cap) stats.critDmg += (raw - cap) * 2;
    } else {
      stats.critRate += raw;
    }
  }
  if (skill.hitChance) stats.hitChance = (stats.hitChance || 0) + skill.hitChance * lv;
  if (skill.pierceBonus) stats.pierceBonus += skill.pierceBonus * lv;
  if (skill.summonBonus) stats.summonBonus += skill.summonBonus * lv;
  if (skill.attackSpeed) stats.attackSpeed += skill.attackSpeed * lv;
  if (skill.allResBonus) stats.allRes += skill.allResBonus * lv;
  if (skill.skillBonus && !opts.skipSkillBonus) stats.skillLevelBonus += skillBonusGranted(skill, lv);
  if (skill.rangeBonus) stats.attackRange += skill.rangeBonus * lv;
  if (skill.shieldPct) stats.damageReduction += skill.shieldPct * lv;
  if (skill.fireDmgBonus) stats.fireDmgPct += skill.fireDmgBonus * lv;
  if (skill.iceDmgBonus) stats.iceDmgPct += skill.iceDmgBonus * lv;
  if (skill.lightningDmgBonus) stats.lightningDmgPct += skill.lightningDmgBonus * lv;
  if (skill.aoeBonus) stats.aoePct += skill.aoeBonus * lv;
  if (skill.enemyResDown) stats.enemyResDown += skill.enemyResDown * lv;
  if (skill.enemyDmgDown) stats.enemyDmgDown += skill.enemyDmgDown * Math.max(lv, 1);
  if (skill.vsUndead) stats.vsUndead += skill.vsUndead * lv;
  if (skill.vsDemon) stats.vsDemon += skill.vsDemon * lv;
  if (skill.reflectPct) stats.reflectPct += skill.reflectPct * lv;
  if (skill.slowAura) stats.slowAura += skill.slowAura * Math.max(1, lv);
  if (skill.zealExtra) stats.zealExtra += skill.zealExtra + Math.floor(lv / 4);
  if (skill.sacrificeAmp) stats.sacrificeAmp += skill.sacrificeAmp * lv;
  if (skill.magicIgnoreArmor) stats.magicIgnoreArmor += skill.magicIgnoreArmor * lv;
  if (skill.hammerAoe) stats.hammerAoe += skill.hammerAoe * lv;
  if (skill.fohExtra) stats.fohExtra += skill.fohExtra * lv;
  if (skill.hpCostReduce) stats.hpCostReduce = Math.min(0.75, stats.hpCostReduce + skill.hpCostReduce * lv);
  if (skill.killHeal) stats.killHeal += skill.killHeal * lv;
  if (skill.lifeRegen) stats.lifeRegen += skill.lifeRegen * lv;
  if (skill.cdrPct) stats.cdrPct += skill.cdrPct * lv;
  if (skill.resRegenPct) stats.resRegenPct += skill.resRegenPct * lv;
  if (skill.eliteDmgPct) stats.eliteDmgPct += skill.eliteDmgPct * lv;
  if (skill.resOnKill) stats.resOnKill += skill.resOnKill * lv;
}

function applyAffixToStats(stats, affix) {
  if (!affix) return;
  const val = affix.value;
  switch (affix.stat) {
    case 'str': stats.str += val; break;
    case 'agi': stats.agi += val; break;
    case 'int': stats.int += val; break;
    case 'vit': stats.vit += val; stats.maxHp += val * 2; break;
    case 'wis': stats.wis += val; break;
    case 'hp': stats.maxHp += val; break;
    case 'armor': stats.armor += val; break;
    case 'physDmgPct': stats.physDmgPct += val / 100; break;
    case 'fireDmgPct': stats.fireDmgPct += val / 100; break;
    case 'iceDmgPct': stats.iceDmgPct += val / 100; break;
    case 'lightningDmgPct': stats.lightningDmgPct += val / 100; break;
    case 'poisonDmgPct': stats.poisonDmgPct += val / 100; break;
    case 'critRate': stats.critRate += val / 100; break;
    case 'critDmg': stats.critDmg += val / 100; break;
    case 'attackSpeed': stats.attackSpeed += val / 100; break;
    case 'lifeRegen': stats.lifeRegen += val; break;
    case 'killHeal': stats.killHeal += val / 100; break;
    case 'allRes': stats.allRes += val / 100; break;
    case 'attackRange': stats.rangePct += val / 100; break;
    case 'skillLevel': stats.skillLevelBonus += val; break;
    case 'eliteDmgPct': stats.eliteDmgPct += val / 100; break;
    case 'resRegenPct': stats.resRegenPct += val / 100; break;
    case 'aoePct': stats.aoePct += val / 100; break;
    case 'cdrPct': stats.cdrPct += val / 100; break;
    case 'summonBonus': stats.summonBonus += val / 100; break;
    case 'lifesteal': stats.lifesteal += val / 100; break;
    case 'damageReduction': stats.damageReduction += val / 100; break;
  }
}

function scaledAffix(affix, mult) {
  if (!affix || mult === 1) return affix;
  return { ...affix, value: Math.round(affix.value * mult * 1000) / 1000 };
}

function applyItemStats(stats, item) {
  const m = itemStatMult(item);
  const em = itemEnhanceMult(item);
  if (item.baseDamage) stats.damage += Math.round(item.baseDamage * m);
  if (item.armor) stats.armor += Math.round(item.armor * m);
  if (item.attackSpeed) stats.attackSpeed += item.attackSpeed * em;
  for (const affix of item.affixes || []) applyAffixToStats(stats, scaledAffix(affix, itemAffixStatMult(item, affix.stat)));
  if (item.exclusiveAffix) applyAffixToStats(stats, scaledAffix(item.exclusiveAffix, itemAffixStatMult(item, item.exclusiveAffix.stat)));
}

function mergeSkillMap(dst, src, mode) {
  if (!src || !dst) return;
  for (const [id, val] of Object.entries(src)) {
    if (!id || !val) continue;
    dst[id] = mode === 'max' ? Math.max(dst[id] || 0, val) : (dst[id] || 0) + val;
  }
}

function applySetBonuses(stats, equipment) {
  const setCounts = {};
  for (const item of Object.values(equipment || {})) {
    if (item?.setId) setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
  }
  const reduce = stats.setReqReduce || equipmentSetReduce(equipment);
  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = SETS[setId];
    if (!setDef) continue;
    for (const [pieces, bonus] of setBonusEntries(setDef)) {
      if (setBonusActive(count, pieces, reduce)) {
        if (bonus.attackSpeed) stats.attackSpeed += bonus.attackSpeed;
        if (bonus.hp) stats.maxHp += bonus.hp;
        if (bonus.skillLevel) stats.skillLevelBonus += bonus.skillLevel;
        if (bonus.fireDmgPct) stats.fireDmgPct += bonus.fireDmgPct;
        if (bonus.iceDmgPct) stats.iceDmgPct += bonus.iceDmgPct;
        if (bonus.lightningDmgPct) stats.lightningDmgPct += bonus.lightningDmgPct;
        if (bonus.physDmgPct) stats.physDmgPct += bonus.physDmgPct;
        if (bonus.pierceBonus) stats.pierceBonus += bonus.pierceBonus;
        if (bonus.critRate) stats.critRate += bonus.critRate;
        if (bonus.allRes) stats.allRes += bonus.allRes;
        if (bonus.damageReduction) stats.damageReduction += bonus.damageReduction;
        if (bonus.armor) stats.armor += bonus.armor;
        if (bonus.summonBonus) stats.summonBonus += bonus.summonBonus;
        if (bonus.attackRange) stats.attackRange += bonus.attackRange;
        if (bonus.poisonDmgPct) stats.poisonDmgPct += bonus.poisonDmgPct;
        if (bonus.eliteDmgPct) stats.eliteDmgPct += bonus.eliteDmgPct;
        if (bonus.aoePct) stats.aoePct += bonus.aoePct;
        if (bonus.cdrPct) stats.cdrPct += bonus.cdrPct;
        if (bonus.critDmg) stats.critDmg += bonus.critDmg;
        if (bonus.lifesteal) stats.lifesteal += bonus.lifesteal;
        if (bonus.lifeRegen) stats.lifeRegen += bonus.lifeRegen;
        if (bonus.resRegenPct) stats.resRegenPct += bonus.resRegenPct;
        if (bonus.killHeal) stats.killHeal += bonus.killHeal;
        if (bonus.skillGrant) mergeSkillMap(stats.skillGrant, bonus.skillGrant, 'max');
        if (bonus.skillDmg) mergeSkillMap(stats.skillDmg, bonus.skillDmg, 'add');
        if (bonus.skillCostPct) mergeSkillMap(stats.skillCostPct, bonus.skillCostPct, 'add');
        if (bonus.power) applyPowerBlob(stats, bonus.power);
      }
    }
  }
}

function calcDPS(hero) {
  const stats = calcHeroStats(hero);
  const charDef = CHARACTERS[hero.charId];
  const mainStat = stats[charDef.mainStat] || 10;
  const baseDmg = stats.damage * (1 + mainStat / 100) * (1 + stats.physDmgPct);
  const critMod = 1 + stats.critRate * (stats.critDmg - 1);
  let dps = baseDmg * critMod / stats.attackInterval;

  const equipped = new Set([...(hero.equippedSkills || []), ...Object.keys(stats.skillGrant || {})]);
  for (const skillId of equipped) {
    const skill = SKILLS[hero.charId]?.[skillId];
    if (!skill || skill.type === 'passive' || skill.type === 'aura') continue;
    if (!isSkillEnabled(hero, skillId)) continue;
    const lv = effectiveSkillLevel(hero, skillId, stats);
    if (lv <= 0 && skill.type !== 'buff') continue;
    if (!skillWeaponReady(hero, skill).ok) continue;
    const mult = (skill.damageMult || 1) * (1 + Math.max(lv, 1) * 0.08) * synergyMult(hero, skill);
    const cd = Math.max(skill.cooldown || 1, 0.6);
    dps += (baseDmg * mult) / cd;
  }
  dps *= (1 + (stats.summonBonus || 0));
  return Math.floor(dps);
}

function calcEHP(hero, monsterLevel = 10) {
  const stats = calcHeroStats(hero);
  const armorFactor = 1 + stats.armor / (stats.armor + 50 * monsterLevel);
  return Math.floor(stats.maxHp * armorFactor / Math.max(0.25, 1 - stats.damageReduction));
}

function calcDamage(hero, monster, skill = null) {
  const stats = calcHeroStats(hero);
  const charDef = CHARACTERS[hero.charId];
  const mainStat = stats[charDef.mainStat] || 10;
  let skillMult = 1;
  let element = 'physical';
  let aoe = false;
  let hits = 1;

  if (skill) {
    const lv = effectiveSkillLevel(hero, skill.id, stats);
    skillMult = (skill.damageMult || 1) * (1 + Math.max(lv, 1) * 0.08) * synergyMult(hero, skill);
    element = skill.element || 'physical';
    hits = skill.hits || 1;
    aoe = !!skill.aoe;
    hits += stats.skillHits?.[skill.id] || 0;
    if (stats.skillNova?.[skill.id]) { aoe = true; skillMult *= 0.9; }
    if (stats.skillTrail?.[skill.id]) skillMult *= 1.18;
    if (stats.skillPierce?.[skill.id]) skillMult *= 0.85 + stats.pierceBonus;
    if (stats.skillConvert?.[skill.id]) element = stats.skillConvert[skill.id];
    if ((skill.tags || []).includes('finisher')) {
      const cw = (typeof combat !== 'undefined' && combat?.comboWindow)
        || (typeof combatState !== 'undefined' && combatState?.comboWindow)
        || 0;
      if (cw > 0) skillMult *= 1.12 + Math.min(0.12, (stats.windowBonus || 0) * 0.04);
    }
    if (skill.static && monster.isBoss) skillMult *= 0.35;
    if (skill.id === 'zeal' && (stats.zealExtra || 0) > 0) hits += stats.zealExtra;
    if (skill.id === 'sacrifice' && (stats.sacrificeAmp || 0) > 0) skillMult *= 1 + stats.sacrificeAmp;
    if (skill.id === 'fistOfHeavens' && (stats.fohExtra || 0) > 0) skillMult *= 1 + stats.fohExtra;
    if (skill.id === 'fistOfHeavens' && (monster.race === 'demon')) skillMult *= 1.2;
    if (skill.id === 'holyBolt' && (monster.race === 'undead' || monster.race === 'demon')) skillMult *= 1.15;
    if ((stats.skillDmg?.[skill.id] || 0) > 0) skillMult *= 1 + stats.skillDmg[skill.id];
  }

  let dmgBonus = stats.physDmgPct;
  if (element === 'fire') dmgBonus += stats.fireDmgPct;
  if (element === 'ice') dmgBonus += stats.iceDmgPct;
  if (element === 'lightning') dmgBonus += stats.lightningDmgPct;
  if (element === 'poison') dmgBonus += stats.poisonDmgPct;

  let damage = stats.damage * (1 + mainStat / 100) * skillMult * (1 + dmgBonus) * hits;
  const gap = (monster.level || 1) - (hero.level || 1);
  const miss = Math.min(0.42, Math.max(0, 0.05 + gap * 0.01 - (stats.hitChance || 0)));
  if (Math.random() < miss) {
    return { damage: 0, isCrit: false, miss: true, element, aoe };
  }
  const isCrit = Math.random() < Math.min(1, stats.critRate);
  if (isCrit) damage *= stats.critDmg;
  if (monster.kind === 'rare' || monster.kind === 'rareBoss' || monster.kind === 'hidden' || monster.isBoss || monster.kind === 'elite') {
    damage *= 1 + (stats.eliteDmgPct || 0);
    if (isCrit) damage *= 1.1;
  }

  const monsterRes = monster.resistances?.[element] || 0;
  const curseRes = monster.curse?.resDown || 0;
  const resCap = Math.min(0.75, monsterRes - stats.allRes * 0.5 - (stats.enemyResDown || 0) - curseRes);
  damage *= (1 - Math.max(0, resCap));
  if (monster.curse?.physTaken && element === 'physical') damage *= 1 + monster.curse.physTaken;
  if (monster.curse?.armorDown) damage *= 1 + monster.curse.armorDown * 0.65;
  if (monster.race === 'undead' && stats.vsUndead) damage *= 1 + stats.vsUndead;
  if (monster.race === 'demon' && stats.vsDemon) damage *= 1 + stats.vsDemon;
  if ((stats.magicIgnoreArmor || 0) > 0 && (element === 'magic' || skill?.id === 'blessedHammer' || skill?.id === 'holyBolt')) {
    damage *= 1 + stats.magicIgnoreArmor * 0.5;
  }
  damage *= 0.9 + Math.random() * 0.2;
  if (aoe) damage *= (stats.reso && stats.reso.aoe) || 1;
  damage *= 1 + (stats.summonBonus || 0) * 0.25;
  return { damage: Math.max(1, Math.floor(damage)), isCrit, element, aoe };
}

function calcMonsterDamage(monster, hero) {
  const stats = calcHeroStats(hero);
  let dmg = monster.damage;
  const armorFactor = stats.armor / (stats.armor + 50 * monster.level);
  dmg *= (1 - armorFactor);
  dmg *= (1 - stats.damageReduction);
  dmg *= (1 - stats.allRes * 0.5);
  if (monster.curse?.dmgDown) dmg *= (1 - monster.curse.dmgDown);
  if (stats.enemyDmgDown) dmg *= (1 - Math.min(0.7, stats.enemyDmgDown));
  return Math.max(1, Math.floor(dmg));
}

function rollKind(clearFactor = 0) {
  const f = Math.max(0, clearFactor);
  const hiddenP = f < 0.75 ? 0 : Math.min(0.11, (f - 0.75) * 0.045);
  const rareP = 0.09 + Math.min(0.20, f * 0.065);
  const eliteP = 0.16 + Math.min(0.24, f * 0.07);
  const r = Math.random();
  if (r < hiddenP) return 'hidden';
  if (r < hiddenP + rareP) return 'rare';
  if (r < hiddenP + rareP + eliteP) return 'elite';
  return 'normal';
}

function goblinSpawnChance(clearFactor = 0) {
  return 0.01 + Math.min(0.07, Math.max(0, clearFactor) * 0.022);
}

function applyWorldMonsterMult(m, mult) {
  const w = Number(mult) || 1;
  if (!m || w === 1) return m;
  m.hp = Math.max(1, Math.floor(m.hp * w));
  m.maxHp = Math.max(1, Math.floor((m.maxHp || m.hp) * w));
  m.damage = Math.max(1, Math.floor(m.damage * w));
  if (m.armor) m.armor = Math.floor(m.armor * w);
  return m;
}

function createTreasureGoblin(map, opts = {}) {
  const level = map.levelMin + Math.floor(Math.random() * (map.levelMax - map.levelMin + 1));
  const ms = monsterStats(level);
  const t = MONSTER_TYPES.goblin;
  const hp = Math.floor(ms.hp * t.hp);
  const piles = 5 + Math.floor(Math.random() * 4);
  const items = 4 + Math.floor(Math.random() * 4);
  const gob = {
    name: '宝藏哥布林',
    level,
    hp, maxHp: hp,
    damage: Math.max(1, Math.floor(ms.damage * t.dmg)),
    armor: Math.floor(ms.armor * 0.7),
    exp: Math.floor(ms.exp * t.exp),
    gold: Math.floor(ms.gold * (22 + piles * 3)),
    goldPiles: piles,
    lootRolls: items,
    isBoss: false,
    kind: 'goblin',
    race: 'goblin',
    treasureGoblin: true,
    flee: true,
    resistances: {},
    eliteAffixes: [],
    iso: { x: 9.2 + Math.random() * 2.4, y: 1.6 + Math.random() * 5.2 },
    attackTimer: 99,
    ranged: false,
    attackRange: 0.7,
    moveSpeed: 3.55,
  };
  return applyWorldMonsterMult(gob, opts.worldMult);
}

function createMonster(map, opts = {}) {
  const { forceBoss = false, bossId = null, forceRareBoss = false, clearFactor = 0 } = opts;
  if (forceBoss && bossId) {
    const boss = BOSSES[bossId];
    const kind = forceRareBoss ? 'rareBoss' : (boss.type || 'actBoss');
    const t = MONSTER_TYPES[kind] || MONSTER_TYPES.actBoss;
    const nativeLv = Math.max(1, boss.level || 1);
    const mapLv = map
      ? Math.round(((map.levelMin || nativeLv) + (map.levelMax || nativeLv)) / 2)
      : nativeLv;
    const from = monsterStats(nativeLv);
    const to = monsterStats(mapLv);
    const hpScale = to.hp / Math.max(1, from.hp);
    const dmgScale = to.damage / Math.max(1, from.damage);
    const armScale = to.armor / Math.max(1, from.armor || 1);
    const hp = Math.floor(boss.hp * hpScale * (forceRareBoss ? 1.4 : 1));
    return applyWorldMonsterMult({
      name: forceRareBoss ? `稀有·${boss.name}` : boss.name,
      level: mapLv, hp, maxHp: hp,
      damage: Math.floor(boss.damage * dmgScale * (forceRareBoss ? 1.25 : 1)),
      armor: Math.floor(boss.armor * armScale),
      resistances: { ...boss.resistances },
      isBoss: true, bossId, kind, race: boss.race, phase: 1,
      eliteAffixes: forceRareBoss ? rollEliteAffixes(2) : [],
      iso: { x: 8.2, y: 4.2 }, attackTimer: 1.8,
      ranged: false, attackRange: 1.5, moveSpeed: 1.8,
    }, opts.worldMult);
  }

  const kind = opts.forceKind || rollKind(clearFactor);
  const t = MONSTER_TYPES[kind] || MONSTER_TYPES.normal;
  const level = map.levelMin + Math.floor(Math.random() * (map.levelMax - map.levelMin + 1));
  const ms = monsterStats(level);
  const hiddenPool = HIDDEN_BY_ACT[map.act] || HIDDEN_BY_ACT[5] || HIDDEN_BY_ACT[1];
  const mdef = kind === 'hidden'
    ? hiddenPool[Math.floor(Math.random() * hiddenPool.length)]
    : map.monsters[Math.floor(Math.random() * map.monsters.length)];
  const race = RACES[mdef.race] || RACES.humanoid;
  const affixes = kind === 'elite' ? rollEliteAffixes(1)
    : kind === 'rare' ? rollEliteAffixes(2 + (Math.random() < 0.5 ? 1 : 0))
    : kind === 'hidden' ? rollEliteAffixes(3)
    : [];
  const early = Math.min(1, 0.4 + level / 22);
  const kindHp = kind === 'hidden' ? (2.4 + 5.2 * early)
    : kind === 'rare' ? (1.8 + 4.2 * early)
    : kind === 'elite' ? (1.35 + 1.15 * early)
    : t.hp;
  const kindDmg = kind === 'hidden' ? (1.35 + 1.15 * early)
    : kind === 'rare' ? (1.2 + 1.0 * early)
    : kind === 'elite' ? (1.15 + 0.35 * early)
    : t.dmg;
  let hp = ms.hp * kindHp;
  let dmg = ms.damage * kindDmg;
  for (const a of affixes) {
    if (a.hp) hp *= a.hp;
    if (a.dmg) dmg *= a.dmg;
  }
  const prefix = affixes.map(a => a.name).filter(Boolean).join('·');
  const ranged = !!mdef.ranged;
  let name = prefix ? `${prefix} ${mdef.name}` : mdef.name;
  if (kind === 'hidden') name = `隐藏·${mdef.name}`;
  if (ranged) dmg *= 0.82;
  if (map.isRift) {
    const diff = riftDifficultyMult(map.riftFloor);
    hp *= diff;
    dmg *= diff;
  }
  return applyWorldMonsterMult({
    name, level,
    hp: Math.floor(hp), maxHp: Math.floor(hp),
    damage: Math.floor(dmg), armor: ms.armor,
    exp: Math.floor(ms.exp * t.exp), gold: Math.floor(ms.gold * t.exp * (kind === 'hidden' ? 1.4 : 0.6)),
    isBoss: false, kind, race: mdef.race,
    resistances: { ...race.res },
    eliteAffixes: affixes,
    iso: { x: 6.5 + Math.random() * 4.5, y: 2 + Math.random() * 6 },
    attackTimer: 1.1 + Math.random() * 1.1,
    ranged,
    attackRange: ranged ? 4.4 + Math.random() * 0.6 : 1.15,
    moveSpeed: ranged ? 1.55 : 2.25,
  }, opts.worldMult);
}

function getSetStatus(equipment) {
  const setCounts = {};
  for (const item of Object.values(equipment || {})) {
    if (item?.setId) setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
  }
  return Object.entries(setCounts).map(([setId, count]) => ({
    setId, count, def: SETS[setId],
  })).filter(s => s.def);
}

const SUMMON_TRAITS = {
  raven: { role: 'ranged', hp: 0.16, dmg: 0.14, range: 3.8, interval: 0.5, skillName: '啄击', skillDesc: '远程连啄', vfx: 'proj' },
  spiritWolf: { role: 'melee', hp: 0.42, dmg: 0.26, range: 1.15, interval: 0.68, skillName: '撕咬', skillDesc: '近战撕咬', vfx: 'slash' },
  oakSage: { role: 'ranged', hp: 0.38, dmg: 0.1, range: 3.1, interval: 1.35, skillName: '生命脉冲', skillDesc: '治疗主人', vfx: 'nova', heal: 0.018 },
  grizzly: { role: 'melee', hp: 1.2, dmg: 0.4, range: 1.22, interval: 0.95, skillName: '重击', skillDesc: '近战重击并可打断', vfx: 'slash', stun: true },
  valkyrie: { role: 'melee', hp: 0.9, dmg: 0.34, range: 1.28, interval: 0.72, skillName: '穿刺', skillDesc: '近战穿刺', vfx: 'slash' },
  shadowWarrior: { role: 'melee', hp: 0.55, dmg: 0.3, range: 1.18, interval: 0.6, skillName: '影袭', skillDesc: '近战影袭', vfx: 'slash' },
  shadowMaster: { role: 'ranged', hp: 0.62, dmg: 0.28, range: 3.4, interval: 0.7, skillName: '影刃', skillDesc: '远程掷刃', vfx: 'proj' },
  raiseSkeleton: { role: 'melee', hp: 0.3, dmg: 0.2, range: 1.12, interval: 0.7, skillName: '骨刃', skillDesc: '近战劈砍', vfx: 'slash' },
  clayGolem: { role: 'melee', hp: 1.45, dmg: 0.2, range: 1.25, interval: 1.05, skillName: '碾压', skillDesc: '近战嘲讽碾压', vfx: 'slash', slow: true },
  fireGolem: { role: 'ranged', hp: 0.95, dmg: 0.3, range: 3.6, interval: 0.85, skillName: '火球', skillDesc: '远程喷火', vfx: 'proj', element: 'fire' },
  revive: { role: 'melee', hp: 0.52, dmg: 0.28, range: 1.15, interval: 0.78, skillName: '尸袭', skillDesc: '近战扑击', vfx: 'slash' },
};

function summonTrait(skill) {
  if (!skill) return { role: 'melee', hp: 0.35, dmg: 0.22, range: 1.2, interval: 0.75, skillName: '打击', skillDesc: '协同攻击', vfx: 'slash' };
  return SUMMON_TRAITS[skill.id] || SUMMON_TRAITS[skill.summonKind] || {
    role: skill.tags?.includes('projectile') ? 'ranged' : 'melee',
    hp: 0.35, dmg: 0.22, range: 1.2, interval: 0.75,
    skillName: '打击', skillDesc: '协同攻击', vfx: skill.tags?.includes('projectile') ? 'proj' : 'slash',
  };
}

function summonMaxHp(stats, trait, lv) {
  return Math.max(8, Math.floor((stats.maxHp || 80) * (trait.hp || 0.3) * (1 + (stats.summonBonus || 0) * 0.35) * (1 + Math.max(1, lv) * 0.06)));
}

function getSummonRoster(hero) {
  const out = [];
  const tree = SKILLS[hero.charId] || {};
  const stats = calcHeroStats(hero);
  for (const [id, skill] of Object.entries(tree)) {
    const lv = hero.skillLevels?.[id] || 0;
    if (lv < 1 || !skill.summonKind || skill.plantSummon) continue;
    const n = typeof skill.summonCount === 'function' ? skill.summonCount(lv) : (skill.summonCount || 1);
    const tr = summonTrait(skill);
    const maxHp = summonMaxHp(stats, tr, lv);
    for (let i = 0; i < n; i++) {
      out.push({
        key: `${id}:${i}`,
        skillId: id,
        kind: skill.summonKind,
        name: skill.name,
        pal: skill.summonPal || ['#4a4a58', '#808090', '#c0c0d0'],
        scale: skill.summonScale || 0.7,
        role: tr.role,
        maxHp,
        dmgMult: tr.dmg,
        atkRange: tr.range,
        interval: tr.interval,
        skillName: tr.skillName,
        vfx: tr.vfx,
        heal: tr.heal || 0,
        stun: !!tr.stun,
        slow: !!tr.slow,
        element: tr.element || '',
      });
    }
  }
  return out.slice(0, 10);
}

function skillVfxKind(skill) {
  const tags = skill.tags || [];
  if (skill.id === 'whirlwind' || skill.channel) return 'spin';
  if (skill.id === 'meteor' || skill.id === 'fistOfHeavens') return 'meteor';
  if (skill.id === 'blizzard') return 'blizzard';
  if (skill.id === 'fireWall' || skill.id === 'wakeOfFire' || skill.id === 'fissure') return 'firewall';
  if (skill.id === 'hurricane' || skill.id === 'thunderstorm') return 'storm';
  if (skill.plantSummon || skill.id === 'hydra') return 'trap';
  if (skill.id === 'chargedBolt') return 'bolts';
  if (tags.includes('projectile') || skill.chain) return 'proj';
  if (tags.includes('aoe') && (skill.element === 'ice' || skill.element === 'poison' || tags.includes('control'))) return 'nova';
  if (tags.includes('trap')) return 'trap';
  if (tags.includes('aoe')) return 'burst';
  if (tags.includes('melee')) return 'slash';
  return 'burst';
}

function elementColor(element) {
  return {
    fire: '#ff6a30', ice: '#80d8ff', lightning: '#ffe060',
    poison: '#70e040', magic: '#c080ff', physical: '#e8dcc8',
  }[element] || '#ffe8a0';
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

function estimateBossWinRate(hero, boss) {
  const dps = calcDPS(hero);
  const ehp = calcEHP(hero, boss.level);
  const timeToKill = (boss.maxHp || boss.hp) / Math.max(dps, 1);
  const stats = calcHeroStats(hero);
  const monsterDmg = boss.damage * (1 - stats.armor / (stats.armor + 50 * boss.level));
  const timeToDie = (ehp / Math.max(monsterDmg, 1)) * 1.5;
  if (timeToKill <= timeToDie * 0.5) return Math.round(Math.min(95, 60 + ((timeToDie - timeToKill) / timeToDie) * 40));
  if (timeToKill <= timeToDie) return Math.round(30 + ((timeToDie - timeToKill) / timeToDie) * 50);
  return Math.max(5, Math.round(30 * timeToDie / timeToKill));
}

function killsPerMinute(hero, map) {
  const avgLevel = (map.levelMin + map.levelMax) / 2;
  const dps = calcDPS(hero);
  const ms = monsterStats(Math.floor(avgLevel));
  const killTime = ms.hp / Math.max(dps, 1) + 0.4;
  return Math.max(1, Math.floor(60 / killTime));
}

function expPerHour(hero, map) {
  const kpm = killsPerMinute(hero, map);
  const avgLevel = (map.levelMin + map.levelMax) / 2;
  const ms = monsterStats(Math.floor(avgLevel));
  const info = expLevelInfo(hero.level, avgLevel);
  return Math.floor(kpm * 60 * ms.exp * info.mult);
}

function expLevelInfo(heroLevel, contentLevel) {
  return { mult: 1, kind: '', label: '' };
}

function mapExpPenalty(hero, map) {
  if (!hero || !map) return expLevelInfo(1, 1);
  const avg = ((map.levelMin || 1) + (map.levelMax || 1)) / 2;
  return expLevelInfo(hero.level, avg);
}

function grantKillExp(hero, raw, monsterLevel) {
  const info = expLevelInfo(hero.level, monsterLevel);
  const got = Math.max(0, Math.floor((raw || 0) * info.mult));
  hero.exp += got;
  return { got, raw: raw || 0, info };
}

function riftProgressNeed(floor) {
  return 70 + Math.min(50, Math.max(0, (floor || 1) - 1) * 2);
}

function makeRiftMap(floor) {
  const f = Math.max(1, Math.floor(floor || 1));
  const bump = (f - 1) * 6;
  const ws = MAPS.find(m => m.id === 'worldstone');
  return {
    id: 'rift',
    name: `小秘境 ${f} 层`,
    act: 6,
    isRift: true,
    riftFloor: f,
    levelMin: 80 + bump,
    levelMax: 88 + bump,
    tiles: 'crypt',
    packMin: 4,
    packMax: 6,
    clearKills: riftProgressNeed(f),
    monsters: (ws?.monsters || []).concat([
      { name: '秘境魔', race: 'demon' },
      { name: '裂隙弓手', race: 'undead', ranged: true },
    ]),
  };
}

function createRiftGuardian(map, opts = {}) {
  const f = Math.max(1, map?.riftFloor || 1);
  const baal = BOSSES.baal;
  const diff = riftDifficultyMult(f);
  const nativeLv = 88 + (f - 1) * 6;
  const level = map
    ? Math.round(((map.levelMin || nativeLv) + (map.levelMax || nativeLv)) / 2)
    : nativeLv;
  const from = monsterStats(nativeLv);
  const to = monsterStats(level);
  const hpScale = to.hp / Math.max(1, from.hp);
  const dmgScale = to.damage / Math.max(1, from.damage);
  const hp = Math.floor(baal.hp * 1.08 * diff * hpScale);
  const dmg = Math.floor(baal.damage * 1.08 * diff * dmgScale);
  return applyWorldMonsterMult({
    name: `秘境守护者`,
    level,
    hp, maxHp: hp,
    damage: dmg,
    armor: Math.floor(baal.armor * diff * (to.armor / Math.max(1, from.armor || 1))),
    resistances: { ...(baal.resistances || {}) },
    isBoss: true,
    riftBoss: true,
    kind: 'riftBoss',
    race: baal.race || 'demon',
    phase: 1,
    eliteAffixes: rollEliteAffixes(2),
    iso: { x: 8.2, y: 4.2 },
    attackTimer: 1.6,
    ranged: false,
    attackRange: 1.55,
    moveSpeed: 1.85,
    exp: 120 + f * 18,
  }, opts.worldMult);
}

function getMap(id) {
  if (id === 'rift') return makeRiftMap(1);
  return MAPS.find(m => m.id === id) || MAPS[0];
}

function isoDist(a, b) {
  if (!a || !b) return 999;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function buffTime(skill, lv) {
  return (skill.buffDuration || 16) + Math.max(1, lv) * 1.6;
}

function collectHudBuffs(hero, buffs) {
  const out = [];
  const tree = SKILLS[hero.charId] || {};
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs });
  for (const [id, skill] of Object.entries(tree)) {
    const parts = skillLevelParts(hero, id, stats);
    if (parts.base < 1) continue;
    if (skill.type === 'aura') {
      if (!isAuraOn(hero, id)) continue;
      out.push({
        id, name: skill.name, kind: 'aura',
        lv: parts.bonus > 0 ? `${parts.base}+${parts.bonus}` : parts.base,
        time: '光环',
      });
    }
  }
  for (const [id, b] of Object.entries(buffs || {})) {
    if (b.perm) continue;
    if ((b.t || 0) <= 0) continue;
    const parts = skillLevelParts(hero, id, stats);
    const lv = parts.base > 0 && parts.bonus > 0 ? `${parts.base}+${parts.bonus}` : (b.lv || parts.base || 1);
    out.push({ id, name: b.name, kind: b.kind || 'buff', lv, time: `${Math.ceil(b.t)}s` });
  }
  return out;
}
