// 模型提供商 (仿 AstrBot): provider 列表 CRUD + provider_settings 关键项
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Cpu, Plus, Trash2, Save, KeyRound } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface Provider {
  id: string
  key?: string[] | string
  enable?: boolean
  [k: string]: unknown
}

const providerApi = {
  list: () => api.get<{ ok: boolean; providers: Provider[]; provider_settings: Record<string, unknown> }>('/api/providers'),
  // 传真实数组 (前端 JSON 编码); 后端 Providers []json.RawMessage 兼容
  save: (providers: Provider[]) =>
    api.post<{ ok: boolean; message: string }>('/api/providers', {
      providers,
      provider_settings: {},
    }),
}

export default function ProvidersPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['providers'], queryFn: providerApi.list })
  const [providers, setProviders] = useState<Provider[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.providers) setProviders(data.providers)
  }, [data])

  function update(i: number, patch: Partial<Provider>) {
    setProviders((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function add() {
    setProviders((prev) => [...prev, { id: 'new/provider', key: [], enable: true }])
  }
  function remove(i: number) {
    setProviders((prev) => prev.filter((_, idx) => idx !== i))
  }
  async function saveAll() {
    setSaving(true)
    try {
      const r = await providerApi.save(providers)
      toast.success(r.message || '已保存')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载模型提供商…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Cpu size={20} className="text-primary-500" /> 模型提供商
          </h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            AstrBot 模型提供商 (provider 列表) · 保存后重启 AstrBot 生效
          </p>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 rounded-lg border border-primary-500/40 px-3 py-1.5 text-[12.5px] font-semibold text-primary-500 hover:bg-primary-500/10"
        >
          <Plus size={13} /> 新增提供商
        </button>
      </div>

      <div className="space-y-2.5">
        {providers.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center text-foreground-muted">
            暂无模型提供商。点击右上角"新增提供商"添加。
          </div>
        )}
        {providers.map((p, i) => {
          const keyVal = Array.isArray(p.key) ? (p.key as string[])[0] ?? '' : ((p.key as string) ?? '')
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              {/* 启用开关 */}
              <button
                onClick={() => update(i, { enable: !p.enable })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${p.enable !== false ? 'bg-primary-500' : 'bg-surface-solid'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    p.enable !== false ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
              {/* id */}
              <input
                value={p.id ?? ''}
                onChange={(e) => update(i, { id: e.target.value })}
                placeholder="provider/模型 (如 deepseek/deepseek-chat)"
                className="h-9 w-[200px] shrink-0 rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
              {/* key */}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <KeyRound size={13} className="shrink-0 text-foreground-muted/60" />
                <input
                  type="password"
                  value={keyVal}
                  onChange={(e) => update(i, { key: [e.target.value] })}
                  placeholder="API Key"
                  className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
                />
              </div>
              {/* 删除 */}
              <button
                onClick={() => remove(i)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          保存全部
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        保存会写入 cmd_config.json 的 provider 列表 (自动备份), 重启 AstrBot 后生效。
      </div>
    </div>
  )
}