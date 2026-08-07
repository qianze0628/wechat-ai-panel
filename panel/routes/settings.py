# -*- coding: utf-8 -*-
"""面板设置路由: /api/settings (读/写面板可编辑配置项)

可编辑项 (写回 config.json, 原子替换 + 备份):
  - panel_password   面板认证密码 (空=免认证; 非空=启用认证)
  - backup_enabled   是否创建 AstrBot 配置备份 (默认 true)
"""
import json
import os

from fastapi.responses import JSONResponse
from starlette.requests import Request

from .. import auth
from ..astrobot import _atomic_write
from ..config import BASE_DIR, CONFIG, CONFIG_FILE


# 允许设置页编辑的字段白名单 (其余字段设置页不碰, 避免误改路径/端口)
EDITABLE_KEYS = ("panel_password", "backup_enabled")


def _current():
    """返回设置页可编辑的当前值 (密码不回显明文, 只回是否启用)"""
    return {
        "ok": True,
        "auth_enabled": bool(CONFIG.get("panel_password")),
        "backup_enabled": bool(CONFIG.get("backup_enabled", True)),
        "config_path": str(CONFIG_FILE),
    }


def register(app):
    @app.get("/api/settings")
    def api_settings_get():
        return _current()

    @app.post("/api/settings")
    async def api_settings_post(request: Request):
        auth.require_auth(request)
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "message": "请求体必须是 JSON"}, status_code=400)
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "message": "请求体必须是对象"}, status_code=400)

        # 读取现有 config.json (保留原字段, 只更新可编辑项)
        try:
            if CONFIG_FILE.exists():
                cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8-sig"))
            else:
                cfg = dict(CONFIG)
        except Exception as e:
            return JSONResponse({"ok": False, "message": f"读取 config.json 失败: {e}"}, status_code=500)

        changes = []
        # panel_password: 空串 = 关闭认证; 非空 = 启用认证
        if "panel_password" in body:
            new_pwd = str(body["panel_password"] or "")
            old_pwd = str(cfg.get("panel_password") or "")
            if new_pwd != old_pwd:
                cfg["panel_password"] = new_pwd
                changes.append("面板认证" + ("已启用" if new_pwd else "已关闭"))
        # backup_enabled: 备份开关
        if "backup_enabled" in body:
            new_val = bool(body["backup_enabled"])
            old_val = bool(cfg.get("backup_enabled", True))
            if new_val != old_val:
                cfg["backup_enabled"] = new_val
                changes.append("配置备份" + ("已启用" if new_val else "已关闭"))

        if not changes:
            return {"ok": True, "message": "无变更", "changes": []}

        try:
            _atomic_write(str(CONFIG_FILE), json.dumps(cfg, ensure_ascii=False, indent=4))
        except Exception as e:
            return JSONResponse({"ok": False, "message": f"写入 config.json 失败: {e}"}, status_code=500)

        # 更新内存 CONFIG, 让认证/备份立即生效 (无需重启面板)
        CONFIG.clear()
        CONFIG.update(cfg)
        # 认证变更时清空所有旧会话 token (改密码后旧会话立即失效, 之前自动登录的 cookie 也作废)
        if "panel_password" in body:
            auth.reset_tokens()
        resp = {
            "ok": True,
            "message": "设置已保存: " + ", ".join(changes),
            "changes": changes,
        }
        if "panel_password" in body:
            if new_pwd:
                # 开启/修改密码 → 前端跳登录页, 让用户输一次新密码确认
                resp["auth_changed"] = True
            else:
                # 关闭认证 → 免登录访问, 前端不应跳登录页
                resp["auth_disabled"] = True
        return resp
