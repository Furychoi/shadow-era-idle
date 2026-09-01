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

let _tw = TILE_W;
let _th = TILE_H;

function isoToScreen(ix, iy, ox, oy, tw = _tw, th = _th) {
  return {
    x: ox + (ix - iy) * (tw / 2),
    y: oy + (ix + iy) * (th / 2),
  };
}

function screenToIso(sx, sy, ox, oy, tw = _tw, th = _th) {
  const dx = (sx - ox) / (tw / 2);
  const dy = (sy - oy) / (th / 2);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

function clampIsoAxis(v) {
  return Math.max(0.85, Math.min(GRID_N - 1.35, v));
}

function isoPlayLayout(w, h) {
  const playW = GRID_N * TILE_W;
  const playH = GRID_N * TILE_H;
  const scale = Math.max(w / playW, h / playH) || 1;
  const tw = TILE_W * scale;
  const th = TILE_H * scale;
  return { tw, th, scale, ox: w / 2, oy: (h - GRID_N * th) / 2 };
}

function clampIsoPos(x, y, field) {
  const view = field || (typeof window !== 'undefined' ? window.isoField : null);
  const w = view?.w || 0;
  const h = view?.h || 0;
  if (w < 16 || h < 16) return { x: clampIsoAxis(x), y: clampIsoAxis(y) };
  const { ox, oy, tw, th } = isoPlayLayout(w, h);
  const s = isoToScreen(x, y, ox, oy, tw, th);
  const padX = 36;
  const padTop = 56;
  const padBot = 28;
  const sx = Math.max(padX, Math.min(w - padX, s.x));
  const sy = Math.max(padTop, Math.min(h - padBot, s.y));
  if (sx === s.x && sy === s.y) return { x, y };
  return screenToIso(sx, sy, ox, oy, tw, th);
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

  setScene({ tiles, monsters, heroDead, respawnTimer }) {
    this.tiles = tiles || 'dirt';
    this.monsters = monsters || [];
    this.heroDead = heroDead;
    this.respawnTimer = Number(respawnTimer) || 0;
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
    } else if (kind === 'bolts') {
      const n = Math.max(3, skill.hits || 5);
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.28;
        this.vfx.push({
          kind: 'proj', color, life: 0.44, max: 0.44, delay: i * 0.035,
          x: from.x, y: from.y,
          tx: dest.x + spread, ty: dest.y + ((i % 2) ? 0.2 : -0.14),
        });
      }
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
    } else if (kind === 'firewall') {
      const r = opts.radius || skill.aoeRadius || 3.2;
      fx.life = opts.duration || skill.duration || 6;
      fx.max = fx.life;
      fx.x = dest.x;
      fx.y = dest.y;
      fx.rx = r * (TILE_W / 2);
      fx.ry = (r * 0.45) * (TILE_H / 2);
      fx.flames = Array.from({ length: 12 }, (_, i) => ({
        t: i / 11,
        h: 12 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
      }));
      this.vfx.push(fx);
    } else if (kind === 'storm') {
      const r = opts.radius || skill.aoeRadius || 3.2;
      fx.life = opts.duration || skill.duration || 0.9;
      fx.max = fx.life;
      fx.x = dest.x;
      fx.y = dest.y;
      fx.rx = r * (TILE_W / 2);
      fx.ry = r * (TILE_H / 2);
      if (skill.id === 'hurricane' || skill.id === 'thunderstorm') fx.follow = 'hero';
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
    if (!this.ctx || !this.canvas) return;
    const cw = this.canvas.clientWidth || 640;
    const ch = this.canvas.clientHeight || 420;
    if (!this.w || cw !== this.w || ch !== this.h) this.resize();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    if (w < 8 || h < 8) return;
    const pal = TILE_PAL[this.tiles] || TILE_PAL.dirt;
    ctx.fillStyle = pal[2] || '#08080e';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const layout = isoPlayLayout(w, h);
    _tw = layout.tw;
    _th = layout.th;
    const ox = layout.ox;
    const oy = layout.oy;
    for (const m of this.monsters) {
      if (!m?.iso) continue;
      const p = clampIsoPos(m.iso.x, m.iso.y, this);
      m.iso.x = p.x;
      m.iso.y = p.y;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [sx, sy] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]]) {
      const p = screenToIso(sx, sy, ox, oy);
      minX = Math.min(minX, Math.floor(p.x) - 3);
      maxX = Math.max(maxX, Math.ceil(p.x) + 3);
      minY = Math.min(minY, Math.floor(p.y) - 3);
      maxY = Math.max(maxY, Math.ceil(p.y) + 3);
    }
    minX -= 8;
    maxX += 8;
    minY -= 8;
    maxY += 8;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const s = isoToScreen(x, y, ox, oy);
        const shade = (x + y) % 2 === 0 ? pal[0] : pal[1];
        drawTile(ctx, s.x, s.y, shade, pal[2], pal);
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
        ctx.globalAlpha = a * 0.35;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 10, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillRect(s.x - 4, s.y - 18, 8, 8);
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(s.x - 2, s.y - 16, 4, 4);
        ctx.fillStyle = v.color;
        ctx.fillRect(s.x - 1, s.y - 24, 2, 6);
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
      } else if (v.kind === 'firewall') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const rx = v.rx || 48;
        const ry = v.ry || 16;
        const fade = Math.min(1, v.life / 0.7);
        ctx.globalAlpha = fade * 0.22;
        ctx.fillStyle = '#ff6a30';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const fl of v.flames || []) {
          const wobble = Math.sin(this.t * 10 + fl.phase) * 3;
          const px = s.x + (fl.t - 0.5) * rx * 1.8 + wobble;
          const py = s.y - 4 + Math.sin(this.t * 7 + fl.phase) * 2;
          const h = fl.h + Math.sin(this.t * 12 + fl.phase) * 4;
          ctx.globalAlpha = fade * 0.85;
          ctx.fillStyle = '#ff8844';
          ctx.fillRect(px - 3, py - h, 6, h);
          ctx.globalAlpha = fade * 0.7;
          ctx.fillStyle = '#ffe080';
          ctx.fillRect(px - 1.5, py - h - 4, 3, h * 0.55);
        }
      } else if (v.kind === 'storm') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        const rx = v.rx || 42;
        const ry = v.ry || 21;
        const fade = Math.min(1, v.life / 0.7);
        ctx.strokeStyle = v.color || '#ffe060';
        ctx.lineWidth = 2;
        ctx.globalAlpha = fade * 0.55;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const ox2 = Math.sin(this.t * 9 + i * 1.1) * rx * 0.7;
          const drop = (this.t * 2.4 + i * 0.35) % 1;
          ctx.globalAlpha = fade * (1 - drop) * 0.9;
          ctx.fillStyle = v.color || '#ffe060';
          ctx.fillRect(s.x + ox2 - 2, s.y - 46 + drop * 40, 3, 11);
        }
      } else if (v.kind === 'trap') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        ctx.fillRect(s.x - 6, s.y - 10, 12, 8);
        ctx.fillRect(s.x - 2, s.y - 22, 4, 12);
      } else if (v.kind === 'slash') {
        const s = isoToScreen(v.x, v.y, ox, oy);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 12, 18, -0.55, 1.55);
        ctx.stroke();
        ctx.globalAlpha = a * 0.45;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x + 3, s.y - 8, 12, -0.2, 1.2);
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
    const cid = heroChar?.id || 'berserker';
    if (this.heroDead) {
      this.ctx.save();
      this.ctx.translate(s.x, s.y);
      this.ctx.rotate(-1.15);
      drawHeroSprite(this.ctx, 0, 0, pal, 1, 0, cid, false);
      this.ctx.restore();
      this.ctx.fillStyle = 'rgba(80, 16, 16, 0.55)';
      this.ctx.beginPath();
      this.ctx.ellipse(s.x, s.y + 6, 18, 7, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.fillStyle = '#ff8a8a';
      this.ctx.fillText('倒下', s.x, s.y - 28);
      const left = Math.max(0, this.respawnTimer || 0);
      this.ctx.font = 'bold 15px sans-serif';
      this.ctx.fillStyle = '#fff4d0';
      this.ctx.fillText(`${left.toFixed(1)}s`, s.x, s.y - 12);
      this.ctx.textAlign = 'left';
      return;
    }
    drawUnitShadow(this.ctx, s.x, s.y, 13, 6);
    drawHeroAura(this.ctx, s.x, s.y, cid, this.t, this.spinning);
    drawHeroSprite(this.ctx, s.x, s.y, pal, this.hero.facing, this.t, cid, this.spinning);
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
      drawUnitShadow(this.ctx, s.x, s.y, 9, 4);
      drawMob(this.ctx, s.x, s.y, m.pal, m.scale || 0.7, this.t + m.i, m.race || 'humanoid', 'normal', false);
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
      drawUnitShadow(this.ctx, s.x, s.y, 10, 5);
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
    const scale = m.isBoss || m.kind === 'riftBoss' || m.kind === 'actBoss' || m.kind === 'rareBoss'
      ? 3
      : (m.kind === 'rare' || m.kind === 'hidden') ? 2
      : m.kind === 'elite' ? 1.25
      : 1;
    drawUnitShadow(this.ctx, s.x, s.y, 11 * Math.min(scale, 2.2), 5 * Math.min(scale, 1.8));
    drawKindRing(this.ctx, s.x, s.y, m.kind, scale, this.t);
    drawMob(this.ctx, s.x, s.y, pal, scale, this.t + (m.iso.x || 0), m.race, m.kind, !!m.ranged);
    const pct = Math.max(0, m.hp / m.maxHp);
    const barY = s.y - 38 * Math.min(scale, 2.4);
    this.ctx.fillStyle = '#1a1010';
    this.ctx.fillRect(s.x - 14, barY, 28, 3);
    this.ctx.fillStyle = m.isBoss ? '#e04040' : m.kind === 'hidden' ? '#c080ff' : m.kind === 'rare' || m.kind === 'rareBoss' ? '#ffe060' : '#70b050';
    this.ctx.fillRect(s.x - 14, barY, 28 * pct, 3);
  }
}

