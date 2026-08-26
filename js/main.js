(function () {
let gameState = loadGame();
let lastTick = performance.now();
let saveTimer = 0;
let hudAcc = 0;

const combat = {
  monsters: [],
  target: null,
  killCount: 0,
  attackTimer: 0,
  skillCooldowns: {},
  spawnTimer: 0,
  comboWindow: 0,
  lastOpener: null,
  lastSkillId: null,
  minionTimer: 0,
  minionIdx: 0,
  lastCorpse: null,
  buffs: {},
  channel: null,
  zones: [],
  turrets: [],
  potionCd: 0,
  potionBuyAcc: 0,
  bossPity: 0,
  log: [{ type: 'info', text: '自动战斗已开始。英雄会自行寻敌、普攻与放技能。' }],
};

setCombatState(combat);
try {
  initUI(gameState, () => {
    combat.monsters = [];
    combat.target = null;
    combat.killCount = 0;
    combat.spawnTimer = 0;
    combat.bossPity = 0;
  });
} catch (err) {
  console.error('[init]', err);
}

function alivePack() {
  return (combat.monsters || []).filter(m => m && m.hp > 0);
}

function nearestTarget(heroIso) {
  const pack = alivePack();
  if (!pack.length) return null;
  const gob = pack.find(m => m.treasureGoblin);
  if (gob) return gob;
  const hx = heroIso?.x ?? 3;
  const hy = heroIso?.y ?? 9;
  pack.sort((a, b) => {
    const da = (a.iso.x - hx) ** 2 + (a.iso.y - hy) ** 2;
    const db = (b.iso.x - hx) ** 2 + (b.iso.y - hy) ** 2;
    return da - db;
  });
  return pack[0];
}

let fgRaf = 0;
let bgInterval = null;
let bgWorker = null;
let bgBusy = false;

function runSlice(dt, paint) {
  dt = Math.min(0.05, Math.max(0, dt));
  if (dt <= 0) return;
  saveTimer += dt * 1000;
  hudAcc += dt;
  updateCombat(dt);
  tickIdleHeroes(gameState, dt);
  const hero = getActiveHero(gameState);
  if (hero && window.isoField) {
    const map = getCurrentMap(hero, gameState);
    const pack = alivePack();
    window.isoField.setScene({
      tiles: map?.tiles || 'dirt',
      monsters: pack,
      heroDead: !!hero.isDead,
    });
    window.isoField.syncMinions(hero.isDead ? [] : getSummonRoster(hero));
    window.isoField.turrets = hero.isDead ? [] : (combat.turrets || []);
    const look = combat.target || (window.isoField.drops?.length && combat.lastCorpse
      ? { iso: combat.lastCorpse } : null);
    window.isoField.tick(dt, look, calcHeroStats(hero, { useCombatBuffs: true, buffs: combat.buffs }).attackRange);
    if (paint) window.isoField.draw(CHARACTERS[hero.charId]);
  }
  if (paint && hudAcc >= 0.12) {
    hudAcc = 0;
    renderAll();
  }
  const saveEvery = paint ? 20000 : 8000;
  if (saveTimer >= saveEvery) {
    gameState.offlineClaimed = false;
    saveGame(gameState);
    saveTimer = 0;
  }
}

function catchUp(now, paint) {
  let remain = Math.min(2, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
  while (remain > 0.0005) {
    const dt = Math.min(0.05, remain);
    remain -= dt;
    runSlice(dt, paint && remain <= 0.0005);
  }
}

function foregroundLoop(now) {
  try {
    catchUp(now, true);
  } catch (err) {
    console.error('[combat]', err);
    combat.channel = null;
    if (window.isoField) window.isoField.spinning = false;
  }
  if (!document.hidden) fgRaf = requestAnimationFrame(foregroundLoop);
}

function backgroundPulse() {
  if (!document.hidden || bgBusy) return;
  bgBusy = true;
  try {
    catchUp(performance.now(), false);
  } catch (err) {
    console.error('[combat]', err);
    combat.channel = null;
  } finally {
    bgBusy = false;
  }
}

function startBackgroundClock() {
  if (bgInterval) return;
  bgInterval = setInterval(backgroundPulse, 200);
  try {
    const blob = new Blob(['setInterval(function(){postMessage(0)},200)'], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    bgWorker = new Worker(url);
    URL.revokeObjectURL(url);
    bgWorker.onmessage = backgroundPulse;
  } catch (_) { /* worker 不可用时仍靠 setInterval */ }
}

function stopBackgroundClock() {
  if (bgInterval) {
    clearInterval(bgInterval);
    bgInterval = null;
  }
  if (bgWorker) {
    bgWorker.terminate();
    bgWorker = null;
  }
}

function syncCombatClock() {
  if (document.hidden) {
    if (fgRaf) {
      cancelAnimationFrame(fgRaf);
      fgRaf = 0;
    }
    startBackgroundClock();
    backgroundPulse();
    saveGame(gameState);
  } else {
    stopBackgroundClock();
    if (!fgRaf) fgRaf = requestAnimationFrame(foregroundLoop);
    try { renderAll(); } catch (_) { /* HUD 尚未就绪 */ }
  }
}

function spawnPack(map) {
  const hero = getActiveHero(gameState);
  if (map?.isRift && hero) {
    ensureRiftHero(hero);
    if (hero.riftBossReady) {
      const g = createRiftGuardian(map, { worldMult: worldMonsterMult(gameState, hero) });
      combat.monsters = [g];
      combat.target = g;
      combat.attackTimer = 0.4;
      combat.spawnTimer = 1.15;
      addLog({ type: 'boss', text: `${g.name}（${map.name}）出现了！` });
      return;
    }
  }
  const pity = combat.bossPity || 0;
  const chance = chapterBossAppearChance(gameState, map, pity);
  if (chance > 0 && Math.random() < chance) {
    const m = createMonster(map, { forceBoss: true, bossId: map.bossId, worldMult: worldMonsterMult(gameState) });
    combat.monsters = [m];
    combat.bossPity = 0;
    const pct = Math.round(chance * 100);
    addLog({ type: 'boss', text: `章节首领 ${m.name} 出现了！（${pct}%）` });
    combat.target = m;
    combat.attackTimer = 0.4;
    combat.spawnTimer = 1.15;
    return;
  }
  if (isChapterBossReady(gameState, map, hero) && campaignOf(gameState, hero).bossesKilled?.[map.bossId]) {
    combat.bossPity = pity + 1;
  }
  const pack = mapPackRange(map, getWorldDiff(gameState, hero));
  const min = pack.packMin;
  const max = Math.max(min, pack.packMax);
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const clearFactor = mapClearFactor(gameState, map);
  combat.monsters = [];
  for (let i = 0; i < n; i++) {
    const m = createMonster(map, { clearFactor, worldMult: worldMonsterMult(gameState) });
    m.iso.x += (i % 4) * 0.52;
    m.iso.y += Math.floor(i / 4) * 0.48;
    combat.monsters.push(m);
  }
  if (Math.random() < goblinSpawnChance(clearFactor)) {
    const gob = createTreasureGoblin(map, { worldMult: worldMonsterMult(gameState) });
    combat.monsters.push(gob);
    addLog({ type: 'boss', text: '宝藏哥布林出现了！正在逃跑…' });
  }
  const hiddens = combat.monsters.filter(m => m.kind === 'hidden');
  if (hiddens.length) addLog({ type: 'boss', text: `隐藏怪物：${hiddens[0].name}` });
  const rares = combat.monsters.filter(m => m.kind === 'rare');
  if (rares.length) addLog({ type: 'boss', text: `稀有怪物：${rares[0].name}` });
  combat.target = combat.monsters.find(m => m.treasureGoblin) || combat.monsters[0];
  combat.attackTimer = 0.4;
  combat.spawnTimer = 1.15;
}

function clampIso(v) {
  return Math.max(0.6, Math.min(GRID_N - 1.2, v));
}

function tickMonsterAI(dt, heroIso, stats) {
  if (!heroIso) return;
  const hx = heroIso.x;
  const hy = heroIso.y;
  for (const m of combat.monsters) {
    if (!m?.iso || m.hp <= 0) continue;
    if (m.tauntT > 0) m.tauntT -= dt;
    if (m.fleeT > 0) {
      m.fleeT -= dt;
      m.flee = m.fleeT > 0;
      if (m.fleeT <= 0) m.fleeT = 0;
    }
    if (m.curse?.t > 0) {
      m.curse.t -= dt;
      if (m.curse.t <= 0) m.curse = null;
    }
    const dx = hx - m.iso.x;
    const dy = hy - m.iso.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const taunted = m.tauntT > 0;
    const range = m.ranged ? (m.attackRange || 4.4) : (m.attackRange || 1.15);
    const hold = taunted ? 1.05 : (m.ranged ? range * 0.78 : 1.05);
    const slow = Math.max(1, m.moveSlow || 1, 1 + (stats?.slowAura || 0) + (m.curse?.slow || 0));
    const spd = (m.moveSpeed || 2) * (m.eliteAffixes?.some(a => a.speed) ? 1.35 : 1) / slow;
    if (m.moveSlow > 1) m.moveSlow = Math.max(1, m.moveSlow - dt * 0.6);
    if (taunted) {
      const pull = Math.max(spd, 3.4);
      if (dist > hold) {
        m.iso.x = clampIso(m.iso.x + (dx / dist) * pull * dt);
        m.iso.y = clampIso(m.iso.y + (dy / dist) * pull * dt);
      }
      continue;
    }
    if (m.flee) {
      m.iso.x = clampIso(m.iso.x - (dx / dist) * spd * dt);
      m.iso.y = clampIso(m.iso.y - (dy / dist) * spd * dt);
      continue;
    }
    if (m.ranged && dist < hold * 0.55) {
      m.iso.x = clampIso(m.iso.x - (dx / dist) * spd * 0.7 * dt);
      m.iso.y = clampIso(m.iso.y - (dy / dist) * spd * 0.7 * dt);
    } else if (dist > hold) {
      m.iso.x = clampIso(m.iso.x + (dx / dist) * spd * dt);
      m.iso.y = clampIso(m.iso.y + (dy / dist) * spd * dt);
    }
  }
}

function tickMonsterAttacks(dt, hero, heroIso, stats) {
  if (!heroIso) return;
  stats = stats || calcHeroStats(hero);
  const minions = (window.isoField?.minions || []).filter(n => (n.hp || 0) > 0 && n.role === 'melee');
  const melee = [];
  const ranged = [];
  for (const m of combat.monsters) {
    if (!m || m.hp <= 0) continue;
    if (m.flee && !(m.tauntT > 0)) continue;
    const dist = isoDist(heroIso, m.iso);
    const range = m.ranged ? (m.attackRange || 4.4) : (m.attackRange || 1.2);
    const nearTank = minions.find(n => Math.hypot(n.x - m.iso.x, n.y - m.iso.y) <= range + 0.15);
    if (dist > range + 0.12 && !nearTank) continue;
    if (m.ranged) ranged.push(m);
    else melee.push({ m, dist, tank: nearTank && (Math.hypot(nearTank.x - m.iso.x, nearTank.y - m.iso.y) + 0.1 < dist) ? nearTank : null });
  }
  melee.sort((a, b) => a.dist - b.dist);
  const hitters = melee.slice(0, 3).concat(ranged.map(m => ({ m, tank: null })));
  const blockStun = isBuffActive(combat.buffs, 'holyShield') ? (SKILLS[hero.charId]?.holyShield?.blockStun || 0) * (hero.skillLevels?.holyShield || 1) : 0;
  for (const row of hitters) {
    const m = row.m || row;
    const tank = row.tank;
    m.attackTimer = (m.attackTimer || 2.4) - dt;
    if (m.attackTimer > 0) continue;
    const dmg = calcMonsterDamage(m, hero);
    if (tank) {
      tank.hp = Math.max(0, (tank.hp || 0) - dmg);
      window.isoField?.addFx('dmg', tank.x, tank.y, dmg, '#ffaa88');
      if (tank.hp <= 0) tank.respawn = 8;
    } else {
      hero.currentHp -= dmg;
      if ((stats.reflectPct || 0) > 0 && m.hp > 0) {
        const thorn = Math.max(1, Math.floor(dmg * stats.reflectPct));
        m.hp -= thorn;
        window.isoField?.addFx('dmg', m.iso.x, m.iso.y, thorn, '#c8aa6e');
        if (m.hp <= 0) onMonsterKill(hero, m);
      }
      if (blockStun && Math.random() < Math.min(0.45, blockStun)) {
        m.attackTimer = Math.max(m.attackTimer || 0, 1.1);
        window.isoField?.addFx('skill', heroIso.x, heroIso.y, '格挡', '#f0e0a0');
      }
      if (m.ranged) {
        window.isoField?.vfx.push({
          kind: 'proj',
          color: '#e8c060',
          life: 0.32, max: 0.32,
          x: m.iso.x, y: m.iso.y,
          tx: heroIso.x, ty: heroIso.y,
        });
        window.isoField?.addFx('dmg', heroIso.x, heroIso.y, dmg, '#ff8866');
      }
      if (hero.currentHp <= 0) {
        handleDeath(hero);
        return;
      }
    }
    const atkSpd = m.eliteAffixes?.some(a => a.speed) ? 1.9 : (m.ranged ? 2.45 : 2.7);
    m.attackTimer = Math.max(m.attackTimer || 0, atkSpd);
  }
}

function tickAuraPulses(dt, hero, stats) {
  if (hero.isDead) return;
  const hx = window.isoField?.hero;
  if (!hx) return;
  combat.auraPulse = combat.auraPulse || {};
  const tree = SKILLS[hero.charId] || {};
  for (const [id, skill] of Object.entries(tree)) {
    if (!skill.auraPulse || !isAuraOn(hero, id)) continue;
    const p = skill.auraPulse;
    combat.auraPulse[id] = (combat.auraPulse[id] || 0) - dt;
    if (combat.auraPulse[id] > 0) continue;
    combat.auraPulse[id] = p.interval || 1;
    const pack = alivePack().filter(m => m.iso && isoDist(hx, m.iso) <= (p.radius || 2.2) + 0.2);
    if (!pack.length) continue;
    const lv = effectiveSkillLevel(hero, id, stats);
    if (p.taunt) applyTauntPull(hero, skill, lv, hx);
    if (p.flee) {
      const dur = (p.fleeDur || 2.2) + lv * 0.12;
      let n = 0;
      for (const m of pack) {
        if (!m || m.hp <= 0) continue;
        if (m.kind === 'boss' || m.kind === 'hidden' || m.isBoss) continue;
        m.flee = true;
        m.fleeT = dur;
        n++;
      }
      if (n) {
        window.isoField?.addFx('skill', hx.x, hx.y, skill.name, '#c8c070');
        addLog({ type: 'skill', text: `${skill.name}：${n} 个小怪溃逃（${dur.toFixed(1)}s）` });
      }
    }
    if (p.stun) {
      const dur = (p.stunDur || 1.15) + lv * 0.04;
      for (const m of pack) {
        m.attackTimer = Math.max(m.attackTimer || 0, dur);
      }
      window.isoField?.addFx('skill', hx.x, hx.y, skill.name, '#e8d080');
      window.isoField?.vfx.push({ kind: 'nova', color: '#e8d080', life: 0.28, max: 0.28, x: hx.x, y: hx.y });
    }
    if ((p.mult || 0) > 0 || p.element) {
      const fake = {
        id, name: skill.name, damageMult: p.mult || 0.25, element: p.element,
        aoe: true, aoeRadius: p.radius, tags: ['aoe', p.element],
      };
      applySkillHits(hero, fake, pack[0], stats, { silent: true, origin: hx });
      window.isoField?.vfx.push({
        kind: 'nova', color: elementColor(p.element), life: 0.3, max: 0.3,
        x: hx.x, y: hx.y,
      });
    }
  }
}

function tickBuffs(dt, hero) {
  combat.buffs = combat.buffs || {};
  if (hero.isDead) {
    for (const id of Object.keys(combat.buffs)) {
      if (!combat.buffs[id].perm) delete combat.buffs[id];
    }
    return;
  }
  for (const [id, b] of Object.entries(combat.buffs)) {
    if (b.perm) continue;
    b.t -= dt;
    if (b.t <= 0) delete combat.buffs[id];
  }
  const tree = SKILLS[hero.charId] || {};
  for (const id of Object.keys(combat.buffs)) {
    const skill = tree[id];
    const lv = hero.skillLevels?.[id] || 0;
    if (combat.buffs[id].perm && (skill?.type !== 'aura' || !isAuraOn(hero, id))) delete combat.buffs[id];
  }
  for (const [id, skill] of Object.entries(tree)) {
    const lv = hero.skillLevels?.[id] || 0;
    if (lv < 1) continue;
    if (!isSkillEnabled(hero, id)) continue;
    if (skill.type === 'aura') {
      if (!isAuraOn(hero, id)) continue;
      combat.buffs[id] = { perm: true, name: skill.name, kind: 'aura', lv };
    }
  }
  for (const [id, skill] of Object.entries(tree)) {
    const lv = hero.skillLevels?.[id] || 0;
    if (lv < 1 || skill.type !== 'buff') continue;
    if (!isSkillEnabled(hero, id)) continue;
    if (isBuffActive(combat.buffs, id)) continue;
    combat.skillCooldowns[id] = combat.skillCooldowns[id] || 0;
    if (combat.skillCooldowns[id] > 0) continue;
    if (skill.exclusive) {
      const held = Object.entries(tree).some(([oid, os]) =>
        oid !== id && os.exclusive === skill.exclusive && isBuffActive(combat.buffs, oid));
      if (held) continue;
      for (const [oid, os] of Object.entries(tree)) {
        if (oid !== id && os.exclusive === skill.exclusive) delete combat.buffs[oid];
      }
    }
    combat.buffs[id] = {
      t: buffTime(skill, lv),
      name: skill.name,
      kind: skill.tags?.includes('shape') ? 'shape' : 'buff',
      lv,
    };
    combat.skillCooldowns[id] = Math.max(skill.cooldown || 6, 4);
  }
}

function updateCombat(dt) {
  const hero = getActiveHero(gameState);
  if (!hero) return;
  if (typeof hero.currentHp !== 'number' || Number.isNaN(hero.currentHp)) {
    hero.currentHp = calcHeroStats(hero).maxHp;
  }
  hero.isDead = !!hero.isDead;

  const map = getCurrentMap(hero, gameState);
  tickBuffs(dt, hero);
  const stats = calcHeroStats(hero, { useCombatBuffs: true, buffs: combat.buffs });
  clampHeroResource(hero, stats);
  tickAuraPulses(dt, hero, stats);
  combat.comboWindow = Math.max(0, combat.comboWindow - dt);
  for (const k of Object.keys(combat.skillCooldowns)) {
    combat.skillCooldowns[k] = Math.max(0, combat.skillCooldowns[k] - dt);
  }

  combat.potionBuyAcc = (combat.potionBuyAcc || 0) + dt;
  if (combat.potionBuyAcc >= 1.25) {
    combat.potionBuyAcc = 0;
    const bought = autoBuyPotions(gameState, stats);
    for (const b of bought) {
      const name = b.kind === 'mana' ? '魔力药水' : '生命药水';
      addLog({ type: 'loot', text: `自动购入${name} ×${b.count}（-${b.cost}金）` });
    }
  }

  if (hero.isDead) {
    hero.respawnTimer -= dt;
    if (hero.respawnTimer <= 0) {
      hero.isDead = false;
      hero.currentHp = calcHeroStats(hero, { useCombatBuffs: true, buffs: combat.buffs }).maxHp;
      combat.channel = null;
      combat.zones = [];
      combat.turrets = [];
      addLog({ type: 'info', text: `${CHARACTERS[hero.charId].name} 已复活` });
    }
    return;
  }

  if (stats.lifeRegen > 0) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.lifeRegen * dt);
  }
  if (stats.resRegen > 0 && !combat.channel) {
    hero.currentRes = Math.min(stats.maxRes, (hero.currentRes || 0) + stats.resRegen * dt);
  }

  combat.potionCd = Math.max(0, (combat.potionCd || 0) - dt);
  if (combat.potionCd <= 0) {
    const drank = tickDrinkPotions(gameState, hero, stats);
    if (drank.usedHp || drank.usedMana) combat.potionCd = 0.95;
    if (drank.usedHp) {
      addLog({ type: 'info', text: `生命药水 +${Math.round(drank.healPct * 100)}%（余 ${gameState.hpPotions}）` });
    }
    if (drank.usedMana) {
      addLog({ type: 'info', text: `魔力药水 +${Math.round(drank.manaPct * 100)}%（余 ${gameState.manaPotions}）` });
    }
  }

  if (window.isoField) window.isoField.spinning = !!(combat.channel && combat.channel.t > 0);

  combat.monsters = alivePack();
  combat.target = combat.monsters.includes(combat.target)
    ? combat.target
    : nearestTarget(window.isoField?.hero);

  tickSkillZones(dt, hero, stats);

  const interrupt = combat.target && combat.channel
    && listReadyCasts(hero, combat.target, stats).some(r => (r.skill.cooldown || 0) > 0);
  if (interrupt) {
    combat.channel = null;
    if (window.isoField) window.isoField.spinning = false;
    combat.preferCdOnce = true;
  }

  if (tickSkillChannel(dt, hero, stats)) {
    combat.attackTimer = 0.05;
    tickMonsterAI(dt, window.isoField?.hero, stats);
    tickMonsterAttacks(dt, hero, window.isoField?.hero, stats);
    return;
  }

  if (!combat.monsters.length) {
    if (window.isoField) window.isoField.spinning = false;
    if (window.isoField?.drops?.length) return;
    combat.spawnTimer -= dt;
    if (combat.spawnTimer <= 0) spawnPack(map);
    else return;
  }

  combat.target = nearestTarget(window.isoField?.hero) || combat.monsters[0];
  const monster = combat.target;
  if (!monster || monster.hp <= 0) return;

  const hx = window.isoField?.hero;
  const inRange = isoDist(hx, monster.iso) <= (stats.attackRange || 1.4) + 0.35;

  if (monster.isBoss && monster.bossId && BOSSES[monster.bossId]) {
    const bossDef = BOSSES[monster.bossId];
    const hpPct = monster.hp / monster.maxHp;
    for (let i = bossDef.phases.length - 1; i >= 0; i--) {
      if (hpPct <= bossDef.phases[i].threshold && monster.phase <= i) {
        monster.phase = i + 1;
        if (bossDef.phases[i].threshold < 1) {
          addLog({ type: 'boss', text: `${monster.name} 阶段 ${monster.phase}：${bossDef.phases[i].desc}` });
        }
        if (hpPct <= 0.5) monster.damage = Math.floor(bossDef.damage * 1.25);
      }
    }
  }

  for (const m of combat.monsters) {
    if (m.eliteAffixes?.some(a => a.regen) && m.hp < m.maxHp) {
      const regen = m.eliteAffixes.find(a => a.regen);
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * regen.regen * dt);
    }
  }

  tickMinionAttacks(dt, hero, stats, monster);

  tickMonsterAI(dt, hx, stats);

  combat.attackTimer -= dt;
  if (combat.attackTimer <= 0) {
    const usedSkill = tryCastOneSkill(hero, monster, stats);
    if (!usedSkill) {
      if (inRange) {
        performHeroAttack(hero, monster, stats);
        combat.attackTimer = stats.attackInterval || 1.2;
      } else {
        combat.attackTimer = 0.08;
      }
    }
    if (!alivePack().length) {
      tickMonsterAttacks(dt, hero, hx, stats);
      return;
    }
    const proc = stats.onHitCast || (stats.procEquipped ? { skillId: null, chance: 0.2, coeff: 0.5 } : null);
    const still = combat.target;
    if (proc && still && still.hp > 0 && Math.random() < (proc.chance || 0.2) && !combat.channel) {
      const sid = proc.skillId || hero.equippedSkills.find(id => SKILLS[hero.charId]?.[id]?.damageMult) || hero.equippedSkills[0];
      const skill = SKILLS[hero.charId]?.[sid];
      if (skill?.damageMult) {
        const r = calcDamage(hero, still, skill);
        const dmg = Math.floor(r.damage * (proc.coeff || 0.5));
        still.hp -= dmg;
        window.isoField?.addFx('dmg', still.iso.x, still.iso.y, `击中施放 ${dmg}`, '#c7a24a');
        if (still.hp <= 0) onMonsterKill(hero, still);
      }
    }
  }

  tickMonsterAttacks(dt, hero, hx, stats);
}

function applyTauntPull(hero, skill, lv, heroIso) {
  const pack = alivePack();
  const dur = (skill.tauntDuration || 5) + lv * 0.4;
  let n = 0;
  for (const m of pack) {
    if (!m || m.hp <= 0) continue;
    m.tauntT = dur;
    n++;
  }
  if (heroIso && window.isoField) {
    window.isoField.playSkill(skill, heroIso, heroIso, pack);
    window.isoField.addFx('skill', heroIso.x, heroIso.y, skill.name, '#ffcc66');
  }
  addLog({ type: 'skill', text: `${skill.name}：${n} 个敌人被强制近身（${dur.toFixed(1)}s）` });
}

function tickMinionAttacks(dt, hero, stats, monster) {
  const roster = window.isoField?.minions || [];
  if (!roster.length || !monster || monster.hp <= 0) return;
  for (const minion of roster) {
    if (!minion || (minion.hp || 0) <= 0) continue;
    minion.atk = (minion.atk || 0) - dt;
    if (minion.atk > 0) continue;
    const range = minion.atkRange || 1.2;
    const dist = Math.hypot(minion.x - monster.iso.x, minion.y - monster.iso.y);
    if (dist > range + 0.5) {
      minion.atk = 0.1;
      continue;
    }
    minion.atk = minion.interval || 0.75;
    const result = calcDamage(hero, monster);
    const dmg = Math.max(1, Math.floor(result.damage * (minion.dmgMult || 0.22) * (1 + (stats.summonBonus || 0))));
    monster.hp -= dmg;
    const col = minion.element === 'fire' ? '#ff6a30' : (minion.pal?.[2] || '#c0c0d0');
    if (minion.vfx === 'slash') {
      window.isoField?.vfx.push({
        kind: 'slash', color: col, life: 0.22, max: 0.22,
        x: monster.iso.x, y: monster.iso.y,
      });
    } else if (minion.vfx === 'nova') {
      window.isoField?.vfx.push({
        kind: 'nova', color: '#80c040', life: 0.35, max: 0.35,
        x: minion.x, y: minion.y,
      });
    } else {
      window.isoField?.vfx.push({
        kind: 'proj', color: col, life: 0.28, max: 0.28,
        x: minion.x, y: minion.y, tx: monster.iso.x, ty: monster.iso.y,
      });
    }
    window.isoField?.addFx('dmg', monster.iso.x, monster.iso.y, dmg, '#a8d8ff');
    if (minion.heal) {
      hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * minion.heal);
    }
    if (minion.stun) monster.attackTimer = Math.max(monster.attackTimer || 0, 0.85);
    if (minion.slow) monster.moveSlow = 1.4;
    if (monster.hp <= 0) {
      onMonsterKill(hero, monster);
      return;
    }
  }
}

