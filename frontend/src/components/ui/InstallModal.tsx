// 安装弹窗 (平台选择 + 进度条 + 实时日志)
// 供概览页/部署向导页复用: 点"安装依赖" → 选平台 → 确认 → 进度
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Wrench, TriangleAlert, CircleCheck, CircleX } from 'lucide-react'
import Modal from './Modal'
import SuccessModal from './SuccessModal'
import { panelApi } from '../../api'
import { toast } from '../../app/toast'
import type { InstallStatus } from '../../types/api'

interface InstallModalProps {
  /** 打开入口: 由父组件触发 (传非 null 即打开) */
  trigger: number
  onDone?: (ok: boolean) => void
}

type DialogPhase = 'closed' | 'select' | 'progress'

export default function InstallModal({ trigger, onDone }: InstallModalProps) {
  const [phase, setPhase] = useState<DialogPhase>('closed')
  const [platform, setPlatform] = useState<'windows' | 'mac' | 'linux'>(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac os') || ua.includes('macintosh')) return 'mac'
    if (ua.includes('linux') || ua.includes('x11')) return 'linux'
    return 'windows'
  })
  const [envMissing, setEnvMissing] = useState<string[]>([])
  const [installState, setInstallState] = useState<InstallStatus>({
    running: false, done: false, ok: null, logs: [], platform: '',
  })
  const [showDone, setShowDone] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 父组件触发 (trigger 变化) → 打开平台选择
  useEffect(() => {
    if (trigger === 0) return
    ;(async () => {
      try {
        const e = await panelApi.env()
        const missing: string[] = []
        if (!e.node.installed) missing.push('Node.js (运行 wechat-bot 必需)')
        if (!e.uv.installed) missing.push('uv (安装 AstrBot 必需)')
        if (!e.python.installed) missing.push('Python (AstrBot 依赖)')
        if (!e.astrbot.installed) missing.push('AstrBot (AI 对话引擎)')
        if (!e.wechat_bot.installed) missing.push('wechat-bot (微信桥接器)')
        setEnvMissing(missing)
      } catch {
        setEnvMissing([])
      }
      setPhase('select')
    })()
  }, [trigger])

  // 清理轮询
  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current)
  }, [])

  async function startInstall() {
    setPhase('progress')
    try {
      const r = await panelApi.install({ platform })
      if (!r.ok) {
        toast.error(r.message || '安装请求失败')
        setPhase('closed')
        return
      }
      if (r.tasks.length === 0) {
        setInstallState({ running: false, done: true, ok: true, logs: [r.message], platform: r.platform })
        setShowDone(true)
        setPhase('closed')
        onDone?.(true)
        return
      }
      setInstallState({ running: true, done: false, ok: null, logs: [], platform: r.platform })
      poll()
    } catch {
      setPhase('closed')
    }
  }

  function poll() {
    const loop = async () => {
      try {
        const s = await panelApi.installStatus()
        setInstallState(s)
        if (s.running || !s.done) {
          pollRef.current = setTimeout(loop, 1200)
        } else {
          setPhase('closed')
          onDone?.(!!s.ok)
          if (s.ok) {
            toast.success('依赖安装完成')
            setShowDone(true)
          } else {
            toast.error('依赖安装失败，请查看日志')
          }
        }
      } catch {
        setPhase('closed')
      }
    }
    pollRef.current = setTimeout(loop, 800)
  }

  const isRunning = installState.running || phase === 'progress'

  return (
    <>
      {/* 平台选择弹窗 */}
      <Modal open={phase === 'select'} onClose={() => setPhase('closed')} title="选择系统平台">
        <div className="space-y-3">
          <p className="text-[13px] text-foreground-muted">
            请选择运行本面板与服务的操作系统。将自动检测缺失的环境依赖并安装：
          </p>
          {envMissing.length > 0 ? (
            <div className="space-y-1.5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-[12.5px]">
              <div className="font-semibold text-warning">将安装以下组件:</div>
              {envMissing.map((m) => (
                <div key={m} className="flex items-center gap-1.5 text-foreground-muted">
                  <TriangleAlert size={12} className="shrink-0 text-warning" /> {m}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-[12.5px] text-success">
              环境已就绪，无缺失组件
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: 'windows', label: 'Windows', icon: '🪟' },
                { v: 'mac', label: 'macOS', icon: '🍎' },
                { v: 'linux', label: 'Linux', icon: '🐧' },
              ] as const
            ).map((p) => (
              <button
                key={p.v}
                onClick={() => setPlatform(p.v)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-[12.5px] font-medium transition-all ${
                  platform === p.v
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-border bg-surface-solid text-foreground-muted hover:border-primary-300'
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={startInstall}
            disabled={isRunning}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Wrench size={15} />}
            确认安装
          </button>
        </div>
      </Modal>

      {/* 进度弹窗: 阶段状态 + 进度条 + 实时日志 */}
      <Modal open={phase === 'progress'} onClose={() => { if (installState.done) setPhase('closed') }} title="正在安装" dismissable={installState.done}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12.5px] text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin text-primary-500" />
              安装进行中...
            </span>
            <span>已输出 {installState.logs.length} 行</span>
          </div>
          {/* 阶段状态 (AstrBot UpdateProgress 风格) */}
          {(installState as unknown as { stages?: { id: string; label: string; status: string; detail?: string }[] }).stages && (
            <div className="space-y-1.5">
              {(installState as unknown as { stages: { id: string; label: string; status: string; detail?: string }[] }).stages.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-[12px]">
                  {st.status === 'done' && <CircleCheck size={13} className="shrink-0 text-success" />}
                  {st.status === 'running' && <Loader2 size={13} className="shrink-0 animate-spin text-primary-500" />}
                  {st.status === 'error' && <CircleX size={13} className="shrink-0 text-danger" />}
                  {st.status === 'pending' && <span className="h-3 w-3 shrink-0 rounded-full border border-border" />}
                  <span className={st.status === 'error' ? 'text-danger' : st.status === 'done' ? 'text-success' : 'text-foreground'}>
                    {st.label}
                  </span>
                  {st.status === 'pending' && <span className="text-foreground-muted/50">待处理</span>}
                </div>
              ))}
            </div>
          )}
          {/* 总进度条 */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-solid">
            <motion.div
              className="h-full rounded-full bg-primary-500"
              animate={installState.done ? { width: '100%' } : { x: ['-100%', '100%'] }}
              transition={installState.done ? { duration: 0.3 } : { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              style={installState.done ? { width: '100%' } : { width: '40%' }}
            />
          </div>
          {/* 手动安装提示 */}
          {(installState as unknown as { need_manual?: boolean; manual_hint?: string }).need_manual && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
              {(installState as unknown as { manual_hint?: string }).manual_hint || '部分组件需要手动安装'}
            </div>
          )}
          {/* 实时日志 */}
          <div className="h-44 overflow-y-auto rounded-xl border border-border bg-surface-solid p-3 font-mono text-[11.5px] leading-relaxed text-foreground-muted">
            {installState.logs.length === 0 ? (
              <div className="text-foreground-muted/60">等待安装输出...</div>
            ) : (
              installState.logs.map((l, i) => (
                <div key={i} className={/FAILED|\[error\]/.test(l) ? 'text-danger' : ''}>{l}</div>
              ))
            )}
          </div>
          {installState.done && (
            <button
              onClick={() => setPhase('closed')}
              className="w-full rounded-xl bg-primary-500 py-2 text-[13px] font-semibold text-white"
            >
              {installState.ok ? '完成' : '关闭并查看日志'}
            </button>
          )}
        </div>
      </Modal>

      {/* 完成弹窗 */}
      <SuccessModal open={showDone} onClose={() => setShowDone(false)} title="安装完成">
        <p className="text-[13px] text-foreground-muted">
          {installState.ok
            ? '依赖安装成功。请重启本面板（关闭后重新打开）使新安装的 Node.js/uv 等工具生效，然后到「服务中心」启动服务，或到「连接配置」扫码登录。'
            : '依赖安装未完成，请按日志中的手动指引安装缺失组件后，重新点击「安装依赖」。'}
        </p>
      </SuccessModal>
    </>
  )
}
