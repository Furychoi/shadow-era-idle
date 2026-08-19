import {
  CHARACTERS, SKILLS, MAPS, BOSSES, QUALITY, AFFIX_POOL, LEGENDARY_ITEMS, UNIQUE_ITEMS,
  BASE_ITEMS, QUALITY_WEIGHTS, SETS, MORPHS, expForLevel, SLOTS, DEFAULT_SKILLS,
} from './data.js';
import { calcHeroStats, calcDPS, getMap } from './combat.js';

const SAVE_KEY = 'shadow-era-save-v11';
const OFFLINE_MAX_HOURS = 12;
export const KILLS_FOR_BOSS = 80;
export const INV_CAP = 64;

const Q_RANK = { normal: 0, magic: 1, rare: 2, set: 3, unique: 4, legendary: 5, ancient: 6 };

export function createNewGame() {
  return {
    gold: 800,
    unlockedChars: ['berserker', 'amazon'],
    activeCharId: 'berserker',
    heroes: {
      berserker: createHero('berserker', 1, { weapon: createNamedItem('butcher_cleaver') }),
      amazon: createHero('amazon', 1, { weapon: createNamedItem('glory_bow') }),
    },
    inventory: [],
    bossesKilled: {},
    lastSaveTime: Date.now(),
    offlineClaimed: false,
    autoSell: {
      enabled: true,
      maxQuality: 'magic',
      keepSet: true,
      keepBetter: true,
    },
    invFilter: 'all',
  };
}

export function createHero(charId, level = 1, equipment = {}) {
  const hero = {
    charId, level, exp: 0,
    skillPoints: Math.max(0, level + 2),
    skillLevels: seedSkills(charId),
    equippedSkills: [...(DEFAULT_SKILLS[charId] || [])],
    skillPriorities: [...(DEFAULT_SKILLS[charId] || [])],
    equipment: {},
    currentMap: 'wasteland',
    currentHp: null,
    kills: 0, combo: 0, deaths: 0,
    isDead: false, respawnTimer: 0,
  };
  for (const slot of SLOTS) {
    if (equipment[slot]) hero.equipment[slot] = equipment[slot];
  }
  hero.currentHp = calcHeroStats(hero).maxHp;
  return hero;
}

function seedSkills(charId) {
  const defaults = DEFAULT_SKILLS[charId] || [];
  const levels = {};
  for (const id of defaults) {
    const skill = SKILLS[charId]?.[id];
    if (skill && !skill.prereq) levels[id] = 1;
  }
  for (const id of defaults) {
    const skill = SKILLS[charId]?.[id];
    if (skill?.prereq && levels[skill.prereq]) levels[id] = 1;
  }
  return levels;
}

function createNamedItem(id) {
  const def = [...UNIQUE_ITEMS, ...LEGENDARY_ITEMS].find(i => i.id === id);
  if (!def) return null;
  return cloneItem(def);
}

function cloneItem(def) {
  return {
    ...def,
    uid: crypto.randomUUID(),
    locked: false,
    affixes: (def.affixes || []).map(a => ({ ...a })),
  };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewGame();
    const state = JSON.parse(raw);
    state.lastSaveTime = state.lastSaveTime || Date.now();
    if (!state.autoSell) {
      state.autoSell = { enabled: true, maxQuality: 'magic', keepSet: true, keepBetter: true };
    }
    if (!state.heroes.amazon && state.unlockedChars.includes('amazon')) {
      state.heroes.amazon = createHero('amazon', 1);
    }
    return state;
  } catch {
    return createNewGame();
  }
}

