# wechat-bot 优化版 发布与安装源指南

> 版本 1.0 · 2026-08-07
> 说明:本项目的安装引擎(`wechat_bot_repo` 配置)缺源码时会自动从 GitHub 克隆优化版 wechat-bot。**这一步需要你把优化版源码上传到 GitHub**,然后填好仓库地址,别人安装面板时就能自动下载。

---

## 一、为什么需要发布到 GitHub

`wechat-ai-panel` 的安装引擎对 wechat-bot 只执行 `npm install`(默认假设源码已在 `wechat_bot_dir`)。
如果别人**没有 wechat-bot 源码**,安装时只会提示"源码缺失,请先克隆/放置项目"。

这个问题在 **`wechat_bot_repo` 配置非空时**解决了:安装引擎检测到源码缺失会自动
`git clone --depth 1 <repo>` 再把依赖 `npm install` 装好 —— 相当于一键拿到**优化版**(不是原版)。

所以关键动作:**把优化版 wechat-bot 源码推到 GitHub**。

---

## 二、发布前:清理敏感信息(必须)

发布的是**公开仓库**的话,以下内容绝不能带上去:

| 路径 | 内容 | 处理 |
|---|---|---|
| `.env` | 微信登录态 / API Key / 聊天白名单 | **不提交**(见 .gitignore) |
| `.data/` | 微信消息记录 + 登录态 | **不提交** |
| `node_modules/` | 依赖, 占体积 | **不提交** |
| `logs/` | 运行日志 | **不提交** |

在项目根目录放一份 `.gitignore`(若没有):

```gitignore
node_modules/
.data/
logs/
.env
*.log
qr-server.js
```

> ⚠️ 如果仓库设为 **Private**,敏感文件不进仓库即可,不限公开/私有都建议忽略。

---

## 三、创建开源仓库并推送

```bash
cd C:/Users/YMB/Desktop/wechat/wechat-bot-windows

# 1. 初始化 git(首次)
git init
git add .
git commit -m "feat: wechat-bot 优化版 (OneBot 桥接 + 白名单 + 群成员本地名)"

# 2. 创建 GitHub 仓库(网页或 gh CLI):
#    gh repo create wechat-bot-optimized --public --source=. --push
#    或手动:
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

完成后你会得到一个形如的地址:

```
https://github.com/你的用户名/wechat-bot-optimized.git
```

> ✅ 2026-08-07 已发布:https://github.com/qianze0628/wechat-bot-optimized (公开仓库)
> 两端 config 的 `wechat_bot_repo` 已填 `https://github.com/qianze0628/wechat-bot-optimized.git`。

---

## 四、配置面板:`wechat_bot_repo`

Python 版 `config.json` 和 Go 版 `config.local.json` 都已内置该字段(默认空):

```jsonc
// wechat-ai-panel/config.json  (Py)
"wechat_bot_repo": "https://github.com/你的用户名/wechat-bot-optimized.git",

// wechat-ai-panel-go/config.local.json  (Go)
"wechat_bot_repo": "https://github.com/你的用户名/wechat-bot-optimized.git",
```

填入后,**别人**在部署向导/概览页点"一键安装缺失组件"时,如果他的 `wechat_bot_dir` 是空的:
安装引擎会自动 `git clone` 优化版并 `npm install`,装的就是**你维护的这版**,而不是原版。

- 留空 = 保持旧行为(缺失源码只提示手动放置)。
- 面板每次安装只读一次该字段;改动后重启面板生效。

---

## 五、每次改完记得推送

优化版会持续更新(桥接、白名单、群消息本地名等)。改完后:

```bash
git add .
git commit -m "update: ..."
git push
```

别人重新安装时会拉到最新优化版。

---

## 六、常见问题

**Q: 克隆到一半断网了?** A: `--depth 1` 浅克隆,体积小,重试即可;目录若已存在会失败,先删掉半成品目录再点安装。

**Q: 我的机器已经有 wechat-bot 了,为什么还提示克隆?** A: 检测到 `package.json` 存在就不克隆(只 npm install)。只有目录空/无 `package.json` 时才克隆优化版。

**Q: 别人不想用 GitHub 怎么办?** A: 可把 `wechat_bot_repo` 指向任何 Git 仓库(如 Gitee)。用 HTTP 仓库地址均可。