import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from '../app/toast'
import { useState } from 'react'
import {
  CircleCheck,
  CircleX,
  TriangleAlert,
  Loader2,
  Play,
  Square,
  RotateCw,
  ExternalLink,
  ScanSearch,
  ServerCog,
  QrCode,
  Cable,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react'
import { panelApi } from '../api'
import type { ServiceInfo, StartStep } from '../types/api'

// ===== 状态 Badge =====
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
        ok ? 'bg-primary-100 text-primary-600' : 'bg-warning/15 text-warning'
      }`}
    >
      {ok ? <CircleCheck size={13} /> : <TriangleAlert size={13} />}
      {label}
    </span>
  )
}

// ===== 复制到剪贴板 =====
async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} 已复制`)
  } catch {
    toast.error('复制失败, 请手动选择复制')
  }
}

// ===== 服务健康卡 =====
function ServiceCard({
  name,
  icon: Icon,
  desc,
  info,
  portLabel,
  onAction,
  busy,
}: {
  name: string
  icon: typeof ServerCog
  desc: string
  info: ServiceInfo & { running: boolean; pid: number | null }
  portLabel: string
  onAction: (action: 'start' | 'stop' | 'restart') => void
  busy: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="glass-panel p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              info.running ? 'bg-primary-100 text-primary-500' : 'bg-surface-solid text-foreground-muted'
            }`}
          >
            <Icon size={19} />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-foreground">{name}</div>
            <div className="text-[12px] text-foreground-muted">{desc}</div>
          </div>
        </div>
        <StatusBadge ok={info.running} label={info.running ? '健康' : '未启动'} />
      </div>

      <div className="mt-4 space-y-1 text-[12.5px] text-foreground-muted">
        <div className="flex justify-between">
          <span className="text-foreground-muted/80">端口</span>
          <span className="mono">{portLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-muted/80">PID</span>
          <span className="mono">{info.pid ?? '—'}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAction('start')}
          disabled={busy || info.running}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          启动
        </button>
        <button
          onClick={() => onAction('restart')}
          disabled={busy || !info.running}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          重启
        </button>
        <button
          onClick={() => onAction('stop')}
          disabled={busy || !info.running}
          aria-label={`停止 ${name}`}
          className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
        </button>
      </div>
    </motion.div>
  )
}

// ===== AstrBot 登录凭据卡 =====
function CredsCard({
  username,
  password,
  source,
  passwordChanged,
}: {
  username: string | null
  password: string | null
  source: string | null
  passwordChanged?: boolean
}) {
  const [show, setShow] = useState(false)
  // 密码已由用户改为 pbkdf2 哈希存储 → 无明文可展示
  if (passwordChanged) {
    return (
      <div className="glass-panel p-5">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <KeyRound size={16} className="text-primary-500" />
          AstrBot 登录凭据
        </div>
        <div className="space-y-2.5">
          {username && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-solid px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[11px] text-foreground-muted">用户名</div>
                <div className="mono mt-0.5 truncate text-[13px] text-foreground">{username}</div>
              </div>
              <button
                onClick={() => copyText(username, '用户名')}
                title="复制用户名"
                aria-label="复制用户名"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-success/15 p-3 text-[12.5px] text-success">
            <CircleCheck size={15} className="mt-0.5 shrink-0" />
            密码已由你本人修改，安全存储在 AstrBot 中。请使用你自己设置的新密码登录，面板不显示它。
          </div>
        </div>
      </div>
    )
  }

  const has = !!username && !!password

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <KeyRound size={16} className="text-primary-500" />
        AstrBot 登录凭据
      </div>

      {!has ? (
        <div className="rounded-lg bg-warning/15 p-3 text-[12.5px] text-warning">
          未找到可用凭据 (cmd_config.json 缺失或未生成 dashboard 凭据)。
          可到 AstrBot WebUI 的「设置-账号」查看。
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-solid px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-[11px] text-foreground-muted">用户名</div>
              <div className="mono mt-0.5 truncate text-[13px] text-foreground">{username}</div>
            </div>
            <button
              onClick={() => copyText(username ?? '', '用户名')}
              title="复制用户名"
              aria-label="复制用户名"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
            >
              <Copy size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-solid px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-[11px] text-foreground-muted">密码</div>
              <div className="mono mt-0.5 truncate text-[13px] text-foreground">
                {show ? password : '••••••••••••'}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setShow((v) => !v)}
                title={show ? '隐藏密码' : '显示密码'}
                aria-label={show ? '隐藏密码' : '显示密码'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => copyText(password ?? '', '')}
                title="复制密码"
                aria-label="复制密码"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {source && (
            <div className="text-[11.5px] text-foreground-muted">来源: {source}</div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-[12px] text-warning">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            登录后请在 AstrBot WebUI 的「设置-账号」中立即修改密码。
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 概览页 =====
export default function OverviewPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 5000,
  })

  const svc = data?.services
  const env = data?.env

  // 按钮 loading 状态 (按服务+动作)
  const [busy, setBusy] = useState<{ key: string; action?: string } | null>(null)
  // 安装完成弹窗
  const [showInstalledDialog, setShowInstalledDialog] = useState(false)
  const [installedWhere, setInstalledWhere] = useState<{ platform: string; wechat_dir?: string; astrbot_dir?: string } | null>(null)

  // 部署进度: 环境齐全 → 服务健康 → 已配置 OneBot
  const envReady =
    !!env &&
    env.node.installed &&
    env.npm.installed &&
    env.uv.installed &&
    env.astrbot.installed &&
    env.wechat_bot.installed
  const servicesReady = !!svc && svc.astrbot.running && svc.wechat.running && svc.qr.running
  const configured = !!data?.astrbot_configured

  const stages = [
    { label: '环境检查', done: envReady, icon: ScanSearch },
    { label: '服务启动', done: servicesReady, icon: ServerCog },
    { label: 'OneBot 配置', done: configured, icon: Cable },
    { label: '微信扫码', done: false, icon: QrCode },
  ]

  // 执行服务动作 (start/stop/restart) 并给出反馈
  async function serviceAction(service: string, act: 'start' | 'stop' | 'restart', label: string) {
    if (busy) return
    setBusy({ key: service, action: act })
    try {
      const r = await panelApi[act](service)
      if (r.ok === false) {
        toast.error(r.message || `${label}失败`)
      } else {
        toast.success(`${label}请求已发送`)
        if (r.message && !r.ok) {
          toast.error(r.message)
        }
      }
      refetch()
      // 等一轮轮询后按最终状态提示
      setTimeout(() => refetch(), 1500)
    } catch (e) {
      // 401 / 网络 / 超时 已由 client 统一 toast
    } finally {
      setBusy(null)
    }
  }

  // 一键安装
  async function handleInstall() {
    if (busy) return
    setBusy({ key: 'install' })
    try {
      const r = await panelApi.install()
      if (r.tasks.length === 0) {
        // 全部组件已就绪: 弹完成窗显示当前位置
        toast.success(r.message || '组件齐全, 无需安装')
        setInstalledWhere({ platform: r.platform, wechat_dir: r.wechat_dir, astrbot_dir: r.astrbot_dir })
        setShowInstalledDialog(true)
      } else {
        toast.success('安装已在后台启动, 可到部署向导查看进度')
      }
      refetch()
    } catch {
      /* client 已 toast */
    } finally {
      setBusy(null)
    }
  }

  // 全部服务动作
  async function allAction(act: 'start' | 'stop') {
    if (busy) return
    setBusy({ key: 'all', action: act })
    try {
      const r = await panelApi[act]('all')
      if (r.ok === false) {
        toast.error(r.message || `${act === 'start' ? '启动' : '停止'}全部服务失败`)
      } else {
        toast.success(`全部服务${act === 'start' ? '启动' : '停止'}完成`)
      }
      // start 返回 steps (分阶段明细)
      if (act === 'start') {
        const sr = r as { steps?: StartStep[] }
        sr.steps?.forEach((s) => {
          if (s.status !== 'ok') toast.error(`[${s.service}] ${s.message}`)
        })
      }
      refetch()
    } catch {
      /* client 已 toast */
    } finally {
      setBusy(null)
    }
  }

  const installing = busy?.key === 'install'

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} />
        正在加载状态…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">概览</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          {data.config.cmd_config_mtime
            ? `AstrBot 配置最后修改: ${data.config.cmd_config_mtime}`
            : '本地实例状态一览'}
        </p>
      </div>

      {/* 部署进度时间线 */}
      <div className="glass-panel p-5">
        <div className="mb-4 text-[14px] font-semibold text-foreground">部署进度</div>
        <div className="flex flex-wrap gap-3">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] ${
                  s.done ? 'bg-primary-100 text-primary-600' : 'bg-surface-solid text-foreground-muted'
                }`}
              >
                <s.icon size={14} />
                {s.label}
                {s.done && <CircleCheck size={13} />}
              </div>
              {i < stages.length - 1 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* 服务健康概览 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ServiceCard
          name="AstrBot"
          icon={ServerCog}
          desc="AI 对话引擎"
          info={svc!.astrbot}
          portLabel={`${svc!.astrbot.webui_port} / ${svc!.astrbot.ws_port}`}
          onAction={(a) => serviceAction('astrbot', a, 'AstrBot')}
          busy={busy?.key === 'astrbot'}
        />
        <ServiceCard
          name="wechat-bot"
          icon={QrCode}
          desc="微信桥接"
          info={svc!.wechat}
          portLabel={String(svc!.wechat.api_port)}
          onAction={(a) => serviceAction('wechat', a, 'wechat-bot')}
          busy={busy?.key === 'wechat'}
        />
        <ServiceCard
          name="qr-server"
          icon={Cable}
          desc="扫码登录服务"
          info={svc!.qr}
          portLabel={String(svc!.qr.port)}
          onAction={(a) => serviceAction('qr', a, 'qr-server')}
          busy={busy?.key === 'qr'}
        />
      </div>

      {/* 快速操作 + 实例信息 + 凭据 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="mb-3 text-[14px] font-semibold text-foreground">快速操作</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleInstall}
              disabled={!!busy}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {installing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {installing ? '正在安装…' : '一键安装缺失组件'}
            </button>
            <button
              onClick={() => allAction('start')}
              disabled={!!busy || (svc?.astrbot.running && svc?.wechat.running && svc?.qr.running)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
            >
              {busy?.key === 'all' && busy.action === 'start' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              启动全部服务
            </button>
            <a
              href="/astrbot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <ExternalLink size={14} /> 打开 AstrBot WebUI
            </a>
          </div>

          {data.config_errors.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-[13px] text-warning">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">配置校验告警</div>
                {data.config_errors.map((e) => (
                  <div key={e} className="text-[12.5px]">
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <CredsCard
          username={data.creds.username}
          password={data.creds.password}
          source={data.creds.source}
          passwordChanged={data.creds.password_changed}
        />
      </div>

      {/* 实例信息 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5">
          <div className="mb-3 text-[14px] font-semibold text-foreground">实例信息</div>
          <div className="space-y-1.5 text-[12.5px]">
            {[
              ['wechat-bot 目录', data.config.wechat_bot_dir],
              ['AstrBot 根目录', data.config.astrbot_root],
              ['AstrBot 数据目录', data.config.astrbot_data_dir],
              ['cmd_config', data.config.cmd_config],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="w-28 shrink-0 text-foreground-muted/80">{k}</span>
                <span className="mono min-w-0 flex-1 truncate text-foreground-muted" title={v}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 配置错误时的额外提示 */}
      {!data.astrbot_configured && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 p-3 text-[13px] text-warning">
          <CircleX size={16} />
          OneBot 平台尚未配置或端口不符, 请前往「连接配置」执行一键配置。
        </div>
      )}

      {/* 安装完成弹窗 */}
      {showInstalledDialog && installedWhere && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowInstalledDialog(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-[440px] p-6"
          >
            <div className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
              <CircleCheck size={18} className="text-success" />
              安装完成
            </div>
            <p className="mb-3 text-[13px] text-foreground-muted">组件安装/检查完成，位置如下：</p>
            <div className="space-y-2 rounded-xl border border-border bg-surface-solid p-3.5 text-[12.5px]">
              {[
                ['系统平台', installedWhere.platform],
                ['wechat-bot', installedWhere.wechat_dir || '（默认路径）'],
                ['AstrBot', installedWhere.astrbot_dir || '（默认路径）'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="w-28 shrink-0 text-foreground-muted/70">{k}</span>
                  <span className="mono min-w-0 flex-1 break-all text-foreground">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowInstalledDialog(false)}
                className="rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                知道了
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}