function aoeTargets(skill, primary, pack, heroIso, hero, stats, originOverride) {
  if (!skill.aoe) return primary ? [primary] : [];
  const aroundHero = isAroundHeroSkill(skill);
  const origin = originOverride || (aroundHero ? heroIso : primary?.iso);
  if (!origin) return primary ? [primary] : [];
  const r = hero ? skillAoeRadius(hero, skill, stats) : (skill.aoeRadius || 1.6);
  const hits = pack.filter(m => m && m.hp > 0 && m.iso && isoDist(origin, m.iso) <= r);
  if (primary && primary.hp > 0 && primary.iso && !hits.includes(primary) && isoDist(origin, primary.iso) <= r + 0.05) {
    hits.unshift(primary);
  }
  return hits;
}

function applySkillHits(hero, skill, primary, stats, opts = {}) {
  if (!opts.silent && skill?.name) {
    addLog({ type: 'skill', text: `${skill.name}` });
  }
  const pack = alivePack();
  const heroIso = window.isoField?.hero;
  const targets = aoeTargets(skill, primary, pack, heroIso, hero, stats, opts.origin);
  const killed = [];
  for (const m of targets) {
    if (!m || m.hp <= 0) continue;
    const result = calcDamage(hero, m, skill);
    if (result.miss) {
      if (m.iso) window.isoField?.addFx('dmg', m.iso.x, m.iso.y, '未中', '#9a9080');
      continue;
    }
    let dmg = skill.aoe && primary && m !== primary ? Math.floor(result.damage * 0.75) : result.damage;
    if (opts.coeff) dmg = Math.max(1, Math.floor(dmg * opts.coeff));
    m.hp -= dmg;
    if (m.curse?.leech) {
      hero.currentHp = Math.min(stats.maxHp, hero.currentHp + dmg * m.curse.leech);
    }
    if (m.iso) {
      window.isoField?.addFx('dmg', m.iso.x, m.iso.y, `${result.isCrit ? '暴 ' : ''}${dmg}`, result.isCrit ? '#ffd070' : '#e8dcc8');
    }
    if (m.hp <= 0) killed.push(m);
  }
  if (skill.curse) {
    const lv = Math.max(1, hero.skillLevels?.[skill.id] || 1);
    const scale = 1 + (lv - 1) * 0.07;
    const base = skill.curse;
    for (const m of targets) {
      if (!m || m.hp <= 0) continue;
      m.curse = {
        id: base.id,
        t: (base.dur || 8) + lv * 0.25,
        physTaken: (base.physTaken || 0) * scale,
        dmgDown: (base.dmgDown || 0) * scale,
        resDown: (base.resDown || 0) * scale,
        slow: (base.slow || 0) * scale,
        leech: (base.leech || 0) * scale,
        armorDown: (base.armorDown || 0) * scale,
      };
    }
  }
  if (skill.holyHeal && targets.some(m => m.race === 'undead' || m.race === 'demon')) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * skill.holyHeal);
  }
  if (!opts.silent) {
    const from = heroIso;
    const to = primary?.iso || heroIso;
    if (from) {
      window.isoField?.playSkill(skill, from, to, targets, {
        radius: skillAoeRadius(hero, skill, stats),
        duration: skill.duration,
      });
      window.isoField?.addFx('skill', from.x, from.y, skill.name, '#ff8844');
    }
  }
  if (stats.lifesteal > 0) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + 12 * stats.lifesteal);
  }
  if (skill.id === 'whirlwind' && stats.wwLifesteal) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * stats.wwLifesteal * Math.max(1, targets.length) * 0.12);
  }
  for (const m of killed) onMonsterKill(hero, m);
  if (!opts.echo && stats.echoSkill?.[skill.id]) {
    const echoId = stats.echoSkill[skill.id];
    const echo = SKILLS[hero.charId]?.[echoId];
    if (echo && echo.id !== skill.id) {
      applySkillHits(hero, echo, primary, stats, { silent: true, echo: true, coeff: 0.55 });
    }
  }
}

