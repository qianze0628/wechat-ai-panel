// 通用插件视图页: 展示插件的元数据与说明 (插件自定义页面可扩展)
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Puzzle, ArrowLeft, Loader2, CircleCheck, Tag, Box } from 'lucide-react'
import { panelApi } from '../api'

export default function PluginPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: panelApi.plugins,
  })
  const plugin = (data?.plugins ?? []).find((p) => p.id === id)

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载插件…
      </div>
    )
  }

  if (!plugin) {
    return (
      <div className="mx-auto max-w-[560px] p-10 text-center">
        <div className="text-[14px] font-semibold text-foreground">未找到插件</div>
        <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-primary-500 hover:underline">
          <ArrowLeft size={14} /> 返回概览
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      {/* 返回 */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-foreground-muted hover:text-primary-500">
        <ArrowLeft size={14} /> 返回概览
      </Link>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-500">
            <Puzzle size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{plugin.name}</h1>
            <p className="mt-0.5 text-[13px] text-foreground-muted">{plugin.description}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5 rounded-xl border border-border bg-surface-solid p-4 text-[13px]">
          <div className="flex items-center gap-3">
            <Tag size={14} className="shrink-0 text-primary-500" />
            <span className="w-20 text-foreground-muted">插件 ID</span>
            <span className="mono text-foreground">{plugin.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <Box size={14} className="shrink-0 text-primary-500" />
            <span className="w-20 text-foreground-muted">版本</span>
            <span className="mono text-foreground">{plugin.version}</span>
          </div>
          <div className="flex items-center gap-3">
            <CircleCheck size={14} className={`shrink-0 ${plugin.enabled ? 'text-success' : 'text-foreground-muted'}`} />
            <span className="w-20 text-foreground-muted">状态</span>
            <span className={plugin.enabled ? 'text-success' : 'text-foreground-muted'}>
              {plugin.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-surface p-4 text-[12.5px] leading-relaxed text-foreground-muted">
          此插件由后端 plugins/ 目录自动发现并注册。它可提供独立 API 与功能；自定义前端页面可在
          <code className="mono mx-1 text-primary-500">frontend/src/pages/</code> 添加组件并在
          <code className="mono mx-1 text-primary-500">App.tsx</code> 注册路由。
        </div>
      </div>
    </div>
  )
}