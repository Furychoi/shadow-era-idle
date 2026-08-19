import {
  loadGame, saveGame, getActiveHero, getCurrentMap, generateLoot, addLoot,
  levelUpHero, onBossKill, KILLS_FOR_BOSS, mapUnlocked,
} from './game.js';
import { calcHeroStats, calcDamage, calcMonsterDamage, createMonster } from './combat.js';
import { initUI, setCombatState, renderAll, addLog, showBossReward, isoField } from './ui.js';
import { SKILLS, BOSSES, CHARACTERS } from './data.js';

let gameState = loadGame();
let lastTick = performance.now();
let saveTimer = 0;

const combat = {
  monster: null,
  killCount: 0,
  attackTimer: 0,
  monsterAttackTimer: 0,
  skillCooldowns: {},
  spawnTimer: 0.2,
  comboWindow: 0,
  lastOpener: null,
  log: [{ type: 'info', text: '边境营地已架起等距战场。选择地图，技能与装备规则会自动战斗。' }],
};

setCombatState(combat);
initUI(gameState, () => {
  combat.monster = null;
  combat.killCount = 0;
  combat.spawnTimer = 0.2;
});

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  saveTimer += dt * 1000;
  updateCombat(dt);
  const hero = getActiveHero(gameState);
  isoField?.setScene({
    tiles: getCurrentMap(hero).tiles,
    monsters: combat.monster ? [combat.monster] : [],
    heroDead: hero.isDead,
  });
  isoField?.tick(dt, combat.monster);
  isoField?.draw(CHARACTERS[hero.charId]);
  if (saveTimer >= 20000) {
    gameState.offlineClaimed = false;
    saveGame(gameState);
    saveTimer = 0;
  }
  renderAll();
  requestAnimationFrame(gameLoop);
}

function updateCombat(dt) {
  const hero = getActiveHero(gameState);
  const map = getCurrentMap(hero);
  const stats = calcHeroStats(hero);
  combat.comboWindow = Math.max(0, combat.comboWindow - dt);

  if (hero.isDead) {
    hero.respawnTimer -= dt;
    if (hero.respawnTimer <= 0) {
      hero.isDead = false;
      hero.currentHp = stats.maxHp;
      addLog({ type: 'info', text: `${CHARACTERS[hero.charId].name} 已复活` });
    }
    return;
  }

  if (!combat.monster) {
    combat.spawnTimer -= dt;
    if (combat.spawnTimer <= 0) {
      const wantBoss = combat.killCount >= KILLS_FOR_BOSS || map.isBoss;
      let forceRareBoss = false;
      if (wantBoss && map.bossId && Math.random() < 0.1) forceRareBoss = true;
      combat.monster = createMonster(map, {
        forceBoss: wantBoss && map.bossId,
        bossId: wantBoss ? map.bossId : null,
        forceRareBoss,
      });
      combat.spawnTimer = 0.4;
      if (combat.monster.isBoss) {
        addLog({ type: 'boss', text: `${combat.monster.name} 出现了！` });
      } else if (combat.monster.kind === 'rare') {
        addLog({ type: 'boss', text: `稀有怪物：${combat.monster.name}` });
      }
    }
    return;
  }

  const monster = combat.monster;
  if (monster.isBoss && monster.bossId) {
    const bossDef = BOSSES[monster.bossId];
    const hpPct = monster.hp / monster.maxHp;
    for (let i = bossDef.phases.length - 1; i >= 0; i--) {
      if (hpPct <= bossDef.phases[i].threshold && monster.phase <= i) {
        monster.phase = i + 1;
        if (bossDef.phases[i].threshold < 1) {
          addLog({ type: 'boss', text: `${monster.name} 阶段 ${monster.phase}：${bossDef.phases[i].desc}` });
        }
        if (hpPct <= 0.5) monster.damage = Math.floor((BOSSES[monster.bossId].damage) * 1.25);
      }
    }
  }

  if (monster.eliteAffixes?.some(a => a.regen) && monster.hp < monster.maxHp) {
    const regen = monster.eliteAffixes.find(a => a.regen);
    monster.hp = Math.min(monster.maxHp, monster.hp + monster.maxHp * regen.regen * dt);
  }

  combat.attackTimer -= dt;
  if (combat.attackTimer <= 0) {
    performHeroAttack(hero, monster, stats);
    combat.attackTimer = stats.attackInterval;
    const proc = Object.values(hero.equipment).find(i => i?.morphId === 'proc');
    if (proc && Math.random() < 0.2) {
      const sid = proc.morphSkill || hero.equippedSkills[0];
      const skill = SKILLS[hero.charId]?.[sid];
      if (skill?.damageMult) {
        const r = calcDamage(hero, monster, skill);
        monster.hp -= Math.floor(r.damage * 0.5);
        isoField?.addFx('dmg', monster.iso.x, monster.iso.y, `击中施放 ${Math.floor(r.damage * 0.5)}`, '#c7a24a');
      }
    }
  }

  castSkills(hero, monster, stats, dt);

  combat.monsterAttackTimer -= dt;
  const atkSpd = monster.eliteAffixes?.some(a => a.speed) ? 1.05 : 1.5;
  if (combat.monsterAttackTimer <= 0) {
    const dmg = calcMonsterDamage(monster, hero);
    hero.currentHp -= dmg;
    if (hero.currentHp <= 0) handleDeath(hero);
    combat.monsterAttackTimer = atkSpd;
  }

  if (stats.lifeRegen > 0) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.lifeRegen * dt);
  }
}