function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function drawUnitShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = 'rgba(6, 4, 8, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTile(ctx, x, y, fill, edge, pal) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + _tw / 2, y + _th / 2);
  ctx.lineTo(x, y + _th);
  ctx.lineTo(x - _tw / 2, y + _th / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + _tw / 2, y + _th / 2);
  ctx.strokeStyle = pal?.[1] || fill;
  ctx.globalAlpha = 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawKindRing(ctx, x, y, kind, scale, t) {
  const boss = kind === 'boss' || kind === 'actBoss' || kind === 'riftBoss' || kind === 'rareBoss';
  if (kind === 'normal') return;
  ctx.save();
  if (kind === 'elite') {
    ctx.strokeStyle = '#88b4ff';
    ctx.globalAlpha = 0.45 + Math.sin(t * 5) * 0.12;
  } else if (kind === 'rare' || kind === 'rareBoss') {
    ctx.strokeStyle = '#ffe060';
    ctx.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15;
  } else if (kind === 'hidden') {
    ctx.strokeStyle = '#c080ff';
    ctx.globalAlpha = 0.4 + Math.sin(t * 7) * 0.2;
  } else if (boss) {
    ctx.strokeStyle = '#ff6644';
    ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.18;
  } else {
    ctx.restore();
    return;
  }
  ctx.lineWidth = boss ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12 + scale * 3, 5 + scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHeroAura(ctx, x, y, cid, t, spinning) {
  ctx.save();
  if (cid === 'berserker') {
    ctx.strokeStyle = '#e05030';
    ctx.globalAlpha = spinning ? 0.55 : 0.22;
    ctx.lineWidth = spinning ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 16 + Math.sin(t * 8) * 2, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (spinning) {
      ctx.fillStyle = '#ff8844';
      for (let i = 0; i < 5; i++) {
        const a = t * 10 + i * 1.2;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x + Math.cos(a) * 14 - 1, y - 8 + Math.sin(a) * 5, 2, 5);
      }
    }
  } else if (cid === 'paladin') {
    ctx.strokeStyle = '#f0d070';
    ctx.globalAlpha = 0.4 + Math.sin(t * 4) * 0.12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 15, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x, y - 30, 5 + Math.sin(t * 3), 0, Math.PI * 2);
    ctx.stroke();
  } else if (cid === 'sorceress') {
    const cols = ['#ff6a30', '#80d8ff', '#ffe060'];
    for (let i = 0; i < 3; i++) {
      const a = t * 3.2 + i * (Math.PI * 2 / 3);
      ctx.fillStyle = cols[i];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x + Math.cos(a) * 12 - 2, y - 16 + Math.sin(a) * 5, 4, 4);
    }
  } else if (cid === 'necro') {
    for (let i = 0; i < 4; i++) {
      const fall = (t * 0.55 + i * 0.25) % 1;
      ctx.fillStyle = '#b090d0';
      ctx.globalAlpha = 0.55 * (1 - fall);
      ctx.fillRect(x - 8 + i * 5, y - 6 - fall * 18, 2, 4);
    }
  } else if (cid === 'druid') {
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + i * 1.7;
      ctx.fillStyle = '#80c060';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + Math.cos(a) * 10 - 1, y - 10 + Math.sin(a * 1.4) * 6, 3, 3);
    }
  } else if (cid === 'assassin') {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#a080d0';
    ctx.fillRect(x - 14, y - 22, 6, 16);
  } else if (cid === 'amazon') {
    ctx.strokeStyle = '#c8a050';
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 13, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeroSprite(ctx, x, y, pal, facing, t, cid, spinning) {
  const bob = Math.sin(t * 8) * 1;
  const dir = facing >= 0 ? 1 : -1;
  const d = pal[0];
  const m = pal[1];
  const l = pal[2];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.scale(dir, 1);
  if (cid === 'berserker') {
    px(ctx, -8, -2, 5, 9, d);
    px(ctx, 3, -2, 5, 9, d);
    px(ctx, -7, -14, 14, 12, m);
    px(ctx, -5, -12, 10, 4, '#8a4030');
    px(ctx, -5, -24, 10, 10, l);
    px(ctx, -6, -26, 12, 4, d);
    px(ctx, -8, -24, 3, 3, d);
    px(ctx, 5, -24, 3, 3, d);
    px(ctx, -3, -21, 2, 2, '#1a1010');
    px(ctx, 1, -21, 2, 2, '#1a1010');
    px(ctx, 8, -16, 11, 3, '#c0c0c8');
    px(ctx, 16, -20, 4, 10, '#8a9098');
    px(ctx, 17, -22, 2, 3, '#e05030');
    px(ctx, -19, -14, 11, 3, '#c0c0c8');
    px(ctx, -20, -18, 4, 10, '#8a9098');
    if (spinning) px(ctx, -2, -18, 4, 3, '#ffcc66');
  } else if (cid === 'amazon') {
    px(ctx, -5, -1, 4, 9, '#4a3020');
    px(ctx, 2, -1, 4, 9, '#4a3020');
    px(ctx, -6, -14, 12, 13, m);
    px(ctx, -4, -12, 8, 5, '#3a5a78');
    px(ctx, -4, -24, 8, 10, l);
    px(ctx, -6, -26, 12, 5, '#c8a050');
    px(ctx, 6, -22, 4, 10, '#c8a050');
    px(ctx, -3, -21, 2, 2, '#203040');
    px(ctx, 1, -21, 2, 2, '#203040');
    px(ctx, 8, -18, 3, 16, '#6a4a28');
    px(ctx, 7, -8, 12, 2, '#d8c080');
    px(ctx, 18, -12, 2, 8, '#d8c080');
  } else if (cid === 'sorceress') {
    px(ctx, -6, -2, 12, 10, m);
    px(ctx, -7, -14, 14, 13, d);
    px(ctx, -5, -12, 10, 6, '#5a48a0');
    px(ctx, -4, -25, 8, 11, l);
    px(ctx, -6, -28, 12, 5, '#8860d0');
    px(ctx, 7, -22, 3, 22, '#6a6088');
    px(ctx, 6, -26, 5, 5, '#80d8ff');
    px(ctx, 7, -28, 3, 3, '#ffe0a0');
    px(ctx, -3, -22, 2, 2, '#302050');
    px(ctx, 1, -22, 2, 2, '#302050');
  } else if (cid === 'druid') {
    px(ctx, -6, -1, 4, 8, '#3a2818');
    px(ctx, 2, -1, 4, 8, '#3a2818');
    px(ctx, -7, -13, 14, 12, m);
    px(ctx, -8, -16, 16, 6, d);
    px(ctx, -4, -24, 8, 10, l);
    px(ctx, -8, -30, 3, 8, '#c8d090');
    px(ctx, 5, -30, 3, 8, '#c8d090');
    px(ctx, -10, -28, 2, 5, '#c8d090');
    px(ctx, 8, -28, 2, 5, '#c8d090');
    px(ctx, 7, -18, 3, 16, '#5a3a20');
    px(ctx, 6, -22, 5, 4, '#80c060');
    px(ctx, -3, -21, 2, 2, '#203018');
    px(ctx, 1, -21, 2, 2, '#203018');
  } else if (cid === 'assassin') {
    px(ctx, -5, -1, 4, 9, '#1a1a28');
    px(ctx, 2, -1, 4, 9, '#1a1a28');
    px(ctx, -6, -14, 12, 13, d);
    px(ctx, -4, -12, 8, 5, '#4a3a6a');
    px(ctx, -4, -24, 8, 10, l);
    px(ctx, -5, -26, 10, 6, '#1a1a2a');
    px(ctx, -3, -21, 2, 2, '#e07090');
    px(ctx, 1, -21, 2, 2, '#e07090');
    px(ctx, 8, -12, 8, 3, '#c0c0c8');
    px(ctx, 14, -14, 3, 6, '#e8d0a0');
    px(ctx, -16, -12, 8, 3, '#c0c0c8');
    px(ctx, -17, -14, 3, 6, '#e8d0a0');
  } else if (cid === 'paladin') {
    px(ctx, -6, -1, 5, 9, '#4a4030');
    px(ctx, 2, -1, 5, 9, '#4a4030');
    px(ctx, -7, -14, 14, 13, m);
    px(ctx, -5, -12, 10, 5, '#f0e8c8');
    px(ctx, -4, -24, 8, 10, l);
    px(ctx, -5, -26, 10, 4, '#d4b050');
    px(ctx, -3, -21, 2, 2, '#303018');
    px(ctx, 1, -21, 2, 2, '#303018');
    px(ctx, -14, -16, 8, 14, '#d4b050');
    px(ctx, -12, -14, 4, 10, '#f0e8c8');
    px(ctx, 8, -18, 4, 14, '#c0c0c8');
    px(ctx, 7, -22, 6, 5, '#d4b050');
  } else if (cid === 'necro') {
    px(ctx, -5, -1, 4, 8, '#2a1a2a');
    px(ctx, 2, -1, 4, 8, '#2a1a2a');
    px(ctx, -7, -14, 14, 13, d);
    px(ctx, -5, -12, 10, 6, '#4a3050');
    px(ctx, -5, -26, 10, 12, m);
    px(ctx, -6, -28, 12, 5, '#1a1020');
    px(ctx, -3, -22, 2, 2, '#80ff90');
    px(ctx, 1, -22, 2, 2, '#80ff90');
    px(ctx, 8, -20, 3, 20, '#d8d0c0');
    px(ctx, 7, -24, 5, 5, '#f0e8d8');
    px(ctx, 8, -26, 2, 2, '#80ff90');
  } else {
    px(ctx, -6, -2, 4, 8, d);
    px(ctx, 2, -2, 4, 8, d);
    px(ctx, -5, -10, 10, 8, m);
    px(ctx, -4, -24, 6, 7, l);
    px(ctx, 6, -14, 10, 3, '#d8c070');
  }
  ctx.restore();
}

function drawMob(ctx, x, y, pal, scale, t, race, kind, ranged) {
  const bob = Math.sin(t * 6) * 1.2;
  const d = pal[0];
  const m = pal[1];
  const l = pal[2];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.scale(scale, scale);
  if (race === 'undead') {
    px(ctx, -6, 0, 4, 7, d);
    px(ctx, 2, 0, 4, 7, d);
    px(ctx, -7, -14, 14, 12, d);
    px(ctx, -5, -12, 3, 8, l);
    px(ctx, 2, -12, 3, 8, l);
    px(ctx, -5, -24, 10, 10, m);
    px(ctx, -4, -22, 2, 2, '#88ff88');
    px(ctx, 2, -22, 2, 2, '#88ff88');
    px(ctx, -2, -18, 4, 2, '#203020');
  } else if (race === 'demon') {
    px(ctx, -7, 0, 5, 7, d);
    px(ctx, 2, 0, 5, 7, d);
    px(ctx, -8, -14, 16, 13, d);
    px(ctx, -6, -12, 12, 6, m);
    px(ctx, -5, -24, 10, 10, m);
    px(ctx, -8, -30, 4, 8, l);
    px(ctx, 4, -30, 4, 8, l);
    px(ctx, -4, -21, 2, 2, '#ffe060');
    px(ctx, 2, -21, 2, 2, '#ffe060');
    px(ctx, 8, -8, 6, 3, d);
  } else if (race === 'beast') {
    px(ctx, -10, -2, 6, 8, d);
    px(ctx, 4, -2, 6, 8, d);
    px(ctx, -9, -12, 18, 11, m);
    px(ctx, 6, -16, 10, 8, d);
    px(ctx, 12, -14, 5, 4, l);
    px(ctx, -8, -18, 4, 4, d);
    px(ctx, 8, -14, 2, 2, '#1a1010');
    px(ctx, 14, -14, 2, 2, '#1a1010');
  } else if (race === 'insect') {
    px(ctx, -10, 1, 5, 4, d);
    px(ctx, 5, 1, 5, 4, d);
    px(ctx, -4, 2, 8, 5, d);
    px(ctx, -8, -12, 16, 12, m);
    px(ctx, -5, -22, 10, 10, d);
    px(ctx, -4, -20, 3, 3, l);
    px(ctx, 1, -20, 3, 3, l);
    px(ctx, 8, -10, 7, 4, l);
  } else if (race === 'construct') {
    px(ctx, -7, 0, 5, 7, d);
    px(ctx, 2, 0, 5, 7, d);
    px(ctx, -8, -14, 16, 14, m);
    px(ctx, -6, -12, 4, 4, l);
    px(ctx, 2, -12, 4, 4, l);
    px(ctx, -6, -24, 12, 10, d);
    px(ctx, -3, -21, 2, 2, '#80d8ff');
    px(ctx, 1, -21, 2, 2, '#80d8ff');
    px(ctx, -2, -8, 4, 3, '#c0c0c8');
  } else if (race === 'elemental') {
    px(ctx, -7, -4, 14, 12, d);
    px(ctx, -5, -16, 10, 12, m);
    px(ctx, -3, -22, 6, 6, l);
    px(ctx, -2, -26, 4, 4, '#fff0c0');
    ctx.globalAlpha = 0.45;
    px(ctx, -9, -10, 18, 6, m);
    ctx.globalAlpha = 1;
  } else {
    px(ctx, -6, 0, 4, 7, d);
    px(ctx, 2, 0, 4, 7, d);
    px(ctx, -7, -14, 14, 13, m);
    px(ctx, -5, -12, 10, 5, d);
    px(ctx, -5, -24, 10, 10, l);
    px(ctx, -3, -21, 2, 2, '#201818');
    px(ctx, 1, -21, 2, 2, '#201818');
  }
  if (ranged && race !== 'beast' && race !== 'elemental') {
    px(ctx, 8, -18, 3, 14, l);
    px(ctx, 7, -12, 11, 2, d);
  }
  if (kind === 'hidden') {
    ctx.globalAlpha = 0.35;
    px(ctx, -10, -20, 20, 16, '#c080ff');
  }
  ctx.restore();
}

function drawGoblin(ctx, x, y, t) {
  const bob = Math.sin(t * 10) * 1.6;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  px(ctx, -6, 0, 4, 6, '#1e6a28');
  px(ctx, 2, 0, 4, 6, '#1e6a28');
  px(ctx, -7, -12, 14, 12, '#1e6a28');
  px(ctx, -5, -10, 10, 5, '#3a8a30');
  px(ctx, -5, -20, 10, 9, '#3a8a30');
  px(ctx, -7, -22, 3, 5, '#1e6a28');
  px(ctx, 4, -22, 3, 5, '#1e6a28');
  px(ctx, -3, -18, 2, 2, '#ffe070');
  px(ctx, 2, -18, 2, 2, '#ffe070');
  px(ctx, 5, -10, 10, 11, '#c07020');
  px(ctx, 7, -8, 6, 5, '#e8c040');
  px(ctx, 8, -6, 4, 2, '#ffe080');
  ctx.restore();
}

function racePalette(race, kind) {
  const base = {
    undead: ['#4a5848', '#c8d0b0', '#88aa66'],
    demon: ['#5a1818', '#c04030', '#f0a040'],
    beast: ['#4a3018', '#8a6030', '#e0c080'],
    humanoid: ['#3a3a4a', '#7060a0', '#e0d0c0'],
    insect: ['#244018', '#50a030', '#c0f060'],
    construct: ['#3a3a44', '#808088', '#c0c0c8'],
    elemental: ['#4a1810', '#e05020', '#ffc040'],
  }[race] || ['#404050', '#808090', '#c0c0d0'];
  if (kind === 'hidden') return ['#2a1840', '#a060e0', '#e8c0ff'];
  if (kind === 'rare' || kind === 'rareBoss') return [base[0], '#d4b020', base[2]];
  if (kind === 'elite') return [base[0], '#6080d0', base[2]];
  return base;
}
