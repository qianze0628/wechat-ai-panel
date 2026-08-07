# 微信 AI 机器人管理面板前端优化方案：NapCat 风格版本

> 版本：2.0  
> 日期：2026-08-06  
> 状态：待实施  
> 项目：`C:\Users\YMB\Desktop\wechat\wechat-ai-panel\`  
> 参考：`C:\Users\YMB\Desktop\napcat\NapCat-WebUI前端仿制分析报告.md`  
> 本文件替代旧版 Jade Console 方案。

---

## 一、检查结论

### 1.1 已确认的侧边栏故障

侧边栏并不是点击事件失效，而是路由定义不完整。

当前 `AppShell.tsx` 已生成以下导航链接：

```text
/
/onboarding
/services
/connection
/logs
/backups
/settings
```

但 `App.tsx` 目前只声明了一个真实路由：

```tsx
<Route path="/" element={<OverviewPage />} />
<Route path="*" element={<Navigate to="/" replace />} />
```

因此点击“部署向导”“服务中心”“连接配置”“实时日志”“备份恢复”“设置”后：

```text
浏览器短暂尝试进入目标地址
→ `*` 通配路由命中
→ 立即重定向回 `/`
→ 用户看到的效果就是“侧边栏按钮没有反应”
```

本机浏览器验证结果：点击“部署向导”后页面地址仍回到 `http://127.0.0.1:8080/`。

### 1.2 已确认的工程问题

当前命令：

```text
npm run typecheck
```

会报：

```text
TS6310: Referenced project ... tsconfig.node.json may not disable emit.
```

原因是根 `tsconfig.json` 使用项目引用，同时 `typecheck` 脚本执行 `tsc -b --noEmit`，与被引用的 `tsconfig.node.json` 的 `noEmit: false` 冲突。

该问题不会阻止已经生成的静态产物被 FastAPI 提供，但会阻止前端在改版过程里稳定做类型检查，必须先修复。

### 1.3 视觉方向调整

旧版 Jade Console 使用深绿、石墨黑和运维控制台风格。用户当前希望改成参考项目的色彩与样式，因此视觉方向改为：

```text
NapCat Pink Glass
粉色主色
+ 冰霜蓝辅助色
+ 浅紫粉渐变背景
+ 毛玻璃卡片
+ 浮动顶栏
+ 可折叠侧边栏
+ 柔和入场与页面切换
```

保留本项目自己的名称、业务文案、图标和前端组件实现；只参考设计方法、配色逻辑、布局机制和交互节奏。

---

## 二、优化目标

完成重构后，前端需要同时满足：

```text
每个侧边栏入口都进入真实、可操作的页面
页面路由、导航高亮和顶部面包屑始终一致
默认主题呈现粉蓝毛玻璃风格
亮色与暗色主题都可用，并可记住用户选择
所有图标统一为 SVG 图标，不使用 Emoji
服务、部署、连接、日志、备份、设置的工作流各自有独立页面
关键操作具备加载、确认、失败、成功和日志入口
375、768、1024、1440 宽度下无横向滚动
前端 typecheck 与 production build 均可通过
```

---

## 三、P0 修复：侧边栏与路由

### 3.1 修复策略

不要删除侧边栏导航项，也不要把未实现页面继续指向首页。应建立完整路由表，为每项导航提供真实页面组件。

推荐创建：

```text
frontend/src/pages/
├── OverviewPage.tsx
├── OnboardingPage.tsx
├── ServicesPage.tsx
├── ConnectionPage.tsx
├── LogsPage.tsx
├── BackupsPage.tsx
├── SettingsPage.tsx
└── AuthPage.tsx
```

路由定义统一放在：

```text
frontend/src/app/routes.tsx
```

### 3.2 路由目标与后端 API 映射

