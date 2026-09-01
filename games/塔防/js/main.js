(function () {
  const canvas = document.getElementById('field');
  const game = new TD.Game();
  const renderer = new TD.Renderer(canvas);
  TDUI.bind(game, renderer);

  let hover = null;
  let last = performance.now();
  let hudAcc = 0;

  function canvasPos(ev) {
    const r = canvas.getBoundingClientRect();
    const src = ev.touches ? ev.touches[0] || ev.changedTouches[0] : ev;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  canvas.addEventListener('pointermove', (ev) => {
    const p = canvasPos(ev);
    hover = renderer.screenToTile(p.x, p.y);
    game.hover = hover;
  });
  canvas.addEventListener('pointerleave', () => { hover = null; game.hover = null; });
  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    const p = canvasPos(ev);
    const tile = renderer.screenToTile(p.x, p.y);
    if (!tile) {
      game.buildId = null;
      game.selectedId = null;
      TDUI.refresh();
      return;
    }
    if (game.buildId) {
      if (!game.tryPlace(tile.x, tile.y)) {
        const exist = game.towerAt(tile.x, tile.y);
        if (exist) game.selectTower(exist.id);
      }
    } else {
      const exist = game.towerAt(tile.x, tile.y);
      if (exist) game.selectTower(exist.id);
      else game.selectedId = null;
    }
    TDUI.refresh();
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    game.buildId = null;
    TDUI.refresh();
  });

  window.addEventListener('resize', () => renderer.resize());

  function loop(now) {
    const raw = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    game.tick(raw);
    renderer.draw(game, hover);
    hudAcc += raw;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      TDUI.refresh();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
