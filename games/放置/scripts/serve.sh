#!/usr/bin/env bash
# 本机 / 局域网试玩（手机连同一 Wi-Fi 即可）
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-8080}"
echo "本机:     http://127.0.0.1:${PORT}"
if command -v ipconfig >/dev/null 2>&1; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  if [ -n "${IP:-}" ]; then
    echo "局域网:   http://${IP}:${PORT}"
  fi
fi
echo "Ctrl+C 结束"
exec python3 -m http.server "$PORT"
