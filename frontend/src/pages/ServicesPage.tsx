// 服务中心: AstrBot / wechat-bot / qr-server 各自的健康、端口、PID、启停控制
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from '../app/toast'
import {
  CircleCheck,
  TriangleAlert,
  Loader2,
  Play,
  Square,
  RotateCw,
  ServerCog,
  QrCode,
  Cable,
  ExternalLink,
  Activity,
  Cpu,
  type LucideIcon,
} from 'lucide-react'
import { panelApi } from '../api'
import ConfirmModal from '../components/ui/ConfirmModal'
import type { ServicesStatus } from '../types/api'

type Act = 'start' | 'stop' | 'restart'

interface ServiceMeta {
  key: string
  name: string
  desc: string
  icon: LucideIcon
  running: boolean
  pid: number | null
  portLabel: string
  extra?: { label: string; value: string }[]
}

function HealthBadge({ ok, label }: { ok: boolean; label: string }) {
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

function actLabel(a: Act) {
  return a === 'start' ? '启动' : a === 'stop' ? '停止' : '重启'
}

export default function ServicesPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 5000,
  })
  const { data: sys } = useQuery({
    queryKey: ['system'],
    queryFn: panelApi.system,
    refetchInterval: 3000,
  })

  const [busySvc, setBusySvc] = useState<string | null>(null)
  const [busyAct, setBusyAct] = useState<Act | null>(null)
  const [confirm, setConfirm] = useState<{ key: string; act: Act } | null>(null)

  const svc: ServicesStatus | undefined = data?.services

  const serviceList: ServiceMeta[] = [
    {
      key: 'astrbot',
      name: 'AstrBot',
      desc: 'AI 对话引擎',
      icon: ServerCog,
      running: !!svc?.astrbot?.running,
      pid: svc?.astrbot?.pid ?? null,
      portLabel: `${svc?.astrbot?.webui_port ?? '—'} / ${svc?.astrbot?.ws_port ?? '—'}`,
      extra: [
        { label: 'WebUI', value: String(svc?.astrbot?.webui_port ?? '—') },
        { label: 'OneBot WS', value: String(svc?.astrbot?.ws_port ?? '—') },
      ],
    },
    {
      key: 'wechat',
      name: 'wechat-bot',
      desc: '微信桥接',
      icon: QrCode,
      running: !!svc?.wechat?.running,
      pid: svc?.wechat?.pid ?? null,
      portLabel: String(svc?.wechat?.api_port ?? '—'),
      extra: [{ label: '状态 API', value: String(svc?.wechat?.api_port ?? '—') }],
    },
    {
      key: 'qr',
      name: 'qr-server',
      desc: '扫码登录服务',
      icon: Cable,
      running: !!svc?.qr?.running,
      pid: svc?.qr?.pid ?? null,
      portLabel: String(svc?.qr?.port ?? '—'),
      extra: [{ label: '页面', value: String(svc?.qr?.port ?? '—') }],
    },
  ]

  async function doAction(key: string, name: string, act: Act) {
    if (busySvc) return
    setBusySvc(key)
    setBusyAct(act)
    setConfirm(null)
    try {
      // act 映射到具体方法, 避免动态索引类型问题
      const call =
        act === 'start' ? () => panelApi.start(key) : act === 'stop' ? () => panelApi.stop(key) : () => panelApi.restart(key)
      const r = await call()
      if (r.ok === false) {
        toast.error(r.message || `${name} ${actLabel(act)}失败`)
      } else {
        toast.success(`${name} ${actLabel(act)}成功`)
      }
      refetch()
    } catch {
      /* client 已 toast */
    } finally {
      setBusySvc(null)
      setBusyAct(null)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 正在加载…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      {/* 危险操作确认弹窗 */}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        confirmText={`确认${confirm ? actLabel(confirm.act) : ''}`}
        danger={confirm?.act === 'stop'}
        busy={!!busySvc}
        onConfirm={() => {
          const meta = serviceList.find((s) => s.key === confirm?.key)
          if (meta) doAction(meta.key, meta.name, confirm!.act)
        }}
      >
        {confirm && (
          <>
            确定要 <span className="font-semibold text-danger">{actLabel(confirm.act)}</span>{' '}
            <span className="font-semibold text-foreground">
              {serviceList.find((s) => s.key === confirm.key)?.name}
            </span>{' '}
            吗？{confirm.act === 'stop' && ' 该操作会中断当前服务。'}
          </>
        )}
      </ConfirmModal>

      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">服务中心</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">管理 AstrBot、wechat-bot、qr-server 的启停与健康</p>
      </div>

      {/* 服务卡片 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {serviceList.map((s) => {
          const thisBusy = busySvc === s.key
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="glass-panel p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      s.running ? 'bg-primary-100 text-primary-500' : 'bg-surface-solid text-foreground-muted'
                    }`}
                  >
                    <s.icon size={19} />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-foreground">{s.name}</div>
                    <div className="text-[12px] text-foreground-muted">{s.desc}</div>
                  </div>
                </div>
                <HealthBadge ok={s.running} label={s.running ? '运行中' : '未启动'} />
              </div>

              <div className="mt-4 space-y-1 text-[12.5px] text-foreground-muted">
                <div className="flex justify-between">
                  <span className="text-foreground-muted/80">端口</span>
                  <span className="mono">{s.portLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted/80">PID</span>
                  <span className="mono">{s.pid ?? '—'}</span>
                </div>
                {(s.extra ?? []).map((e) => (
                  <div key={e.label} className="flex justify-between">
                    <span className="text-foreground-muted/80">{e.label}</span>
                    <span className="mono">{e.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirm({ key: s.key, act: 'start' })}
                  disabled={thisBusy || s.running}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {thisBusy && busyAct === 'start' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  启动
                </button>
                <button
                  onClick={() => setConfirm({ key: s.key, act: 'restart' })}
                  disabled={thisBusy || !s.running}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
                >
                  {thisBusy && busyAct === 'restart' ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                  重启
                </button>
                <button
                  onClick={() => setConfirm({ key: s.key, act: 'stop' })}
                  disabled={thisBusy || !s.running}
                  aria-label={`停止 ${s.name}`}
                  className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
                >
                  {thisBusy && busyAct === 'stop' ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 系统信息 (CPU / 内存 / 磁盘) */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <Cpu size={15} className="text-primary-500" />
          本机资源
          <span className="text-[11px] font-normal text-foreground-muted">每 3 秒刷新</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SystemMeter
            label="CPU"
            usage={sys?.cpu?.usage_percent}
            sub={sys?.cpu ? `${sys.cpu.cores} 线程 · ${sys.cpu.freq_mhz ? Math.round(sys.cpu.freq_mhz) + ' MHz' : ''}` : '—'}
          />
          <SystemMeter
            label="内存"
            usage={sys?.memory?.usage_percent}
            sub={sys?.memory ? `${fmtBytes(sys.memory.used)} / ${fmtBytes(sys.memory.total)}` : '—'}
          />
          <SystemMeter
            label="磁盘 (C:)"
            usage={sys?.disk?.usage_percent}
            sub={sys?.disk ? `${fmtBytes(sys.disk.used)} / ${fmtBytes(sys.disk.total)}` : '—'}
          />
        </div>
        {sys?.system && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface px-4 py-2.5 text-[12px] text-foreground-muted">
            <span>{sys.system.hostname}</span>
            <span>{sys.system.platform} {sys.system.release} ({sys.system.machine})</span>
            {sys.uptime ? <span>已运行 {fmtUptime(sys.uptime)}</span> : null}
            {sys.processes != null ? <span>进程 {sys.processes} 个</span> : null}
            <span>面板 PID {sys.panel_pid}</span>
          </div>
        )}
      </div>

      {/* 连接提示 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface p-4 text-[13px] text-foreground-muted">
        <Activity size={15} className="text-primary-500" />
        端口监听只表示进程在运行。完整健康(WebUI/WS/API)通过应用层检查确认。
        <a href="/logs" className="ml-auto inline-flex items-center gap-1 text-primary-500 hover:underline">
          查看日志 <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}

// ===== 系统指标卡 =====
function SystemMeter({ label, usage, sub }: { label: string; usage?: number; sub: string }) {
  const pct = usage ?? 0
  const ok = pct < 85
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="glass-panel p-5"
    >
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-foreground">{label}</div>
        <div className={`text-[20px] font-bold ${ok ? 'text-primary-500' : 'text-danger'}`}>{pct}%</div>
      </div>
      {/* 进度条 */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-solid">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            ok ? 'bg-gradient-to-r from-primary-400 to-primary-500' : 'bg-danger'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-[12px] text-foreground-muted">{sub}</div>
    </motion.div>
  )
}

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}

function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return d > 0 ? `${d} 天 ${h} 小时` : `${h} 小时 ${m} 分`
}