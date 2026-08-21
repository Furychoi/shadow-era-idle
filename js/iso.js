const TILE_W = 54;
const TILE_H = 27;
const GRID_N = 14;

const TILE_PAL = {
  dirt: ['#3a2a18', '#4a3820', '#2a1c10'],
  snow: ['#5a6a78', '#8aa0b0', '#3a4850'],
  rock: ['#3a3a40', '#52525a', '#2a2a30'],
  temple: ['#4a3a28', '#6a5030', '#2a2018'],
  crypt: ['#2a2830', '#3a3848', '#18181e'],
  sand: ['#6a5a30', '#8a7840', '#4a3c20'],
  tomb: ['#4a4030', '#5a5040', '#2e281c'],
  jungle: ['#1e3a1e', '#2a5a28', '#142814'],
  hell: ['#4a1818', '#6a2020', '#2a0c0c'],
  swamp: ['#1a3020', '#2a4830', '#102018'],
  ice: ['#3a5068', '#6a90b0', '#243848'],
  forest: ['#1a2e14', '#2a4a20', '#102010'],
  sewer: ['#2a3228', '#3a4a38', '#1a2018'],
};

function isoToScreen(ix, iy, ox, oy) {
  return {
    x: ox + (ix - iy) * (TILE_W / 2),
    y: oy + (ix + iy) * (TILE_H / 2),
  };
}