| 路由 | 页面 | 现有后端能力 | 第一版必须可用的操作 |
|---|---|---|---|
| `/` | 概览 | `/api/status`、`/api/services` | 总体状态、最近异常、快捷启动。 |
| `/onboarding` | 部署向导 | `/api/env`、`/api/install`、`/api/start`、`/api/qr/status` | 检测、安装、启动、扫码、进入模型配置。 |
| `/services` | 服务中心 | `/api/services`、`/api/start`、`/api/stop`、`/api/restart` | 分服务启动、停止、重启、健康详情。 |
| `/connection` | 连接配置 | `/api/qr/status`、`/qr.png`、`/api/astrbot/creds`、预览与应用接口 | 微信扫码、凭据、OneBot 预览与配置。 |
| `/logs` | 实时日志 | `/api/logs`、`/api/logs/stream` | 服务切换、实时日志、暂停滚动、复制。 |
| `/backups` | 备份恢复 | `/api/backups`、恢复接口 | 备份列表、恢复确认、恢复结果。 |
| `/settings` | 设置 | `/api/status`、认证状态、配置摘要 | 实例路径、端口、认证、主题和版本信息。 |

### 3.3 推荐路由代码结构

```tsx
<Routes>
  <Route path="/" element={<OverviewPage />} />
  <Route path="/onboarding" element={<OnboardingPage />} />
  <Route path="/services" element={<ServicesPage />} />
  <Route path="/connection" element={<ConnectionPage />} />
  <Route path="/logs" element={<LogsPage />} />
  <Route path="/backups" element={<BackupsPage />} />
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

在页面尚未完成前，也必须显示功能明确的页面占位，不允许点击后返回首页。

占位页面至少提供：

```text
页面标题
该页面正在接入的功能说明
返回概览按钮
与当前页面相关的一个可用入口
```

### 3.4 导航组件改造

将 `Link` 改为 `NavLink`，由路由自动提供 active 状态，不再手写路径相等判断。

导航激活态采用参考项目的方式：

```text
淡粉色背景
+ 主粉色文字
+ 字体加重
+ 向右平移 4px
+ 右侧小型粉色活动点
```

建议菜单数据独立为：

```text
frontend/src/app/navigation.ts
```

这样页面标题、图标、路由、面包屑和移动端导航共用同一份定义。

### 3.5 侧边栏验收

```text
点击每个菜单，URL 必须变成对应路径且页面标题改变
刷新任意已知路径，页面仍显示当前页面而非回到首页
当前菜单项必须高亮
未知路径才允许回退首页
折叠和展开侧边栏不改变当前路由
375px 宽度下导航改为抽屉，不遮挡主内容
```

---

## 四、P0 修复：TypeScript 检查与构建

### 4.1 修复方式

当前 `typecheck` 不能继续使用：

```text
tsc -b --noEmit
```

推荐改为其中一种结构，优先采用方案 A。

#### 方案 A：拆分应用与构建配置

```text
tsconfig.json              只维护 project references
 tsconfig.app.json         前端 src 类型检查，noEmit: true
 tsconfig.node.json        Vite/Tailwind 配置类型检查
```

脚本：

```json
{
  "scripts": {
    "typecheck": "tsc -b",
    "build": "tsc -b && vite build"
  }
}
```

#### 方案 B：保持当前文件结构

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "tsc -b && vite build"
  }
}
```

方案 A 更适合后续多页面项目，优先采用。

### 4.2 验收

```text
npm run typecheck 退出码为 0
npm run build 退出码为 0
构建后 static/index.html 与 static/assets/ 都存在
FastAPI 访问根路径能加载新构建产物
```

---

## 五、NapCat 风格设计系统

### 5.1 主题模式

默认使用亮色粉蓝主题，并提供暗色粉红主题切换。

```text
亮色：清爽、柔和、粉蓝紫光斑，适合作为默认管理界面
暗色：深灰底、亮粉主色，适合夜间与日志工作流
```

主题状态保存到：

```text
localStorage: wechat-ai-panel-theme
```

根节点通过以下属性切换：

```html
<html data-theme="light">
<html data-theme="dark">
```

### 5.2 亮色 Token