function skillHasTarget(hero, skill, stats, pack, hx, monster) {
  const reach = Math.max(stats.attackRange || 1.4, skillAoeRadius(hero, skill, stats) || 0, 2.8) + 1.6;
  const inR = (m) => m && m.hp > 0 && m.iso && (!hx || isoDist(hx, m.iso) <= reach);
  if ((pack || []).some(inR)) return true;
  return inR(monster);
}

function autoCastSkillIds(hero, stats) {
  const tree = SKILLS[hero.charId] || {};
  stats = stats || calcHeroStats(hero, { useCombatBuffs: true, buffs: combat.buffs });
  const defaults = DEFAULT_SKILLS[hero.charId] || [];
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    if (!id || seen.has(id) || !tree[id]) return;
    seen.add(id);
    ids.push(id);
  };
  defaults.forEach(add);
  (hero.equippedSkills || []).forEach(add);
  Object.keys(stats.skillGrant || {}).forEach(add);
  return ids.filter(id => {
    const skill = tree[id];
    if (!skill || skill.type !== 'active') return false;
    if (combatSkillLevel(hero, id, stats) < 1) return false;
    if (!isSkillEnabled(hero, id)) return false;
    if (skill.tree === 'warcry') return false;
    if (!skillWeaponReady(hero, skill).ok) return false;
    if ((skill.tags || []).includes('control') && (skill.damageMult || 0) < 0.9 && !skill.curse) return false;
    return typeof isCombatCastSkill === 'function' ? isCombatCastSkill(skill) : ((skill.damageMult || 0) > 0);
  });
}

