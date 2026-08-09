// 插件市场 (仿 AstrBot 商店): logo 图标 / 分类筛选 / 排序 / 详情弹窗
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Store, Download, Trash2, CheckCircle2, RefreshCw, Search, Star, X, ExternalLink, Filter } from 'lucide-react'
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
  logo?: string
  stars?: number
  astrbot_version?: string
  support_platforms?: string[]
  updated_at?: string
  download_url?: string
}

const marketApi = {
  list: (q?: string) => api.get<{ ok: boolean; plugins: MarketPlugin[]; total?: number; installed_count?: number }>(`/api/market/plugins${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  install: (id: string) => api.post<{ ok: boolean; message: string }>('/api/market/install', { id }),
  uninstall: (id: string) => api.post<{ ok: boolean; message: string }>('/api/market/uninstall', { id }),
}

export default function PluginMarketPage() {
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('全部')
  const [sortBy, setSortBy] = useState<'default' | 'stars' | 'updated'>('default')
  const [detail, setDetail] = useState<MarketPlugin | null>(null)
  const [limit, setLimit] = useState(50)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['market-plugins', query],
    queryFn: () => marketApi.list(query),
    refetchInterval: query ? false : 30000,
  })

  // 输入防抖 400ms 自动搜索
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== query) setQuery(searchInput.trim())
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])
  const [busy, setBusy] = useState<string | null>(null)

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

  // 分类: 按 tags 聚合 (保留最高频 + "全部")
  const categories = useMemo(() => {
    const set = new Set<string>(['全部'])
    for (const p of data?.plugins ?? []) {
      for (const t of p.tags ?? []) if (t) set.add(t)
    }
    return [...set]
  }, [data])

  // 筛选 + 排序 (仿 AstrBot: 分类 filter + stars/更新时间 sort)
  const plugins = useMemo(() => {
    let list = data?.plugins ?? []
    if (category !== '全部') {
      list = list.filter((p) => (p.tags ?? []).includes(category))
    }
    if (sortBy === 'stars') {
      list = [...list].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    } else if (sortBy === 'updated') {
      list = [...list].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    }
    return list
  }, [data, category, sortBy])

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载插件市场…
      </div>
    )
  }

  const installedCount = data?.installed_count ?? plugins.filter((p) => p.installed).length

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
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

      {/* 搜索 */}
      <div className="flex items-center gap-2">
        <Search size={15} className="shrink-0 text-foreground-muted/60" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索插件名称/描述/作者…"
          className="h-9 w-full rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSearchInput(''); setLimit(50) }}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground-muted hover:bg-surface-solid"
          >
            清除
          </button>
        )}
      </div>

      {/* 分类 (tags 横向滚动) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter size={13} className="shrink-0 text-foreground-muted/50" />
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); setLimit(50) }}
            className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              category === c ? 'bg-primary-500 text-white' : 'bg-surface-solid text-foreground-muted hover:bg-primary-500/10'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 排序 */}
      <div className="flex items-center gap-2 text-[12px] text-foreground-muted">
        排序:
        {(['default', 'stars', 'updated'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`rounded-full px-2.5 py-0.5 transition-colors ${
              sortBy === s ? 'bg-primary-500/15 text-primary-500 font-semibold' : 'hover:bg-surface-solid'
            }`}
          >
            {s === 'default' ? '默认' : s === 'stars' ? '⭐ Star' : '🕒 最近更新'}
          </button>
        ))}
      </div>

      {/* 插件列表 (卡片, 点击开详情) */}
      <div className="grid grid-cols-1 gap-2.5">
        {plugins.slice(0, limit).map((p) => (
          <div
            key={p.id}
            onClick={() => setDetail(p)}
            className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary-300"
          >
            {/* logo */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-solid">
              {p.logo ? (
                <img src={p.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Store size={18} className="text-primary-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14.5px] font-semibold text-foreground">{p.name}</span>
                {p.stars !== undefined && p.stars > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[11.5px] text-warning">
                    <Star size={11} className="fill-warning" /> {p.stars}
                  </span>
                )}
                {p.installed ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <CheckCircle2 size={11} /> 已安装{p.local_version ? ` v${p.local_version}` : ''}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted">未安装</span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-1 text-[12.5px] text-foreground-muted">{p.desc}</p>
              <p className="mt-0.5 text-[11px] text-foreground-muted/60">
                by {p.author} · v{p.version}
                {p.support_platforms?.length ? ` · ${p.support_platforms.join(',')}` : ''}
              </p>
            </div>
            {/* 安装/卸载 (stopPropagation 防开详情) */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {p.installed ? (
                <button
                  onClick={() => act(p.id, true)}
                  disabled={busy === p.id}
                  className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-[12.5px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"
                >
                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 卸载
                </button>
              ) : (
                <button
                  onClick={() => act(p.id, false)}
                  disabled={busy === p.id}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 安装
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 */}
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
          {query ? `没有找到匹配 "${query}" 的插件` : '该分类暂无插件'}
        </div>
      )}

      {/* 详情弹窗 (仿 AstrBot: 点击插件开简介) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5 border-b border-border p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-solid">
                {detail.logo ? (
                  <img src={detail.logo} alt="" className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <Store size={22} className="text-primary-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-bold text-foreground">{detail.name}</h2>
                <div className="mt-0.5 text-[12px] text-foreground-muted">by {detail.author}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {detail.stars !== undefined && detail.stars > 0 && (
                    <span className="flex items-center gap-0.5 text-[12px] text-warning">
                      <Star size={12} className="fill-warning" /> {detail.stars}
                    </span>
                  )}
                  <span className="rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted">v{detail.version}</span>
                  {detail.astrbot_version && (
                    <span className="rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted">
                      AstrBot {detail.astrbot_version}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-solid">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[40vh] space-y-3.5 overflow-y-auto p-5">
              <div>
                <div className="mb-1 text-[12px] font-semibold text-foreground-muted">简介</div>
                <p className="text-[13px] leading-relaxed text-foreground">{detail.desc || '暂无描述'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div>
                  <div className="text-foreground-muted">版本</div>
                  <div className="font-medium text-foreground">{detail.version || '-'}</div>
                </div>
                <div>
                  <div className="text-foreground-muted">作者</div>
                  <div className="font-medium text-foreground">{detail.author || '-'}</div>
                </div>
                <div>
                  <div className="text-foreground-muted">Star 数</div>
                  <div className="font-medium text-foreground">{detail.stars ?? 0}</div>
                </div>
                <div>
                  <div className="text-foreground-muted">最近更新</div>
                  <div className="font-medium text-foreground">{detail.updated_at ? detail.updated_at.slice(0, 10) : '-'}</div>
                </div>
                <div>
                  <div className="text-foreground-muted">支持平台</div>
                  <div className="font-medium text-foreground">{(detail.support_platforms ?? []).join(', ') || '通用'}</div>
                </div>
                <div>
                  <div className="text-foreground-muted">分类</div>
                  <div className="font-medium text-foreground">{(detail.tags ?? []).join(', ') || '-'}</div>
                </div>
              </div>
              {detail.repo && (
                <a
                  href={detail.repo.replace(/\.git$/, '')}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary-500 hover:underline"
                >
                  <ExternalLink size={12} /> GitHub 仓库
                </a>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              {detail.installed ? (
                <button
                  onClick={() => { act(detail.id, true); setDetail(null) }}
                  className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-4 py-2 text-[12.5px] font-semibold text-danger hover:bg-danger/10"
                >
                  <Trash2 size={13} /> 卸载
                </button>
              ) : (
                <button
                  onClick={() => { act(detail.id, false); setDetail(null) }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  <Download size={14} /> 安装
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}