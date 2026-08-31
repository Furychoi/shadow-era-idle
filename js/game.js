// 暗影防线 — 模拟：波次、移动、战斗、资源、Boss 技能
(function (root) {
  const TD = root.TD;
  if (!TD) throw new Error('TD data missing');

  let _id = 1;
  function nid() { return _id++; }

  class Game {
    constructor(opts = {}) {
      this.rng = opts.rng || Math.random;
      this.map = TD.buildMap();
      this.reset();
    }

    reset() {
      this.wave = 0;
      this.phase = 'ready';
      this.coreHp = TD.CORE_HP;
      this.coreMax = TD.CORE_HP;
      this.res = { gold: TD.START_GOLD, stone: 0, mineral: 0, wood: 0, mana: 0 };
      this.towers = [];
      this.monsters = [];
      this.projectiles = [];
      this.fx = [];
      this.log = [{ t: 0, text: '八方裂口已打开。在道路旁布防，守住核心。' }];
      this.pending = [];
      this.spawnWait = 0;
      this.waveAlive = false;
      this.selectedId = null;
      this.buildId = null;
      this.speed = 1;
      this.paused = false;
      this.time = 0;
      this.kills = 0;
      this.leaked = 0;
      this.earlyBonus = 0;
      this.banner = null;
      this.hover = null;
      this.prepareLeft = 0;
      this.bestWave = loadBest();
    }

    logMsg(text) {
      this.log.unshift({ t: this.time, text });
      if (this.log.length > 40) this.log.pop();
    }

    bannerMsg(text, life = 2.2) {
      this.banner = { text, life };
    }

    selectBuild(id) {
      if (this.phase === 'gameover') return;
      this.buildId = this.buildId === id ? null : id;
      this.selectedId = null;
    }

    selectTower(id) {
      this.selectedId = id;
      this.buildId = null;
    }

    towerAt(tx, ty) {
      return this.towers.find((t) => t.x === tx && t.y === ty);
    }

    tileAt(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= TD.GRID || ty >= TD.GRID) return null;
      return this.map.tiles[ty][tx];
    }

    canPlace(tx, ty, towerId) {
      const tile = this.tileAt(tx, ty);
      if (!tile || !tile.build) return false;
      if (this.towerAt(tx, ty)) return false;
      const cost = TD.buildCost(towerId);
      if (!TD.canPay(this.res, cost)) return false;
      return true;
    }

    tryPlace(tx, ty) {
      if (!this.buildId) return false;
      if (!this.canPlace(tx, ty, this.buildId)) return false;
      const def = TD.TOWERS[this.buildId];
      const cost = TD.buildCost(this.buildId);
      this.res = TD.pay(this.res, cost);
      const tower = {
        id: nid(),
        type: def.id,
        x: tx,
        y: ty,
        level: 1,
        cd: 0.2,
        prodAcc: 0,
        spent: { ...cost },
        sealed: 0,
        weaken: 0,
        targetMode: 'first',
      };
      this.towers.push(tower);
      this.selectedId = tower.id;
      this.buildId = def.id;
      this.logMsg(`建造 ${def.name}`);
      return true;
    }

    selected() {
      return this.towers.find((t) => t.id === this.selectedId) || null;
    }

    upgradeSelected() {
      const t = this.selected();
      if (!t || t.level >= TD.MAX_TOWER_LV) return false;
      const cost = TD.upgradeCost(t.type, t.level);
      if (!TD.canPay(this.res, cost)) return false;
      this.res = TD.pay(this.res, cost);
      t.level += 1;
      t.spent = TD.addRes(t.spent, cost);
      this.logMsg(`${TD.TOWERS[t.type].name} 升至 ${t.level} 级`);
      return true;
    }

    sellSelected() {
      const t = this.selected();
      if (!t) return false;
      const refund = TD.sellRefund(t);
      this.res.gold += refund.gold;
      this.towers = this.towers.filter((x) => x.id !== t.id);
      this.selectedId = null;
      this.logMsg(`拆除 ${TD.TOWERS[t.type].name}，返还 ${refund.gold} 金币`);
      return true;
    }

    startWave() {
      if (this.phase === 'gameover') return false;
      if (this.waveAlive) return false;
      this.wave += 1;
      const plan = TD.composeWave(this.wave);
      this.pending = plan.queue.slice();
      this.spawnWait = 0.15;
      this.waveAlive = true;
      this.phase = 'combat';
      this.prepareLeft = 0;
      const extra = this.earlyBonus > 0.4 ? Math.floor(8 + this.wave * 1.2) : 0;
      if (extra) {
        this.res.gold += extra;
        this.logMsg(`提前开战，奖金币 ${extra}`);
      }
      this.earlyBonus = 0;
      const tag = TD.waveLabel(this.wave);
      this.bannerMsg(`第 ${this.wave} 波 · ${tag}`, 2.4);
      this.logMsg(`第 ${this.wave} 波来袭（${plan.dirs.map((id) => TD.DIRS.find((d) => d.id === id).name).join('/')}）· ${tag}`);
      return true;
    }

    nextWavePreview() {
      return TD.composeWave(this.wave + 1);
    }

    spawnOne(entry) {
      const stats = TD.monsterStats(entry.kind, this.wave);
      const path = this.map.paths[entry.dir];
      if (!path || !path.length) return;
      const start = path[0];
      this.monsters.push({
        id: nid(),
        kind: entry.kind,
        dir: entry.dir,
        name: stats.name,
        hp: stats.hp,
        maxHp: stats.hp,
        def: stats.def,
        speed: stats.speed,
        leak: stats.leak,
        gold: stats.gold,
        color: stats.color,
        size: stats.size,
        x: start.x,
        y: start.y,
        pathIndex: 0,
        slow: 0,
        slowMul: 1,
        skillCd: entry.kind === 'powerBoss' ? 4.5 : 0,
        nextSkill: 'seal',
      });
    }

    dist2(ax, ay, bx, by) {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    }

    progressOf(m) {
      const path = this.map.paths[m.dir];
      return m.pathIndex / Math.max(1, path.length - 1);
    }

    monstersInRange(x, y, range) {
      const r2 = range * range;
      const list = [];
      for (const m of this.monsters) {
        if (m.hp <= 0) continue;
        if (this.dist2(x, y, m.x, m.y) <= r2) list.push(m);
      }
      return list;
    }

    pickTarget(tower, stats) {
      const cx = tower.x + 0.5;
      const cy = tower.y + 0.5;
      const list = this.monstersInRange(cx, cy, stats.range);
      if (!list.length) return null;
      if (tower.targetMode === 'strong') {
        list.sort((a, b) => b.maxHp - a.maxHp || this.progressOf(b) - this.progressOf(a));
      } else if (tower.targetMode === 'close') {
        list.sort((a, b) => this.dist2(cx, cy, a.x, a.y) - this.dist2(cx, cy, b.x, b.y));
      } else {
        list.sort((a, b) => this.progressOf(b) - this.progressOf(a));
      }
      return list[0];
    }

    towerBuffs(tower) {
      if (tower.sealed > 0) return { sealed: true, attackSpeed: 0, range: 0, damage: 0, weaken: 0 };
      const acc = { attackSpeed: 0, range: 0, damage: 0, weaken: tower.weaken > 0 ? 0.4 : 0, sealed: false };
      const combat = TD.TOWERS[tower.type].category === 'combat';
      if (!combat) return acc;
      for (const s of this.towers) {
        const def = TD.TOWERS[s.type];
        if (def.supportType !== 'buff') continue;
        const range = def.range * (1 + (s.level - 1) * 0.05);
        if (this.dist2(tower.x + 0.5, tower.y + 0.5, s.x + 0.5, s.y + 0.5) <= range * range) {
          acc[def.buff] += TD.buffValue(s.type, s.level);
        }
      }
      return acc;
    }

    hitMonster(m, rawDmg, color) {
      if (!m || m.hp <= 0) return 0;
      const dmg = TD.applyArmor(rawDmg, m.def);
      m.hp -= dmg;
      this.fx.push({ kind: 'dmg', x: m.x, y: m.y, text: String(dmg), color: color || '#f0e6d0', life: 0.7 });
      if (m.hp <= 0) this.killMonster(m);
      return dmg;
    }

    killMonster(m) {
      if (m._dead) return;
      m._dead = true;
      m.hp = 0;
      this.kills += 1;
      this.res.gold += m.gold;
      const extra = TD.killDrops(m.kind, this.rng);
      this.res = TD.addRes(this.res, extra);
      const bits = [`+${m.gold}金`];
      for (const k of TD.RES_KEYS) {
        if (k !== 'gold' && extra[k]) bits.push(`+${extra[k]}${TD.RES[k].name}`);
      }
      this.logMsg(`击杀 ${kindTitle(m)} ${bits.join(' ')}`);
      this.fx.push({ kind: 'burst', x: m.x, y: m.y, color: m.color, life: 0.45 });
    }

    leakMonster(m) {
      if (m._dead) return;
      m._dead = true;
      m.hp = 0;
      this.leaked += 1;
      this.coreHp = Math.max(0, this.coreHp - m.leak);
      this.logMsg(`${kindTitle(m)} 突入核心，耐久 -${m.leak}`);
      this.fx.push({ kind: 'leak', x: TD.coreCenter().x + 0.5, y: TD.coreCenter().y + 0.5, life: 0.6 });
      if (this.coreHp <= 0) this.gameOver();
    }

    gameOver() {
      this.phase = 'gameover';
      this.waveAlive = false;
      this.pending = [];
      this.paused = true;
      this.bannerMsg('核心碎裂', 8);
      this.logMsg(`防守失败。坚持到第 ${this.wave} 波，击杀 ${this.kills}`);
      if (this.wave > this.bestWave) {
        this.bestWave = this.wave;
        saveBest(this.wave);
      }
    }

    applySlow(m, pct, dur) {
      if (m.kind === 'powerBoss') pct *= 0.45;
      else if (m.kind === 'boss') pct *= 0.7;
      m.slow = Math.max(m.slow, dur);
      m.slowMul = Math.min(m.slowMul || 1, 1 - pct);
    }

    fireTower(tower, def, stats) {
      const cx = tower.x + 0.5;
      const cy = tower.y + 0.5;
      if (def.aoe === 'inRange') {
        const list = this.monstersInRange(cx, cy, stats.range);
        if (!list.length) return false;
        this.fx.push({ kind: 'slash', x: cx, y: cy, r: stats.range, color: def.color2, life: 0.22 });
        for (const m of list) this.hitMonster(m, stats.damage, def.color2);
        return true;
      }
      const target = this.pickTarget(tower, stats);
      if (!target) return false;
      this.projectiles.push({
        id: nid(),
        type: def.id,
        x: cx,
        y: cy,
        tx: target.x,
        ty: target.y,
        targetId: target.id,
        speed: def.combatType === 'ranged' ? 10 : 8,
        damage: stats.damage,
        splash: def.aoe === 'splash' ? stats.splash : 0,
        slow: def.slow || null,
        chain: def.chain ? { ...def.chain, remain: def.chain.extra } : null,
        color: def.color2,
        fromX: cx,
        fromY: cy,
      });
      return true;
    }

    tickProjectiles(dt) {
      const keep = [];
      for (const p of this.projectiles) {
        const tgt = this.monsters.find((m) => m.id === p.targetId && m.hp > 0);
        if (tgt) {
          p.tx = tgt.x;
          p.ty = tgt.y;
        }
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const step = p.speed * dt;
        if (step >= dist) {
          this.impact(p, tgt);
        } else {
          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;
          keep.push(p);
        }
      }
      this.projectiles = keep;
    }

    impact(p, tgt) {
      const hit = tgt && tgt.hp > 0 ? tgt : null;
      const x = hit ? hit.x : p.tx;
      const y = hit ? hit.y : p.ty;
      if (p.splash > 0) {
        this.fx.push({ kind: 'boom', x, y, r: p.splash, color: p.color, life: 0.32 });
        for (const m of this.monstersInRange(x, y, p.splash)) this.hitMonster(m, p.damage, p.color);
        return;
      }
      if (hit) {
        this.hitMonster(hit, p.damage, p.color);
        if (p.slow) this.applySlow(hit, p.slow.pct, p.slow.dur);
        if (p.chain && p.chain.remain > 0) {
          const next = this.monstersInRange(hit.x, hit.y, p.chain.radius)
            .filter((m) => m.id !== hit.id)
            .sort((a, b) => this.dist2(hit.x, hit.y, a.x, a.y) - this.dist2(hit.x, hit.y, b.x, b.y))[0];
          if (next) {
            this.projectiles.push({
              ...p,
              id: nid(),
              x: hit.x,
              y: hit.y,
              targetId: next.id,
              tx: next.x,
              ty: next.y,
              damage: p.damage * p.chain.falloff,
              chain: { ...p.chain, remain: p.chain.remain - 1 },
              speed: 14,
            });
          }
        }
      }
    }

    tickMonsters(dt) {
      const keep = [];
      for (const m of this.monsters) {
        if (m.hp <= 0 || m._dead) continue;
        if (m.slow > 0) {
          m.slow -= dt;
          if (m.slow <= 0) m.slowMul = 1;
        }
        const path = this.map.paths[m.dir];
        const speed = m.speed * (m.slowMul || 1);
        let remain = speed * dt;
        while (remain > 0 && m.pathIndex < path.length - 1) {
          const next = path[m.pathIndex + 1];
          const dx = next.x - m.x;
          const dy = next.y - m.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          if (remain >= dist) {
            m.x = next.x;
            m.y = next.y;
            m.pathIndex += 1;
            remain -= dist;
          } else {
            m.x += (dx / dist) * remain;
            m.y += (dy / dist) * remain;
            remain = 0;
          }
        }
        if (m.pathIndex >= path.length - 1) {
          this.leakMonster(m);
          continue;
        }
        if (m.kind === 'powerBoss') this.tickPowerBoss(m, dt);
        keep.push(m);
      }
      this.monsters = keep;
    }

    tickPowerBoss(m, dt) {
      m.skillCd -= dt;
      if (m.skillCd > 0) return;
      m.skillCd = 7.2;
      const combatTowers = this.towers.filter((t) => TD.TOWERS[t.type].category === 'combat');
      if (!combatTowers.length) return;
      if (m.nextSkill === 'seal') {
        const near = combatTowers
          .map((t) => ({ t, d: this.dist2(m.x, m.y, t.x + 0.5, t.y + 0.5) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        for (const row of near) {
          row.t.sealed = 3.6;
          this.fx.push({ kind: 'seal', x: row.t.x + 0.5, y: row.t.y + 0.5, life: 3.6 });
        }
        this.bannerMsg('强力Boss · 封印', 1.8);
        this.logMsg(`${kindTitle(m)} 释放「封印」，战斗塔暂时无法开火`);
        m.nextSkill = 'weaken';
      } else {
        let n = 0;
        for (const t of combatTowers) {
          if (this.dist2(m.x, m.y, t.x + 0.5, t.y + 0.5) <= 5.2 * 5.2) {
            t.weaken = 5.2;
            n += 1;
            this.fx.push({ kind: 'weaken', x: t.x + 0.5, y: t.y + 0.5, life: 1.2 });
          }
        }
        this.bannerMsg('强力Boss · 弱化', 1.8);
        this.logMsg(`${kindTitle(m)} 释放「弱化」，${n} 座战斗塔输出下降`);
        m.nextSkill = 'seal';
      }
    }

    tickTowers(dt) {
      for (const t of this.towers) {
        if (t.sealed > 0) t.sealed = Math.max(0, t.sealed - dt);
        if (t.weaken > 0) t.weaken = Math.max(0, t.weaken - dt);
        const def = TD.TOWERS[t.type];
        if (def.supportType === 'resource') {
          const y = TD.resourceYield(t.type, t.level);
          t.prodAcc += dt;
          if (t.prodAcc >= y.interval) {
            t.prodAcc -= y.interval;
            this.res[y.resource] = (this.res[y.resource] || 0) + y.amount;
            this.fx.push({
              kind: 'res', x: t.x + 0.5, y: t.y + 0.5,
              text: `+${y.amount}`, color: TD.RES[y.resource].color, life: 0.8,
            });
          }
          continue;
        }
        if (def.category !== 'combat') continue;
        const stats = TD.combatStats(t.type, t.level, this.towerBuffs(t));
        if (stats.sealed) continue;
        t.cd -= dt;
        if (t.cd > 0) continue;
        if (this.fireTower(t, def, stats)) t.cd = stats.interval;
        else t.cd = 0.12;
      }
    }

    tickFx(dt) {
      this.fx = this.fx.filter((f) => {
        f.life -= dt;
        return f.life > 0;
      });
      if (this.banner) {
        this.banner.life -= dt;
        if (this.banner.life <= 0) this.banner = null;
      }
    }

    tick(dt) {
      if (this.paused || this.phase === 'gameover') {
        this.tickFx(Math.min(dt, 0.05));
        return;
      }
      dt *= this.speed || 1;
      this.time += dt;
      if (this.waveAlive) {
        this.spawnWait -= dt;
        while (this.pending.length && this.spawnWait <= 0) {
          const next = this.pending.shift();
          this.spawnOne(next);
          this.spawnWait += next.delay || 0.36;
        }
        this.tickMonsters(dt);
        this.tickTowers(dt);
        this.tickProjectiles(dt);
        if (!this.pending.length && !this.monsters.length && !this.projectiles.length) {
          this.waveAlive = false;
          this.phase = 'ready';
          this.prepareLeft = 8;
          this.earlyBonus = 8;
          this.bannerMsg(`第 ${this.wave} 波肃清`, 1.6);
          this.logMsg('波次结束。建造、升级，或提前开始下一波。');
          if (this.wave > this.bestWave) {
            this.bestWave = this.wave;
            saveBest(this.wave);
          }
        }
      } else if (this.phase === 'ready' && this.wave > 0) {
        this.prepareLeft -= dt;
        this.earlyBonus = Math.max(0, this.prepareLeft);
        if (this.prepareLeft <= 0) this.startWave();
      }
      this.tickFx(dt);
    }
  }

  function kindTitle(m) {
    const dir = TD.DIRS.find((d) => d.id === m.dir);
    const from = dir ? dir.name : '';
    if (m.kind === 'normal') return `普通怪`;
    return `${TD.KINDS[m.kind].name}${from ? `（${from}）` : ''}`;
  }

  function loadBest() {
    try {
      return Number(localStorage.getItem(TD.SAVE_KEY) || 0) || 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBest(wave) {
    try { localStorage.setItem(TD.SAVE_KEY, String(wave)); } catch (_) { /* ignore */ }
  }

  TD.Game = Game;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