class IsoField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.hero = { x: 3.2, y: 9.2, facing: 1 };
    this.monsters = [];
    this.minions = [];
    this.turrets = [];
    this.fx = [];
    this.vfx = [];
    this.drops = [];
    this.tiles = 'dirt';
    this.t = 0;
    this.w = 0;
    this.h = 0;
    this.spinning = false;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 420;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  setScene({ tiles, monsters, heroDead }) {
    this.tiles = tiles || 'dirt';
    this.monsters = monsters || [];
    this.heroDead = heroDead;
  }

  addFx(kind, ix, iy, text, color) {
    this.fx.push({ kind, ix, iy, text, color, life: 0.7 });
  }

  playSkill(skill, from, to, pack, opts = {}) {
    if (!from) return;
    const dest = to || from;
    const kind = opts.kind || skillVfxKind(skill);
    const color = elementColor(skill.element || 'physical');
    const fx = { kind, color, life: 0.55, max: 0.55, x: from.x, y: from.y, tx: dest.x, ty: dest.y };
    if (kind === 'spin') {
      this.vfx = this.vfx.filter(v => v.kind !== 'spin');
      fx.life = Math.max(skill.channel || 0.75, 0.75);
      fx.max = fx.life;
      fx.follow = 'hero';
      fx.x = from.x;
      fx.y = from.y;
      const r = opts.radius || skill.aoeRadius || 3.2;
      fx.rx = r * (TILE_W / 2);
      fx.ry = r * (TILE_H / 2);
      this.vfx.push(fx);
    } else if (kind === 'proj') {
      fx.life = 0.38;
      fx.max = 0.38;
      this.vfx.push(fx);
      if (skill.hits > 1 || skill.chain) {
        const others = (pack || []).filter(m => m && m.hp > 0 && m.iso).slice(0, skill.chain || 3);
        others.forEach((m, i) => {
          this.vfx.push({
            kind: 'proj', color, life: 0.32, max: 0.32, delay: 0.08 * (i + 1),
            x: dest.x, y: dest.y, tx: m.iso.x, ty: m.iso.y,
          });
        });
      }
    } else if (kind === 'nova') {
      fx.life = 0.55;
      fx.max = 0.55;
      fx.x = dest.x;
      fx.y = dest.y;
      this.vfx.push(fx);
    } else if (kind === 'meteor') {
      const r = opts.radius || skill.aoeRadius || 3.2;
      fx.life = 0.95;
      fx.max = 0.95;
      fx.x = dest.x;
      fx.y = dest.y;
      fx.rx = r * (TILE_W / 2);
      fx.ry = r * (TILE_H / 2);
      this.vfx.push(fx);
    } else if (kind === 'blizzard') {
      const r = opts.radius || skill.aoeRadius || 3.6;
      fx.life = opts.duration || skill.duration || 8;
      fx.max = fx.life;
      fx.x = dest.x;
      fx.y = dest.y;
      fx.rx = r * (TILE_W / 2);
      fx.ry = r * (TILE_H / 2);
      fx.shards = Array.from({ length: 14 }, (_, i) => ({
        ang: (i / 14) * Math.PI * 2 + Math.random() * 0.4,
        dist: 0.18 + Math.random() * 0.78,
        delay: Math.random() * 0.45,
        speed: 0.7 + Math.random() * 0.6,
      }));
      this.vfx.push(fx);
    } else if (kind === 'storm') {
      fx.life = 0.9;
      fx.max = 0.9;
      fx.x = dest.x;
      fx.y = dest.y;
      this.vfx.push(fx);
    } else if (kind === 'trap') {
      fx.life = 1.1;
      fx.max = 1.1;
      fx.x = (from.x + dest.x) / 2;
      fx.y = (from.y + dest.y) / 2;
      this.vfx.push(fx);
    } else if (kind === 'slash') {
      fx.life = 0.28;
      fx.max = 0.28;
      fx.x = dest.x;
      fx.y = dest.y;
      this.vfx.push(fx);
    } else {
      fx.life = 0.45;
      fx.max = 0.45;
      fx.x = dest.x;
      fx.y = dest.y;
      this.vfx.push(fx);
    }
  }

  addDrop(drop) {
    this.drops.push({
      ix: drop.ix,
      iy: drop.iy,
      originX: drop.ix,
      originY: drop.iy,
      color: drop.color || '#c7a24a',
      name: drop.name || '掉落',
      gold: drop.gold || 0,
      item: drop.item || null,
      rest: drop.rest ?? 2,
      fly: 0,
      flying: false,
      done: false,
      bounce: Math.random() * Math.PI,
      onPickup: drop.onPickup,
    });
  }

  syncMinions(roster) {
    const prev = {};
    for (const m of this.minions) {
      if (m.key) prev[m.key] = m;
    }
    this.minions = (roster || []).map((r, i) => {
      const key = r.key || `${r.skillId || r.kind}:${i}`;
      const old = prev[key];
      const m = Object.assign(old || {
        x: this.hero.x, y: this.hero.y, atk: Math.random() * 0.4, respawn: 0,
      }, r, { key, i });
      if (old) {
        m.x = old.x;
        m.y = old.y;
        m.atk = old.atk;
        m.respawn = old.respawn || 0;
        if (old.maxHp && r.maxHp && old.maxHp !== r.maxHp) {
          m.hp = Math.max(0, Math.min(r.maxHp, Math.round((old.hp || 0) * r.maxHp / old.maxHp)));
        } else {
          m.hp = old.hp != null ? old.hp : r.maxHp;
        }
      } else {
        m.hp = r.maxHp;
      }
      m.maxHp = r.maxHp;
      return m;
    });
  }

  tick(dt, target, range = 1.4) {
    this.t += dt;
    if (target?.iso?.x != null) {
      const tx = target.iso.x;
      const ty = target.iso.y;
      const dx = tx - this.hero.x;
      const dy = ty - this.hero.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const hold = Math.max(0.85, range * 0.78);
      if (dist > hold) {
        const k = Math.min(1, dt * 2.35);
        const step = dist - hold;
        this.hero.x += (dx / dist) * step * k;
        this.hero.y += (dy / dist) * step * k;
      }
      this.hero.facing = dx >= 0 ? 1 : -1;
    }
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter(f => f.life > 0);

    for (const v of this.vfx) {
      if (v.follow === 'hero') {
        v.x = this.hero.x;
        v.y = this.hero.y;
      }
      if (v.delay > 0) {
        v.delay -= dt;
        continue;
      }
      v.life -= dt;
      if (v.kind === 'proj' && v.max) {
        const t = 1 - Math.max(0, v.life) / v.max;
        v.cx = v.x + (v.tx - v.x) * t;
        v.cy = v.y + (v.ty - v.y) * t;
      }
    }
    this.vfx = this.vfx.filter(v => v.life > 0);

    const n = Math.max(1, this.minions.length);
    const tx = target?.iso?.x;
    const ty = target?.iso?.y;
    this.minions.forEach((m, i) => {
      if ((m.hp || 0) <= 0) {
        m.respawn = (m.respawn || 8) - dt;
        if (m.respawn <= 0) {
          m.hp = m.maxHp;
          m.respawn = 0;
          m.x = this.hero.x;
          m.y = this.hero.y;
        }
        return;
      }
      let gx;
      let gy;
      if (tx != null && m.role === 'melee') {
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const hold = m.atkRange || 1.15;
        gx = tx - (dx / dist) * hold * 0.82;
        gy = ty - (dy / dist) * hold * 0.82;
      } else if (tx != null && m.role === 'ranged') {
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const want = m.atkRange || 3.4;
        if (dist < want * 0.55) {
          gx = m.x - (dx / dist);
          gy = m.y - (dy / dist);
        } else if (dist > want) {
          gx = tx - (dx / dist) * want * 0.8;
          gy = ty - (dy / dist) * want * 0.8;
        } else {
          gx = m.x;
          gy = m.y;
        }
      } else {
        const ang = this.t * 1.15 + (i / n) * Math.PI * 2;
        const rad = m.kind === 'raven' ? 1.6 : 1.15;
        gx = this.hero.x + Math.cos(ang) * rad;
        gy = this.hero.y + Math.sin(ang) * rad * 0.85;
      }
      m.x += (gx - m.x) * Math.min(1, dt * 4);
      m.y += (gy - m.y) * Math.min(1, dt * 4);
    });

    for (const d of this.drops) {
      if (d.done) continue;
      if (!d.flying) {
        d.rest -= dt;
        if (d.rest <= 0) d.flying = true;
      } else {
        d.fly += dt;
        const t = Math.min(1, d.fly / 0.55);
        const ease = 1 - Math.pow(1 - t, 3);
        d.ix = d.originX + (this.hero.x - d.originX) * ease;
        d.iy = d.originY + (this.hero.y - d.originY) * ease;
        if (t >= 1) {
          d.done = true;
          if (d.onPickup) d.onPickup(d);
        }
      }
    }
    this.drops = this.drops.filter(d => !d.done);
  }

  draw(heroChar) {
    if (!this.ctx) return;
    if (!this.w) this.resize();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const ox = w / 2;
    const oy = h * 0.08;
    const pal = TILE_PAL[this.tiles] || TILE_PAL.dirt;

    for (let y = 0; y < GRID_N; y++) {
      for (let x = 0; x < GRID_N; x++) {
        const s = isoToScreen(x, y, ox, oy);
        const shade = (x + y) % 2 === 0 ? pal[0] : pal[1];
        drawTile(ctx, s.x, s.y, shade, pal[2]);
      }
    }

    const sprites = [];
    sprites.push({ z: this.hero.x + this.hero.y, draw: () => this.drawHero(ox, oy, heroChar) });
    for (const m of this.minions) {
      sprites.push({ z: m.x + m.y - 0.05, draw: () => this.drawMinion(ox, oy, m) });
    }
    for (const t of this.turrets || []) {
      sprites.push({ z: t.x + t.y - 0.04, draw: () => this.drawTurret(ox, oy, t) });
    }
    for (const m of this.monsters) {
      if (!m.iso || m.hp <= 0) continue;
      sprites.push({ z: m.iso.x + m.iso.y, draw: () => this.drawMonster(ox, oy, m) });
    }
    sprites.sort((a, b) => a.z - b.z);
    for (const s of sprites) s.draw();

    this.drawVfx(ox, oy);

    for (const d of this.drops) {
      const s = isoToScreen(d.ix, d.iy, ox, oy);
      const bob = d.flying ? 0 : Math.abs(Math.sin(this.t * 4 + d.bounce)) * 5;
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(s.x - 7, s.y - 3, 14, 4);
      ctx.fillStyle = d.color;
      ctx.fillRect(s.x - 6, s.y - 14 - bob, 12, 12);
      ctx.strokeStyle = '#fff8e0';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - 6, s.y - 14 - bob, 12, 12);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.name, s.x, s.y - 18 - bob);
    }

    for (const f of this.fx) {
      const s = isoToScreen(f.ix, f.iy, ox, oy);
      ctx.globalAlpha = Math.max(0, f.life / 0.7);
      ctx.fillStyle = f.color || '#ffe8a0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, s.x, s.y - 28 - (0.7 - f.life) * 24);
      ctx.globalAlpha = 1;
    }
  }

  drawVfx(ox, oy) {
    const ctx = this.ctx;
    for (const v of this.vfx) {
      if (v.delay > 0) continue;
      const a = Math.max(0, v.life / (v.max || 0.5));
      ctx.globalAlpha = a;
      ctx.strokeStyle = v.color;
      ctx.fillStyle = v.color;
      if (v.kind === 'proj') {
        const s = isoToScreen(v.cx ?? v.x, v.cy ?? v.y, ox, oy);
        ctx.fillRect(s.x - 3, s.y - 16, 6, 6);
        ctx.fillRect(s.x - 1, s.y - 20, 2, 4);
      } else if (v.kind === 'nova') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const r = (1 - a) * 28 + 6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 8, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (v.kind === 'burst') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const r = 8 + (1 - a) * 14;
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 10, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v.kind === 'meteor') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const drop = 1 - a;
        const rx = v.rx || 48;
        const ry = v.ry || 24;
        ctx.strokeStyle = '#ff9a40';
        ctx.lineWidth = 2;
        ctx.globalAlpha = a * (drop < 0.72 ? 0.55 : 0.9);
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = a * 0.16;
        ctx.fillStyle = '#ff6a30';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        const rockY = s.y - 108 + drop * 100;
        ctx.globalAlpha = Math.min(1, a + 0.2);
        ctx.fillStyle = '#c45a28';
        ctx.fillRect(s.x - 7, rockY, 14, 16);
        ctx.fillStyle = '#ffb060';
        ctx.fillRect(s.x - 4, rockY + 2, 8, 6);
        if (drop > 0.62) {
          const boom = (drop - 0.62) / 0.38;
          ctx.strokeStyle = '#ffe0a0';
          ctx.lineWidth = 3;
          ctx.globalAlpha = a * (1 - boom) * 0.95;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, rx * (0.55 + boom * 0.5), ry * (0.55 + boom * 0.5), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (v.kind === 'blizzard') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const rx = v.rx || 52;
        const ry = v.ry || 26;
        const fade = Math.min(1, v.life / 0.7);
        const pulse = 0.92 + Math.sin(this.t * 9) * 0.06;
        ctx.strokeStyle = '#9ee8ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = fade * 0.75;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([5, 4]);
        ctx.globalAlpha = fade * 0.4;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = fade * 0.14;
        ctx.fillStyle = '#80d8ff';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const sh of v.shards || []) {
          const elapsed = (v.max || 8) - v.life - sh.delay;
          if (elapsed <= 0) continue;
          const fall = (elapsed * sh.speed) % 1;
          const px = s.x + Math.cos(sh.ang) * rx * sh.dist;
          const py = s.y + Math.sin(sh.ang) * ry * sh.dist;
          const y = py - 52 + fall * 50;
          ctx.globalAlpha = fade * (fall < 0.85 ? 0.95 : 0.35);
          ctx.fillStyle = '#d8f4ff';
          ctx.fillRect(px - 1.5, y, 3, 9);
          ctx.fillStyle = '#7ec8e8';
          ctx.fillRect(px - 1, y + 7, 2, 3);
        }
      } else if (v.kind === 'storm') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        for (let i = 0; i < 5; i++) {
          const ox2 = Math.sin(this.t * 8 + i) * 11;
          ctx.fillRect(s.x + ox2 - 2, s.y - 40 - (i % 3) * 8, 4, 10);
        }
      } else if (v.kind === 'trap') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        ctx.fillRect(s.x - 6, s.y - 10, 12, 8);
        ctx.fillRect(s.x - 2, s.y - 22, 4, 12);
      } else if (v.kind === 'slash') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 12, 16, -0.4, 1.4);
        ctx.stroke();
      } else if (v.kind === 'spin') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const rx = v.rx || 70;
        const ry = v.ry || 35;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e8dcc8';
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffcc66';
        for (let i = 0; i < 4; i++) {
          const ang = this.t * 14 + i * (Math.PI / 2);
          ctx.globalAlpha = a * 0.9;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, rx * 0.92, ry * 0.92, 0, ang, ang + 0.85);
          ctx.stroke();
        }
        ctx.globalAlpha = a * 0.12;
        ctx.fillStyle = '#c8a878';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawHero(ox, oy, heroChar) {
    const s = isoToScreen(this.hero.x, this.hero.y, ox, oy);
    const pal = heroChar?.palette || ['#6a3030', '#c45a3a', '#e8c090'];
    if (this.heroDead) {
      drawBlob(this.ctx, s.x, s.y - 4, 16, 8, '#3a2020');
      return;
    }
    drawChar(this.ctx, s.x, s.y, pal, this.hero.facing, this.t + (this.spinning ? this.t * 8 : 0));
  }

  drawMinion(ox, oy, m) {
    const s = isoToScreen(m.x, m.y, ox, oy);
    const dead = (m.hp || 0) <= 0;
    this.ctx.globalAlpha = dead ? 0.28 : 1;
    if (m.kind === 'raven') {
      const bob = Math.sin(this.t * 14 + m.i) * 4;
      this.ctx.fillStyle = m.pal[0];
      this.ctx.fillRect(s.x - 5, s.y - 18 + bob, 10, 5);
      this.ctx.fillRect(s.x + 4, s.y - 20 + bob, 5, 3);
    } else {
      drawMob(this.ctx, s.x, s.y, m.pal, m.scale || 0.7, this.t + m.i);
    }
    this.ctx.globalAlpha = 1;
    if (m.role === 'ranged') {
      this.ctx.fillStyle = '#80d8ff';
      this.ctx.fillRect(s.x + 6, s.y - 22, 3, 8);
    } else {
      this.ctx.fillStyle = '#e8b060';
      this.ctx.fillRect(s.x + 6, s.y - 16, 5, 5);
    }
    if (m.maxHp) {
      const pct = Math.max(0, (m.hp || 0) / m.maxHp);
      this.ctx.fillStyle = '#1a1010';
      this.ctx.fillRect(s.x - 10, s.y - 26, 20, 3);
      this.ctx.fillStyle = pct > 0.35 ? '#6ee08a' : '#ff6a5a';
      this.ctx.fillRect(s.x - 10, s.y - 26, 20 * pct, 3);
    }
  }

  drawTurret(ox, oy, t) {
    const s = isoToScreen(t.x, t.y, ox, oy);
    const ctx = this.ctx;
    if (t.kind === 'hydra' || t.skillId === 'hydra') {
      ctx.fillStyle = '#3a1810';
      ctx.fillRect(s.x - 9, s.y - 6, 18, 8);
      ctx.fillStyle = '#6a2818';
      ctx.fillRect(s.x - 6, s.y - 10, 12, 6);
      for (let i = 0; i < 3; i++) {
        const bob = Math.sin(this.t * 9 + i * 1.8) * 3;
        const hx = (i - 1) * 7;
        ctx.fillStyle = '#c45a28';
        ctx.fillRect(s.x + hx - 3, s.y - 20 + bob, 6, 14);
        ctx.fillStyle = '#ff8844';
        ctx.fillRect(s.x + hx - 2, s.y - 24 + bob, 4, 5);
        ctx.fillStyle = '#ffe0a0';
        ctx.fillRect(s.x + hx - 1, s.y - 26 + bob, 2, 2);
      }
      return;
    }
    ctx.fillStyle = '#4a4a58';
    ctx.fillRect(s.x - 6, s.y - 10, 12, 8);
    ctx.fillRect(s.x - 2, s.y - 22, 4, 12);
  }

  drawMonster(ox, oy, m) {
    const s = isoToScreen(m.iso.x, m.iso.y, ox, oy);
    if (m.treasureGoblin) {
      drawGoblin(this.ctx, s.x, s.y, this.t + (m.iso.x || 0));
      const pct = Math.max(0, m.hp / m.maxHp);
      this.ctx.fillStyle = '#1a1010';
      this.ctx.fillRect(s.x - 14, s.y - 32, 28, 3);
      this.ctx.fillStyle = '#ffd24a';
      this.ctx.fillRect(s.x - 14, s.y - 32, 28 * pct, 3);
      this.ctx.fillStyle = '#ffe080';
      this.ctx.globalAlpha = 0.55 + Math.sin(this.t * 10) * 0.35;
      this.ctx.fillRect(s.x - 2, s.y - 40, 4, 4);
      this.ctx.globalAlpha = 1;
      return;
    }
    const pal = racePalette(m.race, m.kind);
    const scale = m.isBoss ? 1.45 : m.kind === 'hidden' ? 1.32 : m.kind === 'rare' ? 1.25 : m.kind === 'elite' ? 1.12 : 1;
    drawMob(this.ctx, s.x, s.y, pal, scale, this.t + (m.iso.x || 0));
    if (m.ranged) {
      this.ctx.fillStyle = pal[2];
      this.ctx.fillRect(s.x + 8 * scale, s.y - 18 * scale, 3, 12 * scale);
      this.ctx.fillRect(s.x + 4 * scale, s.y - 14 * scale, 10 * scale, 2);
    }
    if (m.kind === 'hidden') {
      this.ctx.globalAlpha = 0.4 + Math.sin(this.t * 6) * 0.2;
      this.ctx.strokeStyle = '#c080ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(s.x, s.y - 10, 16, 8, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
    const pct = Math.max(0, m.hp / m.maxHp);
    this.ctx.fillStyle = '#1a1010';
    this.ctx.fillRect(s.x - 14, s.y - 36 * scale, 28, 3);
    this.ctx.fillStyle = m.isBoss ? '#e04040' : m.kind === 'hidden' ? '#c080ff' : '#70b050';
    this.ctx.fillRect(s.x - 14, s.y - 36 * scale, 28 * pct, 3);
  }
}

