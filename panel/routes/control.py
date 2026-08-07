# -*- coding: utf-8 -*-
"""服务控制路由: /api/start /api/stop /api/restart"""
import time

from fastapi import Query
from fastapi.responses import JSONResponse

from .. import auth
from ..config import CONFIG
from ..processes import (
    port_listening, start_astrbot, start_wechat_bot, start_qr_server,
    stop_service, service_status, health_check, wait_health,
)


def register(app):
    @app.post("/api/start")
    def api_start(service: str = Query("all"), _: bool = auth.auth_dependency()):
        msgs = []
        steps = []
        if service == "astrbot" or service == "all":
            if port_listening(CONFIG["services"]["astrbot"]["webui_port"]):
                steps.append({"service": "astrbot", "status": "already", "message": "AstrBot 已在运行 (6185)"})
            else:
                ok, msg = start_astrbot()
                steps.append({"service": "astrbot", "status": "started" if ok else "failed", "message": msg})
                if ok:
                    if not wait_health("astrbot", timeout=60):
                        steps.append({"service": "astrbot", "status": "health_failed",
                                      "message": "AstrBot 进程已启动但健康检查超时 (6185/20129)"})
                        return {"ok": False,
                                "message": "AstrBot 健康检查失败, 已中止后续服务启动",
                                "steps": steps, "services": service_status()}
                    steps.append({"service": "astrbot", "status": "healthy", "message": "AstrBot 健康检查通过"})
        if service == "wechat" or service == "all":
            if service == "all":
                ok_h, det = health_check("astrbot")
                if not ok_h:
                    steps.append({"service": "wechat", "status": "skipped",
                                  "message": "AstrBot 不健康, 跳过 wechat-bot 启动"})
                    return {"ok": False, "message": "前置服务 AstrBot 未通过健康检查, 已中止",
                            "steps": steps, "services": service_status()}
            if port_listening(CONFIG["services"]["wechat"]["api_port"]):
                steps.append({"service": "wechat", "status": "already", "message": "wechat-bot 已在运行 (6189)"})
            else:
                ok, msg = start_wechat_bot()
                steps.append({"service": "wechat", "status": "started" if ok else "failed", "message": msg})
                if ok:
                    if not wait_health("wechat", timeout=30):
                        steps.append({"service": "wechat", "status": "health_failed",
                                      "message": "wechat-bot 已启动但 /api/status 无响应"})
                    else:
                        steps.append({"service": "wechat", "status": "healthy", "message": "wechat-bot 健康检查通过"})
        if service == "qr" or service == "all":
            if service == "all":
                ok_h, det = health_check("wechat")
                if not ok_h:
                    steps.append({"service": "qr", "status": "skipped",
                                  "message": "wechat-bot 不健康, 跳过 qr-server 启动"})
                    return {"ok": False, "message": "前置服务 wechat-bot 未通过健康检查, 已中止",
                            "steps": steps, "services": service_status()}
            if port_listening(CONFIG["services"]["qr"]["port"]):
                steps.append({"service": "qr", "status": "already", "message": "qr-server 已在运行 (8090)"})
            else:
                ok, msg = start_qr_server()
                steps.append({"service": "qr", "status": "started" if ok else "failed", "message": msg})
                if ok:
                    if not wait_health("qr", timeout=20):
                        steps.append({"service": "qr", "status": "health_failed",
                                      "message": "qr-server 已启动但 /status 无响应"})
                    else:
                        steps.append({"service": "qr", "status": "healthy", "message": "qr-server 健康检查通过"})
        failed = [s for s in steps if s["status"] in ("failed", "health_failed")]
        msgs = [s["message"] for s in steps]
        return {"ok": not failed, "message": " | ".join(msgs), "steps": steps, "services": service_status()}

    @app.post("/api/stop")
    def api_stop(service: str = Query("all"), _: bool = auth.auth_dependency()):
        if service == "all":
            msgs = [stop_service(s)[1] for s in ("astrbot", "wechat", "qr")]
            return {"ok": True, "message": " | ".join(msgs)}
        ok, msg, detail = stop_service(service)
        if not ok:
            return JSONResponse({"ok": False, "message": msg}, status_code=400)
        return {"ok": True, "message": msg, "detail": detail}

    @app.post("/api/restart")
    def api_restart(service: str = Query("all"), _: bool = auth.auth_dependency()):
        msgs = []
        if service == "astrbot" or service == "all":
            stop_service("astrbot")
            time.sleep(1)
            ok, msg = start_astrbot()
            msgs.append(msg if ok else f"❌ {msg}")
        if service == "wechat" or service == "all":
            stop_service("wechat")
            time.sleep(1)
            ok, msg = start_wechat_bot()
            msgs.append(msg if ok else f"❌ {msg}")
        if service == "qr" or service == "all":
            stop_service("qr")
            time.sleep(1)
            ok, msg = start_qr_server()
            msgs.append(msg if ok else f"❌ {msg}")
        failed = [m for m in msgs if m.startswith("❌")]
        return {"ok": not failed, "message": " | ".join(msgs), "services": service_status()}