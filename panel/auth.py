# -*- coding: utf-8 -*-
"""面板认证: token 管理 / require_auth / auth_dependency"""
import secrets
import time

from fastapi import Depends, HTTPException
from starlette.requests import Request

from .config import CONFIG

# 动态判断: 设置页保存 panel_password 后无需重启立即生效
def _auth_enabled() -> bool:
    return bool(CONFIG.get("panel_password"))

_AUTH_TOKENS = {}  # token -> 过期时间 (epoch)
_AUTH_TTL = 12 * 3600


def get_auth_token(request: Request) -> str:
    return request.cookies.get("panel_token") or request.headers.get("X-Auth-Token", "")


def require_auth(request: Request):
    """FastAPI 依赖: 认证校验 (未启用认证时直接放行)"""
    if not _auth_enabled():
        return True
    token = get_auth_token(request)
    if not token or _AUTH_TOKENS.get(token, 0) < time.time():
        raise HTTPException(status_code=401, detail="未认证或会话已过期")
    return True


def auth_dependency():
    """供写操作接口使用的依赖"""
    return Depends(require_auth)


def issue_token() -> str:
    """发放一个会话 token (供登录/设置开启认证后调用)"""
    token = secrets.token_hex(16)
    _AUTH_TOKENS[token] = time.time() + _AUTH_TTL
    return token


def reset_tokens():
    """清空所有已发放的会话 token (设置/修改密码时调用, 使旧会话立即失效)"""
    _AUTH_TOKENS.clear()


def login(body: dict):
    """校验 panel_password, 发放会话 token; 返回 (ok, message, token?)"""
    pwd = body.get("password", "")
    if not _auth_enabled():
        return {"ok": True, "message": "面板未启用认证"}
    if pwd == CONFIG.get("panel_password"):
        return {"ok": True, "message": "登录成功", "token": issue_token()}
    return {"ok": False, "message": "密码错误", "status": 401}


def auth_status(request: Request):
    if not _auth_enabled():
        return {"enabled": False, "authed": True}
    token = get_auth_token(request)
    return {"enabled": True, "authed": bool(token and _AUTH_TOKENS.get(token, 0) >= time.time())}