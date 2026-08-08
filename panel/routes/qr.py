# -*- coding: utf-8 -*-
"""二维码 / AstrBot 凭据 / OneBot 配置 / 备份恢复 路由"""
import json
import os
import time
from pathlib import Path

from fastapi import Query
from fastapi.responses import JSONResponse, RedirectResponse, Response

from .. import auth
from ..astrobot import (
    BACKUP_DIR, extract_astrbot_creds, setup_astrbot_platform,
    _atomic_write, _backup_raw_file,
)
from ..config import CONFIG
from ..logs_core import _log_paths, _safe_read
from ..processes import _force_stop_ports, _service_ports, start_astrbot


def _wechat_logged_in():
    """调 wechat-bot /api/status 获取真实登录状态; 失败返回 False"""
    import urllib.request
    api_port = CONFIG["services"]["wechat"]["api_port"]
    try:
        req = urllib.request.Request(
            f"http://127.0.0.1:{api_port}/api/status",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=3) as r:
            data = json.loads(r.read().decode("utf-8"))
            return bool(data.get("loggedIn", False))
    except Exception:
        return False


def _qr_placeholder(text):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">'
           f'<rect width="320" height="320" fill="#eee"/>'
           f'<text x="160" y="160" text-anchor="middle" fill="#888" font-size="18">{text}</text></svg>')
    return Response(content=svg, media_type="image/svg+xml")


