import { useState, type FormEvent } from 'react'
import { ServerCog, KeyRound, Loader2 } from 'lucide-react'
import { authApi } from '../api'
import PageBackground from '../components/shell/PageBackground'

export default function AuthPage({ onAuthed }: { onAuthed: () => void }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await authApi.login(pwd)
      if (r.ok) {
        onAuthed()
      } else {
        setError(r.message || '登录失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center p-4">
      <PageBackground />

      {/* 左上角产品标识 */}
      <div className="absolute top-5 left-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500 text-white shadow-[0_4px_14px_rgba(243,59,124,0.35)]">
          <ServerCog size={18} />
        </div>
        <div className="text-[13px] font-bold text-foreground">微信 AI 控制台</div>
      </div>

      {/* 中央认证卡片 */}
      <div className="glass-panel w-full max-w-[380px] p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-500">
            <KeyRound size={22} />
          </div>
          <h1 className="text-lg font-bold text-foreground">管理面板已锁定</h1>
          <p className="mt-1 text-[13px] text-foreground-muted">请输入面板访问密码以继续</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="auth-pwd" className="mb-1.5 block text-[13px] text-foreground-muted">
              密码
            </label>
            <input
              id="auth-pwd"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-surface-solid px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-foreground-muted/70 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="输入密码"
            />
          </div>

          {error && <div className="text-[13px] text-danger">{error}</div>}

          <button
            type="submit"
            disabled={loading || !pwd}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(243,59,124,0.3)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            登录
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-foreground-muted">
          本地实例 · 密码由 config.json 的 panel_password 配置
        </p>
      </div>
    </div>
  )
}