// NapCat Pink Glass 外壳: 毛玻璃侧边栏(spring 折叠) + 浮动顶栏 + 光斑背景 + 页面切换动画
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, ServerCog, Sun, Moon } from 'lucide-react'
import { navGroups, findNavItem, NAV_ITEMS } from '../../app/navigation'
import { useTheme } from '../../app/theme'

// 判断 path 是否被更具体的独立导航项覆盖 (如 /plugins/market 是独立项, /plugins 不应高亮)
function routeShadowed(pathname: string, parent: string): boolean {
  // 仅当存在"更长的独立项"且当前 path 恰好等于它时, 父项不高亮
  if (parent === '/') return false
  const prefix = parent + '/'
  if (!pathname.startsWith(prefix)) return false
  // 该子路径是某个导航项的精确 to → 归它自己, 父不高亮
  return NAV_ITEMS.some((n) => n.to !== parent && n.to === pathname)
}
import PageBackground from './PageBackground'

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const current = findNavItem(location.pathname)
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div className="flex h-full gap-4 p-4">
      <PageBackground />

      {/* 玻璃侧边栏: width 256px↔68px, spring ease-out */}
      <aside
        className={`flex shrink-0 flex-col rounded-2xl border border-border bg-surface backdrop-blur-xl transition-[width] duration-[240ms] ease-out ${
          collapsed ? 'w-[68px]' : 'w-[256px]'
        }`}
      >
        {/* 产品标识: 粉竖条 + logo + 名称 (折叠后仅 logo) */}
        <div className="relative flex h-14 items-center gap-2.5 overflow-hidden px-4">
          <span aria-hidden className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-primary-500" />
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white shadow-[0_4px_14px_rgba(243,59,124,0.35)]">
            <ServerCog size={19} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold tracking-tight text-foreground">
                微信 AI 控制台
              </div>
              <div className="text-[11px] text-foreground-muted">本地管理面板</div>
            </div>
          )}
        </div>

        {/* 导航菜单 (仿 AstrBot 分组) */}
        <nav className="mt-2 flex-1 overflow-y-auto px-2.5">
          {navGroups().map((g) => (
            <div key={g.group} className="mb-1.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold tracking-wide text-foreground-muted/60">
                  {g.group}
                </div>
              )}
              <div className="space-y-1">
                {g.items.map((item) => {
                  // 激活: 精确匹配 或 (首页 '/' 仅精确); 子路由 (如 /plugins/:id) 归父级,
                  // 但 /plugins/market 是独立项, 只高亮市场 (不做前缀匹配)
                  const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to + '/') && !routeShadowed(location.pathname, item.to))
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      title={item.label}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-160 ${
                        active
                          ? 'translate-x-1 bg-primary-50 font-semibold text-primary-600'
                          : 'text-foreground-muted hover:translate-x-1 hover:bg-primary-50/60 hover:text-foreground'
                      }`}
                    >
                      <item.icon size={18} strokeWidth={2} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      <span
                        aria-hidden
                        className={`sidebar-nav-indicator absolute right-2 rounded-full bg-primary-500 transition-opacity duration-180 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 底部折叠按钮: 折叠后纯图标 + tooltip */}
        <div className="border-t border-border p-2.5">
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground-muted transition-all duration-160 hover:translate-x-1 hover:bg-primary-50/60 hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>折叠侧边栏</span>}
          </button>
        </div>
      </aside>

      {/* 主区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 浮动顶栏: 面包屑 + 实例状态徽标 + 主题切换 */}
        <header className="mb-4 flex h-14 shrink-0 items-center justify-between rounded-2xl border border-border bg-surface px-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-foreground-muted">面板</span>
            <span className="text-foreground-muted">/</span>
            <span className="font-semibold text-foreground">{current?.label ?? '未知页面'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* 本地实例状态徽标: 亮色下足量对比 */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-solid px-3 py-1 text-[12px] topbar-status-text">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(59,170,120,0.6)]" />
              本地实例已连接
            </div>
            {/* 主题切换按钮 */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
              title={theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'}
              className="topbar-icon-btn flex h-8 w-8 items-center justify-center rounded-full border bg-surface-solid transition-colors"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* 内容区: 路由切换 spring 过渡 */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          {/* 路由切换入场动画: 不用 AnimatePresence mode=wait (会等旧组件退出后 delay 新组件, 个别浏览器可能卡白屏)。
              这里只做入场动画, 新路由立即渲染, 确保切换永远不卡 */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}