// 功能未完成页面的占位组件: 显示标题、说明、返回概览按钮和一个可用入口
import { Link } from 'react-router-dom'
import { ArrowLeft, Construction, type LucideIcon } from 'lucide-react'

export default function PagePlaceholder({
  title,
  description,
  icon: Icon = Construction,
  availableAction,
}: {
  title: string
  description: string
  icon?: LucideIcon
  availableAction?: { label: string; href: string }
}) {
  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="glass-panel mx-auto mt-12 max-w-[560px] p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-500">
          <Icon size={26} />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground-muted">{description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <ArrowLeft size={15} /> 返回概览
          </Link>
          {availableAction && (
            <a
              href={availableAction.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              {availableAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