function listReadyCasts(hero, monster, stats) {
  const tree = SKILLS[hero.charId] || {};
  const hx = window.isoField?.hero;
  const pack = alivePack();
  const ready = [];
  for (const skillId of autoCastSkillIds(hero, stats)) {
    const skill = tree[skillId];
    if (!skill) continue;
    combat.skillCooldowns[skillId] = combat.skillCooldowns[skillId] || 0;
    if (combat.skillCooldowns[skillId] > 0) continue;
    if (skill.tree === 'elem') {
      const shaped = Object.values(combat.buffs || {}).some(b => b.kind === 'shape' && (b.t || 0) > 0);
      if (shaped && !stats.shapecast) continue;
    }
    const cost = skillResCost(hero, skill, stats);
    if (cost > 0 && (hero.currentRes || 0) < cost) continue;
    if (!skillHasTarget(hero, skill, stats, pack, hx, monster)) continue;
    ready.push({ skillId, skill, cost });
  }
  return ready;
}

function pickCastSkill(hero, ready) {
  if (!ready?.length) return null;
  const order = [];
  const seen = new Set();
  const add = (id) => {
    if (!id || seen.has(id)) return;
    const row = ready.find(r => r.skillId === id);
    if (!row) return;
    seen.add(id);
    order.push(row);
  };
  (hero.skillPriorities || []).forEach(add);
  (hero.equippedSkills || []).forEach(add);
  ready.forEach(r => add(r.skillId));
  if (!order.length) return ready[0];
  if (combat.preferCdOnce) {
    combat.preferCdOnce = false;
    const cd = order.find(r => (r.skill.cooldown || 0) > 0);
    if (cd) return cd;
  }
  const last = combat.lastSkillId;
  const idx = order.findIndex(r => r.skillId === last);
  const start = idx >= 0 ? idx + 1 : 0;
  return order[start % order.length];
}

