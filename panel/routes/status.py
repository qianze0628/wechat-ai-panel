# -*- coding: utf-8 -*-
"""状态类路由: / /api/status /api/env /api/services /api/system"""
import os
import time

from fastapi.responses import HTMLResponse

from ..config import CONFIG, STATIC_DIR
from ..env import detect_env, system_status
from ..processes import service_status
from ..astrobot import extract_astrbot_creds, astrbot_platform_ok


def _file_mtime(path):
    try:
        if path and os.path.isfile(path):
            return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(path)))
    except Exception:
        pass
    return None


def register(app):
    @app.get("/", response_class=HTMLResponse)
    def index():
        html = (STATIC_DIR / "index.html")
        if html.exists():
            return HTMLResponse(html.read_text(encoding="utf-8"))
        return HTMLResponse("index.html 缺失", status_code=500)

    @app.get("/api/status")
    def api_status():
        return {
            "env": detect_env(),
            "services": service_status(),
            "creds": extract_astrbot_creds(),
            "astrbot_configured": astrbot_platform_ok(),
            "config_errors": CONFIG.get("_config_errors", []),
            "config": {
                "wechat_bot_dir": CONFIG["wechat_bot_dir"],
                "astrbot_root": CONFIG["astrbot_root"],
                "astrbot_data_dir": CONFIG["astrbot_data_dir"],
                "cmd_config": CONFIG["astrbot"].get("cmd_config", ""),
                "cmd_config_mtime": _file_mtime(CONFIG["astrbot"].get("cmd_config", "")),
                "port": CONFIG.get("port", 8080),
            },
        }

    @app.get("/api/env")
    def api_env():
        return detect_env()

    @app.get("/api/services")
    def api_services():
        return service_status()

    @app.get("/api/system")
    def api_system():
        return system_status()