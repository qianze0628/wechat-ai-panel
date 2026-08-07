# -*- coding: utf-8 -*-
"""白名单/管理员路由"""
import json
import os
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from starlette.requests import Request

from .. import auth
from ..astrobot import (
    _atomic_write, _backup_raw_file, whitelist_contacts, whitelist_get, whitelist_save,
)
from ..config import CONFIG


def _bad(msg):
    raise HTTPException(status_code=400, detail=msg)


def register(app):
    @app.get("/api/whitelist/contacts")
    def api_whitelist_contacts():
        return whitelist_contacts()

    @app.get("/api/whitelist")
    def api_whitelist_get_route():
        return whitelist_get()

    @app.post("/api/whitelist/super")
    async def api_whitelist_super_post(request: Request):
        auth.require_auth(request)
        try:
            body = await request.json()
        except Exception:
            _bad("请求体必须是 JSON")
        if not isinstance(body, dict):
            _bad("请求体必须是对象 {superAdminIds}")
        supers = [str(x) for x in body.get("superAdminIds", [])]
        cfg_path = CONFIG["astrbot"]["cmd_config"]
        if not os.path.isfile(cfg_path):
            return JSONResponse({"ok": False, "message": f"cmd_config.json 不存在: {cfg_path}"}, status_code=400)
        try:
            _backup_raw_file(cfg_path)
            cfg = json.loads(Path(cfg_path).read_text(encoding="utf-8-sig"))
            cfg["super_admins_id"] = supers
            _atomic_write(cfg_path, json.dumps(cfg, ensure_ascii=False, indent=2))
        except Exception as e:
            return JSONResponse({"ok": False, "message": f"写入失败: {e}"}, status_code=500)
        return {"ok": True, "message": "超级管理员已更新 (插件实时读配置生效, 无需重启)", "superAdminIds": supers}

    @app.post("/api/whitelist")
    async def api_whitelist_post(request: Request):
        auth.require_auth(request)
        try:
            body = await request.json()
        except Exception:
            _bad("请求体必须是 JSON")
        if not isinstance(body, dict):
            _bad("请求体必须是对象 {chatIds, adminIds}")
        chat_ids = [str(x) for x in body.get("chatIds", [])]
        admin_ids = [str(x) for x in body.get("adminIds", [])]
        excl = body.get("excludedGroupMembers")
        return whitelist_save(chat_ids, admin_ids, excl)