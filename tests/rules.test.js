const assert = require('assert');
const TD = require('../js/data.js');
require('../js/game.js');

function eq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg);
}

// 八方位
assert.strictEqual(TD.DIRS.length, 8);
eq(TD.DIRS.map((d) => d.name), ['上', '右上', '右', '右下', '下', '左下', '左', '左上']);

// 体型
assert.strictEqual(TD.KINDS.normal.size, 1);
assert.strictEqual(TD.KINDS.elite.size, 2);
assert.strictEqual(TD.KINDS.miniBoss.size, 3);
assert.strictEqual(TD.KINDS.boss.size, 4);
assert.strictEqual(TD.KINDS.powerBoss.size, 6);

// 波次编制：每波精英；3/7 小 Boss；5 Boss；10 强力 Boss（覆盖普通 Boss）
function flags(wave) {
  const s = TD.waveSpecials(wave);
  return [s.elite, s.miniBoss, s.boss, s.powerBoss];
}
eq(flags(1), [true, false, false, false]);
eq(flags(2), [true, false, false, false]);
eq(flags(3), [true, true, false, false]);
eq(flags(5), [true, false, true, false]);
eq(flags(7), [true, true, false, false]);
eq(flags(10), [true, false, false, true]);
eq(flags(13), [true, true, false, false]);
eq(flags(15), [true, false, true, false]);
eq(flags(17), [true, true, false, false]);
eq(flags(20), [true, false, false, true]);

const w10 = TD.composeWave(10);
assert.ok(w10.queue.some((q) => q.kind === 'elite'));
assert.ok(w10.queue.some((q) => q.kind === 'powerBoss'));
assert.ok(!w10.queue.some((q) => q.kind === 'boss'));
assert.ok(!w10.queue.some((q) => q.kind === 'miniBoss'));

const w3 = TD.composeWave(3);
assert.ok(w3.queue.some((q) => q.kind === 'miniBoss'));
assert.ok(w3.queue.some((q) => q.kind === 'elite'));

// 血量 / 防御随波次上升
const n1 = TD.monsterStats('normal', 1);
const n8 = TD.monsterStats('normal', 8);
assert.ok(n8.hp > n1.hp, 'higher wave more hp');
assert.ok(n8.def > n1.def, 'higher wave more def');

// 精英 / Boss 相对普通的 n、m 关系
const elite = TD.monsterStats('elite', 5);
const mini = TD.monsterStats('miniBoss', 5);
const boss = TD.monsterStats('boss', 5);
const power = TD.monsterStats('powerBoss', 5);
const normal = TD.monsterStats('normal', 5);
assert.strictEqual(elite.hp, Math.round(normal.hp * TD.N));
assert.ok(Math.abs(mini.def - Math.round(normal.def * TD.M)) <= 1);
assert.ok(boss.hp > mini.hp);
assert.ok(power.hp > boss.hp);
assert.ok(power.def > boss.def);

// 护甲减免
assert.strictEqual(TD.applyArmor(100, 0), 100);
assert.ok(TD.applyArmor(100, 40) < 100);
assert.ok(TD.applyArmor(100, 200) < TD.applyArmor(100, 40));

// 塔分类
const combat = Object.values(TD.TOWERS).filter((t) => t.category === 'combat');
assert.ok(combat.some((t) => t.combatType === 'melee' && t.aoe === 'inRange'));
assert.ok(combat.some((t) => t.combatType === 'ranged' && !t.aoe));
assert.ok(combat.some((t) => t.combatType === 'magic' && t.magicMode === 'aoe'));
assert.ok(combat.some((t) => t.combatType === 'magic' && t.magicMode === 'single' && t.slow));
assert.ok(combat.some((t) => t.combatType === 'magic' && t.chain));

const support = Object.values(TD.TOWERS).filter((t) => t.category === 'support');
assert.ok(support.filter((t) => t.supportType === 'buff').length >= 3);
const resIds = support.filter((t) => t.supportType === 'resource').map((t) => t.resource).sort();
eq(resIds, ['gold', 'mana', 'mineral', 'stone', 'wood'].sort());

