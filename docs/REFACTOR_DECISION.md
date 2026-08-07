# 后端重构选型决策报告

> 版本：1.0
> 日期：2026-08-07
> 决策：**首选「Go 原生单可执行文件，内嵌 React 前端」**
> 评估方式：3 个并行 deep-dive agent 分别调研 Go / Rust / Tauri 后综合

---

## 一、结论先行

**首选方向 = Go 原生单 exe（后端内嵌 React `dist`，纯 Web 面板形态不变）。**

本项目形态（本地单机、Web 面板访问、轻量命令壳 + 监控、复用已有 React 前端）下，Go 以最低迁移/迭代成本拿到与 Tauri/Rust 同等的体积与单文件收益。Tauri 的桌面壳在本项目零收益，纯 Rust 仅在「零资源 + 长期基石」时才值得。

## 二、三方对比

| 维度 | Go（原生+embed） | Rust（Axum） | Tauri v2 |
|---|---|---|---|
| 体积/单文件 | 优 15~25MB | 优 5-20MB | 良 8-15MB 但依赖系统 WebView2 |
| 性能/资源 | 优，毫秒冷启 | 优，同 Go | 优+额外 WebView 进程 |
| 跨平台 | 优，交叉编译三平台 | 优，Windows 信号需手写 | 中，老 Win10 需装 WebView2 |
| 前端复用 | **优，embed.FS 零改动** | 优，axum 托管静态 | 良，fetch 要改 invoke |
| 迁移成本 | 中低，Python 近平移 | 中高，估 1.5~2 倍 Go 工作量 | 中，后端全 Rust+前端 RPC |
| 主要风险 | 树杀需自实现（/T 或 Job Object） | BOM/信号/树杀摩擦多 | updater/webview 权限复杂度 |
| 单人维护 | 优=秒级编译 | 中 | 中，经常每天编译都背 Rust 全量 |
| 桌面壳 | 无原生（systray 可自写，非核心） | 无 | 有但本项目现状是浏览器，壳非刚需 |

**关键共识**：Tauri 的 sidecar 只支持单个静态二进制，node_modules/Python site-packages 不能捆绑。所以无论怎么选，AstrBot/wechat-bot/qr-server 都是外部进程、靠面板 `os/exec` 拉起——这正是 Go 原生强项，Tauri 无额外加分。

## 三、为什么 Tauri 不适合本项目

Tauri 的全部价值（托盘/窗口/桌面壳）在本项目**未被使用**（现在就是浏览器访问 Web 面板），却强制引入四层复杂度：
1. WebView2 运行时依赖
2. 前端 fetch ║gt; invoke 的 RPC 胶水（需改前端）
3. capabilities 权限配置
4. updater 需要签名/服务器

## 四、为什么 Go 而非 Rust 纯后端

- 迁移成本：Go ≈ Python 1:1 平移；Rust 估算 1.5~2 倍工作量
- 迭代：Go 秒级编译 + 热重启，最利于单人维护；Rust 首编 2-5 分钟
- 本项目负载轻（监控面板），tokio 并发优势无实际收益

## 五、实施路线（单人约 2 周）

| 阶段 | 内容 | 预算 |
|---|---|---|
| 0 决策门 | 冻结 API 契约；插件机制改为编译期声明式注册（或放弃动态） | 0.5天 |
| 1 骨架+进程 | `os/exec` 封装、健康检查(gopsutil)、**树杀从首行实现**（Win taskkill /T、Linux setpgid）、/api/status SSE | 1-2天 |
| 2 配置+日志 | JSON BOM 处理、`_atomic_write`、GB18030 转码、hashId 迁移、config.local | 2-3 天 |
| 3 业务 API | Bearer 认证、后端 API 全量 1:1、SSE、环境检测/install、OneBot/二维码/备份 | 3-4天 |
| 4 剩余+分发 | 托盘/自启(可选)、单文件分发 | 1-2天 |

**双端并存策略**：老 Python 面板保持 :8080，Go 用 :8081，**共享同一工作目录/磁盘状态**；前端 `dist` 一份两端托管，API baseURL 可配置指向任一后端；迁移按「读型监控 → 文件操作 → 业务耦合」优先级逐项切，任一卡住退守 Python。

## 六、诚实边界

Go 重写省的是「面板本身的 Python+PyInstaller 堆积」（体积/误报/内存/分发）。**AstrBot(Python) 和 wechat-bot(Node) 仍作为被启动的外部进程**继续跑在用户机器的 Python/Node 上——若核心痛点是「用户不想装 Python」，Go 不解决这点（需连 bot 也换方案）；若是「安装体积/误报/面板常驻/跨平台」，Go 一次到位。

## 配套
- 功能规格基线：docs/REFACTOR_SPEC_BASELINE.md
- 前置条件：**先初始化 git**（当前无版本控制）