function drawTile(ctx, x, y, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2);
  ctx.lineTo(x, y + TILE_H);
  ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawChar(ctx, x, y, pal, facing, t) {
  const bob = Math.sin(t * 8) * 1;
  const dir = facing >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.fillStyle = pal[0];
  ctx.fillRect(-6 * dir, -18, 8, 10);
  ctx.fillStyle = pal[2];
  ctx.fillRect(-4 * dir, -24, 6, 7);
  ctx.fillStyle = pal[1];
  ctx.fillRect(-5, -10, 10, 8);
  ctx.fillStyle = pal[0];
  ctx.fillRect(-6, -2, 4, 8);
  ctx.fillRect(2, -2, 4, 8);
  ctx.fillStyle = '#d8c070';
  ctx.fillRect(6 * dir, -14, 10, 3);
  ctx.restore();
}

function drawMob(ctx, x, y, pal, scale, t) {
  const bob = Math.sin(t * 6) * 1.2;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.scale(scale, scale);
  ctx.fillStyle = pal[0];
  ctx.fillRect(-8, -14, 16, 14);
  ctx.fillStyle = pal[1];
  ctx.fillRect(-6, -22, 12, 10);
  ctx.fillStyle = pal[2];
  ctx.fillRect(-4, -20, 3, 3);
  ctx.fillRect(2, -20, 3, 3);
  ctx.fillStyle = pal[0];
  ctx.fillRect(-7, 0, 5, 7);
  ctx.fillRect(2, 0, 5, 7);
  ctx.restore();
}

