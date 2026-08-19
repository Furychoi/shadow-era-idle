const TILE_W = 64;
const TILE_H = 32;

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
};

export function isoToScreen(ix, iy, ox, oy) {
  return {
    x: ox + (ix - iy) * (TILE_W / 2),
    y: oy + (ix + iy) * (TILE_H / 2),
  };
}

export class IsoField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hero = { x: 2.2, y: 4.2, facing: 1 };
    this.monsters = [];
    this.fx = [];
    this.tiles = 'dirt';
    this.t = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 360;
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

  tick(dt, target) {
    this.t += dt;
    const tx = target ? target.iso.x - 0.9 : 2.2;
    const ty = target ? target.iso.y + 0.4 : 4.2;
    this.hero.x += (tx - this.hero.x) * Math.min(1, dt * 3.2);
    this.hero.y += (ty - this.hero.y) * Math.min(1, dt * 3.2);
    this.hero.facing = tx >= this.hero.x ? 1 : -1;
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter(f => f.life > 0);
  }

  draw(heroChar) {
    if (!this.w) this.resize();
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const ox = w / 2;
    const oy = h * 0.22;
    const pal = TILE_PAL[this.tiles] || TILE_PAL.dirt;

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const s = isoToScreen(x, y, ox, oy);
        const shade = (x + y) % 2 === 0 ? pal[0] : pal[1];
        drawTile(ctx, s.x, s.y, shade, pal[2]);
      }
    }

    const sprites = [];
    sprites.push({ z: this.hero.x + this.hero.y, draw: () => this.drawHero(ox, oy, heroChar) });
    for (const m of this.monsters) {
      if (!m.iso || m.hp <= 0) continue;
      sprites.push({ z: m.iso.x + m.iso.y, draw: () => this.drawMonster(ox, oy, m) });
    }
    sprites.sort((a, b) => a.z - b.z);
    for (const s of sprites) s.draw();

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

  drawHero(ox, oy, heroChar) {
    const s = isoToScreen(this.hero.x, this.hero.y, ox, oy);
    const pal = heroChar?.palette || ['#6a3030', '#c45a3a', '#e8c090'];
    if (this.heroDead) {
      drawBlob(this.ctx, s.x, s.y - 4, 16, 8, '#3a2020');
      return;
    }
    drawChar(this.ctx, s.x, s.y, pal, this.hero.facing, this.t);
  }

  drawMonster(ox, oy, m) {
    const s = isoToScreen(m.iso.x, m.iso.y, ox, oy);
    const pal = racePalette(m.race, m.kind);
    const scale = m.isBoss ? 1.45 : m.kind === 'rare' ? 1.25 : m.kind === 'elite' ? 1.12 : 1;
    drawMob(this.ctx, s.x, s.y, pal, scale, this.t + (m.iso.x || 0));
    const pct = Math.max(0, m.hp / m.maxHp);
    this.ctx.fillStyle = '#1a1010';
    this.ctx.fillRect(s.x - 14, s.y - 36 * scale, 28, 3);
    this.ctx.fillStyle = m.isBoss ? '#e04040' : '#70b050';
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

function drawBlob(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
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
  if (kind === 'rare' || kind === 'rareBoss') return [base[0], '#d4b020', base[2]];
  if (kind === 'elite') return [base[0], '#6080d0', base[2]];
  return base;
}