```css
:root,
[data-theme="light"] {
  --primary-50: #FFF0F5;
  --primary-100: #FFE4E9;
  --primary-200: #FFCDD9;
  --primary-300: #FF9EB5;
  --primary-400: #FF7FAC;
  --primary-500: #F33B7C;
  --primary-600: #C92462;

  --secondary-100: #D7F0F8;
  --secondary-300: #88C0D0;
  --secondary-500: #4C8DAE;

  --background: #FFF9FB;
  --background-alt: #F6F5FF;
  --foreground: #2F2630;
  --foreground-muted: #756A73;
  --surface: rgba(255, 255, 255, 0.64);
  --surface-solid: #FFFFFF;
  --border: rgba(255, 127, 172, 0.20);
  --danger: #DB3694;
  --success: #3BAA78;
  --warning: #E9A23B;
}
```

### 5.3 暗色 Token

```css
[data-theme="dark"] {
  --primary-50: #310413;
  --primary-100: #610726;
  --primary-200: #920B3A;
  --primary-300: #C20E4D;
  --primary-400: #F31260;
  --primary-500: #F54180;
  --primary-600: #F871A0;

  --secondary-300: #88C0D0;
  --secondary-500: #4C8DAE;

  --background: #1F1D22;
  --background-alt: #28242C;
  --foreground: #FCEFF5;
  --foreground-muted: #BFAFBA;
  --surface: rgba(30, 27, 34, 0.62);
  --surface-solid: #2A2630;
  --border: rgba(255, 255, 255, 0.10);
  --danger: #DB3694;
  --success: #52C58A;
  --warning: #EFB95D;
}
```

### 5.4 全局背景

页面背景采用三层模糊光斑：

```text
左上：粉色
右上：冰蓝
底部：淡紫色
```

亮色背景：

```css
background: linear-gradient(135deg, #F8F4FF 0%, #FFFFFF 48%, #FFF2F6 100%);
```

暗色背景：

```css
background: linear-gradient(135deg, #201D24 0%, #29252E 50%, #1E1B21 100%);
```

光斑必须固定在背景层，透明度低于 `0.42`，模糊值在 `90px` 至 `120px`，不参与持续移动动画。

### 5.5 字体

```text
界面标题与正文：Nunito、Noto Sans SC、PingFang SC、Microsoft YaHei
技术字段与日志：JetBrains Mono、Cascadia Mono、Consolas
```

规则：

```text
标题字距：-0.02em
正文行高：1.55 至 1.7
菜单与表格：13 至 14px
技术字段：12 至 13px 等宽字体
不使用过大、渐变、营销感强的标题
```

---

## 六、应用框架与布局

### 6.1 页面外壳

```text
全屏渐变背景
└── 浮动布局容器
    ├── 左侧玻璃侧边栏
    └── 右侧主内容区
        ├── 顶部毛玻璃胶囊栏
        └── 页面内容
```

桌面端布局：

```text
页面四周保留 16px 间距
侧边栏宽度 256px
侧边栏与主区均为圆角容器，而不是贴边直角分栏
顶部栏置于内容区顶部，保持 16px 外边距
主区内容最大宽度 1440px
```

### 6.2 顶部栏

顶部栏采用：

```text
半透明白色或深色背景
+ backdrop-blur-xl
+ 14px 圆角
+ 细边框
+ 面包屑文字过渡
+ 右侧状态、主题切换、刷新、用户操作
```

右侧建议顺序：

```text
本地实例状态 Badge → 主题切换 → 刷新 → 更多菜单
```

### 6.3 侧边栏

侧边栏延续参考项目的导航节奏：

```text
顶部：产品标识、粉色竖条、产品名与小副标题
中部：菜单组
底部：主题切换、折叠按钮、退出或锁定状态
```

菜单交互：

```css
默认：text-muted
hover：background: default-100；translateX(4px)
active：background: primary-50/70；color: primary-600；font-weight: 600；translateX(4px)
active 指示：右侧 12px × 6px 粉色圆角点
```

