const SAVE_KEY = 'shadow-era-save-v11';
const OFFLINE_MAX_HOURS = 12;
const KILLS_FOR_BOSS = 180;
const INV_CAP = 24;
const BAG_EXPAND_SLOTS = 8;
const BAG_EXPAND_MAX = 24;

const Q_RANK = { normal: 0, magic: 1, rare: 2, set: 3, unique: 4, legendary: 5, ancient: 6, ancientSet: 6, ancientUnique: 6 };

function isAncientItem(itemOrQ) {
  const q = itemOrQ && typeof itemOrQ === 'object' ? itemOrQ.quality : itemOrQ;
  return q === 'ancient' || q === 'ancientSet' || q === 'ancientUnique';
}

function isUniqueItem(itemOrQ) {
  const q = itemOrQ && typeof itemOrQ === 'object' ? itemOrQ.quality : itemOrQ;
  return q === 'unique' || q === 'ancientUnique';
}

function usesNamedAffixBands(itemOrQ) {
  const q = itemOrQ && typeof itemOrQ === 'object' ? itemOrQ.quality : itemOrQ;
  return q === 'unique' || q === 'ancientUnique' || q === 'set' || q === 'ancientSet' || q === 'ancient';
}

function defaultHeroEcon(starter = false) {
  return {
    gold: starter ? 800 : 0,
    inventory: [],
    bagExpands: 0,
    mats: { metal: 0, cloth: 0, crystal: 0 },
    hpPotions: starter ? 8 : 0,
    manaPotions: starter ? 6 : 0,
    potionTier: 1,
    hpPotionTier: 1,
    manaPotionTier: 1,
    potionAuto: { buyHp: true, buyMana: true, useHp: true, useMana: true, keepHp: 20, keepMana: 16 },
  };
}

function ensureHeroEconomy(hero, starter = false) {
  if (!hero) return hero;
  const d = defaultHeroEcon(starter);
  if (hero.gold == null) hero.gold = d.gold;
  if (!Array.isArray(hero.inventory)) hero.inventory = [];
  if (hero.bagExpands == null) hero.bagExpands = 0;
  if (!hero.mats) hero.mats = { metal: 0, cloth: 0, crystal: 0 };
  if (hero.mats.metal == null) hero.mats.metal = 0;
  if (hero.mats.cloth == null) hero.mats.cloth = 0;
  if (hero.mats.crystal == null) hero.mats.crystal = 0;
  if (hero.hpPotions == null) hero.hpPotions = d.hpPotions;
  if (hero.manaPotions == null) hero.manaPotions = d.manaPotions;
  if (!hero.potionTier) hero.potionTier = 1;
  if (hero.hpPotionTier == null) hero.hpPotionTier = hero.potionTier || 1;
  if (hero.manaPotionTier == null) hero.manaPotionTier = hero.potionTier || 1;
  const a = hero.potionAuto || {};
  hero.potionAuto = {
    buyHp: a.buyHp !== false,
    buyMana: a.buyMana !== false,
    useHp: a.useHp !== false,
    useMana: a.useMana !== false,
    keepHp: a.keepHp || 20,
    keepMana: a.keepMana || 16,
  };
  return hero;
}

const HERO_ECON_KEYS = ['gold', 'inventory', 'bagExpands', 'mats', 'hpPotions', 'manaPotions', 'potionTier', 'hpPotionTier', 'manaPotionTier', 'potionAuto'];
const ECON_BOUND = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

function bindHeroEconomy(state) {
  if (!state) return state;
  for (const k of HERO_ECON_KEYS) {
    const desc = Object.getOwnPropertyDescriptor(state, k);
    if (desc && desc.configurable !== false) {
      try { delete state[k]; } catch (_) { /* keep */ }
    }
  }
  for (const k of HERO_ECON_KEYS) {
    Object.defineProperty(state, k, {
      configurable: true,
      enumerable: false,
      get() {
        const h = getActiveHero(this);
        return h ? h[k] : undefined;
      },
      set(v) {
        const h = getActiveHero(this);
        if (h) h[k] = v;
      },
    });
  }
  if (ECON_BOUND) ECON_BOUND.add(state);
  return state;
}

function migrateHeroEconomy(state) {
  const goldDesc = Object.getOwnPropertyDescriptor(state, 'gold');
  const shared = !!(goldDesc && Object.prototype.hasOwnProperty.call(goldDesc, 'value'));
  const active = getActiveHero(state);
  for (const h of Object.values(state.heroes || {})) {
    if (shared && h === active) {
      if (typeof state.potions === 'number' && state.hpPotions == null) state.hpPotions = state.potions;
      if (state.gold != null) h.gold = state.gold;
      if (Array.isArray(state.inventory)) h.inventory = state.inventory;
      if (state.bagExpands != null) h.bagExpands = state.bagExpands;
      if (state.mats) h.mats = state.mats;
      if (state.hpPotions != null) h.hpPotions = state.hpPotions;
      if (state.manaPotions != null) h.manaPotions = state.manaPotions;
      if (state.potionTier != null) h.potionTier = state.potionTier;
      if (state.hpPotionTier != null) h.hpPotionTier = state.hpPotionTier;
      if (state.manaPotionTier != null) h.manaPotionTier = state.manaPotionTier;
      if (state.potionAuto) h.potionAuto = state.potionAuto;
    }
    ensureHeroEconomy(h, false);
  }
  bindHeroEconomy(state);
  return state;
}

function createNewGame() {
  const state = {
    unlockedChars: ['berserker'],
    activeCharId: 'berserker',
    heroes: {
      berserker: createHero('berserker'),
    },
    bossesKilled: {},
    lastSaveTime: Date.now(),
    offlineClaimed: false,
    autoSell: {
      enabled: true,
      maxQuality: 'magic',
      keepBetter: true,
      minKeepLevel: 0,
      action: 'sell',
    },
    junkQuality: 'magic',
    invFilter: 'all',
    invSort: { rarity: true, ilvl: true, score: true },
    shards: 0,
    mapKills: {},
    mapsEntered: { wasteland: true },
    autoNextMap: true,
    diffId: 'normal',
    diffCleared: {},
    bossesEver: {},
    diffProgressV1: true,
    heroMapProgressV1: true,
    heroMapProgressV2: true,
    town: createTownState(),
  };
  ensureDiffProgress(state);
  bindHeroEconomy(state);
  return state;
}

function createTownState() {
  return {
    unlocked: false,
    warehouse: [],
    warehouseCap: WAREHOUSE_BASE_CAP,
    hallLevel: 1,
  };
}

function createHero(charId, level = 1, equipment = {}) {
  const lv = 1;
  const hero = {
    charId, level: lv, exp: 0,
    skillPoints: 2,
    skillLevels: seedSkills(charId, lv),
    equippedSkills: [...(DEFAULT_SKILLS[charId] || [])],
    skillPriorities: [...(DEFAULT_SKILLS[charId] || [])],
    skillEnabled: {},
    equipment: {},
    currentMap: 'wasteland',
    holdMap: false,
    diffProgress: {},
    currentHp: null,
    kills: 0, combo: 0, deaths: 0,
    isDead: false, respawnTimer: 0,
    train: { unlocked: {}, lv: {} },
  };
  for (const slot of SLOTS) {
    if (equipment[slot]) hero.equipment[slot] = equipment[slot];
  }
  if (!hero.equipment.weapon) hero.equipment.weapon = createStarterWeapon(charId);
  ensureHeroEconomy(hero, true);
  hero.currentHp = calcHeroStats(hero).maxHp;
  clampHeroResource(hero);
  return hero;
}

function seedSkills(charId, _level = 1) {
  const levels = {};
  const grant = (skillId) => {
    const skill = SKILLS[charId]?.[skillId];
    if (!skill) return;
    if (skill.prereq) grant(skill.prereq);
    if ((levels[skillId] || 0) < 1) levels[skillId] = 1;
  };
  for (const id of DEFAULT_SKILLS[charId] || []) grant(id);
  return levels;
}

function ensureDefaultSkills(hero) {
  if (!hero) return;
  hero.skillLevels = hero.skillLevels || {};
  const seeded = seedSkills(hero.charId, hero.level);
  for (const [id, lv] of Object.entries(seeded)) {
    if ((hero.skillLevels[id] || 0) < lv) hero.skillLevels[id] = lv;
  }
}

function grantedSkillIds(hero) {
  const ids = new Set();
  if (typeof getSetStatus !== 'function') return ids;
  const reduce = typeof equipmentSetReduce === 'function' ? equipmentSetReduce(hero.equipment || {}) : 0;
  for (const s of getSetStatus(hero.equipment || {})) {
    for (const [n, bonus] of setBonusEntries(s.def)) {
      const on = typeof setBonusActive === 'function'
        ? setBonusActive(s.count, n, reduce)
        : s.count >= parseInt(n, 10);
      if (on && bonus.skillGrant) {
        Object.keys(bonus.skillGrant).forEach(id => ids.add(id));
      }
    }
  }
  return ids;
}

function ensureEquippedSkillLevels(hero) {
  if (!hero) return;
  hero.skillLevels = hero.skillLevels || {};
  hero.skillEnabled = hero.skillEnabled || {};
  ensureDefaultSkills(hero);
  const tree = SKILLS[hero.charId] || {};
  const defaults = DEFAULT_SKILLS[hero.charId] || [];
  const grants = grantedSkillIds(hero);
  const known = (id) => (hero.skillLevels[id] || 0) >= 1 || grants.has(id);
  const barOk = (id) => {
    const sk = tree[id];
    return sk && sk.type === 'active' && sk.tree !== 'warcry' && known(id);
  };
  const extra = (hero.equippedSkills || []).filter(id => !defaults.includes(id) && barOk(id));
  const auto = Object.keys(tree).filter(id => barOk(id) && typeof isCoreCombatSkill === 'function' && isCoreCombatSkill(tree[id]));
  const merged = [];
  const seen = new Set();
  for (const id of [...defaults.filter(known), ...auto, ...extra]) {
    if (seen.has(id) || !tree[id]) continue;
    seen.add(id);
    merged.push(id);
  }
  hero.equippedSkills = merged;
  if (!hero.skillPriorities?.length) hero.skillPriorities = [...hero.equippedSkills];
  else {
    const rest = hero.skillPriorities.filter(id => !defaults.includes(id) && known(id));
    hero.skillPriorities = [...defaults.filter(known), ...rest];
  }
  ensureAuraPicks(hero);
}

function ensureAuraPicks(hero) {
  const tree = SKILLS[hero.charId] || {};
  const slots = new Set(Object.values(tree).map(s => s.auraSlot).filter(Boolean));
  if (!slots.size) return;
  hero.auraPick = hero.auraPick || {};
  hero.skillEnabled = hero.skillEnabled || {};
  const prefer = ['fanaticism', 'concentration', 'holyShock', 'might', 'holyFire', 'salvation', 'defiance', 'vigor', 'resistFire'];
  for (const slot of slots) {
    const ids = auraSlotSkills(hero, slot);
    if (!ids.length) continue;
    if (!hero.auraPick[slot] || !ids.includes(hero.auraPick[slot])) {
      hero.auraPick[slot] = prefer.find(id => ids.includes(id)) || ids[ids.length - 1];
    }
    for (const id of ids) {
      hero.skillEnabled[id] = id === hero.auraPick[slot];
    }
  }
}

function grantSkillWithPrereqs(hero, skillId) {
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill) return;
  if (skill.prereq) grantSkillWithPrereqs(hero, skill.prereq);
  if ((hero.level || 1) < (skill.reqLevel || 1)) return;
  if ((hero.skillLevels[skillId] || 0) < 1) hero.skillLevels[skillId] = 1;
}

function skillLearnCost(hero, skillId) {
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill) return { gold: 0 };
  const cur = hero.skillLevels?.[skillId] || 0;
  const next = cur + 1;
  const req = skill.reqLevel || 1;
  const unlock = cur === 0;
  const gold = Math.floor(16 * next * next * (0.5 + req * 0.055) * (unlock ? 1.65 : 1));
  const scale = (0.7 + req * 0.045) * next;
  let crystal = 0;
  let metal = 0;
  let cloth = 0;
  if (next >= 2) metal = Math.max(1, Math.ceil(2.4 * scale));
  if (next >= 3) cloth = Math.max(1, Math.ceil(1.8 * scale));
  if (next >= 4) crystal = Math.max(1, Math.ceil(0.7 * scale));
  if (unlock && req >= 12) crystal += req >= 24 ? 3 : req >= 18 ? 2 : 1;
  if (next >= 7) {
    metal += next * 2 - 8;
    cloth += next - 4;
  }
  if (next >= 9) crystal += 2;
  return { gold, crystal, metal, cloth };
}

function canLearnSkill(hero, skillId, state) {
  const skill = SKILLS[hero.charId]?.[skillId];
  if (!skill) return { ok: false, reason: '未知技能' };
  const current = hero.skillLevels[skillId] || 0;
  if ((hero.skillPoints || 0) <= 0) return { ok: false, reason: '没有技能点' };
  if (current >= skill.maxLevel) return { ok: false, reason: '已满级' };
  if (skill.prereq && !(hero.skillLevels[skill.prereq] > 0)) {
    const pre = SKILLS[hero.charId][skill.prereq];
    return { ok: false, reason: `需要 ${pre?.name || skill.prereq}` };
  }
  if ((hero.level || 1) < (skill.reqLevel || 1)) {
    return { ok: false, reason: `需要角色 ${skill.reqLevel} 级` };
  }
  const cost = skillLearnCost(hero, skillId);
  if (state) {
    const why = canPayCost(state, cost);
    if (why) return { ok: false, reason: why, cost };
  }
  return { ok: true, cost };
}

