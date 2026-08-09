// 插件市场 (仿 AstrBot 插件中心): 内置插件源浏览 + 安装 / 卸载
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Store, Download, Trash2, CheckCircle2, RefreshCw, Tags, Search } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface MarketPlugin {
  id: string
  name: string
  repo: string
  desc: string
  version: string
  author: string
  tags: string[]
  installed: boolean
  local_version: string
}

const marketApi = {
  list: (q?: string) => api.get<{ ok: boolean; plugins: MarketPlugin[]; total?: number }>(`/api/market/plugins${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  install: (id: string) => api.post<{ ok: boolean; message: string }>('/api/market/install', { id }),
  uninstall: (id: string) => api.post<{ ok: boolean; message: string }>('/api/market/uninstall', { id }),
}

export default function PluginMarketPage() {
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['market-plugins', query],
    queryFn: () => marketApi.list(query),
    refetchInterval: 30000,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)

  async function act(id: string, installed: boolean) {
    if (busy) return
    if (installed && !window.confirm('确定卸载该插件? 将删除插件目录 (配置数据保留在 data/)。\n需重启 AstrBot 生效。')) return
    setBusy(id)
    try {
      const r = installed ? await marketApi.uninstall(id) : await marketApi.install(id)
      toast.success(r.message || '操作完成')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载插件市场…
      </div>
    )
  }

  const plugins = data.plugins ?? []
  const installedCount = plugins.filter((p) => p.installed).length

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Store size={20} className="text-primary-500" /> 插件市场
          </h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            AstrBot 官方商店 · {data?.total ?? plugins.length} 个 · 已装 {installedCount}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground-muted hover:bg-surface-solid"
        >
          <RefreshCw size={13} /> 刷新
        </button>
      </div>

      {/* 搜索框 */}
      <div className="flex items-center gap-2">
        <Search size={15} className="shrink-0 text-foreground-muted/60" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setQuery(searchInput.trim())
              setLimit(50)
            }
          }}
          placeholder="搜索插件名称/描述/作者… (回车搜索)"
          className="h-9 w-full rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setSearchInput('')
              setLimit(50)
            }}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground-muted hover:bg-surface-solid"
          >
            清除
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {plugins.slice(0, limit).map((p) => (
          <div key={p.id} className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Store size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14.5px] font-semibold text-foreground">{p.name}</span>
                {p.installed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <CheckCircle2 size={11} /> 已安装{p.local_version ? ` v${p.local_version}` : ''}
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted">
                    未安装
                  </span>
                )}
                {p.tags?.map((t) => (
                  <span key={t} className="hidden items-center gap-1 rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted/70 sm:inline-flex">
                    <Tags size={10} /> {t}
                  </span>
                ))}
              </div>
              <p className="mt-0.5 line-clamp-1 text-[12.5px] text-foreground-muted">{p.desc}</p>
              <p className="mt-0.5 text-[11px] text-foreground-muted/60">
                by {p.author} · {p.repo.replace('https://github.com/', '')}
              </p>
            </div>
            <div className="shrink-0">
              {p.installed ? (
                <button
                  onClick={() => act(p.id, true)}
                  disabled={busy === p.id}
                  className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
                >
                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  卸载
                </button>
              ) : (
                <button
                  onClick={() => act(p.id, false)}
                  disabled={busy === p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  安装
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 (大列表分页) */}
      {plugins.length > limit && (
        <div className="flex justify-center">
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="rounded-lg border border-border px-5 py-2 text-[12.5px] text-foreground-muted hover:bg-surface-solid"
          >
            加载更多 ({Math.min(limit, plugins.length)}/{plugins.length})
          </button>
        </div>
      )}
      {plugins.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[12.5px] text-foreground-muted">
          {query ? `没有找到匹配 "${query}" 的插件` : '暂无插件'}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        安装流程: git clone (镜像加速) → 自动安装 requirements 依赖 → 重启 AstrBot 生效。卸载会删除插件目录, 配置数据保留在 data/。
      </div>
    </div>
  )
}