折叠动画：

```text
宽度 256px → 68px
时长 240ms
使用 spring 或 ease-out
折叠后图标保留 Tooltip
```

### 6.4 卡片体系

亮色卡片：

```css
background: rgba(255, 255, 255, 0.64);
border: 1px solid rgba(255, 255, 255, 0.72);
box-shadow: 0 14px 40px rgba(155, 109, 136, 0.10);
backdrop-filter: blur(16px) saturate(145%);
border-radius: 16px;
```

暗色卡片：

```css
background: rgba(24, 21, 29, 0.60);
border: 1px solid rgba(255, 255, 255, 0.10);
box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
backdrop-filter: blur(16px) saturate(140%);
border-radius: 16px;
```

所有卡片不应都带 3D 旋转。鼠标追光和轻微 tilt 仅用于认证页或欢迎卡，最大旋转角度为 3 度。

---

## 七、页面重构方案

### 7.1 概览页

首屏结构：

```text
标题区：概览 + 当前实例健康状态
第一行：3 个服务状态卡（AstrBot / wechat-bot / qr-server）
第二行：部署流程进度 + 快捷操作
第三行：配置摘要 + 最近任务 / 最近异常
```

服务卡：

```text
服务图标
服务名称
状态 Badge
端口与 PID
最后一次检查时间
启动 / 停止 / 重启小按钮
```

不在概览页堆放所有细节；日志、备份和完整配置移动到独立页面。

### 7.2 部署向导页

将当前逻辑整理为纵向时间线：

```text
环境检查
→ 安装依赖
→ 配置 OneBot
→ 启动服务
→ 微信扫码
→ 配置模型
```

每步提供：

```text
序号
状态图标
一句说明
完成条件
主操作按钮
最近结果
```

当前步骤使用粉色高亮，完成步骤使用绿色勾选，失败步骤使用洋红错误色。

### 7.3 服务中心

每个服务采用独立可展开卡片：

```text
服务概况
→ 健康明细
→ 进程与端口
→ 最近输出摘要
→ 启动、停止、重启
```

停止和重启需使用粉色系确认弹窗，弹窗明确列出：

```text
服务名
PID
端口
操作影响
确认按钮
```

### 7.4 连接配置

使用双列布局：

```text
左：微信二维码、扫码状态、刷新二维码
右：AstrBot 登录凭据、OneBot 状态、预览变更、应用配置、打开 WebUI
```

二维码卡片使用白色内框和 `rounded-md`，符合参考项目的二维码样式。登录成功后整个二维码区切换为成功摘要，不仅降低图片透明度。

### 7.5 实时日志

日志页采用独立的深色终端工作区，即使亮色主题下仍保持深色日志面板：

```text
顶部：服务标签、搜索、自动滚动、复制、清空视图
主体：等宽日志流
右侧：日志来源、文件路径、连接状态、最近错误
```

日志等级颜色：

```text
INFO：中性浅灰
SUCCESS：淡绿
WARNING：琥珀
ERROR：粉红 / 洋红
```

### 7.6 备份恢复

使用表格或列表，不使用大卡片堆叠：

```text
备份时间
大小
哈希摘要
包含内容
恢复按钮
```

恢复按钮使用危险操作确认弹窗，并显示恢复前备份状态。

### 7.7 设置

设置页分组：

```text
实例路径
端口与服务
面板认证
外观主题
版本与构建信息
```

主题项至少包含：

```text
亮色粉蓝
暗色粉红
跟随系统
```

---

## 八、组件规范

### 8.1 基础组件

```text
AppShell
PageBackground
Sidebar
Topbar
PageHeader
GlassCard
StatusBadge
IconButton
ActionButton
ThemeToggle
ConfirmDialog
Toast
EmptyState
Skeleton
```

### 8.2 图标规范

使用 `lucide-react`。

