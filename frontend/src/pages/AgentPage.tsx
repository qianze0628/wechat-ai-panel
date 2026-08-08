// 子代理编排 (仿 AstrBot): agent_runner_type / 各 runner provider / 步数/超时
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, Workflow, Bot } from 'lucide-react'
import { parseConfig, stringifyConfig } from '../lib/parseConfig'
import { api } from '../api/client'
import { toast } from '../app/toast'

export default function AgentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cmd-config'],
    queryFn: () => api.get<{ ok: boolean; config: string }>('/api/cmd-config'),
  })
  const [cfg, setCfg] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data?.config) return
    try {
      setCfg(parseConfig(data.config))
    } catch { /* ignore */ }
  }, [data])

  const ps = (cfg?.['provider_settings'] as Record<string, unknown>) ?? {}

  function setPs(k: string, v: unknown) {
    setCfg((prev) => (prev ? { ...prev, provider_settings: { ...ps, [k]: v } } : prev))
  }

  async function save() {
    setSaving(true)
    try {
      const r = await api.post<{ ok: boolean; message: string }>('/api/cmd-config', {
        config: stringifyConfig(cfg ?? {}),
      })
      toast.success(r.message || '已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !cfg) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载…
      </div>
    )
  }

  const runnerTypes = ['local', 'dify', 'coze', 'dashscope', 'deerflow']
  const providerKeys: [string, string][] = [
    ['dify_agent_runner_provider_id', 'Dify'],
    ['coze_agent_runner_provider_id', 'Coze'],
    ['dashscope_agent_runner_provider_id', 'DashScope'],
    ['deerflow_agent_runner_provider_id', 'DeerFlow'],
  ]

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <Workflow size={20} className="text-primary-500" /> 子代理编排
        </h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          AstrBot Agent 运行配置 · 保存自动备份, 重启 AstrBot 生效
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Bot size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">Agent 运行</span>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-foreground">运行器类型</div>
              <div className="mt-0.5 text-[12px] text-foreground-muted">Agent 后端 (local=内置, 其他=外部平台)</div>
            </div>
            <select
              value={String(ps['agent_runner_type'] ?? 'local')}
              onChange={(e) => setPs('agent_runner_type', e.target.value)}
              className="h-9 w-full max-w-[240px] rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            >
              {runnerTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {providerKeys.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-foreground">{label} Runner Provider</div>
                <div className="mt-0.5 text-[12px] text-foreground-muted">使用哪个模型提供商 (provider id)</div>
              </div>
              <input
                type="text"
                value={String(ps[k] ?? '')}
                onChange={(e) => setPs(k, e.target.value)}
                placeholder="provider id, 如 deepseek/deepseek-chat"
                className="h-9 w-full max-w-[240px] rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">最大步数 (max_agent_step)</label>
              <input
                type="number"
                value={Number(ps['max_agent_step'] ?? 30)}
                onChange={(e) => setPs('max_agent_step', Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">工具调用超时 (秒)</label>
              <input
                type="number"
                value={Number(ps['tool_call_timeout'] ?? 120)}
                onChange={(e) => setPs('tool_call_timeout', Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-foreground">工具 Schema 模式</div>
              <div className="mt-0.5 text-[12px] text-foreground-muted">full / strict / none</div>
            </div>
            <select
              value={String(ps['tool_schema_mode'] ?? 'full')}
              onChange={(e) => setPs('tool_schema_mode', e.target.value)}
              className="h-9 w-full max-w-[240px] rounded-lg border border-border bg-surface-solid px-3 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            >
              {['full', 'strict', 'none'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          保存配置
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        修改后重启 AstrBot 生效。配置写入 cmd_config.json 的 provider_settings (自动备份)。
      </div>
    </div>
  )
}