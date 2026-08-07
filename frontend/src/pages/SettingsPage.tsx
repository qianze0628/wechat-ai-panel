// 设置: 实例路径 / 端口服务 / 面板认证 / 外观主题 / 系统与版本
import { useQuery } from '@tanstack/react-query'
import {
  FolderCog,
  ServerCog,
  ShieldCheck,
  Palette,
  Info,
  CheckCircle2,
  TriangleAlert,
} from 'lucide-react'
import { panelApi, authApi } from '../api'
import { useTheme } from '../app/theme'

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: panelApi.status,
    refetchInterval: 10000,
  })
  const { data: auth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: authApi.status,
  })
  const { data: sys } = useQuery({
    queryKey: ['system'],
    queryFn: panelApi.system,
    refetchInterval: 5000,
  })
  const { theme, setTheme } = useTheme()

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">正在加载…</div>
    )
  }

  const svc = data.services
  const cfg = data.config
  const panelPort = data.config ? 8080 : 8080

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">设置</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">实例路径、服务端口、认证、主题与系统信息</p>
      </div>

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

      {/* 面板认证 */}
      <Section icon={ShieldCheck} title="面板认证">
        <div className="flex items-center gap-2 text-[13px]">
          {auth?.enabled ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <TriangleAlert size={16} className="text-warning" />
          )}
          {auth?.enabled ? (
            <span className="text-foreground">
              面板密码认证已启用{auth.authed ? ' · 当前已登录' : ' · 未登录'}
            </span>
          ) : (
            <span className="text-foreground">面板认证未启用（免认证）</span>
          )}
          <span className="ml-1 text-[12px] text-foreground-muted">
            通过 config.json 的 panel_password 配置
          </span>
        </div>
      </Section>

      {/* 外观主题 */}
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
        <p className="mt-2 text-[12px] text-foreground-muted">切换即时生效，偏好保存在浏览器本地。</p>
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
            管理面板 · 微信 AI 机器人「得 Talk-AI」v2.6 · FastAPI 后端
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof FolderCog; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <Icon size={16} className="text-primary-500" />
        {title}
      </div>
      {children}
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