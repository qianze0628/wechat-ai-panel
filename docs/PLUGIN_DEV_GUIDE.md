# 插件开发指南

> 版本：1.0
> 日期：2026-08-07
> 说明：本项目后端已实现可插拔的插件系统 (参考 HypeR_Bot 模块自动发现)。本指南教你怎么加一个新功能插件。

---

## 一、插件结构

```
panel/plugins/
├── base.py          # FeaturePlugin 基类 (无需改)
├── registry.py      # 自动发现 + 注册器 (无需改)
├── __init__.py
└── <你的插件目录>/   # 新插件放这里
    └── plugin.py    # 定义 FeaturePlugin 子类
```

## 二、最小插件模板

```python
# panel/plugins/myfeature/plugin.py
# -*- coding: utf-8 -*-
"""我的新功能插件"""
from ..base import FeaturePlugin


class MyFeaturePlugin(FeaturePlugin):
    id = "myfeature"            # 唯一 id (对应目录名)
    name = "我的功能"            # 展示名
    description = "一句话描述"
    version = "1.0.0"
    # 前端侧边栏导航 (可选)。若提供且前端已安装动态导航, 会自动出现菜单项
    # nav = {"to": "/myfeature", "label": "我的功能", "icon": "Sparkles"}

    def register(self, app):
        """在 FastAPI app 上注册路由 (与 panel/routes/*.py 的写法一致)"""

        @app.get("/api/myfeature")
        def api_myfeature():
            return {"ok": True, "message": "我的功能可用"}

        @app.get("/myfeature")
        def page_myfeature():
            # 可返回 SPA 页面或 JSON; 若需要新页面请在 React 侧加路由
            return {"ok": True}
```

## 3. 接入面板核心

插件可 import 面板核心模块，读取配置或调用服务控制：

```python
from ..config import CONFIG          # 全局配置
from ..processes import start_astrbot, service_status  # 服务控制
from ..astrobot import extract_astrbot_creds          # AstrBot 凭据
from ..logs_core import _safe_read                   # 日志读取
from .. import auth                                  # 认证依赖
```

写操作接口建议加认证：`auth.require_auth(request)`。

## 4. 启用 / 禁用

| 操作 | 方法 |
|---|---|
| 启用插件 | 插件目录保持原名 `<name>/` |
| 禁用插件 | 把目录重命名为 `<name>.dis`，重启面板即不再加载 |

HypeR_Bot 式"一键启停"：改目录后缀即可。

> 注意：改插件目录名后需重启面板 (uvicorn) 才重新扫描。

## 5. 查看已加载插件

```
GET /api/plugins
```
返回所有已加载插件的元数据 ({id, name, description, version, enabled, nav})。

## 6. 前端扩展 (可选)

若插件需要新页面：
1. 在 `frontend/src/pages/` 加页面组件
2. 在 `frontend/src/app/App.tsx` 加 `<Route>`
3. 在 `frontend/src/app/navigation.ts` 的 `NAV_ITEMS` 加侧边栏项
   (导航项与插件 nav 声明对应)

> 当前前端是静态路由 (非插件驱动)。若想"插拔式前端", 可后续在导航加载时调 `/api/plugins` 动态合并。

## 7. 示例

完整可运行插件见 `panel/plugins/status/` (状态) 与 `docs/plugin-example/` (新增模板)。

## 8. 设计说明

- 插件系统不引入第三方依赖, 用标准库 importlib 自动发现
- 插件实例在 `panel.plugins.registry.registry` 中, 可被 `/api/plugins` 查询
- 现有 8 个内置插件 (auth/control/install/logs/messages/qr/status/whitelist) 保持 API 不变