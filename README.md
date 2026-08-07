# 🤖 微信 AI 机器人管理面板

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

一键部署管理面板, 负责: 环境检测 → 自动安装 → 服务启动 → 扫码登录 → 实时日志 → AstrBot 一键配置与凭据展示。

**核心原则**: 本系统不捆绑任何模型供应商。AI 对话能力由 AstrBot 提供, 模型由用户在 AstrBot WebUI 的"对话服务"页面自行配置。

## 快速开始

```powershell
# 方式一: 双击/运行启动脚本 (自动装依赖并打开浏览器)
powershell -ExecutionPolicy Bypass -File start-panel.ps1

# 方式二: 手动启动
cd wechat-ai-panel
pip install -r requirements.txt
python app.py
# 浏览器打开 http://localhost:8080 (端口从 config.json 读取)
```

## 功能

| 功能 | 说明 |
|------|------|
| 环境检测 | 检测 node / npm / uv / astrbot / wechat-bot / AstrBot 根目录 |
| 一键安装 | npm install (wechat-bot 依赖) + uv tool install astrbot |
| 服务启动 | 启动 AstrBot (6185+20129) / wechat-bot (6189) / qr-server (8090) |
| 健康检查 | 应用层健康检查: AstrBot (WebUI+WS+HTTP) / wechat-bot (/api/status) / qr-server (/status) |
| 依赖门控 | "启动全部"按依赖顺序: AstrBot 健康 → wechat-bot → qr-server, 前置失败自动中止 |
| 扫码登录 | 内嵌二维码页面, 3 秒轮询登录态 |
| 实时日志 | SSE 流式查看 wechat-bot / AstrBot / qr-server 日志 |
| AstrBot 凭据 | 从 cmd_config.json 或日志自动提取用户名/密码并展示 |
| 一键配置 | 自动写 cmd_config.json 的 aiocqhttp 平台 (127.0.0.1:20129) + 重启 AstrBot |
| 配置备份 | 每次写入前备份原始 cmd_config.json 到 runtime/backups/, 支持一键恢复 |
| 变更预览 | setup 前可查看将修改哪些字段, 明确不会触及模型配置 |
| 进程归属 | 服务 PID/命令/工作目录持久化, 停止时验证归属, 不误杀非本实例进程 |
| 面板认证 | 设置 panel_password 后启用登录保护 (写操作 API + 页面) |
| 模型引导 | 提示用户到 AstrBot WebUI 自行配置模型供应商 |

## API

```
GET  /api/status                总状态 (环境+服务+凭据+配置)
GET  /api/env                   环境检测
GET  /api/services              服务运行状态
GET  /api/system                系统信息 (CPU/内存/磁盘/系统/运行时长)
GET  /api/messages              微信消息记录 (messages.jsonl, 按联系人/关键词筛选)
GET  /api/whitelist/contacts   微信联系人/群列表
GET  /api/whitelist            当前白名单/管理员
POST /api/whitelist            保存白名单/管理员 (同步生效)
POST /api/install               安装缺失组件 (异步)
GET  /api/install/status        安装进度
POST /api/start?service=        启动 (astrbot|wechat|qr|all, all 带依赖门控)
POST /api/stop?service=         停止 (验证进程归属)
POST /api/restart?service=      重启
GET  /api/logs?service=         日志文本 (astrbot|wechat|qr|*_err)
GET  /api/logs/stream?service=  SSE 实时日志
GET  /api/qr/status             二维码/登录状态
GET  /qr.png                    二维码图片代理
GET  /api/astrbot/creds         AstrBot 登录凭据 (password_changed 标志)
POST /api/astrbot/setup         一键配置 OneBot + 重启 (写入前备份)
GET  /api/astrbot/setup/preview 配置变更预览 (不写入)
GET  /api/backups               列出配置备份
POST /api/astrbot/restore       从备份恢复配置并重启
GET  /api/auth/status           面板认证状态
POST /api/auth/login            面板登录
GET  /astrbot                   跳转 AstrBot WebUI
```

## 配置 (config.json)

所有路径可配置, 不写死。配置采用**递归深度合并**, 只覆盖需要的字段即可, 嵌套默认值不会丢失。

```jsonc
{
  "port": 8080,                          // 面板端口 (启动脚本也会读取)
  "panel_password": "",                  // 面板访问密码 (留空=无认证; 设置后需登录)
  "project_root": "C:/Users/YMB/Desktop/wechat",
  "wechat_bot_dir": ".../wechat-bot-windows",
  "astrbot_root": "C:/Users/YMB",        // 含 .astrbot 标记的目录
  "astrbot_data_dir": ".../.astrbot/data",
  "qr_server_script": ".../qr-server.js",
  "wechat_bot_serve": "ChatGPT",          // wechat-bot 服务类型
  "astrbot": { "cmd_config": ".../cmd_config.json", "ws_port": 20129 }
}
```

## 配置备份与恢复

- 每次执行 `/api/astrbot/setup` 前, 会先把原始 cmd_config.json 复制到 `runtime/backups/时间戳/` (变更前的真实原始文件, 可回滚)
- `/api/astrbot/setup/preview` 可先预览将修改哪些字段
- `/api/astrbot/restore` 从备份恢复并重启 AstrBot
- 写入采用临时文件 + 校验 + 原子替换, 失败时原文件保持不变

## 面板认证

1. 在 config.json 设置 `"panel_password": "你的密码"`
2. 重启面板
3. 打开页面会显示登录框, 写操作 API 未登录时返回 401
4. 留空 `panel_password` 则完全免认证

## 打包为 exe (可选)

```powershell
pip install pyinstaller
pyinstaller -F -w -n wechat-ai-panel --add-data "static;static" --add-data "config.json;." app.py
```

## 注意

- 修改 AstrBot 配置后必须重启才生效 (面板的一键配置会自动重启)
- wechat-bot 的 .env 白名单修改后需重启 wechat-bot
- 服务状态"运行中"表示端口已监听; 健康检查通过才代表应用层可用
- 管理面板是辅助工具, 不取代 AstrBot WebUI 的模型配置

## 关联项目

| 项目 | 说明 |
|---|---|
| [wechat-ai-panel-go](https://github.com/qianze0628/wechat-ai-panel-go) | 本项目的 Go 原生重构版 (单文件可执行, 端口 8081) |
| [wechat-bot-optimized](https://github.com/qianze0628/wechat-bot-optimized) | Wechaty + wechat4u 微信桥接器 (端口 6189) |
| [AstrBot](https://github.com/Soulter/AstrBot) | AI 对话引擎 (WebUI 6185 / OneBot WS 20129) |

## 📄 License

[MIT](LICENSE) © 2026 qianze0628
