// 连接配置: 左栏微信扫码 + 右栏 AstrBot 凭据 / OneBot 预览与应用
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from '../app/toast'
import {
  QrCode,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  TriangleAlert,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Cable,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { panelApi } from '../api'

export default function ConnectionPage() {
  // 二维码状态 (3s 轮询)
  const { data: qr, isLoading: qrLoading, refetch: refetchQr } = useQuery({
    queryKey: ['qr'],
    queryFn: panelApi.qrStatus,
    refetchInterval: 3000,
  })
  // 面板总状态 (OneBot 配置状态 + 环境)
  const { data: st, refetch: refetchSt } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 5000,
  })
  // 凭据
  const { data: creds } = useQuery({
    queryKey: ['creds'],
    queryFn: panelApi.creds,
    refetchInterval: 5000,
  })

  const [showPwd, setShowPwd] = useState(false)
  const [preview, setPreview] = useState<{
    changes: string[]
    untouched: string[]
    need_restart: boolean
    cmd_config: string
  } | null>(null)
  const [applying, setApplying] = useState(false)

  const configured = !!st?.astrbot_configured

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} 已复制`)
    } catch {
      toast.error('复制失败')
    }
  }

  async function loadPreview() {
    try {
      const r = await panelApi.setupPreview()
      setPreview(r)
      if (!r.ok) {
        toast.error((r as { message?: string }).message || '预览失败')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '预览失败')
    }
  }

  async function applySetup() {
    setApplying(true)
    try {
      const r = await panelApi.setup()
      if (r.ok === false) {
        toast.error((r as { message?: string }).message || '配置应用失败')
      } else {
        toast.success('OneBot 已配置并重启 AstrBot')
      }
      refetchSt()
      refetchQr()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '配置应用失败')
    } finally {
      setApplying(false)
    }
  }

  const hasCreds = !!creds?.username && !!creds?.password
  const pwdChanged = !!creds?.password_changed

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">连接配置</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">微信扫码登录、AstrBot 凭据与 OneBot 桥接配置</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ===== 左: 微信扫码 ===== */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="glass-panel p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <QrCode size={16} className="text-primary-500" />
            微信扫码登录
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* 二维码区域 (白底圆角, 符合参考样式) */}
            <div className="flex h-[240px] w-[240px] items-center justify-center overflow-hidden rounded-md border border-border bg-white">
              {qrLoading && !qr ? (
                <Loader2 size={24} className="animate-spin text-foreground-muted/40" />
              ) : qr?.logged ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 size={40} className="text-success" />
                  <div className="text-[14px] font-semibold text-success">已登录</div>
                </div>
              ) : qr?.hasQr && qr.qrUrl ? (
                <img src="/qr.png" alt="微信扫码登录二维码" className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <QrCode size={32} className="text-foreground-muted/30" />
                  <div className="text-[12px] text-foreground-muted">等待二维码</div>
                  <div className="text-[11px] text-foreground-muted/70">wechat-bot 未启动或尚未生成</div>
                </div>
              )}
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
                qr?.logged ? 'bg-success/15 text-success' : qr?.hasQr ? 'bg-warning/15 text-warning' : 'bg-surface-solid text-foreground-muted'
              }`}
            >
              {qr?.logged ? <CheckCircle2 size={13} /> : qr?.hasQr ? <QrCode size={13} /> : <TriangleAlert size={13} />}
              {qr?.logged ? '已登录' : qr?.hasQr ? '待扫码' : '未生成二维码'}
            </div>

            <button
              onClick={() => refetchQr()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <RefreshCw size={14} /> 刷新状态
            </button>
          </div>
        </motion.div>

        {/* ===== 右: 凭据 + OneBot ===== */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0.05 }}
          className="glass-panel p-5"
        >
          {/* AstrBot 凭据 */}
          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <KeyRound size={16} className="text-primary-500" />
            AstrBot 登录凭据
          </div>

          {pwdChanged ? (
            <div className="space-y-2.5">
              {creds.username && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-solid px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[11px] text-foreground-muted">用户名</div>
                    <div className="mono mt-0.5 truncate text-[13px] text-foreground">{creds.username}</div>
                  </div>
                  <button
                    onClick={() => copy(creds.username ?? '', '用户名')}
                    title="复制用户名"
                    aria-label="复制用户名"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-success/15 p-3 text-[12.5px] text-success">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                密码已由你本人修改，安全存储在 AstrBot 中。请使用你自己设置的新密码登录，面板不显示它。
              </div>
            </div>
          ) : !hasCreds ? (
            <div className="rounded-lg bg-warning/15 p-3 text-[12.5px] text-warning">
              未找到可用凭据。可到 AstrBot WebUI 的「设置-账号」查看。
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-solid px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] text-foreground-muted">用户名</div>
                  <div className="mono mt-0.5 truncate text-[13px] text-foreground">{creds.username}</div>
                </div>
                <button
                  onClick={() => copy(creds.username ?? '', '用户名')}
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
                    {showPwd ? creds.password : '••••••••••••'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setShowPwd((v) => !v)}
                    title={showPwd ? '隐藏密码' : '显示密码'}
                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => copy(creds.password ?? '', '')}
                    title="复制密码"
                    aria-label="复制密码"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              {creds.source && <div className="text-[11.5px] text-foreground-muted">来源: {creds.source}</div>}
              <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-[12px] text-warning">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                登录后请在 AstrBot WebUI 的「设置-账号」中立即修改密码。
              </div>
            </div>
          )}

          <div className="my-4 border-t border-border" />

          {/* OneBot 状态与配置 */}
          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Cable size={16} className="text-primary-500" />
            OneBot 桥接配置
          </div>

          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-[12.5px] ${
              configured ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            {configured ? <ShieldCheck size={15} /> : <TriangleAlert size={15} />}
            {configured ? 'aiocqhttp 平台已配置并指向 127.0.0.1:20129' : 'OneBot 平台未配置或端口不符'}
          </div>

          {/* 变更预览 */}
          {preview && (
            <div className="mt-3 space-y-2">
              <div className="text-[12px] font-semibold text-foreground">将应用以下变更:</div>
              {(preview.changes || ['无变更']).map((c) => (
                <div key={c} className="flex items-start gap-1.5 text-[12px] text-foreground-muted">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                  {c}
                </div>
              ))}
              {preview.untouched && preview.untouched.length > 0 && (
                <div className="text-[11.5px] text-foreground-muted/80">
                  <div className="font-semibold">不会修改:</div>
                  {preview.untouched.map((u) => (
                    <div key={u}>· {u}</div>
                  ))}
                </div>
              )}
              {preview.need_restart && (
                <div className="text-[11.5px] text-warning">⚠ 应用后需要重启 AstrBot</div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={loadPreview}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              <RefreshCw size={14} /> 查看变更预览
            </button>
            <button
              onClick={applySetup}
              disabled={applying || configured}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {applying ? <Loader2 size={14} className="animate-spin" /> : <Cable size={14} />}
              {applying ? '应用并重启中…' : '一键配置 OneBot + 重启'}
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
        </motion.div>
      </div>
    </div>
  )
}