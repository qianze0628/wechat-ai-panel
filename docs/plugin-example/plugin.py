# -*- coding: utf-8 -*-
"""示例插件模板 (可复制到 panel/plugins/ 下启用)

用法:
  1. 复制本文件到 panel/plugins/myfeature/plugin.py
  2. 改 id/name/description 和 register() 里的逻辑
  3. 重启面板即生效; 目录改名为 myfeature.dis 即可停用
"""
from ..base import FeaturePlugin


class ExamplePlugin(FeaturePlugin):
    id = "example"              # 唯一 id
    name = "示例插件"           # 展示名
    description = "展示如何写一个新功能插件"  # 描述
    version = "1.0.0"

    def register(self, app):
        # ---- 在这里写你的路由 ----

        @app.get("/api/example")
        def api_example():
            """示例 API: 返回面板核心的一些信息"""
            from ..config import CONFIG
            from ..env import detect_env
            env = detect_env()
            return {
                "ok": True,
                "message": "示例插件运行中",
                "wechat_bot_dir": CONFIG["wechat_bot_dir"],
                "node_installed": env["node"]["installed"],
            }

        # 需要认证的写操作:
        # from fastapi.responses import JSONResponse
        # from .. import auth
        # from starlette.requests import Request
        #
        # @app.post("/api/example/write")
        # async def api_example_write(request: Request):
        #     auth.require_auth(request)
        #     body = await request.json()
        #     return {"ok": True, "received": body}