function createStarterWeapon(charId) {
  const classes = CHARACTERS[charId]?.weaponClasses || ['melee'];
  const pool = BASE_ITEMS.weapon || [];
  const classed = pool.filter(b => b.reqClass === charId);
  const generic = pool.filter(b => !b.reqClass && classes.includes(b.weaponClass));
  const pick = (list) => list.slice().sort((a, b) => (a.baseDamage || 0) - (b.baseDamage || 0))[0];
  const base = pick(classed) || pick(generic) || pool.find(b => classes.includes(b.weaponClass)) || pool[0];
  const item = {
    uid: uid(),
    name: base.name,
    slot: 'weapon',
    quality: 'normal',
    locked: false,
    affixes: [],
    itemLevel: 1,
    reqLevel: 1,
  };
  if (base.baseDamage) item.listedDamage = base.baseDamage;
  if (base.weaponClass) item.weaponClass = base.weaponClass;
  if (base.icon) item.icon = base.icon;
  if (base.reqClass) item.reqClass = base.reqClass;
  refreshItemBases(item);
  return item;
}

function createNamedItem(id) {
  const def = [...UNIQUE_ITEMS, ...LEGENDARY_ITEMS].find(i => i.id === id);
  if (!def) return null;
  const item = cloneItem(def);
  item.itemLevel = 8;
  item.reqLevel = 1;
  return rollItemAffixes(item, 8);
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function cloneItem(def) {
  return {
    ...def,
    uid: uid(),
    locked: false,
    affixes: (def.affixes || []).map(a => ({ ...a })),
    exclusiveAffix: def.exclusiveAffix ? { ...def.exclusiveAffix } : undefined,
  };
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewGame();
    const state = JSON.parse(raw);
    state.lastSaveTime = state.lastSaveTime || Date.now();
    if (!state.autoSell) {
      state.autoSell = { enabled: true, maxQuality: 'magic', keepBetter: true, minKeepLevel: 0 };
    }
    if (state.autoSell.minKeepLevel == null) state.autoSell.minKeepLevel = 0;
    if (!state.autoSell.action) state.autoSell.action = 'sell';
    if (state.autoSell.maxQuality === 'legendary' || state.autoSell.maxQuality === 'set') {
      state.autoSell.maxQuality = 'magic';
    }
    if (!state.junkQuality || state.junkQuality === 'ancient' || state.junkQuality === 'ancientSet' || state.junkQuality === 'ancientUnique') {
      state.junkQuality = 'magic';
    }
    if (state.bagExpands == null && !state.heroes?.[state.activeCharId]?.inventory) state.bagExpands = 0;
    state.invSort = normalizeInvSort(state.invSort);
    if (state.invFilter === 'set' || state.invFilter === 'rare') state.invFilter = 'all';
    if (!state.mapKills) state.mapKills = {};
    if (!state.bossesKilled) state.bossesKilled = {};
    if (state.autoNextMap == null) state.autoNextMap = true;
    ensureDiffProgress(state);
    migrateHeroCampaigns(state);
    ensureWorldDiff(state);
    ensureDiffProgress(state);
    syncCampaignAlias(state);
    if (!state.mapsEntered) state.mapsEntered = { wasteland: true };
    for (const h of Object.values(state.heroes || {})) {
      const camp = campaignOf(state, h);
      if (camp.bossesKilled?.visna) grantActClears(state, 1, h);
      if (camp.bossesKilled?.duriel) grantActClears(state, 2, h);
      if (camp.bossesKilled?.council) grantActClears(state, 3, h);
      if (camp.bossesKilled?.baal) grantActClears(state, 5, h);
    }
    if (!state.skillEnableResetV1) {
      state.skillEnableResetV1 = true;
      for (const h of Object.values(state.heroes || {})) {
        h.skillEnabled = {};
      }
    }
    for (const h of Object.values(state.heroes || {})) {
      ensureTrain(h);
      if ((h.whetstone || 0) > 0) {
        const lv = Math.min(10, Math.round((h.whetstone || 0) / 0.02));
        h.train.unlocked.attackSpeed = true;
        h.train.lv.attackSpeed = Math.max(h.train.lv.attackSpeed || 0, lv);
        h.whetstone = 0;
      }
      if (h.currentMap === 'rift') {
        ensureRiftHero(h);
        if (!riftUnlocked(state, h)) h.currentMap = 'wasteland';
      } else {
        if (h.currentMap && !MAPS.some(m => m.id === h.currentMap)) h.currentMap = 'wasteland';
        const cm = getMap(h.currentMap);
        if (cm && !mapUnlocked(state, cm, h)) h.currentMap = 'wasteland';
      }
      ensureRiftHero(h);
      for (const it of Object.values(h.equipment || {})) {
        syncNamedItemPower(it);
        ensureItemAffixes(it, h.level || 1);
      }
      ensureEquippedSkillLevels(h);
      clampHeroResource(h);
    }
    migrateHeroEconomy(state);
    if ((state.shards || 0) > 0) {
      const mats = ensureMats(state);
      mats.metal += state.shards;
      state.shards = 0;
    }
    ensurePotionState(state);
    ensureTown(state);
    if (isMapCleared(state, TOWN_UNLOCK_MAP)) state.town.unlocked = true;
    tryUnlockClasses(state);
    for (const h of Object.values(state.heroes || {})) {
      for (const it of h.inventory || []) {
        syncNamedItemPower(it);
        ensureItemAffixes(it, h.level || 1);
      }
    }
    for (const it of state.town.warehouse || []) {
      syncNamedItemPower(it);
      ensureItemAffixes(it, 1);
    }
    return state;
  } catch {
    return createNewGame();
  }
}

function inferWeaponClass(item) {
  if (!item || item.slot !== 'weapon') return null;
  if (item.weaponClass) return item.weaponClass;
  const n = item.name || '';
  if (/弓|弩/.test(n)) return 'bow';
  if (/标枪|投枪/.test(n)) return 'javelin';
  if (/权杖/.test(n)) return 'melee';
  if (/杖|珠|图腾|法器|魔杖/.test(n)) return 'caster';
  if (/爪|拳刃/.test(n)) return 'claw';
  return 'melee';
}

function skillWeaponReady(hero, skill) {
  const need = skill?.reqWeapon;
  if (!need) return { ok: true };
  const have = inferWeaponClass(hero.equipment?.weapon);
  if (have === need) return { ok: true };
  if (need === 'melee' && (have === 'melee' || have === 'claw')) return { ok: true };
  return { ok: false, need, label: WEAPON_CLASS_NAMES[need] || need };
}

let savePaused = false;

