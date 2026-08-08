// 人格设定 + 自定义规则 (仿 AstrBot): 读/写 cmd_config 关键字段, 自动备份
// 区段: 人格设定 (persona_pool/default_personality)
//        自定义规则 (content_safety.internal_keywords + provider_settings.prompt_prefix)
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, UserRound, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'
import { parseConfig, stringifyConfig } from '../lib/parseConfig'
import { toast } from '../app/toast'

export default function PersonaRulesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cmd-config'],
    queryFn: () => api.get<{ ok: boolean; config: string }>('/api/cmd-config'),
  })
  const [cfg, setCfg] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 提取/写入辅助
  const ps = (cfg?.['provider_settings'] as Record<string, unknown>) ?? {}
  const cs = (cfg?.['content_safety'] as Record<string, unknown>) ?? {}
  const internal = (cs['internal_keywords'] as Record<string, unknown>) ?? {}
  const extraKeywords: string[] = Array.isArray(internal['extra_keywords'])
    ? (internal['extra_keywords'] as string[])
    : []

  useEffect(() => {
    if (!data?.config) return
    try {
      setCfg(parseConfig(data.config))
    } catch {
      /* 非法 JSON 保持 null */
    }
  }, [data])

  function setPs(k: string, v: unknown) {
    setCfg((prev) => (prev ? { ...prev, provider_settings: { ...ps, [k]: v } } : prev))
  }
  function setCs(k: string, v: unknown) {
    setCfg((prev) => (prev ? { ...prev, content_safety: { ...cs, [k]: v } } : prev))
  }
  function setKeywords(list: string[]) {
    setCs('internal_keywords', { ...internal, extra_keywords: list })
  }

  async function save() {
    setSaving(true)
    try {
      const r = await api.post<{ ok: boolean; message: string }>('/api/cmd-config', {
        config: stringifyConfig(cfg ?? {}),
      })
      toast.success(r.message || '已保存')
      setSaved(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !cfg) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载配置…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">人格设定与自定义规则</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          编辑 AstrBot 人格风格与内容安全规则 · 保存自动备份
        </p>
      </div>

      {/* 人格设定 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <UserRound size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">人格设定</span>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground">默认人格</label>
            <input
              type="text"
              value={(ps['default_personality'] as string) ?? ''}
              onChange={(e) => setPs('default_personality', e.target.value)}
              placeholder="default"
              className="h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground">人格池 (每行一个)</label>
            <textarea
              value={(Array.isArray(ps['persona_pool']) ? (ps['persona_pool'] as string[]) : ['*']).join('\n')}
              onChange={(e) =>
                setPs(
                  'persona_pool',
                  e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                )
              }
              rows={3}
              className="w-full max-w-[360px] resize-none rounded-lg border border-border bg-surface-solid p-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            />
            <div className="mt-1 text-[11px] text-foreground-muted">填入 '*', 则自动在已有 persona 间切换。</div>
          </div>
        </div>
      </div>

      {/* 自定义规则 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShieldCheck size={15} className="text-success" />
          <span className="text-[14px] font-semibold text-foreground">自定义规则 (内容安全)</span>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCs('also_use_in_response', !cs['also_use_in_response'])}
              className={`relative h-6 w-11 rounded-full transition-colors ${cs['also_use_in_response'] ? 'bg-success' : 'bg-surface-solid'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  cs['also_use_in_response'] ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-[13px] text-foreground">过滤内容也用于回复 (also_use_in_response)</span>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground">关键词过滤 (每行一个)</label>
            <textarea
              value={extraKeywords.join('\n')}
              onChange={(e) =>
                setKeywords(
                  e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                )
              }
              rows={4}
              className="w-full max-w-[360px] resize-none rounded-lg border border-border bg-surface-solid p-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            />
            <div className="mt-1 text-[11px] text-foreground-muted">
              命中关键词的消息将被屏蔽 (不进入 AI 处理)。
            </div>
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
          {saved ? '已保存 ✓' : saving ? '保存中…' : '保存设置'}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        保存写入 cmd_config.json (自动备份), 重启 AstrBot 后生效。
      </div>
    </div>
  )
}