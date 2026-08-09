// 插件中心: 列出 AstrBot 全部插件 (元数据/连通状态/启禁用), 点击进入详情配置
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Blocks,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Power,
  ChevronRight,
  Puzzle,
  Store,
  RefreshCw,
} from 'lucide-react'
import { pluginCenterApi, type AstrPlugin } from '../api'
import { toast } from '../app/toast'

export default function PluginCenterPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['plugin-center'],
    queryFn: pluginCenterApi.list,
    refetchInterval: 15000, // 15s 刷新状态
  })

  async function togglePlugin(p: AstrPlugin) {
    try {
      const r = await pluginCenterApi.toggle(p.id, !p.enabled)
      toast.success(r.message || '操作成功')
      // 就地更新缓存, 避免 15s 轮询前点第二次误切换
      queryClient.setQueryData<{ ok: boolean; plugins: AstrPlugin[] }>(['plugin-center'], (old) =>
        old
          ? { ...old, plugins: (old.plugins ?? []).map((pl) => (pl.id === p.id ? { ...pl, enabled: !p.enabled } : pl)) }
          : old,
      )
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载插件…
      </div>
    )
  }

  const plugins = data.plugins ?? []
  const compatibleCount = plugins.filter((p) => p.compatible).length
  const enabledCount = plugins.filter((p) => p.enabled).length

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      {/* 标题 + 操作 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">插件中心</h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            AstrBot 插件管理与配置 · 共 {plugins.length} 个 · {enabledCount} 启用 · {compatibleCount} 适配微信
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/plugins/market"
            className="flex items-center gap-1.5 rounded-lg border border-primary-500/40 px-3 py-1.5 text-[12.5px] font-semibold text-primary-500 hover:bg-primary-500/10"
          >
            <Store size={13} /> 插件市场
          </Link>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground-muted hover:bg-surface-solid"
          >
            <RefreshCw size={13} /> 刷新
          </button>
        </div>
      </div>

      {/* 插件列表 */}
      {plugins.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-foreground-muted">
          <Blocks size={32} className="mx-auto mb-3 opacity-40" />
          暂无插件。请在 AstrBot 中安装插件 (pip 或手动放置到 plugins 目录)。
        </div>
      ) : (
        <div className="space-y-2.5">
          {plugins.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary-300 ${
                !p.enabled ? 'opacity-60' : ''
              }`}
            >
              {/* 图标 */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                <Puzzle size={20} />
              </div>
              {/* 信息 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/plugins/${encodeURIComponent(p.id)}`}
                    className="truncate text-[14.5px] font-semibold text-foreground hover:text-primary-500"
                  >
                    {p.display_name || p.name}
                  </Link>
                  <span className="shrink-0 rounded-md bg-surface-solid px-1.5 py-0.5 text-[11px] font-medium text-foreground-muted">
                    v{p.version}
                  </span>
                  {p.author && (
                    <span className="hidden shrink-0 text-[11.5px] text-foreground-muted/70 sm:inline">by {p.author}</span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-foreground-muted">{p.desc || '暂无描述'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {/* 连通状态 */}
                  {p.compatible ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      <CheckCircle2 size={11} /> 适配微信
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                      title={p.compatible_note}
                    >
                      <AlertTriangle size={11} /> 可能不适配
                    </span>
                  )}
                  {/* 平台标签 */}
                  {p.support_platforms?.length > 0 && (
                    <span className="rounded-full bg-surface-solid px-2 py-0.5 text-[11px] text-foreground-muted">
                      {p.support_platforms.join(', ')}
                    </span>
                  )}
                  {/* 配置标记 */}
                  {p.has_config && (
                    <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-medium text-primary-500">
                      可配置
                    </span>
                  )}
                </div>
              </div>
              {/* 操作 */}
              <div className="flex shrink-0 items-center gap-1.5">
                {/* 启用开关 */}
                <button
                  onClick={() => togglePlugin(p)}
                  title={p.enabled ? '禁用插件' : '启用插件'}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    p.enabled
                      ? 'bg-success/15 text-success hover:bg-success/25'
                      : 'bg-surface-solid text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Power size={14} />
                </button>
                <Link
                  to={`/plugins/${encodeURIComponent(p.id)}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-solid text-foreground-muted transition-colors hover:bg-primary-500/10 hover:text-primary-500"
                >
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部提示 */}
      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        提示：插件的启用/禁用与配置修改需重启 AstrBot 生效。点击插件可查看详情与配置。
      </div>
    </div>
  )
}