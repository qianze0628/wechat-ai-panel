#!/usr/bin/env bash
# ============================================
#  微信 AI 管理面板 - Linux/macOS 启动脚本
#  检查依赖 -> 启动面板 (端口 8080)
# ============================================
set -e

PANEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PANEL_DIR"

echo '=============================================='
echo '  微信 AI 管理面板 Launcher'
echo '=============================================='

# 从 config.json 读取面板端口 (与 app.py 保持一致)
PORT=8080
if command -v python3 >/dev/null 2>&1; then
  PORT=$(python3 -c "
import json, os
try:
    d = json.load(open('config.json', encoding='utf-8-sig'))
    print(int(d.get('port', 8080)))
except Exception:
    print(8080)
" 2>/dev/null || echo 8080)
fi
echo "[0/3] 面板端口: $PORT (来自 config.json)"

# 检查 python3
if ! command -v python3 >/dev/null 2>&1; then
  echo '[ERROR] 未找到 python3, 请先安装 Python 3.10+' >&2
  exit 1
fi

# 检查依赖
if ! python3 -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  echo '[1/3] 安装 fastapi + uvicorn...'
  python3 -m pip install -r requirements.txt
else
  echo '[1/3] 依赖已就绪 (fastapi + uvicorn)'
fi

# 端口占用检查
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
    echo "[ERROR] 端口 $PORT 已被占用, 请先停止占用进程或修改 config.json 的 port" >&2
    exit 1
  fi
fi

# 启动
echo '[2/3] 启动管理面板...'
mkdir -p logs
exec python3 app.py