| 功能 | 图标 |
|---|---|
| 概览 | `LayoutDashboard` |
| 部署向导 | `Route` |
| 服务中心 | `ServerCog` |
| 连接配置 | `Cable` |
| 实时日志 | `TerminalSquare` |
| 备份恢复 | `ArchiveRestore` |
| 设置 | `Settings2` |
| 启动 | `Play` |
| 停止 | `Square` |
| 重启 | `RotateCw` |
| 主题 | `Sun` / `Moon` |

界面、按钮、标题和 favicon 不使用 Emoji。

---

## 九、动效规范

### 9.1 页面与导航

| 场景 | 动效 | 参数 |
|---|---|---|
| 页面切换 | opacity 0→1，y 16→0 | 240ms，ease-out |
| 侧边栏展开 | width + 内容淡入 | 240ms，spring / ease-out |
| 菜单 hover | x 0→4px | 160ms |
| 菜单 active | 粉色背景、文字和指示点过渡 | 180ms |
| 卡片入场 | opacity + y 8px | 180ms，错开 30ms |
| 弹窗 | opacity + scale 0.98→1 | 180ms |
| QR 刷新 | 骨架 → 淡入图片 | 200ms |

### 9.2 限制

```text
不使用大面积霓虹
不使用扫描线、粒子、矩阵雨或无意义旋转
不让日志行逐条入场
不让卡片持续浮动
用户开启 reduced motion 时关闭非必要动效
```

---

## 十、实施步骤

### 阶段 A：先修复可用性

```text
修复 tsconfig/typecheck
补齐 6 个真实路由页面
将 Link 改为 NavLink
修正顶栏面包屑
补充 Playwright 路由点击测试
```

验收：

```text
所有侧边栏菜单可进入对应 URL
URL、页面标题、导航高亮三者一致
npm run typecheck 与 npm run build 通过
```

### 阶段 B：替换主题系统

```text
删除 Jade Console 的绿色 Token
建立粉蓝亮色与粉红暗色 CSS Variables
实现 ThemeProvider 和 localStorage 持久化
替换全局背景、侧边栏、顶栏和卡片样式
```

验收：

```text
亮色与暗色切换即时生效
刷新后主题保持
所有页面使用同一套 Token
```

### 阶段 C：重构核心页面

```text
概览页
部署向导页
服务中心页
连接配置页
实时日志页
```

验收：

```text
现有 FastAPI 功能均能在对应新页面完成
所有写操作有 loading、成功、失败和查看日志入口
```

### 阶段 D：完善辅助页面与适配

```text
备份恢复
设置页
移动端抽屉侧边栏
键盘焦点
对比度检查
reduced motion
截图回归测试
```

---

## 十一、最终验收清单

### 功能

```text
所有七个导航入口可用
刷新任意已知路由不回首页
认证状态正确处理
环境、服务、二维码、凭据、配置、日志、备份均可访问
FastAPI 根路径加载最新构建产物
```

### 视觉

```text
主色为粉色，辅助色为冰蓝
亮色页面有粉蓝紫柔和背景光斑
暗色页面使用亮粉色强调色
卡片、按钮、输入框和菜单具有统一圆角、边框和阴影
无 Emoji 图标
导航、顶栏和页面内容层级明确
```

### 交互

```text
按钮有 hover、focus、loading、disabled 状态
危险操作有确认弹窗
错误有 toast 和日志入口
SSE 页面离开后关闭旧连接
375、768、1024、1440 宽度无横向滚动
尊重 prefers-reduced-motion
```

---

## 十二、执行顺序结论

先修复路由与 typecheck，再替换颜色和布局，最后重构独立功能页。

```text
P0：侧边栏路由 + TypeScript 构建
P1：NapCat 粉蓝主题、顶栏、侧栏、全局背景、主题切换
P2：概览、向导、服务、连接、日志页面重构
P3：备份、设置、移动端、无障碍、视觉回归测试
```

在 P0 未通过前，不继续叠加新的动效和页面装饰，避免“界面更好看但导航仍不可用”的问题。
