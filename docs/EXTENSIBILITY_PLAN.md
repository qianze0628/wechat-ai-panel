# 扩展性设计评估与改进方案

> 文档版本：1.0
> 日期：2026-08-07
> 参考：HypeR_Bot (https://github.com/HarcicYang/HypeR_Bot)
> 目的：评估当前面板的扩展性，借鉴 HypeR_Bot 的模块化/分层思想提出改进方案

---

## 一、HypeR_Bot 可借鉴的设计

分析 HypeR_Bot 后，以下设计理念值得借鉴：

| 设计 | HypeR_Bot 做法 | 对我们的启示 |
|---|---|---|
| **模块自动发现** | `modules/__init__.py` 自动发现并加载功能模块；`.py`↔`.dis` 一键启用/禁用 | 插件/功能注册表化，新增功能不再改主程序 |
| **框架与本体分离** | 核心框架 (HyperBotCore) 独立仓库发布 PyPI，应用引用框架 | 后端核心逻辑与具体接入解耦 |
| **配置分层** | 协议/权限/连接/日志/扩展 (`others`) 清晰分离，模块可声明自己的配置 | 管理面板配置按域拆分 |
| **uv 工具链** | `uv sync` / `uv run` / `uv.lock` 锁定版本 | 依赖管理与版本锁定 |
| **协议可扩展** | 支持 OneBot + 自定义协议适配 | 微信/其它 IM 协议可插拔 |
| **PyInstaller** | `main.spec` 支持打包独立 exe | 我们已支持 (README 有打包说明) |

---

## 二、当前项目扩展性现状

### 后端 (app.py, 78 个函数)

```
单文件: config 加载 / 环境检测 / 进程管理 / 日志 / 二维码 / 白名单 / 安装 / 系统信息 / 消息记录 / 认证
```

**问题**：
- 单文件 1300+ 行，所有能力堆叠，改一处易互相影响
- 服务/平台管理逻辑与 API 路由混在一起
- 安装引擎、whitelist 对接、消息记录是后来加的功能，边界不清晰

### 前端 (React 组件化, 组织良好)
- `pages/` 按页面 9 个独立组件 ✅
- `api/index.ts` 统一 API client ✅
- `components/shell/` 外壳组件 ✅
- **优点**：页面级扩展容易（加 page + 路由即可）

### 配置
- `config.json` 顶层合并 + `_deep_merge`
- 已有深度合并，但配置 schema 未明确定义（Pydantic 未用）

---

## 三、改进方案（按优先级）

### P0：后端模块化拆分（降低维护成本，支持扩展）
```
backend/
├── api/               # FastAPI 路由层 (薄路由, 调 service)
│   ├── install.py     # 安装引擎 (多平台/路径/日志)
│   ├── services.py    # 启停/健康/进程
│   ├── whitelist.py   # 白名单/管理员/超管
│   ├── messages.py    # 消息记录
│   ├── system.py      # 系统监控
│   ├── qr.py          # 二维码
│   └── auth.py        # 面板认证
├── core/              # 核心业务 (无 HTTP 依赖)
│   ├── processes.py
│   ├── astrobot.py
│   ├── wechatbot.py
│   └── config.py
├── plugins/           # 可插拔功能 (参考 HypeR_Bot 模块自动发现)
│   ├── __init__.py    # 自动发现加载
│   ├── whitelist/     # 白名单 (现在内联在 app.py)
│   └── ...
└── app.py             # 仅组装
```

### P1：插件/功能注册表（借鉴 HypeR_Bot 模块自动发现）
- 定义一个 `FeaturePlugin` 基类：`{meta, register_api(app), register_ui(routes)}`
- `features/` 目录下每个功能一个包，`__init__.py` 自动发现
- 前端 `navigation.ts` 已支持动态数组，可对接插件路由
- 效果：新增功能 = 放一个目录 + 声明，不改 `app.py`

### P2：配置分层与校验
- 引入 Pydantic 定义 `PanelConfig` schema（端口/服务/astrbot/features）
- `config.json` + `config.local.json` 覆盖（本地私有不提交）
- 插件可声明自己的 config 段，避免污染主 schema（参考 HypeR_Bot `others`）

### P3：依赖管理
- 引入 `uv` (HypeR_Bot 用) 或保留 requirements.txt + 锁定版本
- 好处：可复现构建、多平台一致

---

## 四、与既有工作的衔接

- 安装引擎已完成多平台 + 自定义路径 + 日志 + 弹窗 — 是模块化的基础
- 白名单/管理员已对接 AstrBot 插件 — 是第一个"插件式"功能示例
- 前端已是 React 组件化 — 扩展性基础已具备

---

## 五、实施进度 (2026-08-07)

**P0 已完成**：app.py 单文件 (1816 行) 已拆分为 `panel/` 包：
- `panel/config.py`, `panel/env.py`, `panel/processes.py`, `panel/logs_core.py`, `panel/astrobot.py`, `panel/auth.py`
- `panel/routes/*.py` 各功能路由
- `panel/app_factory.py` 组装，app.py 变薄壳
- API 路径完全不变，13 个 API 全面回归通过

**P1 已完成**：后端插件注册机制 (2026-08-07)：
- `panel/plugins/` 包: base.py (FeaturePlugin 基类) + registry.py (自动发现/注册)
- 现有 8 个路由已迁移为内置插件 (auth/control/install/logs/messages/qr/status/whitelist)
- `.dis` 重命名即禁用插件 (HypeR_Bot 一键启停风格)
- `GET /api/plugins` 列出已加载插件；app_factory 自动扫描加载 (不再硬编码)
- 插件开发指南: docs/PLUGIN_DEV_GUIDE.md; 模板: docs/plugin-example/
- 前端动态导航: usePluginNavs hook 拉 /api/plugins, 插件 nav 自动进侧边栏; /plugin/:id 通用视图页

**P2 已完成**：配置分层 + Pydantic schema (2026-08-07)：
- panel/config_schema.py: Pydantic PanelConfig (端口/服务/astrbot/logs 校验+默认值, extra=allow)
- 加载链: 默认 → config.json → config.local.json(本地覆盖) → Pydantic 校验(错误仅告警)
- CONFIG 仍为 dict (48+ 处调用零改动); config.local.example.json 模板

**剩余 (P3)**：
- P3 uv 依赖锁定
- 后续：Go/Rust/Tauri 重构时直接用此分层