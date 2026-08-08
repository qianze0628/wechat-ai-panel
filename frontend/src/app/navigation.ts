// 统一导航数据: 侧边栏、面包屑、路由共用
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
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '概览', icon: LayoutDashboard, description: '服务健康与快捷操作' },
  { to: '/onboarding', label: '部署向导', icon: Route, description: '环境检测到模型配置的完整流程' },
  { to: '/services', label: '服务中心', icon: ServerCog, description: '单个服务的状态与启停控制' },
  { to: '/connection', label: '连接配置', icon: Cable, description: '微信扫码、凭据与 OneBot 配置' },
  { to: '/messages', label: '消息记录', icon: MessagesSquare, description: '微信消息记录与对话查看' },
  { to: '/whitelist', label: '白名单与管理员', icon: ShieldCheck, description: '微信联系人白名单与管理权限设置' },
  { to: '/logs', label: '实时日志', icon: TerminalSquare, description: '终端式日志查看与搜索' },
  { to: '/plugins', label: '插件中心', icon: Blocks, description: 'AstrBot 插件管理与配置' },
  { to: '/backups', label: '备份恢复', icon: ArchiveRestore, description: 'AstrBot 配置备份与恢复' },
  { to: '/settings', label: '设置', icon: Settings2, description: '路径、认证与主题' },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((n) => n.to === pathname)
}
