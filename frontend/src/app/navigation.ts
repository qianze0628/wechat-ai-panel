// 统一导航数据: 侧边栏、面包屑、路由共用 (仿 AstrBot WebUI 分组)
import {
  LayoutDashboard,
  Route,
  ServerCog,
  Cable,
  TerminalSquare,
  ArchiveRestore,
  Settings2,
  MessagesSquare,
  ShieldCheck,
  Blocks,
  FileCode2,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
  group?: string // 分组: 欢迎/机器人/更多功能/设置
}

export const NAV_ITEMS: NavItem[] = [
  // 欢迎
  { to: '/', label: '欢迎', icon: LayoutDashboard, description: '服务健康与快捷操作', group: '欢迎' },
  // 机器人
  { to: '/onboarding', label: '部署向导', icon: Route, description: '环境检测到模型配置的完整流程', group: '机器人' },
  { to: '/services', label: '服务中心', icon: ServerCog, description: '单个服务的状态与启停控制', group: '机器人' },
  { to: '/connection', label: '连接配置', icon: Cable, description: '微信扫码、凭据与 OneBot 配置', group: '机器人' },
  { to: '/whitelist', label: '白名单与管理员', icon: ShieldCheck, description: '微信联系人白名单与管理权限设置', group: '机器人' },
  // 插件
  { to: '/plugins', label: '插件中心', icon: Blocks, description: 'AstrBot 插件管理与配置', group: '插件' },
  // 更多功能
  { to: '/messages', label: '对话数据', icon: MessagesSquare, description: '微信消息记录与对话查看', group: '更多功能' },
  { to: '/config', label: '配置文件', icon: FileCode2, description: '查看与编辑 AstrBot cmd_config', group: '更多功能' },
  { to: '/logs', label: '平台日志', icon: TerminalSquare, description: '终端式日志查看与搜索', group: '更多功能' },
  { to: '/stats', label: '数据统计', icon: BarChart3, description: '消息量/活跃度等统计', group: '更多功能' },
  { to: '/backups', label: '备份恢复', icon: ArchiveRestore, description: 'AstrBot 配置备份与恢复', group: '更多功能' },
  // 设置
  { to: '/settings', label: '设置', icon: Settings2, description: '常规 / 外观 / 安全 / 维护', group: '设置' },
]

export function findNavItem(pathname: string): NavItem | undefined {
  // 支持 /plugins/:id 等子路由 → 归到父级
  return NAV_ITEMS.find((n) => n.to === pathname) || NAV_ITEMS.find((n) => pathname.startsWith(n.to + '/'))
}

export function navGroups(): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = []
  for (const item of NAV_ITEMS) {
    const g = item.group ?? '其他'
    let found = groups.find((x) => x.group === g)
    if (!found) {
      found = { group: g, items: [] }
      groups.push(found)
    }
    found.items.push(item)
  }
  return groups
}