// 升级消耗：近战要石+矿，远程矿+木，魔法木+魔能
const meleeUp = TD.upgradeCost('blade', 1);
assert.ok(meleeUp.gold > 0 && meleeUp.stone > 0 && meleeUp.mineral > 0);
const rangeUp = TD.upgradeCost('archer', 1);
assert.ok(rangeUp.mineral > 0 && rangeUp.wood > 0);
const magicUp = TD.upgradeCost('flame', 1);
assert.ok(magicUp.wood > 0 && magicUp.mana > 0);

// 击杀掉落：普通无魔能，精英/Boss 可出魔能
const rngLow = () => 0.99;
const rngHigh = () => 0.01;
const nDrop = TD.killDrops('normal', rngHigh);
assert.strictEqual(nDrop.mana, 0);
const eDrop = TD.killDrops('elite', rngHigh);
assert.ok(eDrop.mana >= 1);
const pDrop = TD.killDrops('powerBoss', rngLow);
assert.ok(pDrop.mana >= 1 && pDrop.stone >= 1);

// 地图：八条路通向核心，核心不可建造
const map = TD.buildMap();
assert.strictEqual(Object.keys(map.paths).length, 8);
assert.ok(TD.isCore(10, 10));
assert.strictEqual(map.tiles[10][10].kind, 'core');
assert.strictEqual(map.tiles[10][10].build, false);
for (const dir of TD.DIRS) {
  assert.ok(map.paths[dir.id].length > 3, dir.id);
  assert.strictEqual(map.tiles[dir.y][dir.x].kind, 'spawn');
}

// 方向随波次增加，最多 8
assert.strictEqual(TD.dirCountForWave(1), 2);
assert.strictEqual(TD.dirCountForWave(15), 8);

// 模拟：建造、开火、漏怪、资源
const game = new TD.Game({ rng: () => 0.5 });
assert.strictEqual(game.res.gold, TD.START_GOLD);
game.selectBuild('blade');
let placed = false;
for (let y = 0; y < TD.GRID && !placed; y++) {
  for (let x = 0; x < TD.GRID && !placed; x++) {
    if (game.canPlace(x, y, 'blade')) placed = game.tryPlace(x, y);
  }
}
assert.ok(placed, 'can place a melee tower');
assert.ok(game.res.gold < TD.START_GOLD);

game.startWave();
assert.strictEqual(game.wave, 1);
assert.ok(game.waveAlive);
for (let i = 0; i < 4000 && (game.waveAlive || game.monsters.length); i++) {
  game.tick(0.05);
  if (game.phase === 'gameover') break;
}
assert.ok(game.kills + game.leaked > 0, 'wave resolved some monsters');
assert.ok(game.coreHp <= TD.CORE_HP);

// 强力 Boss 技能会封印战斗塔
const g2 = new TD.Game({ rng: () => 0.5 });
g2.selectBuild('archer');
let ax = -1;
let ay = -1;
for (let y = 0; y < TD.GRID; y++) {
  for (let x = 0; x < TD.GRID; x++) {
    if (g2.canPlace(x, y, 'archer')) { ax = x; ay = y; }
  }
}
g2.tryPlace(ax, ay);
const path = g2.map.paths.n;
const near = path[path.length - 2];
g2.towers[0].x = Math.max(0, Math.min(TD.GRID - 1, Math.floor(near.x)));
g2.towers[0].y = Math.max(0, Math.min(TD.GRID - 1, Math.floor(near.y)));
g2.wave = 10;
g2.spawnOne({ kind: 'powerBoss', dir: 'n' });
const bossM = g2.monsters[0];
bossM.x = near.x;
bossM.y = near.y;
bossM.skillCd = 0;
bossM.nextSkill = 'seal';
g2.tickPowerBoss(bossM, 0);
assert.ok(g2.towers[0].sealed > 0, 'power boss seals combat towers');

bossM.skillCd = 0;
bossM.nextSkill = 'weaken';
g2.tickPowerBoss(bossM, 0);
assert.ok(g2.towers[0].weaken > 0, 'power boss weakens combat towers');

console.log('all tower-defense rule tests passed');
