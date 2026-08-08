// 实时日志: 深色终端式工作区, SSE 实时流 + 搜索 + 自动滚动 + 复制
import { useEffect, useRef, useState } from 'react'
import {
  Terminal,
  Copy,
  Trash2,
  Pause,
  Play,
  Search,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from '../app/toast'

const SERVICES = [
  { key: 'wechat', label: 'wechat-bot' },
  { key: 'astrbot', label: 'AstrBot' },
  { key: 'qr', label: 'qr-server' },
  { key: 'trace', label: '追踪 (Trace)' },
  { key: 'install', label: '安装日志' },
  { key: 'wechat_err', label: 'wechat-bot (错误)' },
  { key: 'astrbot_err', label: 'AstrBot (错误)' },
  { key: 'qr_err', label: 'qr-server (错误)' },
] as const

type ServiceKey = (typeof SERVICES)[number]['key']

export default function LogsPage() {
  const [service, setService] = useState<ServiceKey>('wechat')
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('')
  const [path, setPath] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<string[]>([])

  // 连接日志流
  useEffect(() => {
    const svc = service
    setLines([])
    linesRef.current = []
    setConnected(false)
    if (controllerRef.current) controllerRef.current.abort()

    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const controller = new AbortController()
    controllerRef.current = controller

    async function connect() {
      if (stopped) return
      try {
        const resp = await fetch(`/api/logs/stream?service=${svc}&tail=200`, {
          signal: controller.signal,
        })
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)
        setConnected(true)
        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (!stopped) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          // 按空行切分 SSE 事件
          const events = buf.split('\n\n')
          buf = events.pop() ?? ''
          for (const ev of events) {
            const dataLine = ev.split('\n').find((l) => l.startsWith('data:'))
            if (!dataLine) continue
            try {
              const payload = JSON.parse(dataLine.slice(5).trim())
              if (payload.lines && Array.isArray(payload.lines)) {
                linesRef.current = [...linesRef.current, ...payload.lines]
                if (linesRef.current.length > 5000) linesRef.current = linesRef.current.slice(-5000)
                setLines(linesRef.current)
              }
              if (payload.path) setPath(payload.path)
            } catch {
              /* 忽略单条解析失败 */
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setConnected(false)
        // 断线 2s 后重连
        retryTimer = setTimeout(connect, 2000)
      }
    }
    connect()

    return () => {
      stopped = true
      controller.abort()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [service])

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [lines, autoScroll])

  const filtered = filter.trim()
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(filtered.join('\n'))
      toast.success(`已复制 ${filtered.length} 行`)
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col space-y-4">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">实时日志</h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">服务日志实时流 · 每 2 秒增量推送</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
            connected ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
          }`}
        >
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? '已连接' : '重连中…'}
        </div>
      </div>

      {/* 工具条 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              onClick={() => setService(s.key)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                service === s.key
                  ? 'bg-primary-500 text-white'
                  : 'border border-border bg-surface text-foreground-muted hover:text-primary-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 搜索 */}
          <div className="relative">
            <Search size={13} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-foreground-muted/50" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索日志…"
              className="h-8 w-44 rounded-lg border border-border bg-surface-solid pr-2 pl-8 text-[12.5px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setAutoScroll((v) => !v)}
            title={autoScroll ? '暂停自动滚动' : '恢复自动滚动'}
            aria-label={autoScroll ? '暂停自动滚动' : '恢复自动滚动'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border ${
              autoScroll ? 'bg-primary-500 text-white' : 'bg-surface text-foreground-muted'
            }`}
          >
            {autoScroll ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={copyAll}
            title="复制全部"
            aria-label="复制全部日志"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted hover:text-primary-500"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => {
              setLines([])
              linesRef.current = []
            }}
            title="清空视图"
            aria-label="清空日志视图"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted hover:text-danger"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 日志终端 */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[#141318] shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
        {/* 终端头部 */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Terminal size={14} className="text-primary-400" />
            <span className="text-[12px] font-semibold text-gray-300">
              {SERVICES.find((s) => s.key === service)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {path && <span className="mono max-w-[320px] truncate" title={path}>{path}</span>}
            <span>{filtered.length.toLocaleString()} 行</span>
          </div>
        </div>

        {/* 日志内容 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-600">
              {connected ? '暂无日志内容' : <Loader2 className="mr-2 animate-spin" size={14} />}
              {connected ? '' : '正在连接日志流…'}
            </div>
          ) : (
            filtered.map((l, i) => (
              <div
                key={`${service}-${i}`}
                className="whitespace-pre-wrap break-all text-gray-300 hover:bg-white/5"
              >
                {l}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}