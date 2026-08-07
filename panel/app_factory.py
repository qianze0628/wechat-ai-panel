# -*- coding: utf-8 -*-
"""应用组装工厂: 创建 FastAPI 应用, 挂载静态 + 自动注册插件 + SPA 回退"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import auth  # 确保 auth 初始化 (token 存储)
from .config import STATIC_DIR


def create_app() -> FastAPI:
    app = FastAPI(title="微信 AI 机器人管理面板", docs_url=None, redoc_url=None)
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    # 自动发现并注册 plugins/ 下的所有功能插件
    from .plugins import register_all, get_registry

    register_all(app)

    # 插件管理接口 (列出启用的插件与元数据)
    @app.get("/api/plugins")
    def api_plugins():
        return {
            "ok": True,
            "plugins": [p.meta() for p in get_registry()],
        }

    # SPA 前端路由回退 (deep link)
    @app.get("/{path:path}", response_class=HTMLResponse)
    def spa_fallback(path: str):
        if path.startswith(("api/", "static/", "qr.png", "astrbot")):
            raise HTTPException(status_code=404, detail="Not Found")
        html = STATIC_DIR / "index.html"
        if html.exists():
            return HTMLResponse(html.read_text(encoding="utf-8"))
        raise HTTPException(status_code=500, detail="index.html 缺失")

    return app