function tryCastOneSkill(hero, monster, stats) {
  if (!monster || monster.hp <= 0) return false;
  const pick = pickCastSkill(hero, listReadyCasts(hero, monster, stats));
  if (!pick) return false;

  const { skillId, skill, cost } = pick;
  const before = hero.currentRes || 0;
  if (cost > 0) {
    hero.currentRes = Math.max(0, before - cost);
    combat.spenderLock = true;
  }
  if (cost <= 0 && skill.resGain) gainResource(hero, stats, skill.resGain);
  if (skill.hpCost) {
    const pct = skill.hpCost * (1 - Math.min(0.75, stats.hpCostReduce || 0));
    hero.currentHp = Math.max(1, hero.currentHp - stats.maxHp * pct);
  }

  if (skill.cooldown > 0) {
    combat.skillCooldowns[skillId] = skill.cooldown * (1 - Math.min(0.4, stats.cdrPct || 0));
  } else combat.skillCooldowns[skillId] = 0.4;

  if (skill.channel) {
    combat.channel = { id: skillId, t: skill.channel, tick: 0 };
    if (window.isoField) window.isoField.spinning = true;
    combat.attackTimer = 0.05;
  } else {
    combat.attackTimer = 0.16;
  }
  if (skill.plantSummon) {
    plantSkillSummon(hero, skill, monster, stats);
  } else {
    applySkillHits(hero, skill, monster, stats);
    if (skill.duration) {
      const follow = skill.id === 'hurricane' || skill.id === 'thunderstorm';
      const origin = follow
        ? (window.isoField?.hero || monster?.iso)
        : (monster?.iso || window.isoField?.hero);
      if (origin) {
        combat.zones = combat.zones || [];
        combat.zones.push({
          skillId,
          x: origin.x,
          y: origin.y,
          r: skillAoeRadius(hero, skill, stats),
          t: skill.duration,
          tick: 0,
          interval: skill.lingerTick || 0.45,
          followHero: follow,
        });
      }
    }
  }
  combat.spenderLock = false;
  combat.lastSkillId = skillId;
  if ((skill.tags || []).includes('opener')) {
    combat.comboWindow = Math.max(combat.comboWindow || 0, 6 + (stats.windowBonus || 0));
    combat.lastOpener = skillId;
  }
  if (cost > 0) {
    const resName = stats.resName || '资源';
    addLog({ type: 'skill', text: `${skill.name} ${resName} ${Math.floor(before)} → ${Math.floor(hero.currentRes || 0)}` });
  }
  return true;
}

