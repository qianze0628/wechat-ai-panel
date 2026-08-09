// 模型提供商 (仿 AstrBot): Provider Sources (连接源) + Models (模型) 双区管理
// 源: api_base/key/type/enable/timeout/proxy; 模型: id/model/provider_source_id/max_context/modalities
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  ServerCog,
  Bot,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Cable,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface SourceItem {
  id: string
  api_base?: string
  key?: string[]
  type?: string
  provider_type?: string
  provider?: string
  enable?: boolean
  timeout?: number
  proxy?: string
  [k: string]: unknown
}
interface ModelItem {
  id: string
  model?: string
  enable?: boolean
  max_context_tokens?: number
  provider_source_id?: string
  modalities?: string[]
  reasoning?: string
  [k: string]: unknown
}

const providerApi = {
  get: () =>
    api.get<{ ok: boolean; providers: ModelItem[]; provider_sources: SourceItem[]; provider_settings: Record<string, unknown> }>(
      '/api/providers',
    ),
  save: (providers: ModelItem[], sources: SourceItem[], settings: Record<string, unknown>) =>
    api.post<{ ok: boolean; message: string }>('/api/providers', {
      providers,
      provider_sources: sources,
      provider_settings: settings,
    }),
}

export default function ProvidersPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['providers'], queryFn: providerApi.get })
  const [sources, setSources] = useState<SourceItem[]>([])
  const [models, setModels] = useState<ModelItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setSources(data.provider_sources ?? [])
      setModels(data.providers ?? [])
    }
  }, [data])

  const srcById = useMemo(() => {
    const m = new Map<string, SourceItem>()
    for (const s of sources) m.set(s.id ?? '', s)
    return m
  }, [sources])

  async function saveAll() {
    setSaving(true)
    try {
      const r = await providerApi.save(models, sources, data?.provider_settings ?? {})
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

  function updSource(i: number, patch: Partial<SourceItem>) {
    setSources((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function updModel(i: number, patch: Partial<ModelItem>) {
    setModels((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }
  const updById = srcById
  function isExpandedFor(m: ModelItem, i: number): boolean {
    return expanded === `model_i${i}` || expanded === `model_id_${m.id}`
  }

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <ServerCog size={20} className="text-primary-500" /> 模型提供商
          </h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            管理连接源 (API 地址/Key) 与模型列表 · 保存后重启 AstrBot 生效
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          保存全部
        </button>
      </div>

      {/* ==== 提供商源 ==== */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Cable size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">提供商源 (Provider Sources)</span>
          <span className="ml-auto text-[11.5px] text-foreground-muted">{sources.length} 个连接源</span>
          <button
            onClick={() => setSources((prev) => [...prev, { id: `new_source_${Date.now()}`, api_base: 'http://localhost:8000/v1', key: [], type: 'openai_chat_completion', enable: false }])}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary-500/40 px-2 py-1 text-[11.5px] font-semibold text-primary-500 hover:bg-primary-500/10"
          >
            <Plus size={12} /> 新增源
          </button>
        </div>
        <div className="divide-y divide-border/60">
          {sources.length === 0 && <div className="p-4 text-[12.5px] text-foreground-muted">暂无连接源。点击"新增源"添加。</div>}
          {sources.map((s, i) => {
            const isOpen = expanded === `src_${s.id}` || expanded === `src_i${i}`
            const keyStr = Array.isArray(s.key) ? (s.key[0] as string) ?? '' : String(s.key ?? '')
            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : `src_i${i}`)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {/* 启用开关 */}
                  <button
                    onClick={() => updSource(i, { enable: !s.enable })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${s.enable !== false ? 'bg-primary-500' : 'bg-surface-solid'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${s.enable !== false ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-[13px] font-semibold text-foreground">{s.id}</span>
                      <span className="hidden rounded-md bg-surface-solid px-1.5 py-0.5 text-[10.5px] text-foreground-muted sm:inline">
                        {s.type || 'openai_chat_completion'}
                      </span>
                    </div>
                    <div className="truncate text-[11.5px] text-foreground-muted">
                      {s.api_base || '未设置 API 地址'}
                    </div>
                  </div>
                  <button
                    onClick={() => setSources((prev) => prev.filter((_, idx) => idx !== i))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-3 pl-9 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-foreground-muted">名称 (id)</label>
                      <input
                        value={s.id ?? ''}
                        onChange={(e) => updSource(i, { id: e.target.value })}
                        className="h-8 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12.5px] text-foreground focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-foreground-muted">API 地址</label>
                      <input
                        value={s.api_base ?? ''}
                        onChange={(e) => updSource(i, { api_base: e.target.value })}
                        placeholder="http://localhost:8000/v1"
                        className="h-8 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12.5px] text-foreground focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-foreground-muted">API Key</label>
                      <input
                        type="password"
                        value={keyStr}
                        onChange={(e) => updSource(i, { key: [e.target.value] })}
                        placeholder="sk-..."
                        className="h-8 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12.5px] text-foreground focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-foreground-muted">请求超时 (ms)</label>
                      <input
                        type="number"
                        value={Number(s.timeout ?? 60000)}
                        onChange={(e) => updSource(i, { timeout: Number(e.target.value) })}
                        className="h-8 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12.5px] text-foreground focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11.5px] font-medium text-foreground-muted">代理 (可选)</label>
                      <input
                        value={s.proxy ?? ''}
                        onChange={(e) => updSource(i, { proxy: e.target.value })}
                        placeholder="http://localhost:7890"
                        className="h-8 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[12.5px] text-foreground focus:border-primary-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ==== 模型 (Models) ==== */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Bot size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">模型 (Models)</span>
          <span className="ml-auto text-[11.5px] text-foreground-muted">{models.length} 个模型</span>
          <button
            onClick={() =>
              setModels((prev) => [
                ...prev,
                { id: `new/model`, model: '', enable: true, provider_source_id: sources[0]?.id ?? '' },
              ])
            }
            className="flex shrink-0 items-center gap-1 rounded-lg border border-primary-500/40 px-2 py-1 text-[11.5px] font-semibold text-primary-500 hover:bg-primary-500/10"
          >
            <Plus size={12} /> 新增模型
          </button>
        </div>
        <div className="divide-y divide-border/60">
          {models.length === 0 && <div className="p-4 text-[12.5px] text-foreground-muted">暂无模型。</div>}
          {models.map((m, i) => {
            const src = updById.get(m.provider_source_id ?? '')
            return (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setExpanded(isExpandedFor(m, i) ? null : `model_i${i}`)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    {isExpandedFor(m, i) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  <button
                    onClick={() => updModel(i, { enable: !m.enable })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${m.enable !== false ? 'bg-primary-500' : 'bg-surface-solid'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${m.enable !== false ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="truncate font-mono text-[13px] font-semibold text-foreground">{m.id}</span>
                    {src && (
                      <span className="ml-2 rounded-md bg-surface-solid px-1.5 py-0.5 text-[10.5px] text-foreground-muted">
                        源: {src.id}
                      </span>
                    )}
                    <div className="truncate text-[11.5px] text-foreground-muted">
                      model={m.model ?? m.id}
                      {m.max_context_tokens ? ` · ctx ${m.max_context_tokens}` : ''}
                      {Array.isArray(m.modalities) ? ` · ${(m.modalities as string[]).join(',')}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => setModels((prev) => prev.filter((_, idx) => idx !== i))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        模型挂接对应提供商源 (provider_source_id)。保存写入 cmd_config.json (自动备份), 重启 AstrBot 生效。
      </div>
    </div>
  )
}