export function saveGame(state) {
  state.lastSaveTime = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function getActiveHero(state) {
  return state.heroes[state.activeCharId];
}

export function getCurrentMap(hero) {
  return getMap(hero.currentMap);
}

export function mapUnlocked(state, map) {
  if (!map.unlockBoss) return true;
  return !!state.bossesKilled[map.unlockBoss];
}

export function rollQuality(kindBonus = 1) {
  const weights = QUALITY_WEIGHTS.map(q => {
    let w = q.weight;
    if (['unique', 'legendary', 'ancient', 'set'].includes(q.quality)) w *= kindBonus;
    return { ...q, weight: w };
  });
  const total = weights.reduce((s, q) => s + q.weight, 0);
  let roll = Math.random() * total;
  for (const q of weights) {
    roll -= q.weight;
    if (roll <= 0) return q.quality;
  }
  return 'normal';
}

function maybeMorph(item) {
  if (item.morphId) return item;
  const q = item.quality;
  let chance = 0;
  if (q === 'unique') chance = 0.7;
  else if (q === 'legendary') chance = 0.6;
  else if (q === 'ancient') chance = 1;
  if (Math.random() > chance) return item;
  const ids = Object.keys(MORPHS);
  item.morphId = ids[Math.floor(Math.random() * ids.length)];
  const skills = Object.values(SKILLS).flatMap(tree => Object.keys(tree));
  item.morphSkill = skills[Math.floor(Math.random() * skills.length)];
  return item;
}

export function generateLoot(mapLevel, forceQuality = null, kind = 'normal') {
  const kindBonus = kind === 'rare' || kind === 'rareBoss' ? 3 : kind === 'elite' ? 1.8 : kind === 'actBoss' || kind === 'boss' ? 4 : 1;
  const quality = forceQuality || rollQuality(kindBonus);
  const qDef = QUALITY[quality];

  if (quality === 'unique') {
    if (UNIQUE_ITEMS.length) {
      const def = UNIQUE_ITEMS[Math.floor(Math.random() * UNIQUE_ITEMS.length)];
      return maybeMorph(cloneItem(def));
    }
  }

  if (quality === 'legendary' || quality === 'ancient') {
    const pool = LEGENDARY_ITEMS.filter(i => i.quality === 'legendary');
    if (pool.length && Math.random() < 0.7) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const item = cloneItem(def);
      item.quality = quality;
      return maybeMorph(item);
    }
  }

  if (quality === 'set') {
    const setItems = LEGENDARY_ITEMS.filter(i => i.quality === 'set');
    if (setItems.length) return cloneItem(setItems[Math.floor(Math.random() * setItems.length)]);
  }

  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const baseList = BASE_ITEMS[slot] || BASE_ITEMS.weapon;
  const base = baseList[Math.floor(Math.random() * baseList.length)];
  const item = {
    uid: crypto.randomUUID(),
    name: base.name,
    slot, quality, locked: false, affixes: [],
  };
  if (base.baseDamage) item.baseDamage = base.baseDamage + Math.floor(mapLevel * 0.15);
  if (base.armor) item.armor = base.armor + Math.floor(mapLevel * 0.1);

  const [minA, maxA] = qDef.affixCount;
  const affixCount = minA + Math.floor(Math.random() * (maxA - minA + 1));
  const used = new Set();
  for (let i = 0; i < affixCount; i++) {
    const pool = i % 2 === 0 ? AFFIX_POOL.prefix : AFFIX_POOL.suffix;
    let affixDef = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (used.has(affixDef.id) && guard++ < 8) affixDef = pool[Math.floor(Math.random() * pool.length)];
    used.add(affixDef.id);
    const scale = 1 + mapLevel * 0.02;
    const value = Math.floor((affixDef.min + Math.random() * (affixDef.max - affixDef.min + 1)) * scale);
    item.affixes.push({ stat: affixDef.stat, value, name: affixDef.name });
  }
  return maybeMorph(item);
}

export function sellValue(item) {
  const rank = (Q_RANK[item.quality] ?? 0) + 1;
  return Math.floor(8 * rank * (1 + 0.15 * (item.affixes?.length || 0)));
}

export function shouldAutoSell(state, item, hero) {
  const cfg = state.autoSell;
  if (!cfg?.enabled || item.locked) return false;
  if (item.quality === 'unique' || item.quality === 'legendary' || item.quality === 'ancient') return false;
  if (cfg.keepSet && (item.quality === 'set' || item.setId)) return false;
  if (cfg.keepBetter) {
    const { diffPct } = compareDPS(hero, item);
    if (diffPct > 2) return false;
  }
  return (Q_RANK[item.quality] ?? 0) <= (Q_RANK[cfg.maxQuality] ?? 1);
}

export function addLoot(state, item) {
  const hero = getActiveHero(state);
  if (shouldAutoSell(state, item, hero)) {
    const gold = sellValue(item);
    state.gold += gold;
    return { sold: true, gold, item };
  }
  if (state.inventory.length >= INV_CAP) {
    const gold = sellValue(item);
    state.gold += gold;
    return { sold: true, overflow: true, gold, item };
  }
  state.inventory.push(item);
  return { sold: false, item };
}

export function sortInventory(state) {
  state.inventory.sort((a, b) => {
    if (!!b.locked - !!a.locked) return b.locked - a.locked;
    const qr = (Q_RANK[b.quality] ?? 0) - (Q_RANK[a.quality] ?? 0);
    if (qr) return qr;
    return (a.slot || '').localeCompare(b.slot || '');
  });
}

export function levelUpHero(hero) {
  while (hero.exp >= expForLevel(hero.level) && hero.level < 99) {
    hero.exp -= expForLevel(hero.level);
    hero.level++;
    hero.skillPoints = (hero.skillPoints || 0) + 1;
    hero.currentHp = calcHeroStats(hero).maxHp;
  }
}