function tickSkillChannel(dt, hero, stats) {
  const ch = combat.channel;
  if (!ch) return false;
  const skill = SKILLS[hero.charId]?.[ch.id];
  if (!skill || hero.isDead) {
    combat.channel = null;
    if (window.isoField) window.isoField.spinning = false;
    return false;
  }
  ch.t -= dt;
  ch.tick += dt;
  const interval = skill.channelTick || 0.32;
  if (ch.tick >= interval) {
    ch.tick -= interval;
    const pack = alivePack();
    const primary = nearestTarget(window.isoField?.hero) || pack[0];
    if (primary && primary.hp > 0) applySkillHits(hero, skill, primary, stats, { silent: true });
  }
  if (ch.t <= 0) {
    combat.channel = null;
    if (window.isoField) window.isoField.spinning = false;
  }
  return true;
}

function plantSkillSummon(hero, skill, monster, stats) {
  const origin = monster?.iso || window.isoField?.hero;
  if (!origin) return;
  const hx = window.isoField?.hero;
  let x = origin.x;
  let y = origin.y;
  if (hx) {
    const dx = origin.x - hx.x;
    const dy = origin.y - hx.y;
    const d = Math.hypot(dx, dy) || 1;
    x = origin.x - (dx / d) * 0.4 + (Math.random() - 0.5) * 0.55;
    y = origin.y - (dy / d) * 0.4 + (Math.random() - 0.5) * 0.55;
  }
  combat.turrets = combat.turrets || [];
  const cap = skill.summonCap || 3;
  const same = combat.turrets.filter(t => t.skillId === skill.id);
  while (same.length >= cap) {
    const oldest = same.shift();
    combat.turrets = combat.turrets.filter(t => t !== oldest);
  }
  combat.turrets.push({
    skillId: skill.id,
    kind: skill.id,
    x,
    y,
    r: Math.max(skillAoeRadius(hero, skill, stats), 4.6),
    t: skill.duration || 10,
    tick: 0.05,
    interval: skill.lingerTick || 0.5,
  });
  addLog({ type: 'skill', text: skill.name });
  window.isoField?.playSkill(skill, hx || origin, { x, y }, [], {
    radius: skillAoeRadius(hero, skill, stats),
  });
  window.isoField?.addFx('skill', x, y, skill.name, '#ff8844');
}

function tickSkillZones(dt, hero, stats) {
  if (combat.zones?.length) {
    const pack = alivePack();
    combat.zones = combat.zones.filter((z) => {
      z.t -= dt;
      z.tick += dt;
      const skill = SKILLS[hero.charId]?.[z.skillId];
      if (!skill || hero.isDead || z.t <= 0) return false;
      if (z.followHero && window.isoField?.hero) {
        z.x = window.isoField.hero.x;
        z.y = window.isoField.hero.y;
      }
      if (z.tick >= (z.interval || 0.45)) {
        z.tick -= z.interval || 0.45;
        const origin = { x: z.x, y: z.y };
        const primary = pack.find(m => m?.iso && isoDist(origin, m.iso) <= (z.r || 3)) || pack[0];
        if (primary && primary.hp > 0) {
          applySkillHits(hero, skill, primary, stats, { silent: true, origin });
        }
      }
      return true;
    });
  }
  tickSkillTurrets(dt, hero, stats);
}

