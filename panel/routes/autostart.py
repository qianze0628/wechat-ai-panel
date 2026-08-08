# -*- coding: utf-8 -*-
"""开机自启路由: /api/autostart (Windows 注册表 Run 键, 与 Go 版行为一致)

通过 HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run 注册/取消面板自启。
面板以 --autostart 启动时写 logs/autostart.log 便于排查。
"""
import os
import subprocess
import sys
from datetime import datetime

from fastapi.responses import JSONResponse
from starlette.requests import Request

from .. import auth
from ..config import BASE_DIR, CONFIG

_AUTOSTART_KEY = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
_AUTOSTART_NAME = "WeChatAIPanel"


def _exe_path():
    if getattr(sys, "frozen", False):
        return sys.executable
    # 真实运行入口 (app.py) 的绝对路径; -c 等特殊场景回退到 python 本身
    p = os.path.abspath(sys.argv[0])
    if os.path.basename(p).lower() in ("-c", "app.py") and not os.path.isfile(p):
        return sys.executable
    return p


def autostart_enabled() -> bool:
    if os.name != "nt":
        return False
    try:
        out = subprocess.run(
            ["reg", "query", _AUTOSTART_KEY, "/v", _AUTOSTART_NAME],
            capture_output=True, text=True, timeout=5,
        )
        return out.returncode == 0 and "WeChatAIPanel" in out.stdout
    except Exception:
        return False


def set_autostart(enable: bool) -> str:
    if os.name != "nt":
        raise RuntimeError("仅 Windows 支持注册表自启 (Linux/macOS 请使用 systemd/launchd)")
    exe = _exe_path()
    if not enable:
        subprocess.run(["reg", "delete", _AUTOSTART_KEY, "/v", _AUTOSTART_NAME, "/f"],
                       capture_output=True, timeout=5)
        return "已关闭开机自启"
    target = f'"{exe}" --autostart'
    r = subprocess.run(
        ["reg", "add", _AUTOSTART_KEY, "/v", _AUTOSTART_NAME, "/t", "REG_SZ", "/d", target, "/f"],
        capture_output=True, text=True, timeout=5,
    )
    if r.returncode != 0:
        raise RuntimeError(f"写入注册表失败: {r.stderr}")
    return "已开启开机自启 (下次开机自动启动面板并拉起服务)"


def log_autostart(line: str):
    try:
        os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)
        with open(os.path.join(BASE_DIR, "logs", "autostart.log"), "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {line}\n")
    except Exception:
        pass


def register(app):
    @app.get("/api/autostart")
    def api_autostart_status():
        return {"ok": True, "enabled": autostart_enabled(), "method": "registry_run"}

    @app.post("/api/autostart")
    async def api_autostart_set(request: Request):
        auth.require_auth(request)
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "message": "请求体需为 JSON"}, status_code=400)
        enabled = body.get("enabled")
        if not isinstance(enabled, bool):
            return JSONResponse({"ok": False, "message": "缺少 enabled 布尔字段"}, status_code=400)
        try:
            msg = set_autostart(enabled)
            return {"ok": True, "enabled": autostart_enabled(), "message": msg}
        except Exception as e:
            return JSONResponse({"ok": False, "message": str(e)}, status_code=500)