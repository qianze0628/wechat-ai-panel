// 人格设定 + 自定义规则 (仿 AstrBot): 读/写 cmd_config 关键字段, 自动备份
// 区段: 人格设定 (persona_pool/default_personality)
//        自定义规则 (content_safety.internal_keywords + provider_settings.prompt_prefix)
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, UserRound, ShieldCheck, Plus } from 'lucide-react'
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
  // 人格池列表
  const personaList: string[] = Array.isArray(ps['persona_pool'])
    ? (ps['persona_pool'] as string[]).map((x) => String(x))
    : ['*']

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
          {/* 默认人格选择 (下拉, 从池中选) */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-foreground">默认人格</div>
              <div className="mt-0.5 text-[12px] text-foreground-muted">对话默认使用的人格</div>
            </div>
            <select
              value={(ps['default_personality'] as string) ?? 'default'}
              onChange={(e) => setPs('default_personality', e.target.value)}
              className="h-9 w-full max-w-[240px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
            >
              {personaList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 人格池 (卡片列表) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">人格池 ({personaList.length})</span>
              <button
                onClick={() => setPs('persona_pool', [...personaList, `persona_${personaList.length + 1}`])}
                className="flex items-center gap-1 rounded-lg border border-primary-500/40 px-2.5 py-1 text-[12px] font-semibold text-primary-500 hover:bg-primary-500/10"
              >
                <Plus size={12} /> 新增人格
              </button>
            </div>
            <div className="space-y-1.5">
              {personaList.map((name, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-surface-solid/50 px-3 py-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${name === (ps['default_personality'] as string) ? 'bg-primary-500' : 'bg-foreground-muted/30'}`} />
                  <span className="flex-1 truncate font-mono text-[13px] text-foreground">{name}</span>
                  {name === (ps['default_personality'] as string) && (
                    <span className="shrink-0 rounded-md bg-primary-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-500">默认</span>
                  )}
                  <button
                    onClick={() => setPs('default_personality', name)}
                    title="设为此人格"
                    className="shrink-0 rounded-lg px-2 py-1 text-[11.5px] text-foreground-muted hover:bg-primary-500/10 hover:text-primary-500"
                  >
                    设为默认
                  </button>
                  <button
                    onClick={() => {
                      const next = personaList.filter((_, idx) => idx !== i)
                      setPs('persona_pool', next.length ? next : ['*'])
                      // 若删的是默认, 回退到第一个
                      if ((ps['default_personality'] as string) === name && next.length) {
                        setPs('default_personality', next[0])
                      }
                    }}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11.5px] text-foreground-muted hover:bg-danger/10 hover:text-danger"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] text-foreground-muted">人格池含 '*' 时自动在已有人格间切换。</div>
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