function tickSkillTurrets(dt, hero, stats) {
  if (!combat.turrets?.length) return;
  const pack = alivePack();
  combat.turrets = combat.turrets.filter((tur) => {
    tur.t -= dt;
    tur.tick += dt;
    const skill = SKILLS[hero.charId]?.[tur.skillId];
    if (!skill || hero.isDead || tur.t <= 0) return false;
    if (tur.tick >= (tur.interval || 0.5)) {
      tur.tick -= tur.interval || 0.5;
      const origin = { x: tur.x, y: tur.y };
      const reach = tur.r || 4.6;
      let primary = null;
      let best = 1e9;
      for (const m of pack) {
        if (!m?.iso || m.hp <= 0) continue;
        const d = isoDist(origin, m.iso);
        if (d <= reach && d < best) {
          best = d;
          primary = m;
        }
      }
      if (primary) {
        applySkillHits(hero, skill, primary, stats, { silent: true, origin: primary.iso });
        window.isoField?.playSkill(skill, origin, primary.iso, [], { kind: 'proj' });
      }
    }
    return true;
  });
}

function performHeroAttack(hero, monster, stats) {
  const result = calcDamage(hero, monster);
  if (result.miss) {
    window.isoField?.addFx('dmg', monster.iso.x, monster.iso.y, '未中', '#9a9080');
    return;
  }
  monster.hp -= result.damage;
  window.isoField?.playSkill(
    { tags: ['melee'], element: 'physical', id: 'auto' },
    window.isoField.hero, monster.iso, []
  );
  window.isoField?.addFx('dmg', monster.iso.x, monster.iso.y, `${result.isCrit ? '暴 ' : ''}${result.damage}`, result.isCrit ? '#ffd070' : '#e8dcc8');
  if (stats.lifesteal > 0) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + result.damage * stats.lifesteal);
  }
  if (stats.resOnHit && (hero.currentRes || 0) < stats.maxRes * 0.9) {
    gainResource(hero, stats, stats.resOnHit);
  }
  if (monster.hp <= 0) onMonsterKill(hero, monster);
}

function spawnGoldDrop(mx, my, goldAmt, i = 0, n = 1) {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.4;
  const rad = 0.35 + i * 0.16 + Math.random() * 0.2;
  window.isoField?.addDrop({
    ix: mx + Math.cos(ang) * rad,
    iy: my + Math.sin(ang) * rad * 0.75,
    color: '#d4a843',
    name: `${goldAmt}金`,
    gold: goldAmt,
    rest: 1.05 + i * 0.16,
    onPickup: (d) => {
      gameState.gold += d.gold;
      addLog({ type: 'loot', text: `拾取 ${d.gold} 金币` });
    },
  });
}

function splitGoldPiles(total, count) {
  const piles = [];
  let left = Math.max(count, total);
  for (let i = 0; i < count; i++) {
    const remain = count - i;
    const chunk = i === count - 1
      ? left
      : Math.max(1, Math.floor(left * (0.12 + Math.random() * 0.22)));
    piles.push(chunk);
    left -= chunk;
  }
  return piles.filter(n => n > 0);
}

function spawnDrops(hero, monster, extraItems) {
  const mx = monster.iso?.x ?? 7;
  const my = monster.iso?.y ?? 4;
  if (monster.treasureGoblin) {
    const piles = splitGoldPiles(monster.gold || 120, monster.goldPiles || 6);
    piles.forEach((amt, i) => spawnGoldDrop(mx, my, amt, i, piles.length));
    const nItems = Math.max(1, dropRolls(monster.lootRolls || 5));
    const items = extraItems ? extraItems.slice() : [];
    while (items.length < nItems) items.push(generateLoot(monster.level, null, 'goblin', hero.charId, gameState));
    items.forEach((item, i) => {
      const q = QUALITY[item.quality] || QUALITY.normal;
      const ang = (i / items.length) * Math.PI * 2;
      window.isoField?.addDrop({
        ix: mx + Math.cos(ang) * (0.7 + (i % 3) * 0.28),
        iy: my + Math.sin(ang) * (0.55 + (i % 3) * 0.22),
        color: q.color,
        name: itemDisplayName(item),
        item,
        rest: 1.35 + i * 0.12,
        onPickup: (d) => {
          const res = addLoot(gameState, d.item);
          if (res.salvage) addLog({ type: 'loot', text: formatSalvageLog(`拾取并分解 ${itemDisplayName(d.item)}`, res) });
          else if (res.sold) addLog({ type: 'loot', text: `拾取并出售 ${itemDisplayName(d.item)} +${res.gold} 金` });
          else addLog({ type: 'loot', text: `拾取 ${itemDisplayName(d.item)}（${q.name}）` });
        },
      });
    });
    addLog({ type: 'loot', text: `宝藏哥布林爆出 ${piles.length} 袋金币与 ${items.length} 件装备` });
    return;
  }
  spawnGoldDrop(mx, my, monster.isBoss ? 250 : (monster.gold || 5));
  const items = extraItems ? extraItems.slice() : [];
  let expected = 0;
  if (monster.kind === 'hidden') expected = 2.5;
  else if (monster.kind === 'rare' || monster.kind === 'rareBoss') expected = 1.55;
  else if (monster.kind === 'elite') expected = 1.18;
  else if (monster.isBoss || monster.kind === 'actBoss' || monster.kind === 'riftBoss') expected = 2;
  else expected = 0.1;
  const rolls = dropRolls(expected);
  if (!items.length) {
    for (let i = 0; i < rolls; i++) items.push(generateLoot(monster.level, null, monster.kind, hero.charId, gameState));
  }
  for (const item of items) {
    const q = QUALITY[item.quality] || QUALITY.normal;
    window.isoField?.addDrop({
      ix: mx + (Math.random() - 0.5) * 1.1,
      iy: my + (Math.random() - 0.5) * 1.1,
      color: q.color,
      name: itemDisplayName(item),
      item,
      onPickup: (d) => {
        const res = addLoot(gameState, d.item);
        if (res.salvage) addLog({ type: 'loot', text: formatSalvageLog(`拾取并分解 ${itemDisplayName(d.item)}`, res) });
        else if (res.sold) addLog({ type: 'loot', text: `拾取并出售 ${itemDisplayName(d.item)} +${res.gold} 金` });
        else addLog({ type: 'loot', text: `拾取 ${itemDisplayName(d.item)}（${q.name}）` });
      },
    });
  }
}

