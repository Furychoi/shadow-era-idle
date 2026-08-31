// 暗影防线 — 战场绘制
(function (root) {
  const TD = root.TD;

  function hash(x, y) {
    return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.t = 0;
      this.layout = { size: 28, ox: 0, oy: 0 };
      this.resize();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || 720;
      const h = this.canvas.clientHeight || 720;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = w;
      this.h = h;
      const pad = 10;
      const size = Math.min((w - pad * 2) / TD.GRID, (h - pad * 2) / TD.GRID);
      this.layout = {
        size,
        ox: (w - size * TD.GRID) / 2,
        oy: (h - size * TD.GRID) / 2,
      };
    }

    screenToTile(sx, sy) {
      const { size, ox, oy } = this.layout;
      const tx = Math.floor((sx - ox) / size);
      const ty = Math.floor((sy - oy) / size);
      if (tx < 0 || ty < 0 || tx >= TD.GRID || ty >= TD.GRID) return null;
      return { x: tx, y: ty };
    }

    tileToScreen(x, y) {
      const { size, ox, oy } = this.layout;
      return { x: ox + x * size, y: oy + y * size, s: size };
    }

    draw(game, hover) {
      const ctx = this.ctx;
      this.t += 0.016;
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawBackdrop(ctx);
      this.drawTiles(ctx, game);
      this.drawCore(ctx, game);
      this.drawSpawn(ctx, game);
      if (game.buildId || game.selected()) this.drawRanges(ctx, game, hover);
      this.drawTowers(ctx, game);
      this.drawMonsters(ctx, game);
      this.drawProjectiles(ctx, game);
      this.drawFx(ctx, game);
      if (hover) this.drawHover(ctx, game, hover);
      if (game.banner) this.drawBanner(ctx, game);
    }

    drawBackdrop(ctx) {
      const g = ctx.createRadialGradient(this.w * 0.5, this.h * 0.5, 20, this.w * 0.5, this.h * 0.5, this.w * 0.7);
      g.addColorStop(0, '#1a1824');
      g.addColorStop(1, '#0a0a10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    drawTiles(ctx, game) {
      const { size, ox, oy } = this.layout;
      for (let y = 0; y < TD.GRID; y++) {
        for (let x = 0; x < TD.GRID; x++) {
          const tile = game.map.tiles[y][x];
          const px = ox + x * size;
          const py = oy + y * size;
          const n = hash(x, y);
          if (tile.kind === 'path' || tile.kind === 'spawn') {
            ctx.fillStyle = n > 0.5 ? '#3a3228' : '#332c24';
            ctx.fillRect(px, py, size + 0.5, size + 0.5);
            ctx.fillStyle = 'rgba(90,70,40,0.25)';
            ctx.fillRect(px + size * 0.15, py + size * 0.4, size * 0.2, size * 0.12);
          } else if (tile.kind === 'core') {
            ctx.fillStyle = '#2a2438';
            ctx.fillRect(px, py, size + 0.5, size + 0.5);
          } else {
            ctx.fillStyle = n > 0.55 ? '#1c2a1c' : '#182418';
            ctx.fillRect(px, py, size + 0.5, size + 0.5);
            if (n > 0.82) {
              ctx.fillStyle = 'rgba(70,110,50,0.35)';
              ctx.fillRect(px + size * 0.3, py + size * 0.3, size * 0.18, size * 0.18);
            }
          }
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, size * TD.GRID, size * TD.GRID);
    }

    drawCore(ctx, game) {
      const c = TD.coreCenter();
      const { size, ox, oy } = this.layout;
      const cx = ox + (c.x + 0.5) * size;
      const cy = oy + (c.y + 0.5) * size;
      const r = size * 1.35;
      const pulse = 1 + Math.sin(this.t * 3) * 0.05;
      const hp = game.coreHp / game.coreMax;
      ctx.save();
      ctx.shadowColor = `rgba(160,90,255,${0.35 + hp * 0.35})`;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        const x = cx + Math.cos(a) * r * pulse;
        const y = cy + Math.sin(a) * r * pulse;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = hp > 0.35 ? '#6a48c8' : '#a04050';
      ctx.fill();
      ctx.strokeStyle = '#e8d8ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#f4eeff';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.42);
      ctx.lineTo(cx + r * 0.22, cy);
      ctx.lineTo(cx, cy + r * 0.42);
      ctx.lineTo(cx - r * 0.22, cy);
      ctx.closePath();
      ctx.fill();
      const bw = size * 2.4;
      const bh = 5;
      ctx.fillStyle = '#1a1018';
      ctx.fillRect(cx - bw / 2, cy + r + 6, bw, bh);
      ctx.fillStyle = hp > 0.4 ? '#6ad070' : '#d06060';
      ctx.fillRect(cx - bw / 2, cy + r + 6, bw * hp, bh);
    }

    drawSpawn(ctx, game) {
      const { size, ox, oy } = this.layout;
      const active = new Set();
      if (game.waveAlive) {
        for (const m of game.monsters) active.add(m.dir);
        for (const p of game.pending) active.add(p.dir);
      } else {
        TD.pickDirs(game.wave + 1).forEach((id) => active.add(id));
      }
      for (const dir of TD.DIRS) {
        const px = ox + (dir.x + 0.5) * size;
        const py = oy + (dir.y + 0.5) * size;
        const on = active.has(dir.id);
        const pulse = on ? 1 + Math.sin(this.t * 5) * 0.12 : 1;
        ctx.beginPath();
        ctx.arc(px, py, size * (on ? 0.46 : 0.32) * pulse, 0, Math.PI * 2);
        ctx.fillStyle = on ? 'rgba(220,70,50,0.92)' : 'rgba(80,50,60,0.45)';
        ctx.fill();
        ctx.strokeStyle = on ? '#ffd0a0' : '#604850';
        ctx.lineWidth = on ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = '#f0e0d0';
        ctx.font = `${Math.max(8, size * 0.28)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dir.name, px, py);
      }
    }

    drawRanges(ctx, game, hover) {
      const { size, ox, oy } = this.layout;
      const sel = game.selected();
      const drawRing = (tx, ty, range, color, fill) => {
        const cx = ox + (tx + 0.5) * size;
        const cy = oy + (ty + 0.5) * size;
        ctx.beginPath();
        ctx.arc(cx, cy, range * size, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
      };
      if (sel) {
        const def = TD.TOWERS[sel.type];
        const stats = def.category === 'combat'
          ? TD.combatStats(sel.type, sel.level, game.towerBuffs(sel))
          : { range: def.range };
        if (stats.range) drawRing(sel.x, sel.y, stats.range, 'rgba(240,220,160,0.9)', 'rgba(240,220,160,0.08)');
      }
      if (game.buildId && hover) {
        const def = TD.TOWERS[game.buildId];
        const ok = game.canPlace(hover.x, hover.y, game.buildId);
        const range = def.range || 0.45;
        drawRing(hover.x, hover.y, range || 0.5, ok ? 'rgba(120,220,140,0.9)' : 'rgba(220,80,80,0.9)',
          ok ? 'rgba(80,180,100,0.12)' : 'rgba(180,40,40,0.12)');
      }
    }

    drawTowers(ctx, game) {
      const { size, ox, oy } = this.layout;
      for (const t of game.towers) {
        const def = TD.TOWERS[t.type];
        const cx = ox + (t.x + 0.5) * size;
        const cy = oy + (t.y + 0.5) * size;
        const r = size * 0.38;
        ctx.fillStyle = '#141018';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def.color2;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = def.color2;
        ctx.font = `${Math.max(10, size * 0.42)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.icon, cx, cy + 1);
        if (t.level > 1) {
          ctx.fillStyle = '#fff6d0';
          ctx.font = `bold ${Math.max(8, size * 0.26)}px sans-serif`;
          ctx.fillText(String(t.level), cx + r * 0.7, cy - r * 0.7);
        }
        if (t.sealed > 0) {
          ctx.strokeStyle = '#c060ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
          ctx.fillStyle = 'rgba(80,0,120,0.35)';
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        } else if (t.weaken > 0) {
          ctx.strokeStyle = 'rgba(220,80,80,0.8)';
          ctx.strokeRect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8);
        }
        if (game.selectedId === t.id) {
          ctx.strokeStyle = '#ffe080';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    drawMonsters(ctx, game) {
      const { size, ox, oy } = this.layout;
      const list = game.monsters.slice().sort((a, b) => a.y - b.y);
      for (const m of list) {
        const cx = ox + m.x * size;
        const cy = oy + m.y * size;
        const sc = 0.22 * m.size;
        const r = size * sc;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.7, r * 0.8, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - r * 0.15, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        if (m.kind !== 'normal') {
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        const bw = Math.max(size * 0.7, r * 2);
        const bh = 3;
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(cx - bw / 2, cy - r - 8, bw, bh);
        ctx.fillStyle = m.hp / m.maxHp > 0.35 ? '#d44' : '#f80';
        ctx.fillRect(cx - bw / 2, cy - r - 8, bw * (m.hp / m.maxHp), bh);
        if (m.kind !== 'normal') {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(8, size * 0.28)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(TD.KINDS[m.kind].name, cx, cy - r - 12);
        }
      }
    }

    drawProjectiles(ctx, game) {
      const { size, ox, oy } = this.layout;
      for (const p of game.projectiles) {
        const x = ox + p.x * size;
        const y = oy + p.y * size;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, size * 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(ox + p.fromX * size, oy + p.fromY * size);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    drawFx(ctx, game) {
      const { size, ox, oy } = this.layout;
      for (const f of game.fx) {
        const x = ox + f.x * size;
        const y = oy + f.y * size;
        const a = Math.max(0, Math.min(1, f.life * 2));
        ctx.globalAlpha = a;
        if (f.kind === 'dmg' || f.kind === 'res') {
          ctx.fillStyle = f.color;
          ctx.font = `bold ${Math.max(10, size * 0.32)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(f.text, x, y - (0.7 - f.life) * 18);
        } else if (f.kind === 'slash' || f.kind === 'boom') {
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, (f.r || 1) * size * (1.15 - f.life), 0, Math.PI * 2);
          ctx.stroke();
        } else if (f.kind === 'burst' || f.kind === 'leak') {
          ctx.fillStyle = f.color || '#ff8866';
          ctx.beginPath();
          ctx.arc(x, y, size * (0.4 + (0.5 - f.life)), 0, Math.PI * 2);
          ctx.fill();
        } else if (f.kind === 'seal') {
          ctx.strokeStyle = '#c080ff';
          ctx.strokeRect(x - size * 0.4, y - size * 0.4, size * 0.8, size * 0.8);
        }
        ctx.globalAlpha = 1;
      }
    }

    drawHover(ctx, game, hover) {
      const { size, ox, oy } = this.layout;
      ctx.strokeStyle = 'rgba(255,255,220,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + hover.x * size + 1, oy + hover.y * size + 1, size - 2, size - 2);
    }

    drawBanner(ctx, game) {
      const { text, life } = game.banner;
      const a = Math.min(1, life);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,8,16,0.72)';
      const w = Math.min(this.w - 40, 420);
      ctx.fillRect((this.w - w) / 2, 18, w, 40);
      ctx.strokeStyle = '#c8aa6e';
      ctx.strokeRect((this.w - w) / 2, 18, w, 40);
      ctx.fillStyle = '#f4e8c8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.w / 2, 38);
      ctx.globalAlpha = 1;
    }
  }

  TD.Renderer = Renderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
