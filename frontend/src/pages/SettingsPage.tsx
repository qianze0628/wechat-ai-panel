// 设置: 面板认证 / 备份 / 外观主题(DIY配色) / 实例路径 / 端口服务 / 系统与版本
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FolderCog,
  ServerCog,
  ShieldCheck,
  Palette,
  Info,
  Save,
  Loader2,
  DatabaseBackup,
  Lock,
  Sparkles,
  Power,
  RefreshCw,
  ExternalLink,
  Download,
} from 'lucide-react'
import { panelApi, authApi, settingsApi, autostartApi, updateApi } from '../api'
import { useTheme, ACCENT_PRESETS } from '../app/theme'
import { toast } from '../app/toast'
import Toggle from '../components/ui/Toggle'
import type { ReactNode } from 'react'

// 从任意版本串提取规范语义版本 (容忍 "go-v0.2" → "0.2.0"、"v1.2.3-beta" → "1.2.3")
function normalizeVersion(v: string): string {
  const m = v.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  if (!m) return v
  return `${m[1]}.${m[2]}.${m[3] ?? '0'}`
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 10000,
  })
  const { data: auth, refetch: refetchAuth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: authApi.status,
  })
  const { data: sys } = useQuery({
    queryKey: ['system'],
    queryFn: panelApi.system,
    refetchInterval: 5000,
  })

  // 面板设置 (可编辑项)
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })
  const [authSwitch, setAuthSwitch] = useState<boolean | null>(null) // null=跟随 settings
  const [password, setPassword] = useState('')
  const [backupSwitch, setBackupSwitch] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  // 开机自启状态
  const { data: autostart, refetch: refetchAutostart } = useQuery({
    queryKey: ['autostart'],
    queryFn: autostartApi.status,
  })
  const autostartOn = autostart?.enabled ?? false
  async function toggleAutostart(v: boolean) {
    try {
      const r = await autostartApi.set(v)
      toast.success(r.message || (v ? '已开启开机自启' : '已关闭开机自启'))
      refetchAutostart()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  // 更新检测 (GitHub latest + IP 判断国内镜像)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<Awaited<ReturnType<typeof updateApi.check>> | null>(null)
  const [downloadInfo, setDownloadInfo] = useState<Awaited<ReturnType<typeof updateApi.downloadInfo>> | null>(null)
  const [applying, setApplying] = useState(false)
  async function checkUpdate() {
    if (checkingUpdate) return
    setCheckingUpdate(true)
    setUpdateInfo(null)
    try {
      // 从 status.version 提取规范语义版本号 (容忍 "go-v0.2" → "0.2.0" 前缀)
      const ver = (data as { version?: string })?.version ?? ''
      const norm = normalizeVersion(ver)
      const info = await updateApi.check(norm)
      setUpdateInfo(info)
      if (!info.has_update && info.message) toast.success(info.message)
      // 若有新版本, 预取下载信息 (体现国内镜像判断)
      if (info.has_update && info.latest?.assets?.length) {
        const asset = info.latest.assets[0].name
        const dl = await updateApi.downloadInfo(asset)
        setDownloadInfo(dl)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '检查更新失败')
    } finally {
      setCheckingUpdate(false)
    }
  }

  // 一键自动更新 (面板内下载→替换→重启, 不跳 GitHub)
  async function applyUpdateNow() {
    const ver = updateInfo?.latest?.tag_name
    if (!ver || applying) return
    if (!window.confirm(`确定要更新到 ${ver} 吗？\n面板将自动下载并替换自身，完成后自动重启。`)) return
    setApplying(true)
    try {
      const r = await updateApi.apply(ver)
      if (r.ok) {
        toast.success(r.message || '更新成功，面板即将重启')
        // 更新期间面板会重启, 几秒后刷新状态
        setTimeout(() => {
          window.location.reload()
        }, 8000)
      } else {
        toast.error(r.message || '更新失败')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '自动更新失败')
    } finally {
      setApplying(false)
    }
  }

  const { theme, setTheme, accent, setAccent } = useTheme()

  // DIY 配色: 自定义色值输入
  const [customColor, setCustomColor] = useState(accent)

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 正在加载…
      </div>
    )
  }

  const svc = data.services
  const cfg = data.config
  const panelPort = data.config.port ?? 8080

  // 实际开关状态: settings 优先, 未加载用默认
  const authOn = authSwitch ?? settings?.auth_enabled ?? false
  const backupOn = backupSwitch ?? settings?.backup_enabled ?? true

  async function saveSettings() {
    if (saving) return
    setSaving(true)
    try {
      const payload: { panel_password?: string; backup_enabled?: boolean } = {}
      // 认证: 开关状态变化 或 输入了密码
      const wantAuth = authOn
      const curAuth = settings?.auth_enabled ?? false
      if (wantAuth !== curAuth || password) {
        payload.panel_password = wantAuth ? password : ''
      }
      if ((backupSwitch ?? null) !== null) {
        payload.backup_enabled = backupOn
      }
      if (Object.keys(payload).length === 0) {
        toast.success('没有需要保存的变更')
        return
      }
      // 开启认证但没填密码 → 提示
      if (payload.panel_password === '' && wantAuth && !curAuth) {
        toast.error('开启认证需要设置密码')
        return
      }
      const r = await settingsApi.save(payload)
      // 开启/修改密码 → 跳登录页让用户用新密码重新登录 (认证已启用, 需要登录)
      if (r.auth_changed) {
        toast.success(r.message || '设置已保存')
        setTimeout(() => {
          window.dispatchEvent(new Event('panel-auth-expired'))
        }, 400)
        return
      }
      toast.success(r.message || '设置已保存')
      // 关闭认证 (auth_disabled) 或其它变更 → 免登录, 直接同步最新状态 (不跳登录页)
      setAuthSwitch(null)
      setPassword('')
      setBackupSwitch(null)
      refetchSettings()
      refetchAuth()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">设置</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          面板认证、备份、外观与运行信息 · 修改即时保存到 config.json
        </p>
      </div>

      {/* 面板认证 */}
      <Section icon={ShieldCheck} title="面板认证">
        <SwitchRow
          icon={<Lock size={15} />}
          title="启用密码认证"
          desc={
            authOn
              ? '未登录时将要求输入密码才能访问面板'
              : '免认证运行，任何人可访问面板（默认）'
          }
          checked={authOn}
          onChange={(v) => {
            setAuthSwitch(v)
            if (!v) setPassword('')
          }}
        />
        {authOn && (
          <div className="mt-3">
            <div className="text-[12.5px] text-foreground-muted">设置登录密码</div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings?.auth_enabled ? '输入新密码（留空保持不变）' : '输入登录密码'}
              autoComplete="new-password"
              className="mt-1 h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground placeholder:text-foreground-muted/50 focus:border-primary-400 focus:outline-none"
            />
            <p className="mt-1 text-[11.5px] text-foreground-muted/70">
              {auth?.enabled ? '当前已启用' : '保存后将启用'} · 密码明文存于 config.json
            </p>
          </div>
        )}
      </Section>

      {/* 备份 */}
      <Section icon={DatabaseBackup} title="备份">
        <SwitchRow
          icon={<DatabaseBackup size={15} />}
          title="系统自动备份"
          desc={backupOn ? '配置变更前会自动创建备份（runtime/backups）' : '关闭后不再自动创建配置备份'}
          checked={backupOn}
          onChange={(v) => setBackupSwitch(v)}
        />
      </Section>

      {/* 开机自启 + 服务守护 */}
      <Section icon={ServerCog} title="开机自启与服务守护">
        <SwitchRow
          icon={<Power size={15} />}
          title="开机自动启动面板"
          desc={
            autostartOn
              ? '下次开机自动启动面板，并自动拉起 AstrBot / wechat-bot / qr-server'
              : '关闭后开机需手动启动面板（服务需手动或守护拉起）'
          }
          checked={autostartOn}
          onChange={(v) => toggleAutostart(v)}
        />
        <div className="mt-2 rounded-lg border border-border bg-surface-solid px-3 py-2 text-[12px] text-foreground-muted">
          🛡️ 面板运行时会自动守护服务（每 30 秒健康检查，掉线自动拉起）；AstrBot
          升级冲掉的群聊补丁也会自动重打，无需手动干预。
        </div>
      </Section>

      {/* 外观主题 + DIY 配色 */}
      <Section icon={Palette} title="外观主题">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['light', '亮色 · 粉蓝'],
              ['dark', '暗色 · 粉红'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                theme === mode
                  ? 'bg-primary-500 text-white'
                  : 'border border-border text-foreground-muted hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* DIY 配色: 预设色板 + 自定义 */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Sparkles size={14} className="text-primary-500" />
            自定义主色
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setAccent(p.color)}
                title={p.label}
                aria-label={`设置主题色为 ${p.label}`}
                className={`h-9 w-9 rounded-full transition-all duration-150 ${
                  accent.toLowerCase() === p.color.toLowerCase()
                    ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-background'
                    : 'hover:scale-110'
                }`}
                style={{ background: p.color }}
              />
            ))}
            {/* 自定义颜色输入 */}
            <label className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-solid px-2.5 py-1.5">
              <input
                type="color"
                value={accent}
                onChange={(e) => { setAccent(e.target.value); setCustomColor(e.target.value) }}
                className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  if (/^#?[0-9a-fA-F]{6}$/.test(e.target.value)) setAccent(e.target.value)
                }}
                placeholder="#F33B7C"
                className="w-20 bg-transparent text-[12px] text-foreground-muted focus:outline-none"
              />
            </label>
          </div>
          <p className="mt-1.5 text-[11.5px] text-foreground-muted">
            主色会即时应用到全站（按钮/开关/徽标/边框），偏好保存在浏览器本地。  </p>
        </div>
      </Section>

      {/* 保存设置 */}
      {((authSwitch !== null) || (backupSwitch !== null && backupSwitch !== settings?.backup_enabled) || password) && (
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      )}

      {/* 实例路径 */}
      <Section icon={FolderCog} title="实例路径">
        <div className="space-y-2.5">
          {[
            ['wechat-bot 目录', cfg.wechat_bot_dir],
            ['AstrBot 根目录', cfg.astrbot_root],
            ['AstrBot 数据目录', cfg.astrbot_data_dir],
            ['cmd_config', cfg.cmd_config],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="w-32 shrink-0 text-[12.5px] text-foreground-muted">{k}</span>
              <span className="mono min-w-0 flex-1 truncate text-right text-[12px] text-foreground" title={v}>
                {v}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <span className="w-32 shrink-0 text-[12.5px] text-foreground-muted">AstrBot 配置修改时间</span>
            <span className="text-[12px] text-foreground">{cfg.cmd_config_mtime ?? '—'}</span>
          </div>
        </div>
      </Section>

      {/* 端口与服务 */}
      <Section icon={ServerCog} title="端口与服务">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <PortItem name="管理面板" main={String(panelPort)} sub={svc ? '本地管理界面' : '—'} running />
          <PortItem
            name="AstrBot WebUI"
            main={String(svc.astrbot.webui_port)}
            sub={svc.astrbot.running ? `运行中 · PID ${svc.astrbot.pid ?? '—'}` : '未启动'}
            running={svc.astrbot.running}
          />
          <PortItem
            name="AstrBot OneBot WS"
            main={String(svc.astrbot.ws_port)}
            sub={svc.astrbot.running ? 'OneBot v11' : '未启动'}
            running={svc.astrbot.running}
          />
          <PortItem
            name="wechat-bot API"
            main={String(svc.wechat.api_port)}
            sub={svc.wechat.running ? `运行中 · PID ${svc.wechat.pid ?? '—'}` : '未启动'}
            running={svc.wechat.running}
          />
          <PortItem
            name="qr-server"
            main={String(svc.qr.port)}
            sub={svc.qr.running ? `运行中 · PID ${svc.qr.pid ?? '—'}` : '未启动'}
            running={svc.qr.running}
          />
        </div>
      </Section>

      {/* 系统与版本 */}
      <Section icon={Info} title="系统与版本">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-foreground-muted">
            {sys?.system && (
              <>
                <span>{sys.system.hostname}</span>
                <span>{sys.system.platform} {sys.system.release} ({sys.system.machine})</span>
                <span>CPU {sys.cpu?.cores ?? '?'} 线程</span>
                <span>{sys.processes != null ? `进程 ${sys.processes}` : ''}</span>
                <span>面板 PID {sys.panel_pid}</span>
              </>
            )}
          </div>
          <div className="text-[12px] text-foreground-muted">
            管理面板 · 微信 AI 机器人「得 Talk-AI」v2.6 ·{' '}
            {(data as { version?: string })?.version?.startsWith('go') ? 'Go 后端' : 'FastAPI 后端'}
            {` · 当前版本 v${normalizeVersion((data as { version?: string })?.version ?? '0.0.0')}`}
          </div>

          {/* 检查更新 */}
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={checkUpdate}
                disabled={checkingUpdate}
                className="flex items-center gap-1.5 rounded-lg border border-primary-300 px-3 py-1.5 text-[12.5px] font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-40"
              >
                {checkingUpdate ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {checkingUpdate ? '检查中…' : '检查更新'}
              </button>
              {updateInfo?.latest && (
                <span className="text-[12.5px] text-foreground-muted">
                  最新版本 {updateInfo.latest.tag_name}
                  {updateInfo.has_update ? ' · 有新版本' : ' · 已是最新'}
                </span>
              )}
            </div>
            {updateInfo?.latest && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-border bg-surface-solid p-3 text-[12px] leading-relaxed text-foreground-muted">
                <div className="mb-1 font-semibold text-foreground">
                  {updateInfo.latest.name || updateInfo.latest.tag_name}
                  {updateInfo.latest.published_at && (
                    <span className="ml-2 font-normal text-foreground-muted/70">
                      {updateInfo.latest.published_at.slice(0, 10)}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{updateInfo.latest.body || '暂无更新日志'}</div>
              </div>
            )}
            {updateInfo?.latest && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={applyUpdateNow}
                  disabled={applying || !updateInfo.has_update}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {applying ? '更新中…' : '立即更新'}
                </button>
                {downloadInfo?.use_mirror && (
                  <span className="text-[11.5px] text-foreground-muted/70">
                    检测到国内网络，将走镜像加速 ({downloadInfo.region})
                  </span>
                )}
                <a
                  href={updateInfo.latest.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-500 hover:text-primary-600"
                >
                  <ExternalLink size={12} /> 前往 GitHub 发布页
                </a>
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon?: typeof FolderCog
  title: string
  children: ReactNode
}) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
        {Icon && <Icon size={16} className="text-primary-500" />}
        {title}
      </div>
      {children}
    </div>
  )
}

function SwitchRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: ReactNode
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-surface-solid/60 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-500">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-foreground">{title}</div>
          <div className="mt-0.5 text-[12px] text-foreground-muted">{desc}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={() => onChange(!checked)} />
    </div>
  )
}

function PortItem({ name, main, sub, running }: { name: string; main: string; sub: string; running?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface-solid p-3">
      <div className="text-[12px] text-foreground-muted">{name}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[16px] font-bold text-foreground">{main}</span>
        {running ? (
          <span className="mb-0.5 h-1.5 w-1.5 rounded-full bg-success" title="运行中" />
        ) : null}
      </div>
      <div className="mt-0.5 text-[11px] text-foreground-muted/80">{sub}</div>
    </div>
  )
}
