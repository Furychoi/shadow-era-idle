#!/usr/bin/env bash
# 从仓库根目录起静态服务，目录页与两个游戏都能打开
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8080}"
echo "目录:     http://127.0.0.1:${PORT}"
echo "放置:     http://127.0.0.1:${PORT}/games/放置/"
echo "塔防:     http://127.0.0.1:${PORT}/games/塔防/"
if command -v ipconfig >/dev/null 2>&1; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  if [ -n "${IP:-}" ]; then
    echo "局域网:   http://${IP}:${PORT}"
  fi
fi
echo "Ctrl+C 结束"
exec python3 -m http.server "$PORT"
