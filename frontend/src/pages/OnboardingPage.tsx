// 部署向导: 环境检查 → 安装依赖 → 配置 OneBot → 启动服务 → 微信扫码 → 配置模型
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from '../app/toast'
import {
  CircleCheck,
  CircleX,
  TriangleAlert,
  Loader2,
  Play,
  ScanSearch,
  Wrench,
  ServerCog,
  QrCode,
  ExternalLink,
  Settings2,
} from 'lucide-react'
import { panelApi } from '../api'
import SuccessModal from '../components/ui/SuccessModal'
import type { EnvStatus } from '../types/api'

type StepStatus = 'pending' | 'done' | 'error'

interface StepRow {
  key: string
  label: string
  desc: string
  icon: typeof ScanSearch
  status: StepStatus
  result?: string
}

export default function OnboardingPage() {
  const { data: st, isLoading, refetch } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 5000,
  })
  const { data: qr } = useQuery({
    queryKey: ['qr'],
    queryFn: panelApi.qrStatus,
    refetchInterval: 3000,
  })

  const [busy, setBusy] = useState<string | null>(null)
  const [installState, setInstallState] = useState<{
    running: boolean
    done: boolean
    ok: boolean | null
    logs: string[]
    platform?: string
    install_where?: { platform: string; wechat_dir: string; astrbot_dir: string; astrbot_exe?: string }
  }>({ running: false, done: false, ok: null, logs: [] })

  const env: EnvStatus | undefined = st?.env
  const svc = st?.services

  const envReady =
    !!env &&
    env.node.installed &&
    env.npm.installed &&
    env.uv.installed &&
    env.astrbot.installed
  const depsReady = !!env?.wechat_bot?.installed && !!env?.wechat_bot?.deps_ready
  const configured = !!st?.astrbot_configured
  const astrRunning = !!svc?.astrbot?.running
  const logged = !!qr?.logged

  // 安装: 平台 + 自定义路径 + 日志 + 完成弹窗
  const [installPlatform, setInstallPlatform] = useState<'windows' | 'mac' | 'linux'>('windows')
  const [wechatDir, setWechatDir] = useState('')
  const [astrbotDir, setAstrbotDir] = useState('')
  const [showInstalledDialog, setShowInstalledDialog] = useState(false)

  async function runInstall() {
    if (busy) return
    setBusy('install')
    try {
      const r = await panelApi.install({
        platform: installPlatform,
        wechat_dir: wechatDir || undefined,
        astrbot_dir: astrbotDir || undefined,
      })
      if (!r.ok) {
        toast.error(r.message || '安装请求失败')
        setBusy(null)
        return
      }
      if (r.tasks.length === 0) {
        // 所有组件已就绪: 直接显示完成弹窗 (显示当前位置)
        toast.success(r.message || '所有组件已就绪')
        setInstallState({
          running: false, done: true, ok: true, logs: [r.message],
          platform: r.platform,
          install_where: { platform: r.platform, wechat_dir: r.wechat_dir, astrbot_dir: r.astrbot_dir },
        })
        setShowInstalledDialog(true)
        setBusy(null)
        return
      }
      // 有实际安装任务: 进入轮询
      toast.success(r.message || '开始安装')
      setInstallState({ running: true, done: false, ok: null, logs: [], platform: r.platform })
      setShowInstalledDialog(false)
      pollInstall()
    } catch {
      setBusy(null)
    }
  }

  function pollInstall() {
    const poll = async () => {
      try {
        const s = await panelApi.installStatus()
        setInstallState({ running: s.running, done: s.done, ok: s.ok, logs: s.logs, platform: s.platform, install_where: s.install_where })
        if (s.running || !s.done) {
          setTimeout(poll, 1500)
        } else {
          setBusy(null)
          if (s.ok) {
            toast.success('依赖安装完成')
            setShowInstalledDialog(true)
          } else {
            toast.error('依赖安装失败，请查看日志')
          }
          refetch()
        }
      } catch {
        setBusy(null)
      }
    }
    setTimeout(poll, 800)
  }

  async function startAll() {
    if (busy) return
    setBusy('start')
    try {
      const r = await panelApi.start('all')
      if (r.ok === false) {
        toast.error(r.message || '启动失败')
      } else {
        toast.success('服务启动请求已发送')
      }
      ;(r as { steps?: { service: string; status: string; message: string }[] }).steps?.forEach((s) => {
        if (s.status !== 'ok') toast.error(`[${s.service}] ${s.message}`)
        else toast.success(`[${s.service}] ${s.message}`)
      })
      refetch()
    } catch {
      /* client 已 toast */
    } finally {
      setBusy(null)
    }
  }

  async function runSetup() {
    if (busy) return
    setBusy('setup')
    try {
      const r = await panelApi.setup()
      if (r.ok === false) {
        toast.error((r as { message?: string }).message || 'OneBot 配置失败')
      } else {
        toast.success('OneBot 已配置并重启 AstrBot')
      }
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'OneBot 配置失败')
    } finally {
      setBusy(null)
    }
  }

  // 组装步骤序列
  const rows: StepRow[] = [
    {
      key: 'env',
      label: '环境检查',
      desc: '检测 node / npm / uv / astrbot 运行环境',
      icon: ScanSearch,
      status: envReady ? 'done' : 'pending',
      result: envReady ? '环境齐全' : '存在缺失组件',
    },
    {
      key: 'deps',
      label: '安装依赖',
      desc: '安装 wechat-bot 依赖与 AstrBot (npm / uv)',
      icon: Wrench,
      status: installState.ok === true || depsReady ? 'done' : installState.ok === false ? 'error' : 'pending',
      result: depsReady ? '依赖已就绪' : installState.running ? `安装中… (${installState.logs.length} 行)` : '尚未安装',
    },
    {
      key: 'onebot',
      label: '配置 OneBot',
      desc: '把 aiocqhttp 平台接入 AstrBot (127.0.0.1:20129)',
      icon: ServerCog,
      status: configured ? 'done' : 'pending',
      result: configured ? '已配置' : '未配置或端口不符',
    },
    {
      key: 'services',
      label: '启动服务',
      desc: '健康启动 AstrBot、wechat-bot、qr-server',
      icon: ServerCog,
      status: astrRunning && svc?.wechat?.running && svc?.qr?.running ? 'done' : 'pending',
      result: astrRunning && svc?.wechat?.running && svc?.qr?.running ? '全部运行中' : astrRunning ? '部分运行中' : '未启动',
    },
    {
      key: 'qr',
      label: '微信扫码',
      desc: '手机微信扫码登录机器人账号',
      icon: QrCode,
      status: logged ? 'done' : 'pending',
      result: logged ? '已登录' : qr?.hasQr ? '待扫码' : '无二维码',
    },
    {
      key: 'model',
      label: '配置模型',
      desc: '到 AstrBot WebUI 的"对话服务"添加你的模型供应商',
      icon: QrCode,
      status: 'pending',
      result: '在 AstrBot WebUI 完成',
    },
  ]

  const actionBtn = (row: StepRow) => {
    switch (row.key) {
      case 'env':
        return (
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
              envReady ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            {envReady ? '环境就绪' : '有缺失'}
          </a>
        )
      case 'deps':
        if (installState.running || busy === 'install')
          return (
            <button disabled className="flex items-center gap-1.5 rounded-lg bg-primary-500/40 px-3.5 py-2 text-[13px] font-semibold text-white">
              <Loader2 size={14} className="animate-spin" /> 安装中…
            </button>
          )
        if (depsReady && !installState.done)
          return (
            <span className="rounded-lg bg-success/15 px-3.5 py-2 text-[13px] font-semibold text-success">已就绪</span>
          )
        return (
          <button
            onClick={runInstall}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Wrench size={14} /> 安装依赖
          </button>
        )
      case 'onebot':
        if (configured)
          return <span className="rounded-lg bg-success/15 px-3.5 py-2 text-[13px] font-semibold text-success">已配置</span>
        return (
          <button
            onClick={runSetup}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Settings2 size={14} /> 一键配置
          </button>
        )
      case 'services':
        if (busy === 'start')
          return (
            <button disabled className="flex items-center gap-1.5 rounded-lg bg-primary-500/40 px-3.5 py-2 text-[13px] font-semibold text-white">
              <Loader2 size={14} className="animate-spin" /> 启动中…
            </button>
          )
        if (astrRunning && svc?.wechat?.running && svc?.qr?.running)
          return <span className="rounded-lg bg-success/15 px-3.5 py-2 text-[13px] font-semibold text-success">全部运行中</span>
        return (
          <button
            onClick={startAll}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play size={14} /> 启动全部服务
          </button>
        )
      case 'qr':
        if (logged) return <span className="rounded-lg bg-success/15 px-3.5 py-2 text-[13px] font-semibold text-success">已登录</span>
        if (qr?.hasQr)
          return (
            <a href="/qr.png" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted hover:text-primary-500">
              <QrCode size={14} /> 查看二维码
            </a>
          )
        return <span className="rounded-lg bg-muted/10 px-3.5 py-2 text-[13px] text-foreground-muted">等待二维码</span>
      case 'model':
        return (
          <a
            href="/astrbot"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted hover:text-primary-500"
          >
            <ExternalLink size={14} /> 打开 AstrBot WebUI
          </a>
        )
      default:
        return null
    }
  }

  if (isLoading || !st) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 正在加载…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-3">
      {/* 页面标题 */}
      <div className="mb-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">部署向导</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">从环境检查到配置模型的完整部署流程</p>
      </div>

      {rows.map((row, i) => (
        <motion.div
          key={row.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
          className="glass-panel flex items-center gap-3 p-4"
        >
          {/* 序号/状态 */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-solid text-foreground-muted">
            <StepIcon status={row.status} icon={row.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-foreground">{row.label}</div>
            <div className="text-[12px] text-foreground-muted">{row.desc}</div>
            <div className="mt-0.5 text-[11.5px] text-foreground-muted/70">{row.result}</div>
          </div>
          <div className="shrink-0">{actionBtn(row)}</div>
        </motion.div>
      ))}

      {/* 依赖安装配置面板: 平台选择 + 自定义路径 + 日志 */}
      <div className="glass-panel p-5">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <Wrench size={15} className="text-primary-500" />
          依赖安装
          <span className="text-[11px] font-normal text-foreground-muted">选择系统平台与安装路径</span>
          <button
            onClick={runInstall}
            disabled={!!busy || installState.running}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {installState.running ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
            {installState.running ? '安装中…' : depsReady ? '重新安装 / 检查' : '开始安装'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* 平台选择 */}
          <label className="block">
            <span className="mb-1 block text-[12px] text-foreground-muted">系统平台</span>
            <select
              value={installPlatform}
              onChange={(e) => setInstallPlatform(e.target.value as 'windows' | 'mac' | 'linux')}
              disabled={installState.running}
              className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none disabled:opacity-40"
            >
              <option value="windows">Windows</option>
              <option value="mac">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </label>
          {/* 自定义路径 */}
          <label className="block">
            <span className="mb-1 block text-[12px] text-foreground-muted">wechat-bot 路径（留空=默认）</span>
            <input
              value={wechatDir}
              onChange={(e) => setWechatDir(e.target.value)}
              placeholder="C:/path/to/wechat-bot"
              disabled={installState.running}
              className="mono h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-foreground-muted">AstrBot 路径（留空=默认）</span>
            <input
              value={astrbotDir}
              onChange={(e) => setAstrbotDir(e.target.value)}
              placeholder="C:/path/to/astrbot-root"
              disabled={installState.running}
              className="mono h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none disabled:opacity-40"
            />
          </label>
        </div>
        {/* 安装日志面板 */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] text-foreground-muted">
              {installState.running
                ? '⏳ 正在安装…'
                : installState.done
                  ? installState.ok
                    ? '✅ 安装完成'
                    : '❌ 安装失败'
                  : '尚未开始安装'}
            </span>
            {installState.platform && (
              <span className="text-[11px] text-foreground-muted/70">平台: {installState.platform}</span>
            )}
          </div>
          <pre className="mono max-h-44 overflow-y-auto rounded-lg bg-black/80 p-3 text-[11.5px] leading-relaxed text-green-300">
            {(installState.logs || []).length === 0
              ? '等待开始安装…'
              : installState.logs.join('\n')}
          </pre>
        </div>
      </div>

      {/* 安装完成弹窗: 显示安装位置 */}
      <SuccessModal open={showInstalledDialog} onClose={() => setShowInstalledDialog(false)} title="安装完成">
        <p className="mb-3 text-[13px] text-foreground-muted">依赖已安装成功，组件安装位置如下：</p>
        <div className="space-y-2 rounded-xl border border-border bg-surface-solid p-3.5 text-[12.5px]">
          {[
            ['系统平台', installState.platform ?? installPlatform],
            ['wechat-bot', installState.install_where?.wechat_dir || wechatDir || '（默认路径）'],
            ['AstrBot', installState.install_where?.astrbot_dir || astrbotDir || '（默认路径）'],
            ['AstrBot 可执行', installState.install_where?.astrbot_exe || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="w-28 shrink-0 text-foreground-muted/70">{k}</span>
              <span className="mono min-w-0 flex-1 break-all text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </SuccessModal>

      {/* OneBot 未配置提示 */}
      {!configured && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 p-3 text-[13px] text-warning">
          <TriangleAlert size={15} />
          AstrBot 尚未配置 OneBot 平台，请在上方执行「一键配置」。
        </div>
      )}
    </div>
  )
}

function StepIcon({ status, icon: Icon }: { status: StepStatus; icon: typeof ScanSearch }) {
  if (status === 'done') return <CircleCheck size={17} className="text-success" />
  if (status === 'error') return <CircleX size={17} className="text-danger" />
  return <Icon size={17} />
}