function drawGoblin(ctx, x, y, t) {
  const bob = Math.sin(t * 10) * 1.6;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.fillStyle = '#1e6a28';
  ctx.fillRect(-7, -12, 14, 12);
  ctx.fillStyle = '#3a8a30';
  ctx.fillRect(-5, -20, 10, 9);
  ctx.fillStyle = '#ffe070';
  ctx.fillRect(-3, -18, 2, 2);
  ctx.fillRect(2, -18, 2, 2);
  ctx.fillStyle = '#c07020';
  ctx.fillRect(5, -10, 9, 10);
  ctx.fillStyle = '#e8c040';
  ctx.fillRect(7, -8, 5, 4);
  ctx.fillStyle = '#1e6a28';
  ctx.fillRect(-6, 0, 4, 6);
  ctx.fillRect(2, 0, 4, 6);
  ctx.restore();
}

function racePalette(race, kind) {
  const base = {
    undead: ['#5a6a5a', '#c8d0b0', '#88aa66'],
    demon: ['#6a2020', '#c04030', '#f0a040'],
    beast: ['#5a3a20', '#8a6030', '#e0c080'],
    humanoid: ['#3a3a4a', '#7060a0', '#e0d0c0'],
    insect: ['#2a4a20', '#50a030', '#c0f060'],
    construct: ['#4a4a50', '#808088', '#c0c0c8'],
    elemental: ['#4a2020', '#e05020', '#ffc040'],
  }[race] || ['#404050', '#808090', '#c0c0d0'];
  if (kind === 'hidden') return ['#2a1840', '#a060e0', '#e8c0ff'];
  if (kind === 'rare' || kind === 'rareBoss') return [base[0], '#d4b020', base[2]];
  if (kind === 'elite') return [base[0], '#6080d0', base[2]];
  return base;
}
