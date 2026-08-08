// OpenAPI 页面: 面板 API 密钥管理 (自动化调用面板 API)
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, KeyRound, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface APIKeyItem {
  key: string
  created: string
  prefix: string
}

const apikeyApi = {
  list: () => api.get<{ ok: boolean; keys: APIKeyItem[]; count: number }>('/api/apikeys'),
  create: () => api.post<{ ok: boolean; key: string; message: string }>('/api/apikeys', { gen: true }),
  del: (key: string) => api.post<{ ok: boolean; message: string }>('/api/apikeys', { key }),
}

export default function OpenApiPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['apikeys'], queryFn: apikeyApi.list })
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)

  async function create() {
    try {
      const r = await apikeyApi.create()
      setNewKey(r.key)
      toast.success('密钥已生成 (仅显示一次)')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '生成失败')
    }
  }
  async function del(key: string) {
    if (!window.confirm('确定撤销该密钥? 使用它的自动化任务将失效')) return
    try {
      const r = await apikeyApi.del(key)
      toast.success(r.message || '已撤销')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '撤销失败')
    }
  }
  async function copyKey() {
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载密钥…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <KeyRound size={20} className="text-primary-500" /> OpenAPI 密钥
        </h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          面板 API 密钥 (供自动化脚本/外部服务调用面板接口) · 当前 {data.count} 个有效
        </p>
      </div>

      {/* 新建 */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <button
          onClick={create}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> 生成新密钥
        </button>
        {newKey && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary-500/30 bg-primary-500/5 p-3">
            <code className="flex-1 break-all font-mono text-[12.5px] text-foreground">{newKey}</code>
            <button onClick={copyKey} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-solid text-foreground-muted hover:text-primary-500">
              {copied ? <CheckCircle2 size={15} className="text-success" /> : <Copy size={15} />}
            </button>
          </div>
        )}
      </div>

      {/* 密钥列表 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <KeyRound size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">有效密钥</span>
        </div>
        <div className="divide-y divide-border/60">
          {data.keys.length === 0 && (
            <div className="p-4 text-[12.5px] text-foreground-muted">暂无密钥。点击"生成新密钥"创建。</div>
          )}
          {data.keys.map((k) => (
            <div key={k.key} className="flex items-center gap-3 px-4 py-2.5">
              <code className="flex-1 truncate font-mono text-[12.5px] text-foreground">{k.prefix}</code>
              <span className="text-[11.5px] text-foreground-muted">创建于 {k.created}</span>
              <button
                onClick={() => del(k.key)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        调用方式: 请求面板 API 时带请求头 <code className="font-mono text-primary-500">X-Api-Key: &lt;你的密钥&gt;</code>。<br />
        主要用于自动化脚本/外部服务访问面板接口 (等同 AstrBot OpenAPI)。
      </div>
    </div>
  )
}