function performHeroAttack(hero, monster, stats) {
  const result = calcDamage(hero, monster);
  monster.hp -= result.damage;
  isoField?.addFx('dmg', monster.iso.x, monster.iso.y, `${result.isCrit ? '暴 ' : ''}${result.damage}`, result.isCrit ? '#ffd070' : '#e8dcc8');
  if (stats.lifesteal > 0) {
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + result.damage * stats.lifesteal);
  }
  if (monster.hp <= 0) onMonsterKill(hero, monster);
}

function castSkills(hero, monster, stats, dt) {
  const priorities = hero.skillPriorities || hero.equippedSkills || [];
  for (const skillId of priorities) {
    const skill = SKILLS[hero.charId]?.[skillId];
    if (!skill || skill.type === 'passive' || skill.type === 'aura') continue;
    const lv = hero.skillLevels?.[skillId] || 0;
    if (lv <= 0 && skill.type !== 'buff') continue;

    combat.skillCooldowns[skillId] = (combat.skillCooldowns[skillId] || 0) - dt;
    if (combat.skillCooldowns[skillId] > 0) continue;
    if (skill.hpCost && hero.currentHp <= stats.maxHp * skill.hpCost) continue;

    if (skill.hpCost) hero.currentHp -= stats.maxHp * skill.hpCost;

    const result = calcDamage(hero, monster, skill);
    monster.hp -= result.damage;
    let cd = skill.cooldown || 2;
    const morph = Object.values(hero.equipment).find(i => i?.morphId === 'reset' && i.morphSkill === skillId);
    combat.skillCooldowns[skillId] = cd;

    if (skill.tags?.includes('opener') || skill.tags?.includes('window')) {
      combat.comboWindow = 3 + (Object.values(hero.equipment).some(i => i?.morphId === 'window') ? 1.5 : 0);
      combat.lastOpener = skillId;
    }

    addLog({ type: 'skill', text: `${skill.name} 造成 ${result.damage}${result.aoe ? '（范围）' : ''}` });
    isoField?.addFx('skill', monster.iso.x, monster.iso.y, skill.name, '#ff8844');

    if (stats.lifesteal > 0) {
      hero.currentHp = Math.min(stats.maxHp, hero.currentHp + result.damage * stats.lifesteal);
    }
    if (monster.hp <= 0) {
      if (morph && (monster.kind === 'elite' || monster.kind === 'rare' || monster.isBoss)) {
        combat.skillCooldowns[skillId] = 0;
      }
      onMonsterKill(hero, monster);
      return;
    }
    break;
  }
}

function onMonsterKill(hero, monster) {
  hero.combo = (hero.combo || 0) + 1;
  hero.kills = (hero.kills || 0) + 1;
  const stats = calcHeroStats(hero);

  if (!monster.isBoss) {
    combat.killCount++;
    hero.exp += monster.exp || 20;
    gameState.gold += monster.gold || 5;
    if (stats.killHeal > 0) {
      hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * stats.killHeal);
    }
    addLog({ type: 'kill', text: `击杀 ${monster.name}（${kindName(monster.kind)}） 经验 +${monster.exp}` });

    const dropChance = monster.kind === 'rare' ? 0.55 : monster.kind === 'elite' ? 0.28 : 0.14;
    if (Math.random() < dropChance) {
      const item = generateLoot(monster.level, null, monster.kind);
      const res = addLoot(gameState, item);
      if (res.sold) addLog({ type: 'loot', text: `自动出售 ${item.name} +${res.gold} 金` });
      else addLog({ type: 'loot', text: `掉落 ${item.name}（${item.quality}）` });
    }

    const prev = hero.level;
    levelUpHero(hero);
    if (hero.level > prev) addLog({ type: 'level', text: `升级至 ${hero.level}，获得技能点` });
  } else {
    addLog({ type: 'boss', text: `击败 ${monster.name}` });
    hero.exp += 600 + monster.level * 20;
    gameState.gold += 250;
    levelUpHero(hero);
    const reward = onBossKill(gameState, monster.bossId);
    if (reward && !reward.repeat) showBossReward(reward);
    else if (reward?.loot) addLog({ type: 'loot', text: `Boss 掉落 ${reward.loot.name}` });
    combat.killCount = 0;
  }

  combat.monster = null;
  combat.spawnTimer = 0.25;
}

function kindName(k) {
  return { normal: '普通', elite: '精英', rare: '稀有', boss: 'Boss', rareBoss: '稀有Boss', actBoss: '章节Boss' }[k] || k;
}

function handleDeath(hero) {
  hero.isDead = true;
  hero.respawnTimer = 8;
  hero.combo = 0;
  const loss = Math.floor(gameState.gold * 0.1);
  gameState.gold = Math.max(0, gameState.gold - loss);
  addLog({ type: 'death', text: `倒下，损失金币 ${loss}，8 秒后复活` });
  combat.monster = null;
}

gameState.offlineClaimed = false;
window.addEventListener('beforeunload', () => saveGame(gameState));
window.addEventListener('resize', () => isoField?.resize());
requestAnimationFrame(gameLoop);