function saveGame(state) {
  if (savePaused || !state) return;
  state.lastSaveTime = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function resetSave() {
  savePaused = true;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('shadow-era-save')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  try { sessionStorage.removeItem(SAVE_KEY); } catch {}
  localStorage.setItem(SAVE_KEY, JSON.stringify(createNewGame()));
}

function getActiveHero(state) {
  return state.heroes[state.activeCharId] || state.heroes.berserker || Object.values(state.heroes || {})[0];
}

function emptyDiffProgress() {
  return { mapKills: {}, bossesKilled: {}, mapsEntered: { wasteland: true }, lastMaps: {} };
}

function cloneDiffProgress(p) {
  return {
    mapKills: { ...(p?.mapKills || {}) },
    bossesKilled: { ...(p?.bossesKilled || {}) },
    mapsEntered: { ...(p?.mapsEntered || { wasteland: true }) },
    lastMaps: { ...(p?.lastMaps || {}) },
  };
}

function campaignOf(state, hero) {
  ensureWorldDiff(state);
  const did = getDiffById(state.diffId).id;
  const h = hero || getActiveHero(state);
  if (!h) return emptyDiffProgress();
  h.diffProgress = h.diffProgress || {};
  if (!h.diffProgress[did]) h.diffProgress[did] = emptyDiffProgress();
  const p = h.diffProgress[did];
  p.mapKills = p.mapKills || {};
  p.bossesKilled = p.bossesKilled || {};
  p.mapsEntered = p.mapsEntered || { wasteland: true };
  if (!p.mapsEntered.wasteland) p.mapsEntered.wasteland = true;
  return p;
}

function pickCampaignKeeper(state) {
  let best = null;
  let bestScore = -1;
  for (const h of Object.values(state.heroes || {})) {
    if (!h) continue;
    const score = (h.level || 1) * 1e12 + (h.kills || 0) * 1e6 + (h.exp || 0)
      + (h.charId === state.activeCharId ? 1 : 0);
    if (!best || score > bestScore) {
      best = h;
      bestScore = score;
    }
  }
  return best;
}

function resetHeroMapProgress(h) {
  if (!h) return;
  h.diffProgress = {};
  h.currentMap = 'wasteland';
  h.holdMap = false;
  h.riftFloor = 1;
  h.riftProgress = 0;
  h.riftBest = 0;
  h.riftBossReady = false;
}

function migrateHeroCampaigns(state) {
  if (!state || state.heroMapProgressV2) return;
  state.heroMapProgressV2 = true;
  state.heroMapProgressV1 = true;
  ensureDiffProgress(state);
  const keeper = pickCampaignKeeper(state);
  for (const h of Object.values(state.heroes || {})) {
    h.diffProgress = h.diffProgress || {};
    if (h === keeper) {
      for (const [did, p] of Object.entries(state.diffProgress || {})) {
        const own = h.diffProgress[did];
        const ownHas = own && (Object.keys(own.bossesKilled || {}).length || Object.keys(own.mapKills || {}).length);
        if (!ownHas) h.diffProgress[did] = cloneDiffProgress(p);
      }
      continue;
    }
    resetHeroMapProgress(h);
  }
}

function syncCampaignAlias(state, hero) {
  const p = campaignOf(state, hero || getActiveHero(state));
  state.mapKills = p.mapKills;
  state.bossesKilled = p.bossesKilled;
  state.mapsEntered = p.mapsEntered;
}

function snapshotHeroMaps(state) {
  const id = getDiffById(state.diffId).id;
  const acc = state.diffProgress[id] || (state.diffProgress[id] = emptyDiffProgress());
  acc.lastMaps = acc.lastMaps || {};
  for (const h of Object.values(state.heroes || {})) {
    if (!h?.charId) continue;
    const camp = campaignOf(state, h);
    camp.lastMap = h.currentMap || 'wasteland';
    acc.lastMaps[h.charId] = camp.lastMap;
  }
}

function restoreHeroMaps(state) {
  const id = getDiffById(state.diffId).id;
  const accLast = (state.diffProgress[id] || emptyDiffProgress()).lastMaps || {};
  for (const h of Object.values(state.heroes || {})) {
    const camp = campaignOf(state, h);
    const want = camp.lastMap || accLast[h.charId] || 'wasteland';
    if (want === 'rift') {
      h.currentMap = riftUnlocked(state, h) ? 'rift' : 'wasteland';
    } else {
      const m = getMap(want);
      h.currentMap = (m && mapUnlocked(state, m, h)) ? want : 'wasteland';
    }
    camp.lastMap = h.currentMap;
    const cur = getMap(h.currentMap);
    if (!cur || cur.isRift || !mapCampaignDone(state, cur, h)) h.holdMap = false;
  }
}

function ensureDiffProgress(state) {
  if (!state) return state;
  state.diffProgress = state.diffProgress || {};
  state.bossesEver = state.bossesEver || {};
  state.diffCleared = state.diffCleared || {};
  if (!state.diffProgressV1) {
    state.diffProgressV1 = true;
    const snap = cloneDiffProgress({
      mapKills: state.mapKills,
      bossesKilled: state.bossesKilled,
      mapsEntered: state.mapsEntered,
      lastMaps: {},
    });
    for (const h of Object.values(state.heroes || {})) {
      if (h?.charId) snap.lastMaps[h.charId] = h.currentMap || 'wasteland';
    }
    const cur = getDiffById(state.diffId).id;
    state.diffProgress[cur] = cloneDiffProgress(snap);
    if (cur !== 'normal') state.diffProgress.normal = cloneDiffProgress(snap);
    for (const [bid, v] of Object.entries(snap.bossesKilled || {})) {
      if (v) state.bossesEver[bid] = true;
    }
  }
  for (const [did, p] of Object.entries(state.diffProgress)) {
    if (p?.bossesKilled?.baal) state.diffCleared[did] = true;
  }
  if (state.bossesEver.baal) state.diffCleared.normal = true;
  const id = getDiffById(state.diffId).id;
  if (!state.diffProgress[id]) state.diffProgress[id] = emptyDiffProgress();
  const p = state.diffProgress[id];
  p.mapKills = p.mapKills || {};
  p.bossesKilled = p.bossesKilled || {};
  p.mapsEntered = p.mapsEntered || { wasteland: true };
  if (!p.mapsEntered.wasteland) p.mapsEntered.wasteland = true;
  p.lastMaps = p.lastMaps || {};
  state.mapKills = p.mapKills;
  state.bossesKilled = p.bossesKilled;
  state.mapsEntered = p.mapsEntered;
  syncCampaignAlias(state);
  return state;
}

function ensureWorldDiff(state) {
  if (!state) return null;
  const d = getDiffById(state.diffId);
  state.diffId = d.id;
  state.diffCleared = state.diffCleared || {};
  if (state.bossesEver?.baal) state.diffCleared.normal = true;
  if (!diffUnlocked(state, state.diffId)) state.diffId = 'normal';
  return getDiffById(state.diffId);
}

function getWorldDiff(state) {
  return ensureWorldDiff(state) || WORLD_DIFFS[0];
}

function worldMonsterMult(state) {
  return getWorldDiff(state).monsterMult || 1;
}

function diffUnlocked(state, id) {
  const d = getDiffById(id);
  if (!d || d.tier <= 0) return true;
  const prev = WORLD_DIFFS.find(x => x.tier === d.tier - 1);
  return !!(prev && state?.diffCleared?.[prev.id]);
}

function nextWorldDiff(id) {
  const cur = getDiffById(id);
  return WORLD_DIFFS.find(d => d.tier === cur.tier + 1) || null;
}

function markDiffCleared(state, id) {
  ensureWorldDiff(state);
  const d = getDiffById(id);
  const already = !!state.diffCleared[d.id];
  state.diffCleared[d.id] = true;
  if (already) return null;
  return nextWorldDiff(d.id);
}

function setWorldDiff(state, id) {
  ensureDiffProgress(state);
  ensureWorldDiff(state);
  const d = getDiffById(id);
  if (!diffUnlocked(state, d.id)) {
    const prev = WORLD_DIFFS.find(x => x.tier === d.tier - 1);
    return { ok: false, reason: `击败${prev?.name || '上一'}难度的巴尔后解锁${d.name}` };
  }
  if (state.diffId === d.id) return { ok: true, same: true, diff: d };
  snapshotHeroMaps(state);
  state.diffId = d.id;
  ensureDiffProgress(state);
  restoreHeroMaps(state);
  syncCampaignAlias(state);
  return { ok: true, diff: d };
}

function stampLootDiff(item, state) {
  if (!item || !state) return item;
  item.diffId = getWorldDiff(state).id;
  return item;
}

function ensureRiftHero(hero) {
  if (!hero) return hero;
  if (!hero.riftFloor || hero.riftFloor < 1) hero.riftFloor = 1;
  if (hero.riftProgress == null || hero.riftProgress < 0) hero.riftProgress = 0;
  if (hero.riftBest == null) hero.riftBest = 0;
  if (hero.riftBossReady == null) hero.riftBossReady = false;
  return hero;
}

function riftDifficultyMult(floor) {
  return 1 + Math.max(0, (Math.max(1, floor || 1) - 1) * 0.02);
}

function riftHighestOpen(hero) {
  ensureRiftHero(hero);
  return Math.max(1, (hero.riftBest || 0) + 1);
}

function shiftRiftFloor(hero, dir) {
  ensureRiftHero(hero);
  const max = riftHighestOpen(hero);
  const next = Math.max(1, Math.min(max, (hero.riftFloor || 1) + (dir || 0)));
  if (next === hero.riftFloor) return false;
  hero.riftFloor = next;
  hero.riftProgress = 0;
  hero.riftBossReady = false;
  return true;
}

function getCurrentMap(hero, state) {
  let map;
  if (hero?.currentMap === 'rift') {
    ensureRiftHero(hero);
    map = makeRiftMap(hero.riftFloor);
  } else {
    map = getMap(hero?.currentMap);
  }
  return state ? withDiffLevels(map, state) : map;
}

function tryAutoNextMap(state, hero) {
  if (!state || state.autoNextMap === false || !hero) return null;
  if (hero.holdMap) return null;
  if (hero.currentMap === 'rift') return null;
  const map = getMap(hero.currentMap);
  if (!map || map.isRift) return null;
  const p = mapClearProgress(state, map, hero);
  if (!p.ready) return null;
  if (map.isBoss && !campaignOf(state, hero).bossesKilled?.[map.bossId]) return null;
  const idx = MAPS.findIndex(m => m.id === map.id);
  for (let i = idx + 1; i < MAPS.length; i++) {
    const n = MAPS[i];
    if (!mapUnlocked(state, n, hero)) continue;
    if (n.id === hero.currentMap) return null;
    hero.currentMap = n.id;
    campaignOf(state, hero).mapsEntered[n.id] = true;
    campaignOf(state, hero).lastMap = n.id;
    return n;
  }
  return null;
}

function idleKillInterval(hero, map) {
  const avgLevel = ((map?.levelMin || 1) + (map?.levelMax || 1)) / 2;
  const dps = Math.max(1, calcDPS(hero));
  return Math.max(0.35, (28 + avgLevel * 22) / dps);
}

function applyOneIdleKill(state, hero, map) {
  const avg = ((map.levelMin || 1) + (map.levelMax || 1)) / 2;
  grantKillExp(hero, Math.floor(18 + avg * 11), avg);
  levelUpHero(hero);
  hero.gold = (hero.gold || 0) + Math.floor(5 + avg * 3);
  hero.kills = (hero.kills || 0) + 1;
  if (Math.random() < 0.018) {
    addLoot(state, generateLoot(avg, null, 'normal', hero.charId, state), hero);
  }
  if (hero.currentMap === 'rift' || map.isRift) {
    ensureRiftHero(hero);
    if (!hero.riftBossReady) {
      hero.riftProgress = (hero.riftProgress || 0) + 1;
      const need = riftProgressNeed(hero.riftFloor);
      if (hero.riftProgress >= need) {
        hero.riftProgress = need;
        hero.riftBossReady = true;
      }
    }
    return;
  }
  state.mapKills = state.mapKills || {};
  const camp = campaignOf(state, hero);
  const need = mapProgressNeed(map);
  const have = camp.mapKills[hero.currentMap] || 0;
  if (have < need) camp.mapKills[hero.currentMap] = have + 1;
  maybeUnlockTown(state);
  tryAutoNextMap(state, hero);
}

function applyIdleHero(state, hero, dt, opts = {}) {
  if (!state || !hero || dt <= 0) return;
  if (!opts.includeActive && hero.charId === state.activeCharId) return;
  if (hero.isDead) {
    hero.respawnTimer = (hero.respawnTimer || 0) - dt;
    if (hero.respawnTimer <= 0) {
      hero.isDead = false;
      hero.currentHp = calcHeroStats(hero).maxHp;
      clampHeroResource(hero);
    }
    return;
  }
  ensureHeroEconomy(hero, false);
  let guard = 0;
  const maxKills = 200000;
  hero._idleAcc = (hero._idleAcc || 0) + dt;
  while (guard++ < maxKills) {
    const map = getCurrentMap(hero, state);
    if (!map) return;
    if (map.isBoss && map.bossId && !campaignOf(state, hero).bossesKilled?.[map.bossId] && isChapterBossReady(state, map, hero)) return;
    if ((hero.currentMap === 'rift' || map.isRift) && hero.riftBossReady) return;
    const interval = idleKillInterval(hero, map);
    if (hero._idleAcc < interval) return;
    hero._idleAcc -= interval;
    const mapId = hero.currentMap;
    applyOneIdleKill(state, hero, map);
    if (hero.currentMap !== mapId) continue;
  }
}

function tickIdleHeroes(state, dt, opts) {
  for (const h of Object.values(state.heroes || {})) applyIdleHero(state, h, dt, opts);
}

function actOrdinalName(n) {
  return ['', '一', '二', '三', '四', '五'][n] || String(n);
}

function classUnlockHint(charId) {
  const u = (typeof CLASS_UNLOCKS !== 'undefined' ? CLASS_UNLOCKS : []).find(x => x.charId === charId);
  if (!u) return '初始职业';
  const d = WORLD_DIFFS.find(x => x.id === u.diffId);
  const boss = typeof BOSSES !== 'undefined' ? BOSSES[u.bossId] : null;
  const bossName = boss?.name || '章节首领';
  return `${d?.name || ''}难度 · 击败${bossName}（第${actOrdinalName(u.act)}章）`;
}

function isClassUnlockDone(state, u) {
  return !!(state.diffProgress?.[u.diffId]?.bossesKilled?.[u.bossId]);
}

function tryUnlockClasses(state) {
  const unlocked = [];
  if (!state) return unlocked;
  ensureDiffProgress(state);
  state.unlockedChars = state.unlockedChars || [];
  state.heroes = state.heroes || {};
  for (const u of CLASS_UNLOCKS || []) {
    if (state.unlockedChars.includes(u.charId)) continue;
    if (!isClassUnlockDone(state, u)) continue;
    state.unlockedChars.push(u.charId);
    if (!state.heroes[u.charId]) state.heroes[u.charId] = createHero(u.charId);
    unlocked.push(u.charId);
  }
  return unlocked;
}

function mapClearProgress(state, map, hero) {
  hero = hero || getActiveHero(state);
  if (map?.isRift) {
    ensureRiftHero(hero);
    const need = riftProgressNeed(hero.riftFloor);
    const have = hero.riftBossReady ? need : Math.min(need, hero.riftProgress || 0);
    return { have, need, pct: Math.min(100, Math.floor((have / Math.max(1, need)) * 100)), ready: !!hero.riftBossReady };
  }
  const have = campaignOf(state, hero).mapKills?.[map.id] || 0;
  const need = mapProgressNeed(map);
  return { have, need, pct: Math.min(100, Math.floor((have / Math.max(1, need)) * 100)), ready: have >= need };
}

function onRiftBossKill(state, hero, monster) {
  ensureRiftHero(hero);
  const cleared = hero.riftFloor;
  hero.riftBest = Math.max(hero.riftBest || 0, cleared);
  hero.riftProgress = 0;
  hero.riftBossReady = false;
  const loot = [];
  const lv = monster?.level || 88;
  loot.push(generateLoot(lv, null, 'riftBoss', hero.charId, state));
  if (Math.random() < 0.45) loot.push(generateLoot(lv, null, 'riftBoss', hero.charId, state));
  if (Math.random() < 0.12) loot.push(generateLoot(lv, 'ancient', 'riftBoss', hero.charId, state));
  return { cleared, next: hero.riftFloor, unlocked: riftHighestOpen(hero), loot };
}

function grantActClears(state, act, hero) {
  const camp = campaignOf(state, hero || getActiveHero(state));
  for (const m of MAPS) {
    if (m.act === act) {
      camp.mapKills[m.id] = Math.max(camp.mapKills[m.id] || 0, mapProgressNeed(m));
    }
  }
}

function mapProgressNeed(map) {
  if (!map) return 140;
  if (map.isBoss) return map.bossKills || map.clearKills || 50;
  return map.clearKills || 140;
}

function riftUnlocked(state, hero) {
  return !!campaignOf(state, hero || getActiveHero(state)).bossesKilled?.diablo;
}

function mapUnlocked(state, map, hero) {
  if (!map) return false;
  hero = hero || getActiveHero(state);
  if (map.isRift || map.id === 'rift') return riftUnlocked(state, hero);
  const camp = campaignOf(state, hero);
  if (map.unlockBoss && !camp.bossesKilled[map.unlockBoss]) return false;
  if (map.unlockPrev) {
    const prev = MAPS.find(m => m.id === map.unlockPrev);
    if (prev && prev.act === map.act) {
      const need = mapProgressNeed(prev);
      if ((camp.mapKills?.[map.unlockPrev] || 0) < need) return false;
    }
  }
  return true;
}

function isMapCleared(state, mapId, hero) {
  const map = MAPS.find(m => m.id === mapId);
  if (!map) return false;
  if (hero) return mapCampaignDone(state, map, hero);
  return Object.values(state.heroes || {}).some(h => mapCampaignDone(state, map, h));
}

function mapCampaignDone(state, map, hero) {
  hero = hero || getActiveHero(state);
  if (!map || map.isRift || map.id === 'rift') return false;
  if (!mapUnlocked(state, map, hero)) return false;
  if (map.isBoss && map.bossId) return !!campaignOf(state, hero).bossesKilled?.[map.bossId];
  return mapClearProgress(state, map, hero).ready;
}

function ensureTown(state) {
  if (!state.town) state.town = createTownState();
  if (!Array.isArray(state.town.warehouse)) state.town.warehouse = [];
  if (state.town.warehouseCap == null) state.town.warehouseCap = WAREHOUSE_BASE_CAP;
  if (!state.town.hallLevel) state.town.hallLevel = 1;
  for (const it of state.town.warehouse) ensureItemAffixes(it, 1);
  return state.town;
}

function townUnlocked(state) {
  ensureTown(state);
  return !!state.town.unlocked;
}

function maybeUnlockTown(state) {
  ensureTown(state);
  if (state.town.unlocked) return false;
  if (!isMapCleared(state, TOWN_UNLOCK_MAP)) return false;
  state.town.unlocked = true;
  return true;
}

function getWarehouseCap(state) {
  return ensureTown(state).warehouseCap || WAREHOUSE_BASE_CAP;
}

function stashToWarehouse(state, uid) {
  ensureTown(state);
  if (!townUnlocked(state)) return { ok: false, reason: '据点未解锁' };
  if (state.town.warehouse.length >= getWarehouseCap(state)) {
    return { ok: false, reason: '仓库已满' };
  }
  const idx = state.inventory.findIndex(i => i.uid === uid);
  if (idx < 0) return { ok: false, reason: '不在背包中' };
  const item = state.inventory.splice(idx, 1)[0];
  state.town.warehouse.push(item);
  return { ok: true, item };
}

function withdrawFromWarehouse(state, uid) {
  ensureTown(state);
  if (state.inventory.length >= getInvCap(state)) return { ok: false, reason: '背包已满' };
  const idx = state.town.warehouse.findIndex(i => i.uid === uid);
  if (idx < 0) return { ok: false, reason: '不在仓库中' };
  const item = state.town.warehouse.splice(idx, 1)[0];
  state.inventory.push(item);
  return { ok: true, item };
}

function isChapterBossReady(state, map, hero) {
  if (!map?.isBoss || !map.bossId) return false;
  hero = hero || getActiveHero(state);
  return (campaignOf(state, hero).mapKills?.[map.id] || 0) >= mapProgressNeed(map);
}

function chapterBossAppearChance(state, map, pity = 0, hero) {
  hero = hero || getActiveHero(state);
  if (!isChapterBossReady(state, map, hero)) return 0;
  if (!campaignOf(state, hero).bossesKilled?.[map.bossId]) return 1;
  return Math.min(1, 0.1 + Math.max(0, pity) * 0.05);
}

function mapClearFactor(state, map, hero) {
  if (map?.isRift) return Math.min(1.5, 0.9 + Math.max(0, (map.riftFloor || 1) - 1) * 0.02);
  hero = hero || getActiveHero(state);
  const need = map.clearKills || 140;
  return (campaignOf(state, hero).mapKills?.[map.id] || 0) / need;
}

function mapUnlockHint(state, map, hero) {
  hero = hero || getActiveHero(state);
  if (map?.isRift || map?.id === 'rift') return '解锁世界之石要塞后开放';
  const camp = campaignOf(state, hero);
  if (map.unlockBoss && !camp.bossesKilled[map.unlockBoss]) {
    const b = BOSSES[map.unlockBoss];
    return `需击败 ${b?.name || map.unlockBoss}（第 ${map.act - 1} 章）`;
  }
  if (map.unlockPrev) {
    const prev = MAPS.find(m => m.id === map.unlockPrev);
    const p = mapClearProgress(state, prev, hero);
    return `${prev.name} ${Math.min(p.have, p.need)}/${p.need}`;
  }
  return '';
}

function rollQuality(kindBonus = 1) {
  const weights = QUALITY_WEIGHTS.map(q => {
    let w = q.weight;
    if (['unique', 'legendary', 'ancient', 'ancientSet', 'ancientUnique', 'set'].includes(q.quality)) w *= kindBonus;
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

function namedItemTemplate(item) {
  if (!item?.id) return null;
  return [...UNIQUE_ITEMS, ...LEGENDARY_ITEMS].find(d => d.id === item.id) || null;
}

function syncNamedItemPower(item) {
  if (!item) return item;
  const def = namedItemTemplate(item);
  if (!def) {
    delete item.morphId;
    delete item.morphSkill;
    delete item.itemPower;
    return item;
  }
  if (def.morphId) {
    item.morphId = def.morphId;
    item.morphSkill = def.morphSkill || null;
  } else {
    delete item.morphId;
    delete item.morphSkill;
  }
  if (def.itemPower) item.itemPower = { ...def.itemPower };
  else delete item.itemPower;
  if (def.legendaryEffect) item.legendaryEffect = def.legendaryEffect;
  if (def.reqClass) item.reqClass = def.reqClass;
  return item;
}

function maybeMorph(item) {
  return syncNamedItemPower(item);
}

function itemLevelOf(itemOrLevel, fallback = 1) {
  if (itemOrLevel && typeof itemOrLevel === 'object') {
    return Math.max(1, itemOrLevel.itemLevel || fallback);
  }
  return Math.max(1, itemOrLevel || fallback);
}

function clampItemLevel(n) {
  return Math.max(1, Math.min(110, Math.round(n || 1)));
}

function preferredAffixTier(ilvl) {
  const lv = clampItemLevel(ilvl);
  return 15 - (lv / 110) * 14;
}

function namedAffixBand(ilvl) {
  const lv = clampItemLevel(ilvl);
  const bands = NAMED_AFFIX_TIER_BANDS || [];
  return bands.find(b => lv <= b.maxLevel) || bands[bands.length - 1] || { best: 1, mode: 3 };
}

function namedAffixTierWeight(ilvl, tier) {
  const { best, mode } = namedAffixBand(ilvl);
  if (tier < best || tier > AFFIX_TIER_MAX) return 0;
  const sigma = 2.15;
  const d = (tier - mode) / sigma;
  return Math.exp(-0.5 * d * d);
}

function rollNamedAffixTier(ilvl) {
  const weights = [];
  let total = 0;
  for (let t = 1; t <= AFFIX_TIER_MAX; t++) {
    const w = namedAffixTierWeight(ilvl, t);
    weights.push(w);
    total += w;
  }
  if (total <= 0) return namedAffixBand(ilvl).mode || AFFIX_TIER_MAX;
  let r = Math.random() * total;
  for (let t = 1; t <= AFFIX_TIER_MAX; t++) {
    r -= weights[t - 1];
    if (r <= 0) return t;
  }
  return AFFIX_TIER_MAX;
}

function rollAffixTierForItem(item, opts = {}) {
  const ilvl = itemLevelOf(item);
  if (opts.forceT1) return 1;
  if (usesNamedAffixBands(item)) return rollNamedAffixTier(ilvl);
  return rollAffixTier(ilvl, !!opts.favorBest);
}

function affixTierWeight(ilvl, tier, favorBest = false) {
  const lv = clampItemLevel(ilvl);
  const preferred = preferredAffixTier(lv);
  const dist = Math.abs(tier - preferred);
  let w = Math.pow(0.64, dist);
  w *= 1 + ((16 - tier) / 15) * (lv / 99) * 1.8;
  if (tier === 1) w *= 0.25 + (lv / 99) * 2.6;
  if (tier === 15) w = Math.max(w, 0.045 + (1 - lv / 99) * 0.08);
  if (favorBest) w *= (16 - tier) / 6;
  return Math.max(0.008, w);
}

function rollAffixTier(ilvl, favorBest = false) {
  const weights = [];
  let total = 0;
  for (let t = 1; t <= AFFIX_TIER_MAX; t++) {
    const w = affixTierWeight(ilvl, t, favorBest);
    weights.push(w);
    total += w;
  }
  let r = Math.random() * total;
  for (let t = 1; t <= AFFIX_TIER_MAX; t++) {
    r -= weights[t - 1];
    if (r <= 0) return t;
  }
  return AFFIX_TIER_MAX;
}

function t1AffixChancePct(ilvl) {
  let t1 = 0;
  let total = 0;
  for (let t = 1; t <= AFFIX_TIER_MAX; t++) {
    const w = affixTierWeight(ilvl, t, false);
    total += w;
    if (t === 1) t1 = w;
  }
  return Math.round((t1 / total) * 1000) / 10;
}

function affixValueAtTier(def, tier) {
  if (!def) return 0;
  const min = def.min;
  const max = def.max;
  const t = Math.max(1, Math.min(AFFIX_TIER_MAX, tier));
  if (max <= min) return min;
  const u = (AFFIX_TIER_MAX - t) / (AFFIX_TIER_MAX - 1);
  return Math.max(min, Math.round(min + (max - min) * u));
}

function affixTierFromValue(def, value) {
  if (!def) return AFFIX_TIER_MAX;
  const min = def.min;
  const max = def.max;
  if (max <= min) return AFFIX_TIER_MAX;
  const u = (value - min) / (max - min + 1e-9);
  const idx = Math.min(AFFIX_TIER_MAX - 1, Math.max(0, Math.floor(u * AFFIX_TIER_MAX)));
  return AFFIX_TIER_MAX - idx;
}

function maxAffixTierForItemLevel(ilvl) {
  return Math.max(1, Math.min(AFFIX_TIER_MAX, Math.round(preferredAffixTier(ilvl))));
}

function itemBaseCapScale(ilvl) {
  const lv = clampItemLevel(ilvl);
  return 0.5 + lv * 0.022 + (lv * lv) / 2400;
}

function scaleItemBase(listed, ilvl) {
  if (!listed) return 0;
  return Math.max(1, Math.round(listed * itemBaseCapScale(ilvl)));
}

function namedItemDef(item) {
  if (!item?.id) return null;
  return [...UNIQUE_ITEMS, ...LEGENDARY_ITEMS].find(i => i.id === item.id) || null;
}

function refreshItemBases(item) {
  if (!item) return item;
  const named = namedItemDef(item);
  if (named?.baseDamage) item.listedDamage = named.baseDamage;
  if (named?.armor) item.listedArmor = named.armor;
  if (named?.attackSpeed) item.listedAttackSpeed = named.attackSpeed;
  const ilvl = item.itemLevel || 1;
  const scaleNow = itemBaseCapScale(ilvl);
  if (item.listedDamage == null && item.baseDamage) {
    item.listedDamage = Math.max(1, Math.round(item.baseDamage / Math.max(0.45, scaleNow)));
  }
  if (item.listedArmor == null && item.armor) {
    item.listedArmor = Math.max(1, Math.round(item.armor / Math.max(0.45, scaleNow)));
  }
  const iasScale = 0.82 + (ilvl / 99) * 0.55;
  if (item.listedAttackSpeed == null && item.attackSpeed) {
    item.listedAttackSpeed = item.attackSpeed / Math.max(0.5, iasScale);
  }
  if (item.listedDamage) item.baseDamage = scaleItemBase(item.listedDamage, ilvl);
  if (item.listedArmor) item.armor = scaleItemBase(item.listedArmor, ilvl);
  if (item.listedAttackSpeed) {
    item.attackSpeed = Math.round(item.listedAttackSpeed * iasScale * 1000) / 1000;
  }
  return item;
}

function stampItemLevel(item, monsterLevel = 1) {
  if (!item) return item;
  if (!item.itemLevel) item.itemLevel = clampItemLevel(monsterLevel);
  if (!item.reqLevel) item.reqLevel = Math.max(1, Math.min(110, item.itemLevel - 4));
  return item;
}

function allAffixDefs() {
  return AFFIX_POOL.prefix.concat(AFFIX_POOL.suffix);
}

function affixKind(affixOrDef) {
  if (!affixOrDef) return 'attr';
  if (affixOrDef.kind) return affixOrDef.kind;
  if (affixOrDef.stat && AFFIX_KIND[affixOrDef.stat]) return AFFIX_KIND[affixOrDef.stat];
  const def = findAffixDef(affixOrDef);
  if (def?.kind) return def.kind;
  if (def?.stat && AFFIX_KIND[def.stat]) return AFFIX_KIND[def.stat];
  return 'attr';
}

function slotAffixMode(slot) {
  if (AFFIX_SLOT_ATK.includes(slot)) return 'atk';
  if (AFFIX_SLOT_DEF.includes(slot)) return 'def';
  return 'flex';
}

function affixKindCounts(affixes) {
  let atk = 0;
  let def = 0;
  for (const a of affixes || []) {
    const k = affixKind(a);
    if (k === 'atk') atk += 1;
    else if (k === 'def') def += 1;
  }
  return { atk, def };
}

function affixAllowedOnItem(def, item, currentAffixes) {
  if (!def || !item) return true;
  const k = affixKind(def);
  const mode = slotAffixMode(item.slot);
  if (mode === 'atk' && k === 'def') return false;
  if (mode === 'def' && k === 'atk') return false;
  if (mode === 'flex') {
    const { atk, def: defs } = affixKindCounts(currentAffixes);
    if (k === 'atk' && atk >= AFFIX_KIND_CAP) return false;
    if (k === 'def' && defs >= AFFIX_KIND_CAP) return false;
  }
  return true;
}

function findAffixDef(affix) {
  if (!affix) return null;
  const exclusive = (typeof EXCLUSIVE_AFFIX_POOL !== 'undefined' ? EXCLUSIVE_AFFIX_POOL : [])
    .find(d => d.stat === affix.stat || d.id === affix.id || d.name === affix.name);
  if (exclusive) return exclusive;
  return allAffixDefs().find(d => d.stat === affix.stat || d.id === affix.id || d.name === affix.name) || null;
}

function affixTier(value, min, max) {
  if (max <= min) return AFFIX_TIER_MAX;
  const idx = Math.min(AFFIX_TIER_MAX - 1, Math.floor(((value - min) / (max - min + 1e-9)) * AFFIX_TIER_MAX));
  return AFFIX_TIER_MAX - idx;
}

function affixBounds(def) {
  return {
    min: affixValueAtTier(def, AFFIX_TIER_MAX),
    max: affixValueAtTier(def, 1),
  };
}

function makeRolledAffix(def, itemOrLevel, maxed) {
  const ilvl = itemLevelOf(itemOrLevel);
  const { min, max } = affixBounds(def);
  const forceT1 = maxed === true || maxed?.forceT1;
  const favor = maxed === true || maxed?.favorBest;
  const item = itemOrLevel && typeof itemOrLevel === 'object' ? itemOrLevel : null;
  const tier = item
    ? rollAffixTierForItem(item, { forceT1, favorBest: favor })
    : (forceT1 ? 1 : rollAffixTier(ilvl, !!favor));
  const value = Math.min(max, Math.max(min, affixValueAtTier(def, tier)));
  return {
    id: def.id,
    stat: def.stat,
    name: def.name,
    value,
    min,
    max,
    tier,
    suffix: def.suffix || '',
    exclusive: !!def.exclusive || !!maxed?.exclusive,
    kind: affixKind(def),
  };
}

function wantsExclusiveAffix(quality) {
  return quality === 'legendary' || quality === 'ancient';
}

function pickExclusiveDef(item) {
  const pool = (EXCLUSIVE_AFFIX_POOL || []).filter(d => affixAllowedOnItem(d, item, item?.affixes || []));
  const use = pool.length ? pool : (EXCLUSIVE_AFFIX_POOL || []);
  return use[Math.floor(Math.random() * use.length)] || use[0];
}

function stampExclusiveAffix(item, forceT1) {
  if (!item || !wantsExclusiveAffix(item.quality)) {
    if (item && item.quality !== 'legendary' && item.quality !== 'ancient') delete item.exclusiveAffix;
    return item;
  }
  if (item.exclusiveAffix?.stat) {
    stampAffixMeta(item.exclusiveAffix, item);
    item.exclusiveAffix.exclusive = true;
    if (forceT1) {
      const def = EXCLUSIVE_AFFIX_POOL.find(d => d.id === item.exclusiveAffix.id || d.stat === item.exclusiveAffix.stat);
      if (def) {
        item.exclusiveAffix.value = affixValueAtTier(def, 1);
        item.exclusiveAffix.tier = 1;
      }
    }
    return item;
  }
  const def = pickExclusiveDef(item);
  if (!def) return item;
  item.exclusiveAffix = makeRolledAffix(def, item, { exclusive: true, forceT1: !!forceT1 });
  item.exclusiveAffix.exclusive = true;
  return item;
}

function pickAffixDef(used, item, currentAffixes) {
  const all = allAffixDefs().filter(d => !used.has(d.id) && !used.has(d.stat) && affixAllowedOnItem(d, item, currentAffixes));
  if (all.length) return all[Math.floor(Math.random() * all.length)];
  const attrs = allAffixDefs().filter(d => affixKind(d) === 'attr' && !used.has(d.id) && !used.has(d.stat));
  if (attrs.length) return attrs[Math.floor(Math.random() * attrs.length)];
  return allAffixDefs().find(d => !used.has(d.stat)) || allAffixDefs()[0];
}

function affixCountFor(quality, maxed = false) {
  const [minA, maxA] = QUALITY[quality]?.affixCount || [0, 0];
  if (maxed || isAncientItem(quality)) return maxA;
  if (maxA <= minA) return minA;
  return minA + Math.floor(Math.random() * (maxA - minA + 1));
}

function rollItemAffixes(item, mapLevel = 1) {
  if (!item) return item;
  stampItemLevel(item, mapLevel);
  const ancient = isAncientItem(item);
  const named = usesNamedAffixBands(item);
  const count = affixCountFor(item.quality, ancient);
  const kept = (item.affixes || [])
    .filter(a => a && !a.exclusive)
    .map((a) => {
      if (!named) return stampAffixMeta({ ...a }, item);
      const def = findAffixDef(a);
      return def ? makeRolledAffix(def, item, false) : stampAffixMeta({ ...a }, item);
    })
    .slice(0, count);
  const used = new Set(kept.flatMap(a => [a.id, a.stat].filter(Boolean)));
  const affixes = kept.slice();
  while (affixes.length < count) {
    const def = pickAffixDef(used, item, affixes);
    if (!def) break;
    used.add(def.id);
    used.add(def.stat);
    affixes.push(makeRolledAffix(def, item, false));
  }
  item.affixes = affixes;
  stampExclusiveAffix(item, false);
  refreshItemBases(item);
  return item;
}

function stampAffixMeta(a, itemOrLevel = 1) {
  const def = findAffixDef(a);
  if (def) {
    const { min, max } = affixBounds(def);
    a.min = min;
    a.max = max;
    a.value = Math.min(max, Math.max(min, a.value ?? min));
    a.suffix = a.suffix || def.suffix || '';
    a.name = a.name || def.name;
    a.id = a.id || def.id;
    a.stat = a.stat || def.stat;
    a.tier = affixTierFromValue(def, a.value);
  } else {
    a.min = a.min ?? a.value;
    a.max = a.max ?? a.value;
    a.suffix = a.suffix || '';
    a.tier = affixTier(a.value, a.min, a.max);
  }
  return a;
}

function ensureItemAffixes(item, mapLevel = 1) {
  if (!item) return item;
  if (!item.itemLevel) {
    if (item.affixes?.length) {
      let best = AFFIX_TIER_MAX;
      for (const a of item.affixes) {
        const def = findAffixDef(a);
        if (def) best = Math.min(best, affixTierFromValue(def, a.value));
      }
      if (best <= 1) item.itemLevel = 91;
      else if (best <= 2) item.itemLevel = 76;
      else if (best <= 4) item.itemLevel = 61;
      else if (best <= 6) item.itemLevel = 46;
      else if (best <= 9) item.itemLevel = 31;
      else item.itemLevel = Math.max(1, Math.min(30, mapLevel || 20));
    } else {
      item.itemLevel = Math.max(1, Math.min(110, Math.round(mapLevel || 1)));
    }
  }
  stampItemLevel(item, item.itemLevel);
  if (item.id) {
    const named = [...UNIQUE_ITEMS, ...LEGENDARY_ITEMS].find(i => i.id === item.id);
    if (named?.reqClass && !item.reqClass) item.reqClass = named.reqClass;
    if (named?.icon && !item.icon) item.icon = named.icon;
    if (named?.weaponClass && !item.weaponClass) item.weaponClass = named.weaponClass;
  }
  if (!item.reqClass && item.setId && SETS[item.setId]?.reqClass) {
    item.reqClass = SETS[item.setId].reqClass;
  }
  refreshItemBases(item);
  if (!item.quality || item.quality === 'normal') {
    item.affixes = item.affixes || [];
    return item;
  }
  const [minA, maxA] = QUALITY[item.quality]?.affixCount || [0, 0];
  if (maxA <= 0) return item;
  item.affixes = (item.affixes || []).filter(a => a && !a.exclusive).map(a => stampAffixMeta({ ...a }, item));
  const ancient = isAncientItem(item);
  const used = new Set(item.affixes.flatMap(a => [a.id, a.stat].filter(Boolean)));
  let target = item.affixes.length;
  if (ancient) target = maxA;
  else if (target < minA) target = affixCountFor(item.quality, false);
  else if (target > maxA) target = maxA;
  while (item.affixes.length < target) {
    const def = pickAffixDef(used, item, item.affixes);
    if (!def) break;
    used.add(def.id);
    used.add(def.stat);
    item.affixes.push(makeRolledAffix(def, item, false));
  }
  if (item.affixes.length > target) item.affixes = item.affixes.slice(0, target);
  stampExclusiveAffix(item, false);
  return item;
}

function scaleRolledBase(listed, ilvl) {
  if (!listed) return 0;
  const cap = scaleItemBase(listed, ilvl);
  const lo = Math.max(1, Math.floor(cap * 0.9));
  return lo + Math.floor(Math.random() * (cap - lo + 1));
}

function scaleNamedBase(listed, ilvl) {
  return scaleItemBase(listed, ilvl);
}

function pickFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function itemClassId(item) {
  if (!item) return null;
  if (item.reqClass) return item.reqClass;
  if (item.setId && SETS[item.setId]?.reqClass) return SETS[item.setId].reqClass;
  return null;
}

function namedItemFitsHero(def, charId) {
  if (!def || !charId) return false;
  const req = itemClassId(def);
  if (req === charId) return true;
  const wcs = CHARACTERS[charId]?.weaponClasses || [];
  if (def.weaponClass && wcs.includes(def.weaponClass)) return true;
  return false;
}

function pickNamedLoot(pool, charId) {
  if (!pool.length) return null;
  const prefer = charId ? pool.filter(d => namedItemFitsHero(d, charId)) : [];
  if (prefer.length && Math.random() < 0.72) return pickFrom(prefer);
  return pickFrom(pool);
}

function pickSetLoot(pool, charId) {
  if (!pool.length) return null;
  const generic = pool.filter(d => !itemClassId(d));
  const mine = charId ? pool.filter(d => itemClassId(d) === charId) : [];
  const pGeneric = pool.length ? 0.28 * generic.length / pool.length : 0;
  if (generic.length && (!mine.length || Math.random() < pGeneric)) return pickFrom(generic);
  if (mine.length) return pickFrom(mine);
  return pickFrom(generic.length ? generic : pool);
}

function pickLootBase(slot, charId) {
  const list = BASE_ITEMS[slot] || BASE_ITEMS.weapon;
  const prefer = list.filter(b => {
    if (b.reqClass === charId) return true;
    if (slot === 'weapon' && (CHARACTERS[charId]?.weaponClasses || []).includes(b.weaponClass)) return true;
    return false;
  });
  if (prefer.length && Math.random() < 0.64) return pickFrom(prefer);
  const generic = list.filter(b => !b.reqClass);
  return pickFrom(generic.length ? generic : list);
}

function generateLoot(mapLevel, forceQuality = null, kind = 'normal', charId = null, state = null) {
  const kindBonus = kind === 'goblin' ? 5.4
    : kind === 'hidden' ? 4.8
    : kind === 'rare' || kind === 'rareBoss' ? 4.2
    : kind === 'elite' ? 2.6
    : kind === 'actBoss' || kind === 'boss' || kind === 'riftBoss' ? 3.8
    : 1;
  const quality = forceQuality || rollQuality(kindBonus);

  const finishNamed = (def, q = def.quality) => {
    const item = cloneItem(def);
    item.quality = q;
    item.itemLevel = clampItemLevel(mapLevel);
    item.reqLevel = Math.max(1, Math.min(110, item.itemLevel - 4));
    if (!item.reqClass && item.setId && SETS[item.setId]?.reqClass) {
      item.reqClass = SETS[item.setId].reqClass;
    }
    if (def.baseDamage) item.listedDamage = def.baseDamage;
    if (def.armor) item.listedArmor = def.armor;
    if (def.attackSpeed) item.listedAttackSpeed = def.attackSpeed;
    refreshItemBases(item);
    return stampLootDiff(syncNamedItemPower(rollItemAffixes(item, item.itemLevel)), state);
  };

  if (quality === 'unique' || quality === 'ancientUnique') {
    if (UNIQUE_ITEMS.length) {
      return finishNamed(pickNamedLoot(UNIQUE_ITEMS, charId), quality);
    }
  }

  if (quality === 'legendary' || quality === 'ancient') {
    const pool = LEGENDARY_ITEMS.filter(i => i.quality === 'legendary');
    if (pool.length && Math.random() < 0.7) {
      return finishNamed(pickNamedLoot(pool, charId), quality);
    }
  }

  if (quality === 'set' || quality === 'ancientSet') {
    const setItems = LEGENDARY_ITEMS.filter(i => i.quality === 'set' || i.setId);
    if (setItems.length) {
      return finishNamed(pickSetLoot(setItems, charId), quality);
    }
  }

  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const base = pickLootBase(slot, charId);
  const item = {
    uid: uid(),
    name: base.name,
    slot, quality, locked: false, affixes: [],
    itemLevel: clampItemLevel(mapLevel),
  };
  item.reqLevel = Math.max(1, Math.min(110, item.itemLevel - 4));
  if (base.baseDamage) item.listedDamage = base.baseDamage;
  if (base.armor) item.listedArmor = base.armor;
  if (base.weaponClass) item.weaponClass = base.weaponClass;
  if (base.offhandClass) item.offhandClass = base.offhandClass;
  if (base.attackSpeed) item.listedAttackSpeed = base.attackSpeed;
  if (base.icon) item.icon = base.icon;
  if (base.reqClass) item.reqClass = base.reqClass;
  refreshItemBases(item);
  rollItemAffixes(item, item.itemLevel);
  return stampLootDiff(item, state);
}

function sellValue(item) {
  if (!item) return 0;
  const ilvl = Math.max(1, item.itemLevel || 1);
  const qMult = {
    normal: 1,
    magic: 1.9,
    rare: 3.5,
    set: 5.4,
    unique: 6.6,
    legendary: 8.8,
    ancient: 12.2,
    ancientSet: 12.6,
    ancientUnique: 12.4,
  }[item.quality] || 1;
  const affn = item.affixes?.length || 0;
  const enh = item.enhance || 0;
  let gold = (20 + ilvl * 18 + ilvl * ilvl * 0.32) * qMult;
  gold *= 1 + affn * 0.12;
  gold *= 1 + enh * 0.08;
  gold *= 0.7 + 0.3 * itemLootMult(item);
  if (item.exclusiveAffix) gold *= 1.22;
  if (item.legendaryEffect) gold *= 1.15;
  return Math.max(10, Math.floor(gold));
}

function qualitySellMatch(item, mode) {
  const q = item?.quality;
  if (mode === 'unique') return q === 'unique';
  if (mode === 'set') return q === 'set';
  if (mode === 'legendary') return q === 'legendary';
  if (mode === 'belowAncient') return !isAncientItem(item);
  if (isAncientItem(item)) return false;
  if (mode === 'normal') return q === 'normal';
  if (mode === 'magic') return q === 'normal' || q === 'magic';
  if (mode === 'rare') return q === 'normal' || q === 'magic' || q === 'rare';
  if (mode === 'uniqueDown') return q === 'normal' || q === 'magic' || q === 'rare' || q === 'unique';
  if (mode === 'setDown') return q === 'normal' || q === 'magic' || q === 'rare' || q === 'set';
  if (mode === 'legendaryDown') return q === 'normal' || q === 'magic' || q === 'rare' || q === 'legendary';
  return q === 'normal' || q === 'magic';
}

function shouldAutoSell(state, item, hero) {
  const cfg = state.autoSell;
  if (!cfg?.enabled || item.locked) return false;
  const keepLv = Number(cfg.minKeepLevel) || 0;
  if (keepLv > 0 && (item.itemLevel || 0) >= keepLv) return false;
  if (cfg.keepBetter) {
    const { diffPct } = compareDPS(hero, item);
    if (diffPct > 2) return false;
  }
  return qualitySellMatch(item, cfg.maxQuality || 'magic');
}

function junkBagTargets(state, mode) {
  const filter = mode || state.junkQuality || 'magic';
  return (state.inventory || []).filter((it) => !it.locked && qualitySellMatch(it, filter));
}

function sellJunkItems(state, mode) {
  return bulkDisposeLoose(state, junkBagTargets(state, mode).map((it) => it.uid), 'sell');
}

function salvageJunkItems(state, mode) {
  return bulkDisposeLoose(state, junkBagTargets(state, mode).map((it) => it.uid), 'salvage');
}

function normalizeInvSort(sort) {
  if (sort && typeof sort === 'object' && !Array.isArray(sort)) {
    return {
      rarity: !!sort.rarity,
      ilvl: !!sort.ilvl,
      score: !!sort.score,
    };
  }
  if (sort === 'ilvl') return { rarity: false, ilvl: true, score: false };
  if (sort === 'rarity') return { rarity: true, ilvl: false, score: false };
  if (sort === 'same') return { rarity: true, ilvl: false, score: true };
  return { rarity: true, ilvl: true, score: true };
}

function addLoot(state, item, hero) {
  hero = hero || getActiveHero(state);
  ensureHeroEconomy(hero, false);
  if (shouldAutoSell(state, item, hero)) {
    if (state.autoSell.action === 'salvage') {
      const r = salvageItem(state, item, hero);
      return { sold: true, salvage: true, gold: r.gold, metal: r.metal, cloth: r.cloth, crystal: r.crystal, item };
    }
    const gold = sellValue(item);
    hero.gold = (hero.gold || 0) + gold;
    return { sold: true, gold, item };
  }
  if ((hero.inventory || []).length >= getInvCap(state, hero)) {
    const gold = sellValue(item);
    hero.gold = (hero.gold || 0) + gold;
    return { sold: true, overflow: true, gold, item };
  }
  hero.inventory.push(item);
  return { sold: false, item };
}

function itemTwinKey(item) {
  if (!item) return '';
  if (item.id) return `id:${item.id}`;
  if (item.setId) return `set:${item.setId}:${item.slot}`;
  return `n:${item.name}|${item.slot}|${item.quality}`;
}

function sortBagItems(items, sort, hero) {
  const list = (items || []).slice();
  const keys = normalizeInvSort(sort);
  const tot = (() => {
    const cache = new Map();
    return (it) => {
      if (cache.has(it.uid)) return cache.get(it.uid);
      const s = scoreItem(it, hero);
      const n = (s.atk || 0) + (s.surv || 0);
      cache.set(it.uid, n);
      return n;
    };
  })();
  const active = ['rarity', 'ilvl', 'score'].filter((k) => keys[k]);
  const use = active.length ? active : ['score'];
  list.sort((a, b) => {
    for (const k of use) {
      let d = 0;
      if (k === 'rarity') d = (Q_RANK[b.quality] ?? 0) - (Q_RANK[a.quality] ?? 0);
      else if (k === 'ilvl') d = (b.itemLevel || 0) - (a.itemLevel || 0);
      else d = tot(b) - tot(a);
      if (d) return d;
    }
    return (a.slot || '').localeCompare(b.slot || '');
  });
  return list;
}

function sortInventory(state) {
  const hero = getActiveHero(state);
  state.inventory = sortBagItems(state.inventory, state.invSort, hero);
}

function levelUpHero(hero) {
  while (hero.exp >= expForLevel(hero.level) && hero.level < 99) {
    hero.exp -= expForLevel(hero.level);
    hero.level++;
    hero.skillPoints = (hero.skillPoints || 0) + 1;
    hero.currentHp = calcHeroStats(hero).maxHp;
    clampHeroResource(hero);
  }
}

function allocateSkillPoint(hero, skillId, state) {
  const gate = canLearnSkill(hero, skillId, state);
  if (!gate.ok) return false;
  const skill = SKILLS[hero.charId][skillId];
  const cost = gate.cost || skillLearnCost(hero, skillId);
  if (state) {
    const paid = payCost(state, cost);
    if (!paid.ok) return false;
  }
  const current = hero.skillLevels[skillId] || 0;
  hero.skillLevels[skillId] = current + 1;
  hero.skillPoints--;
  if (skill.auraSlot && current < 1) {
    hero.auraPick = hero.auraPick || {};
    if (!hero.auraPick[skill.auraSlot]) {
      hero.auraPick[skill.auraSlot] = skillId;
      hero.skillEnabled = hero.skillEnabled || {};
      hero.skillEnabled[skillId] = true;
      for (const id of auraSlotSkills(hero, skill.auraSlot)) {
        if (id !== skillId) hero.skillEnabled[id] = false;
      }
    }
  }
  if (!hero.equippedSkills) hero.equippedSkills = [];
  const combatBar = skill.type === 'active' && skill.tree !== 'warcry'
    && (typeof isCoreCombatSkill === 'function' ? isCoreCombatSkill(skill) : (skill.damageMult || 0) > 0);
  if (!hero.equippedSkills.includes(skillId) && combatBar && hero.equippedSkills.length < 8) {
    hero.equippedSkills.push(skillId);
  }
  ensureEquippedSkillLevels(hero);
  return { ok: true, cost };
}

function takeOwnedLooseItem(state, uid) {
  let idx = (state.inventory || []).findIndex(i => i.uid === uid);
  if (idx >= 0) return state.inventory.splice(idx, 1)[0];
  idx = (ensureTown(state).warehouse || []).findIndex(i => i.uid === uid);
  if (idx >= 0) return state.town.warehouse.splice(idx, 1)[0];
  return null;
}

function salvageSlotGroup(item) {
  const slot = item?.slot;
  if (WEAPON_SALVAGE_SLOTS.has(slot)) return 'weapon';
  if (JEWEL_SALVAGE_SLOTS.has(slot)) return 'jewel';
  return 'armor';
}

function salvagePreview(item) {
  const rank = (Q_RANK[item.quality] ?? 0) + 1;
  const ilvl = item.itemLevel || 1;
  const affn = item.affixes?.length || 0;
  const base = Math.max(1, Math.round((rank * 1.1 + ilvl / 10) * (1 + affn * 0.06)));
  const gold = Math.floor(sellValue(item) * 0.4);
  const g = salvageSlotGroup(item);
  let metal = 0;
  let cloth = 0;
  let crystal = 0;
  if (g === 'weapon') {
    metal = base;
    crystal = Math.max(0, Math.floor(base * 0.08 + (rank >= 4 ? 1 : 0)));
  } else if (g === 'armor') {
    metal = base <= 1 ? 1 : Math.max(1, Math.round(base * 0.2));
    cloth = Math.max(0, base - metal);
  } else {
    crystal = base;
  }
  return { gold, metal, cloth, crystal, shards: metal };
}

function salvageItem(state, item, hero) {
  const r = salvagePreview(item);
  gainMats(state, r, hero);
  const h = hero || getActiveHero(state);
  h.gold = (h.gold || 0) + r.gold;
  return r;
}

function bulkDisposeLoose(state, uids, mode) {
  const want = new Set(uids || []);
  let gold = 0;
  let metal = 0;
  let cloth = 0;
  let crystal = 0;
  let n = 0;
  let skipped = 0;
  const strip = (arr) => {
    if (!arr?.length) return;
    for (let i = arr.length - 1; i >= 0; i--) {
      const it = arr[i];
      if (!want.has(it.uid)) continue;
      if (it.locked) {
        skipped += 1;
        continue;
      }
      if (mode === 'salvage') {
        const r = salvageItem(state, it);
        gold += r.gold;
        metal += r.metal;
        cloth += r.cloth;
        crystal += r.crystal;
      } else {
        const g = sellValue(it);
        state.gold += g;
        gold += g;
      }
      arr.splice(i, 1);
      n += 1;
    }
  };
  strip(state.inventory);
  strip(state.town?.warehouse);
  return { n, gold, metal, cloth, crystal, shards: metal, skipped };
}

function formatCompactNum(n) {
  const v = Math.trunc(Number(n) || 0);
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs < 1000) return String(v);
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [div, u] of units) {
    if (abs >= div) {
      const x = abs / div;
      const d = x >= 100 ? 0 : x >= 10 ? 1 : 2;
      let s = x.toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
      return sign + s + u;
    }
  }
  return String(v);
}

function formatMatBits(p) {
  const bits = [];
  if ((p.metal || 0) > 0) bits.push(`金属${formatCompactNum(p.metal)}`);
  if ((p.cloth || 0) > 0) bits.push(`布料${formatCompactNum(p.cloth)}`);
  if ((p.crystal || 0) > 0) bits.push(`水晶${formatCompactNum(p.crystal)}`);
  return bits.join(' ');
}

function formatCostText(c) {
  const bits = [];
  if (c.gold) bits.push(`${formatCompactNum(c.gold)}金`);
  if (c.metal) bits.push(`${formatCompactNum(c.metal)}金属`);
  if (c.cloth) bits.push(`${formatCompactNum(c.cloth)}布料`);
  if (c.crystal) bits.push(`${formatCompactNum(c.crystal)}水晶`);
  return bits.join('/');
}

function formatSalvageLog(prefix, r) {
  const mats = formatMatBits(r);
  return `${prefix} +${formatCompactNum(r.gold || 0)}金${mats ? ' +' + mats : ''}`;
}

function ensureMats(state, hero) {
  const h = hero || getActiveHero(state);
  ensureHeroEconomy(h, false);
  return h.mats;
}

function gainMats(state, p, hero) {
  const m = ensureMats(state, hero);
  m.metal += p.metal || 0;
  m.cloth += p.cloth || 0;
  m.crystal += p.crystal || 0;
}

function canPayCost(state, cost) {
  ensureMats(state);
  if ((cost.gold || 0) > (state.gold || 0)) return '金币不足';
  if ((cost.metal || 0) > state.mats.metal) return '金属不足';
  if ((cost.cloth || 0) > state.mats.cloth) return '布料不足';
  if ((cost.crystal || 0) > state.mats.crystal) return '水晶不足';
  return '';
}

function failActText(reason, action) {
  if (!reason) return `无法${action}`;
  if (reason.includes('无法')) return reason;
  return `${reason}，无法${action}`;
}

function payCost(state, cost) {
  const why = canPayCost(state, cost);
  if (why) return { ok: false, reason: why };
  state.gold -= cost.gold || 0;
  state.mats.metal -= cost.metal || 0;
  state.mats.cloth -= cost.cloth || 0;
  state.mats.crystal -= cost.crystal || 0;
  return { ok: true };
}

function enhanceCost(item) {
  const q = (Q_RANK[item?.quality] ?? 0) + 1;
  const ilvl = item?.itemLevel || 1;
  const n = (item?.enhance || 0) + 1;
  const cap = itemEnhanceCapPct(item?.quality) || 0.3;
  const mats = Math.max(4, Math.ceil((ilvl / 4.5 + q * 2.2) * n * (0.9 + cap)));
  const gold = Math.floor(ilvl * 32 * q * (1.2 + n * 0.62) * (0.85 + cap));
  const g = salvageSlotGroup(item);
  if (g === 'weapon') return { gold, metal: mats };
  if (g === 'jewel') return { gold, crystal: mats };
  return { gold, cloth: mats };
}

function enhanceItem(state, item) {
  if (!item) return { ok: false, reason: '没有装备' };
  const cap = itemEnhanceCapPct(item.quality);
  if (!cap) return { ok: false, reason: '普通/魔法无法强化' };
  const lv = item.enhance || 0;
  if (lv >= 10) return { ok: false, reason: '已强化至上限' };
  const cost = enhanceCost(item);
  const pay = payCost(state, cost);
  if (!pay.ok) return pay;
  item.enhance = lv + 1;
  return { ok: true, cost, enhance: item.enhance, bonus: itemEnhanceBonus(item) };
}

function ensureTrain(hero) {
  if (!hero.train) hero.train = { unlocked: {}, lv: {} };
  if (!hero.train.unlocked) hero.train.unlocked = {};
  if (!hero.train.lv) hero.train.lv = {};
  return hero.train;
}

function growthResourceCost(level, goldMul = 20, matMul = 0.05) {
  const e = expForLevel(Math.max(1, Math.min(99, Math.round(level))));
  const mats = Math.max(1, Math.ceil(e * matMul));
  return {
    gold: Math.max(20, Math.floor(e * goldMul)),
    metal: mats,
    cloth: mats,
    crystal: mats,
  };
}

function highestOpenAct(state) {
  let act = 1;
  const killed = state?.bossesEver || state?.bossesKilled || {};
  if (killed.visna) act = 2;
  if (killed.duriel) act = 3;
  if (killed.council) act = 4;
  if (killed.diablo) act = 5;
  if (killed.baal) act = 6;
  return act;
}

function trainUnlockCost(def) {
  const hall = Math.max(1, def?.hall || 1);
  return growthResourceCost(hall * 12, 55, 0.16);
}

function trainLevelCost(def, lv) {
  const n = Math.max(1, (lv || 0) + 1);
  const hall = Math.max(1, def?.hall || 1);
  return growthResourceCost(5 + n * 2 + hall * 2, 40 + hall * 6, 0.12 + hall * 0.015);
}

function getHallLevel(state) {
  return ensureTown(state).hallLevel || 1;
}

function hallUpgradeCost(lv) {
  const n = Math.max(1, lv);
  return growthResourceCost(12 + n * 8, 36 + n * 10, 0.12 + n * 0.025);
}

function hallUpgradeBlocked(state) {
  const lv = getHallLevel(state);
  if (lv >= HALL_MAX) return '议事厅已满级';
  const need = lv + 1;
  if (highestOpenAct(state) < need) {
    const names = { 1: '一章', 2: '二章', 3: '三章', 4: '四章', 5: '五章', 6: '秘境' };
    return `解锁${names[need] || `${need}章`}后可升级议事厅`;
  }
  return '';
}

function upgradeHall(state) {
  const town = ensureTown(state);
  const lv = town.hallLevel || 1;
  const why = hallUpgradeBlocked(state);
  if (why) return { ok: false, reason: why };
  const cost = hallUpgradeCost(lv);
  const pay = payCost(state, cost);
  if (!pay.ok) return pay;
  town.hallLevel = lv + 1;
  return { ok: true, lv: town.hallLevel, cost };
}

function unlockTrainStat(state, statId) {
  const hero = getActiveHero(state);
  const def = TRAIN_DEFS.find(d => d.id === statId);
  if (!def) return { ok: false, reason: '未知训练' };
  ensureTrain(hero);
  if (hero.train.unlocked[statId]) return { ok: false, reason: '已解锁' };
  const needHall = def.hall || 1;
  if (getHallLevel(state) < needHall) {
    return { ok: false, reason: '议事厅条件不满足' };
  }
  const pay = payCost(state, trainUnlockCost(def));
  if (!pay.ok) return pay;
  hero.train.unlocked[statId] = true;
  hero.train.lv[statId] = 0;
  return { ok: true, cost: trainUnlockCost(def) };
}

function upgradeTrainStat(state, statId) {
  const hero = getActiveHero(state);
  const def = TRAIN_DEFS.find(d => d.id === statId);
  if (!def) return { ok: false, reason: '未知训练' };
  ensureTrain(hero);
  if (!hero.train.unlocked[statId]) return { ok: false, reason: '尚未解锁' };
  const lv = hero.train.lv[statId] || 0;
  if (lv >= (def.max || TRAIN_MAX)) return { ok: false, reason: '已达上限' };
  const cost = trainLevelCost(def, lv);
  const pay = payCost(state, cost);
  if (!pay.ok) return pay;
  hero.train.lv[statId] = lv + 1;
  return { ok: true, cost, lv: hero.train.lv[statId] };
}

function rerollAffixCost(item) {
  const ilvl = item?.itemLevel || 1;
  const q = (Q_RANK[item?.quality] ?? 0) + 1;
  return {
    shards: Math.max(2, Math.ceil(ilvl / 5) + q),
    metal: Math.max(2, Math.ceil(ilvl / 5) + q),
    gold: Math.max(15, ilvl * 6 * q),
  };
}

function findOwnedItem(state, uid) {
  if (!uid) return null;
  const bag = (state.inventory || []).find(i => i.uid === uid);
  if (bag) return bag;
  const ware = (state.town?.warehouse || []).find(i => i.uid === uid);
  if (ware) return ware;
  const hero = getActiveHero(state);
  return Object.values(hero?.equipment || {}).find(i => i?.uid === uid) || null;
}

function rerollItemAffix(state, item) {
  if (!item) return { ok: false, reason: '没有装备' };
  const regular = (item.affixes || []).filter(a => !a.exclusive);
  if (item.quality === 'normal' || !regular.length) {
    return { ok: false, reason: '没有可洗练的词缀' };
  }
  const cost = rerollAffixCost(item);
  const pay = payCost(state, { gold: cost.gold, metal: cost.metal });
  if (!pay.ok) return pay;
  const idx = Math.floor(Math.random() * regular.length);
  const others = regular.filter((_, i) => i !== idx);
  const used = new Set(others.flatMap(a => [a.id, a.stat].filter(Boolean)));
  const current = item.exclusiveAffix ? others.concat(item.exclusiveAffix) : others;
  const def = pickAffixDef(used, item, current);
  const next = makeRolledAffix(def, item, false);
  const realIdx = item.affixes.indexOf(regular[idx]);
  const prev = item.affixes[realIdx];
  item.affixes[realIdx] = next;
  return { ok: true, prev, next, cost, index: idx };
}

function unequipItem(state, hero, slot) {
  const item = hero.equipment[slot];
  if (!item) return { ok: false, reason: '该部位没有装备' };
  if (state.inventory.length < getInvCap(state)) {
    state.inventory.push(item);
    delete hero.equipment[slot];
    return { ok: true, item };
  }
  if (townUnlocked(state) && ensureTown(state).warehouse.length < getWarehouseCap(state)) {
    state.town.warehouse.push(item);
    delete hero.equipment[slot];
    return { ok: true, item, toWarehouse: true };
  }
  return { ok: false, reason: '背包已满' };
}

function isRingItem(item) {
  return item && (item.slot === 'ring1' || item.slot === 'ring2');
}

function ringSlotForEquip(hero, preferred) {
  const want = preferred === 'ring2' ? 'ring2' : 'ring1';
  if (!hero.equipment[want]) return want;
  if (!hero.equipment.ring1) return 'ring1';
  if (!hero.equipment.ring2) return 'ring2';
  return want;
}

function inferOffhandClass(item) {
  if (!item || item.slot !== 'offhand') return null;
  if (item.offhandClass) return item.offhandClass;
  const n = item.name || '';
  if (/箭袋|箭壶|箭囊|箭筒/.test(n)) return 'quiver';
  return 'shield';
}

function offhandFitsWeapon(weapon, offhand) {
  if (!offhand) return { ok: true };
  const oc = inferOffhandClass(offhand);
  const wc = inferWeaponClass(weapon);
  if (oc === 'quiver') {
    if (wc === 'bow') return { ok: true };
    const have = weapon ? (WEAPON_CLASS_NAMES[wc] || weapon.name) : '未装备武器';
    return { ok: false, reason: `箭袋需搭配弓或弩（当前：${have}）` };
  }
  if (oc === 'shield' && wc === 'bow') {
    return { ok: false, reason: '弓/弩不能同时持盾，请改用箭袋' };
  }
  return { ok: true };
}

function equipBlockReason(hero, item) {
  if (!hero || !item) return '';
  const req = itemClassId(item);
  if (req && req !== hero.charId) {
    const who = CHARACTERS[req]?.name || req;
    return `仅限 ${who}`;
  }
  if (item.slot === 'offhand') {
    const chk = offhandFitsWeapon(hero.equipment?.weapon, item);
    if (!chk.ok) return chk.reason;
  }
  return '';
}

function itemFitsSlot(item, slot) {
  if (!item || !slot) return false;
  if (slot === 'ring1' || slot === 'ring2') return isRingItem(item);
  if (slot === 'offhand') return item.slot === 'offhand';
  if (slot === 'weapon' && inferOffhandClass(item) === 'quiver') return true;
  return item.slot === slot;
}

function tryEquip(state, hero, item, preferredSlot) {
  const dest = isRingItem(item)
    ? ringSlotForEquip(hero, preferredSlot || item.slot)
    : item.slot;
  const block = equipBlockReason(hero, item);
  if (block) return { ok: false, reason: block };
  if (item.slot === 'offhand') {
    const chk = offhandFitsWeapon(hero.equipment.weapon, item);
    if (!chk.ok) return { ok: false, reason: chk.reason };
  }
  let extra = null;
  if (item.slot === 'weapon') {
    const chk = offhandFitsWeapon(item, hero.equipment.offhand);
    if (!chk.ok && hero.equipment.offhand) {
      extra = hero.equipment.offhand;
      delete hero.equipment.offhand;
    }
  }
  const prev = hero.equipment[dest];
  hero.equipment[dest] = { ...item, slot: dest };
  return { ok: true, prev, dest, extra };
}

function compareDPS(hero, newItem, preferredSlot) {
  const oldDps = Math.max(1, calcDPS(hero));
  const slot = isRingItem(newItem)
    ? ringSlotForEquip(hero, preferredSlot || newItem.slot)
    : newItem.slot;
  const prev = hero.equipment[slot];
  hero.equipment[slot] = newItem;
  const newDps = calcDPS(hero);
  hero.equipment[slot] = prev;
  return { oldDps, newDps, diff: newDps - oldDps, diffPct: ((newDps - oldDps) / oldDps) * 100, slot };
}

function compareEHP(hero, newItem, preferredSlot) {
  const map = getCurrentMap(hero);
  const ml = map ? Math.round(((map.levelMin || 1) + (map.levelMax || 1)) / 2) : (hero.level || 10);
  const slot = isRingItem(newItem)
    ? ringSlotForEquip(hero, preferredSlot || newItem.slot)
    : newItem.slot;
  const oldEhp = Math.max(1, calcEHP(hero, ml));
  const prev = hero.equipment[slot];
  hero.equipment[slot] = newItem;
  const newEhp = calcEHP(hero, ml);
  hero.equipment[slot] = prev;
  return { oldEhp, newEhp, diff: newEhp - oldEhp, diffPct: ((newEhp - oldEhp) / oldEhp) * 100, slot };
}

function listedBaseAvg(slot, key) {
  const list = BASE_ITEMS[slot === 'ring2' ? 'ring1' : slot] || [];
  const vals = list.map(b => b[key]).filter(v => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function expectedItemBase(item) {
  const ilvl = item?.itemLevel || 1;
  const dmg = listedBaseAvg(item.slot, 'baseDamage');
  const arm = listedBaseAvg(item.slot, 'armor');
  return {
    damage: dmg ? scaleItemBase(dmg, ilvl) : 0,
    armor: arm ? scaleItemBase(arm, ilvl) : 0,
  };
}

function scoreGrade(n) {
  if (n >= 1000) return 'SSS';
  if (n >= 850) return 'SS';
  if (n >= 700) return 'S';
  if (n >= 560) return 'A';
  if (n >= 420) return 'B';
  if (n >= 280) return 'C';
  return 'D';
}

function affixRollRatio(a) {
  const max = a?.max || (findAffixDef(a) ? affixBounds(findAffixDef(a)).max : a?.value);
  if (!max) return 0.5;
  return Math.max(0, Math.min(1.05, (a.value || 0) / max));
}

function statAxisWeight(hero, stat, axis) {
  const charId = hero?.charId;
  const main = CHARACTERS[charId]?.mainStat || 'str';
  const caster = main === 'int';
  const summoner = charId === 'necro' || charId === 'druid';
  const elements = charId === 'sorceress';
  const ranged = charId === 'amazon' || charId === 'sorceress' || charId === 'necro';
  const melee = charId === 'berserker' || charId === 'paladin' || charId === 'assassin';
  if (stat === 'str' || stat === 'agi' || stat === 'int' || stat === 'vit' || stat === 'wis') {
    if (axis === 'surv') return stat === 'vit' ? 1.05 : 0.12;
    if (stat === 'vit') return 0.2;
    if (stat === 'wis') return caster ? 0.95 : 0.4;
    if (stat === main) return 1.2;
    if (stat === 'int' && caster) return 0.55;
    return 0.35;
  }
  if (axis === 'atk') {
    const w = {
      physDmgPct: elements ? 0.55 : 1.15,
      fireDmgPct: elements ? 1.15 : 0.45,
      iceDmgPct: elements ? 1.15 : 0.45,
      lightningDmgPct: elements ? 1.15 : 0.45,
      poisonDmgPct: charId === 'necro' ? 1.2 : 0.4,
      critRate: 1.1,
      critDmg: 1.1,
      attackSpeed: ranged ? 1.15 : 1.05,
      attackRange: ranged ? 1.1 : 0.5,
      skillLevel: 1.2,
      eliteDmgPct: 1.05,
      aoePct: 1.0,
      cdrPct: 1.05,
      summonBonus: summoner ? 1.2 : 0.4,
      resRegenPct: caster ? 1.05 : 0.7,
    };
    return w[stat] || 0;
  }
  const w = {
    hp: 1.15,
    armor: melee ? 1.2 : 1.0,
    allRes: 1.1,
    damageReduction: 1.2,
    lifeRegen: 0.85,
    killHeal: 0.9,
    lifesteal: 1.05,
  };
  return w[stat] || 0;
}

function scoreItem(item, hero) {
  if (!item) {
    return { usable: true, atk: 0, surv: 0, atkGrade: 'D', survGrade: 'D' };
  }
  const block = hero ? equipBlockReason(hero, item) : '';
  let atk = 0;
  let surv = 0;
  const exp = expectedItemBase(item);
  const lootM = itemLootMult(item);
  const affQ = itemAffixQualityMult(item);
  if (item.baseDamage && exp.damage) atk += 34 * (item.baseDamage / exp.damage) * lootM;
  if (item.attackSpeed) atk += 8 * (item.attackSpeed / 0.1);
  if (item.armor && exp.armor) surv += 34 * (item.armor / Math.max(1, exp.armor)) * lootM;
  else if (item.armor) surv += item.armor * 0.45 * lootM;

  const addAffix = (a) => {
    if (!a?.stat) return;
    const ratio = affixRollRatio(a);
    const k = affixKind(a);
    if (k === 'atk' || k === 'attr') atk += ratio * 12 * statAxisWeight(hero, a.stat, 'atk') * lootM * affQ;
    if (k === 'def' || k === 'attr') surv += ratio * 12 * statAxisWeight(hero, a.stat, 'surv') * lootM * affQ;
  };
  for (const a of item.affixes || []) addAffix(a);
  addAffix(item.exclusiveAffix);

  const qBonus = [0, 1.5, 3, 4, 5, 6.5, 9][Q_RANK[item.quality] ?? 0] || 0;
  const eb = itemEnhanceBonus(item);
  const mode = slotAffixMode(item.slot);
  if (mode === 'def') surv += qBonus + eb * 22;
  else if (mode === 'atk') atk += qBonus + eb * 22;
  else {
    atk += qBonus * 0.55 + eb * 12;
    surv += qBonus * 0.55 + eb * 12;
  }
  if (item.morphId) atk += 4;
  if (item.legendaryEffect) {
    if (mode === 'def') surv += 6;
    else if (mode === 'atk') atk += 6;
    else {
      atk += 3;
      surv += 3;
    }
  }

  const atkN = Math.round(Math.max(0, atk) * 10);
  const survN = Math.round(Math.max(0, surv) * 10);
  return {
    usable: !block,
    reason: block || '',
    atk: atkN,
    surv: survN,
    atkGrade: scoreGrade(atkN),
    survGrade: scoreGrade(survN),
  };
}

function combatPowerScore(dps, ehp) {
  return Math.max(1, Math.round(Math.sqrt(Math.max(1, dps) * Math.max(1, ehp)) * 10));
}

function itemPowerScore(item, hero) {
  const s = scoreItem(item, hero);
  return (s.atk || 0) + (s.surv || 0);
}

function heroGearScore(hero) {
  if (!hero) return 0;
  const dps = typeof calcDPS === 'function' ? calcDPS(hero) : 1;
  const ehp = typeof calcEHP === 'function' ? calcEHP(hero, hero.level || 10) : 1;
  return combatPowerScore(dps, ehp);
}

function mapLevelAvg(map) {
  const a = Number(map?.levelMin ?? 1);
  const b = Number(map?.levelMax ?? a);
  return (a + b) / 2;
}

function mapRecommendScore(map, state) {
  if (!map) return 0;
  const lv = Math.max(1, Math.round(mapLevelAvg(map)));
  const w = (typeof worldMonsterMult === 'function' && state) ? worldMonsterMult(state) : 1;
  const rift = (map.isRift && typeof riftDifficultyMult === 'function')
    ? riftDifficultyMult(map.riftFloor) : 1;
  let hp;
  let dmg;
  if (map.isBoss && map.bossId && typeof BOSSES !== 'undefined' && BOSSES[map.bossId]) {
    const boss = BOSSES[map.bossId];
    const from = monsterStats(Math.max(1, boss.level || lv));
    const to = monsterStats(lv);
    hp = boss.hp * (to.hp / Math.max(1, from.hp)) * w * rift;
    dmg = boss.damage * (to.damage / Math.max(1, from.damage)) * w * rift;
  } else {
    const ms = monsterStats(lv);
    const pack = ((map.packMin || 1) + (map.packMax || 1)) / 2;
    hp = ms.hp * w * rift * pack * 1.55;
    dmg = ms.damage * w * rift * 1.3;
  }
  const dpsNeed = hp / (map.isBoss ? 9 : 3.6);
  const ehpNeed = dmg * (map.isBoss ? 18 : 12);
  return combatPowerScore(dpsNeed, ehpNeed);
}

function offlineEfficiency(hours) {
  if (hours <= 2) return 1;
  if (hours <= 8) return (2 * 1 + (hours - 2) * 0.7) / hours;
  const capped = Math.min(hours, OFFLINE_MAX_HOURS);
  return (2 * 1 + 6 * 0.7 + (capped - 8) * 0.4) / capped;
}

function calcOfflineRewards(state) {
  const elapsed = Date.now() - (state.lastSaveTime || Date.now());
  const hours = Math.min(elapsed / 3600000, OFFLINE_MAX_HOURS);
  if (hours < 0.01) return null;
  const eff = offlineEfficiency(hours);
  const dt = hours * 3600 * eff;
  const clone = JSON.parse(JSON.stringify({
    heroes: state.heroes,
    activeCharId: state.activeCharId,
    unlockedChars: state.unlockedChars,
    mapKills: state.mapKills,
    bossesKilled: state.bossesKilled,
    mapsEntered: state.mapsEntered,
    autoNextMap: state.autoNextMap,
    autoSell: state.autoSell,
    diffId: state.diffId,
    diffProgress: state.diffProgress,
    town: { unlocked: !!state.town?.unlocked, warehouse: [], warehouseCap: 8, hallLevel: state.town?.hallLevel || 1 },
  }));
  for (const h of Object.values(clone.heroes || {})) ensureHeroEconomy(h, false);
  bindHeroEconomy(clone);
  const beforeInv = {};
  for (const [id, h] of Object.entries(clone.heroes || {})) {
    beforeInv[id] = new Set((h.inventory || []).map(i => i.uid));
  }
  tickIdleHeroes(clone, dt, { includeActive: true });
  let gold = 0;
  let exp = 0;
  let kills = 0;
  const items = [];
  for (const [id, h] of Object.entries(clone.heroes || {})) {
    const orig = state.heroes[id];
    if (!orig) continue;
    gold += Math.max(0, (h.gold || 0) - (orig.gold || 0));
    exp += heroExpDelta(orig, h);
    kills += Math.max(0, (h.kills || 0) - (orig.kills || 0));
    for (const it of h.inventory || []) {
      if (!beforeInv[id]?.has(it.uid)) items.push(it);
    }
  }
  return {
    hours: Math.floor(hours * 10) / 10,
    exp,
    gold,
    items: items.slice(0, 24),
    kills,
    eff: Math.round(eff * 100),
    expPen: '',
    dt,
  };
}

function heroExpDelta(from, to) {
  let exp = 0;
  let lv = from.level || 1;
  let cur = from.exp || 0;
  const endLv = to.level || 1;
  const endExp = to.exp || 0;
  while (lv < endLv && lv < 99) {
    exp += Math.max(0, expForLevel(lv) - cur);
    cur = 0;
    lv += 1;
  }
  if (lv === endLv) exp += Math.max(0, endExp - cur);
  return Math.max(0, exp);
}

function claimOfflineRewards(state, rewards) {
  const dt = rewards?.dt || 0;
  if (dt > 0) tickIdleHeroes(state, dt, { includeActive: true });
  state.offlineClaimed = true;
  state.lastSaveTime = Date.now();
}

function onBossKill(state, bossId) {
  const boss = BOSSES[bossId];
  const map = MAPS.find(m => m.bossId === bossId);
  const scaled = withDiffLevels(map, state);
  const lv = scaled ? Math.round((scaled.levelMin + scaled.levelMax) / 2) : (boss.level || 1);
  const hero = getActiveHero(state);
  const camp = campaignOf(state, hero);
  const firstOnDiff = !camp.bossesKilled[bossId];
  const loot = firstOnDiff
    ? generateLoot(lv, 'legendary', 'actBoss', hero?.charId, state)
    : generateLoot(lv, null, 'actBoss', hero?.charId, state);
  const unlockedDiff = bossId === 'baal' ? markDiffCleared(state, getWorldDiff(state).id) : null;
  camp.bossesKilled[bossId] = true;
  const did = getWorldDiff(state).id;
  state.diffProgress = state.diffProgress || {};
  if (!state.diffProgress[did]) state.diffProgress[did] = emptyDiffProgress();
  state.diffProgress[did].bossesKilled = state.diffProgress[did].bossesKilled || {};
  state.diffProgress[did].bossesKilled[bossId] = true;
  state.bossesEver[bossId] = true;
  if (!firstOnDiff) {
    return { loot, repeat: true, unlockedDiff };
  }
  if (map?.act) grantActClears(state, map.act, hero);
  const unlocked = tryUnlockClasses(state);
  const nextAct = (map?.act || 0) + 1;
  const nextMaps = MAPS.filter(m => m.act === nextAct);
  return { unlockChars: unlocked, loot, act: map?.act, nextAct: nextMaps.length ? nextAct : null, unlockedDiff };
}

function getUnlockProgress(state) {
  return { classes: CLASS_UNLOCKS.map(u => ({ ...u, done: isClassUnlockDone(state, u) })) };
}

function getInvCap(state, hero) {
  const h = hero || getActiveHero(state);
  return INV_CAP + (h?.bagExpands || 0) * BAG_EXPAND_SLOTS;
}

function bagExpandsLeft(state) {
  return Math.max(0, BAG_EXPAND_MAX - (state.bagExpands || 0));
}

function bagExpandCost(state) {
  const n = (state.bagExpands || 0) + 1;
  return {
    gold: Math.floor(10000 * n * n * (1 + (n - 1) * 0.15)),
    metal: 12 * n + 4 * n * n,
    cloth: 12 * n + 4 * n * n,
    crystal: 8 * n + 2 * n * n,
  };
}

function skillResetCost(hero) {
  return 150 + hero.level * 40;
}

function buyBagExpand(state) {
  if ((state.bagExpands || 0) >= BAG_EXPAND_MAX) return { ok: false, reason: '背包已扩到上限' };
  const cost = bagExpandCost(state);
  const pay = payCost(state, cost);
  if (!pay.ok) return pay;
  state.bagExpands = (state.bagExpands || 0) + 1;
  return { ok: true, cost };
}

function buySkillReset(state) {
  const hero = getActiveHero(state);
  const cost = skillResetCost(hero);
  if (state.gold < cost) return { ok: false, reason: '金币不足' };
  const spent = Object.values(hero.skillLevels || {}).reduce((a, b) => a + b, 0);
  const seed = seedSkills(hero.charId, hero.level);
  const seedSpent = Object.values(seed).reduce((a, b) => a + b, 0);
  hero.skillLevels = seed;
  hero.skillPoints = (hero.skillPoints || 0) + Math.max(0, spent - seedSpent);
  state.gold -= cost;
  return { ok: true, cost };
}

function potionKindKey(kind) {
  return kind === 'mana' ? 'manaPotionTier' : 'hpPotionTier';
}

function potionTierDef(state, kind = 'hp') {
  ensurePotionState(state);
  const max = POTION_TIERS.length;
  const lv = Math.max(1, Math.min(max, state[potionKindKey(kind)] || 1));
  return POTION_TIERS[lv - 1];
}

function potionUpgradeCost(state, kind = 'hp') {
  ensurePotionState(state);
  const lv = state[potionKindKey(kind)] || 1;
  if (lv >= POTION_TIERS.length) return { gold: 0 };
  return growthResourceCost(lv * 12 + 6, 16, 0.065);
}

function potionUpgradeBlocked(state, kind = 'hp') {
  ensurePotionState(state);
  const lv = state[potionKindKey(kind)] || 1;
  if (lv >= POTION_TIERS.length) return '药水已达最高级';
  const needHall = lv + 1;
  if (getHallLevel(state) < needHall) return `需议事厅 ${needHall} 级`;
  return '';
}

function usesManaPotions(stats) {
  return (stats?.resId || 'mana') === 'mana';
}

function ensurePotionState(state) {
  if (!state) return;
  if (typeof state.potions === 'number') {
    state.hpPotions = state.potions;
    state.potions = undefined;
  }
  if (state.hpPotions == null) state.hpPotions = 8;
  if (state.manaPotions == null) state.manaPotions = 6;
  if (!state.potionTier) state.potionTier = 1;
  if (state.hpPotionTier == null) state.hpPotionTier = state.potionTier || 1;
  if (state.manaPotionTier == null) state.manaPotionTier = state.potionTier || 1;
  const a = state.potionAuto || {};
  state.potionAuto = {
    buyHp: a.buyHp !== false,
    buyMana: a.buyMana !== false,
    useHp: a.useHp !== false,
    useMana: a.useMana !== false,
    keepHp: a.keepHp || 20,
    keepMana: a.keepMana || 16,
  };
}

function buyPotions(state, n, kind = 'hp') {
  ensurePotionState(state);
  const tier = potionTierDef(state, kind);
  const count = Math.max(1, n || POTION_PACK);
  const cost = tier.unitCost * count;
  if (state.gold < cost) return { ok: false, reason: '金币不足' };
  state.gold -= cost;
  if (kind === 'mana') state.manaPotions = (state.manaPotions || 0) + count;
  else state.hpPotions = (state.hpPotions || 0) + count;
  return { ok: true, cost, count, kind };
}

function upgradePotionTier(state, kind = 'hp') {
  ensurePotionState(state);
  const why = potionUpgradeBlocked(state, kind);
  if (why) return { ok: false, reason: why };
  const cost = potionUpgradeCost(state, kind);
  const pay = payCost(state, cost);
  if (!pay.ok) return pay;
  const key = potionKindKey(kind);
  state[key] = (state[key] || 1) + 1;
  state.potionTier = Math.max(state.hpPotionTier || 1, state.manaPotionTier || 1);
  return { ok: true, cost, kind, tier: potionTierDef(state, kind) };
}

function togglePotionAuto(state, key) {
  ensurePotionState(state);
  if (!(key in state.potionAuto)) return;
  state.potionAuto[key] = !state.potionAuto[key];
}

function autoBuyPotions(state, stats) {
  ensurePotionState(state);
  const a = state.potionAuto;
  const bought = [];
  const one = (kind, on, stock, keep) => {
    if (!on || stock >= keep) return;
    const r = buyPotions(state, POTION_PACK, kind);
    if (r.ok) bought.push(r);
  };
  one('hp', a.buyHp, state.hpPotions || 0, a.keepHp);
  if (usesManaPotions(stats)) one('mana', a.buyMana, state.manaPotions || 0, a.keepMana);
  return bought;
}

function tryUsePotion(state, hero, stats) {
  return tickDrinkPotions(state, hero, stats).usedHp;
}

function tickDrinkPotions(state, hero, stats) {
  const out = { usedHp: false, usedMana: false, healPct: 0, manaPct: 0 };
  if (!hero || hero.isDead || !stats) return out;
  ensurePotionState(state);
  const a = state.potionAuto;
  const hpTier = potionTierDef(state, 'hp');
  const manaTier = potionTierDef(state, 'mana');
  if (a.useHp && stats.maxHp > 0 && hero.currentHp / stats.maxHp <= 0.42 && (state.hpPotions || 0) > 0) {
    state.hpPotions -= 1;
    out.healPct = hpTier.healPct;
    hero.currentHp = Math.min(stats.maxHp, hero.currentHp + stats.maxHp * hpTier.healPct);
    out.usedHp = true;
  }
  if (a.useMana && usesManaPotions(stats) && stats.maxRes > 0
    && (hero.currentRes || 0) / stats.maxRes <= 0.35 && (state.manaPotions || 0) > 0) {
    state.manaPotions -= 1;
    out.manaPct = manaTier.manaPct;
    hero.currentRes = Math.min(stats.maxRes, (hero.currentRes || 0) + stats.maxRes * manaTier.manaPct);
    out.usedMana = true;
  }
  return out;
}
