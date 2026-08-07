# -*- coding: utf-8 -*-
"""认证路由: /api/auth/login /api/auth/status"""
from fastapi.responses import JSONResponse
from starlette.requests import Request

from .. import auth


def register(app):
    @app.post("/api/auth/login")
    async def api_auth_login(request: Request):
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "message": "请求体错误"}, status_code=400)
        result = auth.login(body)
        if result.get("status") == 401:
            return JSONResponse({"ok": False, "message": result["message"]}, status_code=401)
        if result.get("token"):
            resp = JSONResponse({"ok": True, "message": result["message"]})
            resp.set_cookie("panel_token", result["token"], httponly=True, max_age=auth._AUTH_TTL, samesite="lax")
            return resp
        return {"ok": True, "message": result["message"]}

    @app.get("/api/auth/status")
    def api_auth_status(request: Request):
        return auth.auth_status(request)