function onMonsterKill(hero, monster) {
  if (monster._looted) return;
  monster._looted = true;
  monster.hp = 0;
  hero.combo = (hero.combo || 0) + 1;
  hero.kills = (hero.kills || 0) + 1;
  gameState.mapKills = gameState.mapKills || {};
  const stats = calcHeroStats(hero);
  if (stats.killReset && (monster.kind === 'elite' || monster.kind === 'rare' || monster.kind === 'rareBoss' || monster.kind === 'hidden' || monster.isBoss)) {
    combat.skillCooldowns[stats.killReset] = 0;
  }
  if (stats.resOnKill && !combat.channel && !combat.spenderLock) {
    gainResource(hero, stats, stats.resOnKill);
  }

  if (monster.riftBoss) {
    addLog({ type: 'boss', text: `击败 ${monster.name}` });
    const gain = grantKillExp(hero, 140 + monster.level * 5, monster.level);
    levelUpHero(hero);
    const reward = onRiftBossKill(gameState, hero, monster);
    spawnDrops(hero, monster, reward.loot);
    addLog({ type: 'boss', text: `小秘境 ${reward.cleared} 层通过，进入 ${reward.next} 层` });
    combat.monsters = alivePack().filter(m => m !== monster);
    combat.target = nearestTarget(window.isoField?.hero);
    combat.lastCorpse = { x: monster.iso?.x || 7, y: monster.iso?.y || 4 };
    combat.spawnTimer = 0.7;
    return;
  }

  if (!monster.isBoss) {
    const map = getCurrentMap(hero, gameState);
    if (map?.isRift) {
      ensureRiftHero(hero);
      if (!hero.riftBossReady) {
        hero.riftProgress = (hero.riftProgress || 0) + 1;
        const need = riftProgressNeed(hero.riftFloor);
        if (hero.riftProgress >= need) {
          hero.riftProgress = need;
          hero.riftBossReady = true;
          addLog({ type: 'boss', text: '秘境进度已满，强力守护者即将出现' });
        }
      }
    } else {
      const camp = campaignOf(gameState, hero);
      const need = mapProgressNeed(map);
      const have = camp.mapKills[hero.currentMap] || 0;
      if (have < need) camp.mapKills[hero.currentMap] = have + 1;
      combat.killCount = camp.mapKills[hero.currentMap] || 0;
    }
    if (maybeUnlockTown(gameState)) {
      addLog({ type: 'info', text: '血沼已肃清，荒村据点开放。可从营地进入。' });
      window.notifyTownUnlock?.();
    }
    const gained = grantKillExp(hero, monster.exp || 4, monster.level);
    if (stats.killHeal > 0) {
      hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * stats.killHeal);
    }
    const pen = gained.info.label ? ` · ${gained.info.label}` : '';
    addLog({ type: 'kill', text: `击杀 ${monster.name}（${kindName(monster.kind)}） 经验 +${gained.got}${pen}` });
    spawnDrops(hero, monster);
    const prev = hero.level;
    levelUpHero(hero);
    if (hero.level > prev) addLog({ type: 'level', text: `升级至 ${hero.level}，获得技能点` });
  } else {
    addLog({ type: 'boss', text: `击败 ${monster.name}` });
    grantKillExp(hero, 90 + monster.level * 4, monster.level);
    levelUpHero(hero);
    const reward = onBossKill(gameState, monster.bossId);
    spawnDrops(hero, monster, reward?.loot ? [reward.loot] : []);
    if (reward && !reward.repeat) {
      const bits = [];
      if (reward.act) bits.push(`第 ${reward.act} 章已通关`);
      if (reward.nextAct) bits.push(`解锁第 ${reward.nextAct} 章`);
      if (reward.unlockChars?.length) bits.push(`解锁职业 ${reward.unlockChars.map(id => CHARACTERS[id]?.name || id).join('、')}`);
      if (reward.unlockedDiff) bits.push(`解锁${reward.unlockedDiff.name}难度`);
      if (bits.length) addLog({ type: 'boss', text: bits.join(' · ') });
      showBossReward(reward);
    } else if (reward?.unlockedDiff) {
      addLog({ type: 'boss', text: `解锁${reward.unlockedDiff.name}难度` });
    }
    combat.killCount = campaignOf(gameState, hero).mapKills[hero.currentMap] || 0;
  }

  const jumped = tryAutoNextMap(gameState, hero);
  if (jumped) {
    addLog({ type: 'info', text: `自动进入 ${jumped.name}` });
    combat.monsters = [];
    combat.target = null;
    combat.bossPity = 0;
    combat.spawnTimer = 0.25;
    combat.killCount = campaignOf(gameState, hero).mapKills[hero.currentMap] || 0;
    combat.lastCorpse = { x: monster.iso?.x || 7, y: monster.iso?.y || 4 };
    return;
  }

  combat.monsters = alivePack().filter(m => m !== monster);
  combat.target = nearestTarget(window.isoField?.hero);
  combat.lastCorpse = { x: monster.iso?.x || 7, y: monster.iso?.y || 4 };
  if (!combat.monsters.length) combat.spawnTimer = 0.9;
}

function kindName(k) {
  return { normal: '普通', elite: '精英', rare: '稀有', hidden: '隐藏', goblin: '宝藏哥布林', boss: 'Boss', rareBoss: '稀有Boss', actBoss: '章节Boss', riftBoss: '秘境守护' }[k] || k;
}

function handleDeath(hero) {
  hero.isDead = true;
  hero.respawnTimer = 8;
  hero.combo = 0;
  combat.channel = null;
  combat.zones = [];
  combat.turrets = [];
  if (window.isoField) window.isoField.spinning = false;
  const loss = Math.floor((gameState.gold || 0) * 0.1);
  gameState.gold = Math.max(0, (gameState.gold || 0) - loss);
  const fightingBoss = (combat.monsters || []).some(m => m && m.isBoss && m.bossId);
  const map = getCurrentMap(hero, gameState);
  if (fightingBoss && map) {
    const dec = 10;
    const camp = campaignOf(gameState, hero);
    camp.mapKills[map.id] = Math.max(0, (camp.mapKills[map.id] || 0) - dec);
    combat.killCount = camp.mapKills[map.id];
    addLog({ type: 'death', text: `倒下，未能击败首领，进度 -${dec}，损失金币 ${loss}，8 秒后复活` });
  } else {
    addLog({ type: 'death', text: `倒下，损失金币 ${loss}，8 秒后复活` });
  }
  combat.monsters = [];
  combat.target = null;
  combat.spawnTimer = 8;
}

gameState.offlineClaimed = false;
window.addEventListener('beforeunload', () => { if (!savePaused) saveGame(gameState); });
window.addEventListener('pagehide', () => { if (!savePaused) saveGame(gameState); });
window.addEventListener('freeze', () => { if (!savePaused) saveGame(gameState); });
window.addEventListener('resize', () => window.isoField?.resize());
document.addEventListener('visibilitychange', syncCombatClock);
fgRaf = requestAnimationFrame(foregroundLoop);
if (document.hidden) syncCombatClock();
})();
