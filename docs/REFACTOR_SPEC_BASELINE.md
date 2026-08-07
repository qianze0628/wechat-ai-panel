# 重构功能规格基线 (REFACTOR SPEC BASELINE)

> 版本：1.0
> 日期：2026-08-07
> 目的：作为 Go/Rust/Tauri 重构的功能规格基线。任何重构目标必须满足以下全部能力（与现有 Python 面板行为一致）。
> 说明：本文档从现有实现提取，是"迁移的验收清单"。

---

## 一、核心职责

管理面板 = 本地单机进程管理器 + 服务控制台 + 微信/OneBot 桥接助手。**不参与消息转发本身**（由 wechat-bot + AstrBot 完成），只做部署/运维/配置。

## 二、必须保留的功能（功能基线）

### 1. 配置系统
- `config.json` 加载（UTF-8 BOM 兼容）
- 递归深度合并（默认 + 用户配置）
- **Pydantic 式校验**（新实现需等价 schema 校验 + 错误暴露）
- `config.local.json` 本地覆盖
- 相对路径基于程序目录解析

### 2. 服务进程管理
- 启动/停止/重启：AstrBot (astrbot run)、wechat-bot (node cli.js start -s ChatGPT)、qr-server (node qr-server.js)
- 子进程：cwd/env/PYTHONIOENCODING；stdout/stderr 写独立日志文件
- PID 持久化到 `runtime/instances.json`；面板重启后恢复识别（进程存在 + 命令行/工作目录校验）
- 端口监听检测（netstat 解析）+ 端口→PID
- 进程 kill：`taskkill /F /PID` + `/T` 树杀（AstrBot worker 孤儿清理）
- 应用层健康检查：AstrBot (WebUI+WS+HTTP)、wechat-bot (/api/status)、qr-server (/status)
- 启动依赖门控：AstrBot 健康 → wechat → qr；任一失败中止

### 3. 系统监控
- CPU 型号/核心/使用率、内存总量/使用、磁盘使用率（"C:/"）、系统平台/主机名、boot 时间、进程数
- 面板 PID

### 4. 日志
- 日志路径读 config
- 尾部读取（大文件/字节偏移）
- 手动日志回退（astrbot-win.log / wechatbot-win.log）
- SSE `/api/logs/stream`：先尾部回放，每 2s 增量推送（字节偏移游标）

### 5. 二维码/登录
- 从 wechat-bot 日志解析 `onScan:` URL 和 "in logged in"/"已登录"
- 二维码图片代理 `/qr.png`（会扫码 URL 拉取）

### 6. AstrBot 集成
- 凭据提取（cmd_config 的 dashboard 明文字段; PBKDF2 哈希后标记 password_changed，不显示明文）
- OneBot 平台配置读写（aiocqhttp, wake_prefix, 私聊免前缀, dashboard host/port）
- 变更预览（preview）/ 应用（setup → 备份 + 原子写 + 重启 AstrBot）
- 配置备份：`runtime/backups/时间戳/`（原始字节前快照）；列出/恢复
- 原子写：临时文件 → 校验 → os.replace
- 证书：不使用

### 7. 白名单/管理员/超管（对接 AstrBot whitelist_manager 插件）
- 登录 AstrBot dashboard 拿 token（Bearer）
- 调用插件 API：`/api/plug/whitelist_manager/{contacts,whitelist}`
- 会话 ID 体系：`hashId(名字) = JS式哈希+10000`（与 wechat-bot 一致）
- contact 列表：姓名/别名/hashId/avatar/公众号标记(32位hex)/群成员标记/群归属
- 群折叠：勾选群 = 群+成员 hashId 全进白名单
- 超管：super_admins_id 读写、**不重启 AstrBot**（重启会覆盖磁盘）
- 保存 POST 触发 AstrBot/wechat-bot 自动同步重启

### 8. 消息记录
- 读 wechat-bot `.data/wechat/messages.jsonl`
- 按联系/群筛选 + 关键词搜索
- 按时间正序（旧在上）；limit 取最近 N 条仍正序
- 会话列表（联系人 + 条数 + 群/私聊标记）

### 9. 认证
- `panel_password` 启/禁；login/status；httponly cookie token（12h）；写操作 401

### 10. 面板认证 API 与 SPA
- FastAPI 路由全部保留（见 api 清单）
- SPA deep link 回退
- 静态资源服务

### 11. 插件系统
- 插件自动发现（目录 + plugin.py）+ `.dis` 禁用
- `/api/plugins` 列出（含 nav 元数据）
- 前端动态导航读插件 nav

---

## 三、HTTP API 清单（目标必须全部实现）

```
GET  /                        SPA 首页
GET  /api/status              总状态
GET  /api/env                 环境
GET  /api/services            服务状态
GET  /api/system              系统监控
GET  /api/plugins             插件列表
GET  /api/messages            消息记录
GET  /api/whitelist/contacts  联系人/群
GET  /api/whitelist           白名单/管理员+nameMap
POST /api/whitelist           保存
POST /api/whitelist/super     超管
POST /api/install             安装(多平台+路径)
GET  /api/install/status      安装进度
POST /api/start|stop|restart  服务控制
GET  /api/logs                日志文本
GET  /api/logs/stream         SSE
GET  /api/qr/status           二维码
GET  /qr.png                  二维码图
GET  /api/astrbot/creds       凭据
POST /api/astrbot/setup       配置(备份+重启)
GET  /api/astrbot/setup/preview 变更预览
GET  /api/backups             备份列表
POST /api/astrbot/restore     恢复
GET  /api/auth/status         认证状态
POST /api/auth/login          登录
GET  /astrbot                 AstrBot 跳转
GET  /{path}                  SPA 回退
```

---

## 四、前置条件（重构前必须做的）
1. **初始化 git**（当前无版本控制，重构不可回滚风险高）—— 第一优先级
2. 冻结本 Python 版本为 v3.3 基线
3. 自动化回归测试（至少 API 探测脚本）保证新旧一致性

---

## 五、配套文档
- docs/PLUGIN_DEV_GUIDE.md（插件开发）
- docs/EXTENSIBILITY_PLAN.md（扩展性规划）