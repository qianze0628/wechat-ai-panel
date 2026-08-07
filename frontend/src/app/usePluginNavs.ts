// 动态插件导航: 从 /api/plugins 拉取带 nav 声明的插件, 生成侧边栏菜单项
import { useEffect, useState } from 'react'
import { Puzzle, type LucideIcon } from 'lucide-react'
import { panelApi } from '../api'
import type { NavItem } from './navigation'

// 图标名 → lucide 组件 (Puzzle 兜底)
function iconFor(name?: string): LucideIcon {
  if (!name) return Puzzle
  // 内置已知图标映射
  const map: Record<string, LucideIcon> = { Puzzle }
  return map[name.toLowerCase()] ?? Puzzle
}

export function usePluginNavs(): {
  pluginNavs: NavItem[]
  loading: boolean
} {
  const [pluginNavs, setPluginNavs] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    panelApi
      .plugins()
      .then((r) => {
        if (cancelled) return
        const navs: NavItem[] = (r.plugins ?? [])
          .filter((p) => p.nav && p.nav.to)
          .map((p) => ({
            to: p.nav!.to,
            label: p.nav!.label || p.name,
            icon: iconFor(p.nav!.icon),
            description: p.description,
          }))
        setPluginNavs(navs)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return { pluginNavs, loading }
}