export function allocateSkillPoint(hero, skillId) {
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill || (hero.skillPoints || 0) <= 0) return false;
  const current = hero.skillLevels[skillId] || 0;
  if (current >= skill.maxLevel) return false;
  if (skill.prereq && !(hero.skillLevels[skill.prereq] > 0)) return false;
  hero.skillLevels[skillId] = current + 1;
  hero.skillPoints--;
  if (!hero.equippedSkills.includes(skillId) && skill.type === 'active') {
    if (hero.equippedSkills.length < 6) hero.equippedSkills.push(skillId);
  }
  return true;
}

export function equipItem(hero, item) {
  const slot = item.slot === 'ring1' || item.slot === 'ring2'
    ? (hero.equipment.ring1 ? 'ring2' : 'ring1')
    : item.slot;
  const prev = hero.equipment[slot];
  hero.equipment[slot] = { ...item, slot };
  return prev;
}

export function compareDPS(hero, newItem) {
  const oldDps = Math.max(1, calcDPS(hero));
  const slot = newItem.slot === 'ring1' || newItem.slot === 'ring2'
    ? (hero.equipment.ring1 && newItem.slot === 'ring2' ? 'ring2' : 'ring1')
    : newItem.slot;
  const prev = hero.equipment[slot];
  hero.equipment[slot] = newItem;
  const newDps = calcDPS(hero);
  hero.equipment[slot] = prev;
  return { oldDps, newDps, diff: newDps - oldDps, diffPct: ((newDps - oldDps) / oldDps) * 100 };
}

function offlineEfficiency(hours) {
  if (hours <= 2) return 1;
  if (hours <= 8) return (2 * 1 + (hours - 2) * 0.7) / hours;
  const capped = Math.min(hours, OFFLINE_MAX_HOURS);
  return (2 * 1 + 6 * 0.7 + (capped - 8) * 0.4) / capped;
}

export function calcOfflineRewards(state) {
  const elapsed = Date.now() - (state.lastSaveTime || Date.now());
  const hours = Math.min(elapsed / 3600000, OFFLINE_MAX_HOURS);
  if (hours < 0.01) return null;
  const hero = getActiveHero(state);
  const map = getCurrentMap(hero);
  const avgLevel = (map.levelMin + map.levelMax) / 2;
  const dps = calcDPS(hero);
  const killTime = (28 + avgLevel * 22) / Math.max(dps, 1);
  const eff = offlineEfficiency(hours);
  const kills = Math.floor((hours * 3600 * eff) / Math.max(killTime, 0.4));
  const msExp = Math.floor(18 + avgLevel * 11);
  const msGold = Math.floor(5 + avgLevel * 3);
  const rewards = {
    hours: Math.floor(hours * 10) / 10,
    exp: Math.floor(kills * msExp),
    gold: Math.floor(kills * msGold),
    items: [],
    kills, eff: Math.round(eff * 100),
  };
  const itemCount = Math.min(40, Math.floor(kills * 0.06 * 0.5));
  for (let i = 0; i < itemCount; i++) rewards.items.push(generateLoot(avgLevel));
  return rewards;
}

export function claimOfflineRewards(state, rewards) {
  const hero = getActiveHero(state);
  hero.exp += rewards.exp;
  state.gold += rewards.gold;
  levelUpHero(hero);
  for (const item of rewards.items) addLoot(state, item);
  state.offlineClaimed = true;
  state.lastSaveTime = Date.now();
}

export function onBossKill(state, bossId) {
  if (state.bossesKilled[bossId]) {
    const loot = generateLoot(BOSSES[bossId].level, null, 'actBoss');
    addLoot(state, loot);
    return { loot, repeat: true };
  }
  state.bossesKilled[bossId] = true;
  const boss = BOSSES[bossId];
  const reward = boss.firstKillReward || {};
  const unlocked = [];
  for (const id of reward.unlockChars || []) {
    if (!state.unlockedChars.includes(id)) {
      state.unlockedChars.push(id);
      state.heroes[id] = createHero(id, Math.max(1, getActiveHero(state).level - 4));
      unlocked.push(id);
    }
  }
  const loot = generateLoot(boss.level, 'legendary', 'actBoss');
  addLoot(state, loot);
  return { unlockChars: unlocked, loot };
}

export function getUnlockProgress(state) {
  return {
    visna: state.bossesKilled.visna,
    duriel: state.bossesKilled.duriel,
    council: state.bossesKilled.council,
    diablo: state.bossesKilled.diablo,
  };
}

export { MAPS, BOSSES, SKILLS, CHARACTERS, QUALITY, SETS, MORPHS, SLOTS };
