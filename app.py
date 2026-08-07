# -*- coding: utf-8 -*-
"""
微信 AI 机器人一键部署管理面板 (FastAPI)
端口 8080
入口: 组装 panel 包的应用 (配置/进程/环境/AstrBot/路由已模块化)
原单体版本备份在: app.py.monolith-backup
"""
import uvicorn

from panel.app_factory import create_app
from panel.config import CONFIG

app = create_app()

if __name__ == "__main__":
    port = int(CONFIG.get("port", 8080))
    print(f"[panel] 微信 AI 管理面板: http://localhost:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")