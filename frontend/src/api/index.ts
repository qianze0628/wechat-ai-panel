// 业务 API 封装
import { api } from './client'
import type {
  AuthStatus,
  BackupItem,
  EnvStatus,
  InstallStatus,
  LogsResponse,
  MessagesResponse,
  PanelStatus,
  PluginInfo,
  QrStatus,
  ServicesStatus,
  SetupPreview,
  StartResult,
  SystemStatus,
  WhitelistContacts,
  WhitelistState,
} from '../types/api'

export const authApi = {
  status: () => api.get<AuthStatus>('/api/auth/status'),
  login: (password: string) => api.post<{ ok: boolean; message: string }>('/api/auth/login', { password }),
}

export interface PanelSettings {
  ok: boolean
  auth_enabled: boolean
  backup_enabled: boolean
  config_path: string
}

export const settingsApi = {
  get: () => api.get<PanelSettings>('/api/settings'),
  save: (payload: {
    panel_password?: string
    backup_enabled?: boolean
    host?: string
    port?: number
    mirror_npm?: string
    mirror_pypi?: string
    mirror_git?: string
  }) =>
    api.post<{ ok: boolean; message: string; changes: string[]; auth_changed?: boolean; auth_disabled?: boolean }>(
      '/api/settings',
      payload,
    ),
}

// 开机自启 (Windows 注册表 Run 键)
export const autostartApi = {
  status: () => api.get<{ ok: boolean; enabled: boolean; method: string }>('/api/autostart'),
  set: (enabled: boolean) =>
    api.post<{ ok: boolean; enabled: boolean; message: string }>('/api/autostart', { enabled }),
}

// 更新检测 (GitHub latest + IP 判断国内镜像)
export interface ReleaseInfo {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  assets?: { name: string; size: number; browser_download_url: string }[]
}
export interface UpdateCheckResult {
  has_update: boolean
  current_version: string
  latest?: ReleaseInfo
  message: string
}
export interface DownloadInfo {
  region: string
  use_mirror: boolean
  mirror_prefix: string
  direct_url: string
  final_url: string
}
// 插件中心 (AstrBot 插件管理)
export interface AstrPlugin {
  id: string
  name: string
  display_name: string
  desc: string
  version: string
  author: string
  repo: string
  support_platforms: string[]
  enabled: boolean
  compatible: boolean
  compatible_note: string
  has_config: boolean
  config_path: string
  conf_schema_path: string
}
export const pluginCenterApi = {
  list: () => api.get<{ ok: boolean; plugins: AstrPlugin[] }>('/api/plugin-center'),
  config: (id: string) =>
    api.get<{ ok: boolean; config: Record<string, unknown>; schema: unknown }>(
      `/api/plugin-center/config?id=${encodeURIComponent(id)}`,
    ),
  saveConfig: (id: string, config: Record<string, unknown>) =>
    api.post<{ ok: boolean; message: string }>(`/api/plugin-center/config?id=${encodeURIComponent(id)}`, { config }),
  toggle: (id: string, enabled: boolean) =>
    api.post<{ ok: boolean; message: string }>(
      `/api/plugin-center/toggle?id=${encodeURIComponent(id)}&enabled=${enabled}`,
    ),
}

export const updateApi = {
  check: (version: string) => api.get<UpdateCheckResult>(`/api/update-check?version=${encodeURIComponent(version)}`),
  // 修复 (2026-08-11): 资产名由后端按平台自算, 前端只传目标版本 (之前传 asset 可能取错平台 → 404)
  downloadInfo: (_asset?: string, version?: string) =>
    api.get<DownloadInfo>(`/api/update/download-info${version ? `?version=${encodeURIComponent(version)}` : ''}`),
  // 面板内置自动更新 (下载→替换→重启)
  apply: (version: string) =>
    api.post<{ ok: boolean; message: string }>('/api/update/apply', { version }),
}

export const panelApi = {
  status: () => api.get<PanelStatus>('/api/status'),
  env: () => api.get<EnvStatus>('/api/env'),
  services: () => api.get<ServicesStatus>('/api/services'),
  install: (opts?: { platform?: string; wechat_dir?: string; astrbot_dir?: string }) =>
    api.post<{
      ok: boolean
      message: string
      tasks: { label: string; kind: string; target: string }[]
      platform: string
      wechat_dir: string
      astrbot_dir: string
    }>('/api/install', opts),
  installStatus: () => api.get<InstallStatus>('/api/install/status'),
  start: (service: string) => api.post<StartResult>(`/api/start?service=${service}`),
  stop: (service: string) => api.post<{ ok: boolean; message: string }>(`/api/stop?service=${service}`),
  restart: (service: string) => api.post<StartResult>(`/api/restart?service=${service}`),
  logs: (service: string) => api.get<LogsResponse>(`/api/logs?service=${service}`),
  qrStatus: () => api.get<QrStatus>('/api/qr/status'),
  creds: () =>
    api.get<{ username: string | null; password: string | null; source: string | null; password_changed: boolean }>(
      '/api/astrbot/creds',
    ),
  setupPreview: () => api.get<SetupPreview>('/api/astrbot/setup/preview'),
  setup: () => api.post<{ ok: boolean; message: string; detail?: unknown }>('/api/astrbot/setup'),
  backups: () => api.get<{ ok: boolean; backups: BackupItem[] }>('/api/backups'),
  restore: (path: string) => api.post<{ ok: boolean; message: string }>(`/api/astrbot/restore?path=${encodeURIComponent(path)}`),
  system: () => api.get<SystemStatus>('/api/system'),
  whitelistContacts: () => api.get<WhitelistContacts>('/api/whitelist/contacts'),
  whitelistGet: () => api.get<WhitelistState>('/api/whitelist'),
  whitelistSave: (payload: {
    chatIds: string[]
    adminIds: string[]
    excludedGroupMembers?: Record<string, string[]>
  }) =>
    api.post<{ status: string; message: string; chatIds: string[]; adminIds: string[] }>('/api/whitelist', payload),
  whitelistSuper: (superAdminIds: string[]) =>
    api.post<{ ok: boolean; message: string; superAdminIds: string[] }>('/api/whitelist/super', { superAdminIds }),
  // 群聊配置 (回复所有群聊开关, 同步 wechat-bot .env ROOM_WHITELIST)
  wechatEnvGet: () =>
    api.get<{ ok: boolean; config: { replyAllGroups: boolean; room_whitelist?: string; room_member_exclude?: string; no_mention_rooms?: string; room_chat_enabled?: boolean; bot_name?: string } }>('/api/wechat-env'),
  wechatEnvSave: (payload: {
    reply_all_groups?: boolean
    room_whitelist?: string
    room_member_exclude?: string
    no_mention_rooms?: string
    room_chat_enabled?: boolean
  }) => api.post<{ ok: boolean; message: string }>('/api/wechat-env', payload),
  plugins: () => api.get<{ ok: boolean; plugins: PluginInfo[] }>('/api/plugins'),
  messages: (params: { contact?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params.contact) q.set('contact', params.contact)
    if (params.search) q.set('search', params.search)
    if (params.limit) q.set('limit', String(params.limit))
    return api.get<MessagesResponse>(`/api/messages?${q.toString()}`)
  },
}