def register(app):
    @app.get("/api/qr/status")
    def api_qr_status():
        logs = _log_paths()
        candidates = []
        for key in ("wechat_capture_log", "wechat_stdout"):
            p = logs.get(key, "")
            if p and os.path.isfile(p):
                candidates.append(p)
        # 登录状态: 优先调 wechat-bot 真实 API (日志残留 "has logged in" 不可靠:
        # 重新扫码时日志仍含旧登录记录, 会导致误判为已登录)
        logged = _wechat_logged_in()
        qr_url = None
        for path in candidates:
            content = _safe_read(path, 500 * 1024)
            if not qr_url:
                marker = "onScan: "
                idx = content.rfind(marker)
                if idx != -1:
                    rest = content[idx + len(marker):].strip()
                    url = rest.split()[0] if rest else ""
                    if url.startswith("https://"):
                        qr_url = url
        return {"logged": logged, "hasQr": bool(qr_url), "qrUrl": qr_url}

    @app.get("/qr.png")
    def qr_proxy():
        qr_url = api_qr_status().get("qrUrl")
        if not qr_url:
            return _qr_placeholder("等待二维码...")
        import urllib.request
        try:
            req = urllib.request.Request(qr_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                data = r.read()
            return Response(content=data, media_type="image/png")
        except Exception:
            return _qr_placeholder("二维码获取失败")

    @app.get("/api/astrbot/creds")
    def api_astrbot_creds():
        return extract_astrbot_creds()

    @app.post("/api/astrbot/setup")
    def api_astrbot_setup(_: bool = auth.auth_dependency()):
        ok, msg, detail = setup_astrbot_platform()
        if not ok:
            return JSONResponse({"ok": False, "message": msg, "detail": detail}, status_code=400)
        _force_stop_ports(_service_ports("astrbot"))
        time.sleep(1)
        ok2, msg2 = start_astrbot()
        if not ok2:
            return JSONResponse({"ok": False, "message": f"{msg}, 但重启失败: {msg2}", "detail": detail}, status_code=500)
        return {"ok": True, "message": f"{msg}, AstrBot 已重启", "detail": detail}

    @app.get("/api/astrbot/setup/preview")
    def api_astrbot_setup_preview():
        cfg_path = CONFIG["astrbot"]["cmd_config"]
        if not os.path.isfile(cfg_path):
            return JSONResponse({"ok": False, "message": f"cmd_config.json 不存在: {cfg_path}"}, status_code=400)
        try:
            cfg = json.loads(Path(cfg_path).read_text(encoding="utf-8-sig"))
        except Exception as e:
            return JSONResponse({"ok": False, "message": f"cmd_config.json 解析失败: {e}"}, status_code=400)
        a = CONFIG["astrbot"]
        platform = {
            "id": a["platform_id"],
            "type": a["platform_type"],
            "enable": True,
            "ws_reverse_host": a["ws_host"],
            "ws_reverse_port": a["ws_port"],
            "ws_reverse_token": a["ws_token"],
        }
        changes = []
        platforms = cfg.get("platform")
        if not isinstance(platforms, list):
            changes.append("platform 数组不存在, 将创建")
        else:
            found = next((p for p in platforms if isinstance(p, dict) and p.get("id") == a["platform_id"]), None)
            if found:
                diff = {k: v for k, v in platform.items() if found.get(k) != v}
                if diff:
                    changes.append(f"平台 {a['platform_id']} 将更新字段: {list(diff.keys())}")
            else:
                changes.append(f"将新增平台 {a['platform_id']} ({a['platform_type']}, {a['ws_host']}:{a['ws_port']})")
        if cfg.get("wake_prefix") != a["wake_prefix"]:
            changes.append(f"wake_prefix 将变为 {a['wake_prefix']}")
        ps = cfg.get("platform_settings")
        if not isinstance(ps, dict) or ps.get("friend_message_needs_wake_prefix", True) is not False:
            changes.append("friend_message_needs_wake_prefix 将设为 false (私聊免前缀)")
        dash = cfg.get("dashboard")
        if isinstance(dash, dict):
            if dash.get("port") != a["dashboard"]["port"]:
                changes.append(f"dashboard.port 将变为 {a['dashboard']['port']}")
            if dash.get("host") != a["dashboard"]["host"]:
                changes.append(f"dashboard.host 将变为 {a['dashboard']['host']}")
        untouched = []
        if isinstance(cfg.get("provider"), list) and cfg["provider"]:
            untouched.append(f"{len(cfg['provider'])} 个模型 provider (不改动)")
        if isinstance(cfg.get("provider_sources"), list) and cfg["provider_sources"]:
            untouched.append(f"{len(cfg['provider_sources'])} 个 provider source (不改动)")
        need_restart = bool(changes)
        return {
            "ok": True,
            "changes": changes if changes else ["无变更"],
            "untouched": untouched,
            "need_restart": need_restart,
            "cmd_config": cfg_path,
            "backup_dir": str(BACKUP_DIR),
        }

    @app.get("/api/backups")
    def api_backups():
        if not BACKUP_DIR.exists():
            return {"ok": True, "backups": []}
        items = []
        for d in sorted(BACKUP_DIR.iterdir(), reverse=True):
            if not d.is_dir():
                continue
            for f in d.iterdir():
                items.append({
                    "time": d.name,
                    "path": str(f),
                    "size": f.stat().st_size if f.exists() else 0,
                })
        return {"ok": True, "backups": items}

    @app.post("/api/astrbot/restore")
    def api_astrbot_restore(path: str = Query(""), _: bool = auth.auth_dependency()):
        if not path or not os.path.isfile(path):
            return JSONResponse({"ok": False, "message": "备份文件不存在"}, status_code=400)
        cfg_path = CONFIG["astrbot"]["cmd_config"]
        try:
            _backup_raw_file(cfg_path)
            raw = Path(path).read_bytes()
            json.loads(raw.decode("utf-8-sig"))
            _atomic_write(cfg_path, raw.decode("utf-8-sig"))
        except Exception as e:
            return JSONResponse({"ok": False, "message": f"恢复失败: {e}"}, status_code=500)
        _force_stop_ports(_service_ports("astrbot"))
        time.sleep(1)
        ok2, msg2 = start_astrbot()
        return {"ok": True, "message": f"已从备份恢复并重启 AstrBot: {msg2}"}

    @app.get("/astrbot")
    def astrbot_redirect():
        port = CONFIG["services"]["astrbot"]["webui_port"]
        return RedirectResponse(f"http://localhost:{port}")