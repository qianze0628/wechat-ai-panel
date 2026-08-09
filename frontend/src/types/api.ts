// FastAPI 后端数据类型 (与 app.py 返回结构对应)

export interface ServiceInfo {
  running: boolean
  pid: number | null
  [key: string]: unknown
}

export interface ServicesStatus {
  astrbot: ServiceInfo & { webui_port: number; ws_port: number }
  wechat: ServiceInfo & { api_port: number }
  qr: ServiceInfo & { port: number }
}

export interface EnvItem {
  installed: boolean
  path?: string
  deps_ready?: boolean
  ok?: boolean
  exists?: boolean
}

export interface EnvStatus {
  node: EnvItem
  npm: EnvItem
  uv: EnvItem
  python: EnvItem
  astrbot: EnvItem
  wechat_bot: EnvItem & { deps_ready: boolean }
  astrbot_root: EnvItem
  cmd_config: EnvItem
}

export interface PanelStatus {
  version?: string
  platform?: string
  env: EnvStatus
  services: ServicesStatus
  creds: { username: string | null; password: string | null; source: string | null; password_changed: boolean }
  astrbot_configured: boolean
  config_errors: string[]
  config: {
    wechat_bot_dir: string
    astrbot_root: string
    astrbot_data_dir: string
    cmd_config: string
    cmd_config_mtime: string | null
    port?: number
  }
}

export interface AuthStatus {
  enabled: boolean
  authed: boolean
}

export interface SetupPreview {
  ok: boolean
  changes: string[]
  untouched: string[]
  need_restart: boolean
  cmd_config: string
  backup_dir: string
}

export interface BackupItem {
  time: string
  path: string
  size: number
}

export interface QrStatus {
  logged: boolean
  hasQr: boolean
  qrUrl: string | null
}

export interface StartStep {
  service: string
  /** 后端实际返回布尔 ok (Go: map[string]any{"ok": bool}) */
  ok?: boolean
  /** 兼容旧字段 (如 status 文本) */
  status?: string
  message: string
}

export interface StartResult {
  ok: boolean
  message: string
  steps?: StartStep[]
  services?: ServicesStatus
}

export interface LogsResponse {
  service: string
  path: string
  content: string
}

export interface InstallStatus {
  running: boolean
  logs: string[]
  done: boolean
  ok: boolean | null
  platform?: string
  install_where?: {
    platform: string
    wechat_dir: string
    astrbot_dir: string
    astrbot_exe?: string
  }
}

export interface SystemStatus {
  cpu: {
    cores: number
    physical_cores: number
    usage_percent: number
    freq_mhz: number | null
  } | null
  memory: { total: number; used: number; free: number; usage_percent: number } | null
  disk: { total: number; used: number; free: number; usage_percent: number } | null
  system: {
    platform: string
    system: string
    release: string
    version: string
    machine: string
    hostname: string
  } | null
  uptime: number | null
  processes: number | null
  boot_time: number | null
  panel_pid: number
}

export interface ChatMessage {
  timestamp: string
  type: number
  typeName: string
  isText: boolean
  room: boolean
  contact: string
  talker: string
  receiver: string
  self: boolean
  text: string
}

export interface MessagesResponse {
  ok: boolean
  message?: string
  path?: string
  total: number
  contacts: { name: string; count: number; room: boolean }[]
  messages: ChatMessage[]
}

export interface WhitelistContact {
  name: string
  alias: string
  rawName: string
  id: string
  hashId: number
  avatar?: string
  isOfficial?: boolean
  chatted?: boolean
  isGroupMember?: boolean
  groupNames?: string[]
}

export interface WhitelistRoomMember {
  rawId: string
  name: string
  hashId: number
  source?: string
}

export interface WhitelistRoom {
  name: string
  hashId: number
  id?: string
  memberCount?: number
  members?: WhitelistRoomMember[]
  memberList?: WhitelistRoomMember[]
  unknownMemberCount?: number
  fromHist?: boolean
  activeNames?: string[]
}

export interface WhitelistContacts {
  ok: boolean
  message?: string
  contacts: WhitelistContact[]
  rooms: WhitelistRoom[]
}

export interface PluginInfo {
  id: string
  name: string
  description: string
  version: string
  enabled: boolean
  nav?: { to: string; label: string; icon?: string }
}

export interface WhitelistState {
  enabled: boolean
  chatIds: string[]
  adminIds: string[]
  superAdminIds?: string[]
  superAdminNames?: string[]
  nameMap?: Record<string, string>
  chatNames?: string[]
  adminNames?: string[]
  /** 群内屏蔽成员: {群hashId: [成员hashId]} —— 取消勾选的成员群里/私聊都不回复 */
  excludedGroupMembers?: Record<string, string[]>
  /** 群内屏蔽成员(按名字, 备选回显): {群名: [成员名]} */
  excludedGroupNames?: Record<string, string[]>
}
