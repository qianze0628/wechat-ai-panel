// AstrBot 完整配置页 (仿 AstrBot 设置): 读/写 cmd_config 的 provider_settings + 顶层字段
// 分组: Agent执行 / 模型 / 人格 / 知识库 / 网页搜索 / 电脑能力 / 主动型 / 上下文管理 / 其他 / 基本 / 白名单 / 速率限制 / 内容安全 / 分段回复 / 群聊感知
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, Settings2, Bot, Brain, BookOpen, Globe, Monitor, AlarmClock, MemoryStick, SlidersHorizontal, UserRound, Users, ShieldCheck, Timer, MessageSquare, Gauge } from 'lucide-react'
import { api } from '../api/client'
import { parseConfig } from '../lib/parseConfig'
import { toast } from '../app/toast'

type Field = { key: string; label: string; type?: 'text' | 'number' | 'bool' | 'select' | 'textarea'; options?: string[]; hint?: string; path?: 'top' | 'ps' | 'platform' | 'cs' | 'seg' | 'ratelimit' }
type Section = { id: string; title: string; icon: React.ReactNode; fields: Field[] }

const SECTIONS: Section[] = [
  {
    id: 'agent', title: 'Agent 执行', icon: <Bot size={15} />,
    fields: [
      { key: 'agent_runner_type', label: '执行器', type: 'select', options: ['local', 'dify', 'coze', 'dashscope', 'deerflow'], hint: '内置 Agent 执行器 (可使用知识库/人格/工具)' },
      { key: 'tool_call_timeout', label: '工具调用超时 (秒)', type: 'number' },
      { key: 'tool_schema_mode', label: '工具调用模式', type: 'select', options: ['full', 'skills-like'] },
    ],
  },
  {
    id: 'model', title: '模型', icon: <Brain size={15} />,
    fields: [
      { key: 'default_chat_model', label: '默认对话模型', hint: '留空使用第一个模型' },
      { key: 'default_image_caption_provider_id', label: '默认图片转述模型' },
      { key: 'request_max_retries', label: '请求最大重试次数', type: 'number' },
      { key: 'enable_stt', label: '启用语音转文本', type: 'bool' },
      { key: 'enable_tts', label: '启用文本转语音', type: 'bool' },
      { key: 'image_caption_prompt', label: '图片转述提示词', type: 'textarea' },
    ],
  },
  {
    id: 'persona', title: '人格', icon: <UserRound size={15} />,
    fields: [
      { key: 'default_personality', label: '默认采用的人格' },
      { key: 'persona_pool', label: '人格池', hint: '逗号分隔多个' },
    ],
  },
  {
    id: 'kb', title: '知识库', icon: <BookOpen size={15} />,
    fields: [
      { key: 'kb_names', label: '知识库列表', hint: '逗号分隔, 支持多选' },
      { key: 'kb_fusion_top_k', label: '融合检索结果数', type: 'number' },
      { key: 'kb_final_top_k', label: '最终返回结果数', type: 'number' },
      { key: 'kb_agentic_mode', label: 'Agentic 知识库检索', type: 'bool', path: 'top' },
    ],
  },
  {
    id: 'websearch', title: '网页搜索', icon: <Globe size={15} />,
    fields: [
      { key: 'enable_web_search', label: '启用网页搜索', type: 'bool' },
      { key: 'websearch_provider', label: '网页搜索提供商', type: 'select', options: ['exa', 'bocha', 'tavily', 'brave', 'firecrawl'] },
      { key: 'websearch_exa_key', label: 'Exa API Key', hint: '可多个逗号分隔' },
      { key: 'show_source', label: '显示来源引用', type: 'bool' },
    ],
  },
  {
    id: 'computer', title: '电脑能力', icon: <Monitor size={15} />,
    fields: [
      { key: 'computer_use_runtime', label: '运行环境', type: 'select', options: ['local', 'sandbox', 'none'] },
      { key: 'computer_use_require_admin', label: '需要管理员权限', type: 'bool' },
    ],
  },
  {
    id: 'proactive', title: '主动型能力', icon: <AlarmClock size={15} />,
    fields: [
      { key: 'proactive_capability', label: '启用主动型 Agent', type: 'bool', hint: '可告诉 AstrBot 未来时间要做的事' },
    ],
  },
  {
    id: 'context', title: '上下文管理', icon: <MemoryStick size={15} />,
    fields: [
      { key: 'max_context_length', label: '压缩前最多保留对话轮数', type: 'number', hint: '-1 不限制' },
      { key: 'dequeue_context_length', label: '轮次超限时一次丢弃轮数', type: 'number' },
      { key: 'context_limit_reached_strategy', label: '历史超限处理方式', type: 'select', options: ['llm_compress', 'drop_oldest'] },
      { key: 'llm_compress_keep_recent_ratio', label: '压缩时保留最近比例', type: 'number' },
      { key: 'llm_compress_provider_id', label: '用于压缩的模型提供商 ID' },
    ],
  },
  {
    id: 'other', title: '其他配置', icon: <SlidersHorizontal size={15} />,
    fields: [
      { key: 'display_reasoning_text', label: '显示思考内容', type: 'bool' },
      { key: 'streaming_response', label: '流式输出', type: 'bool' },
      { key: 'unsupported_streaming_strategy', label: '不支持流式回复的平台', type: 'select', options: ['turn_off', 'real_time', 'buffered'] },
      { key: 'llm_safety_mode', label: '健康模式', type: 'bool' },
      { key: 'enable_user_id', label: '用户识别', type: 'bool' },
      { key: 'group_name_display', label: '显示群名称', type: 'bool' },
      { key: 'datetime_system_prompt', label: '现实世界时间感知', type: 'bool' },
      { key: 'prompt_prefix', label: '用户提示词', hint: '{{prompt}} 为用户输入占位符' },
      { key: 'image_compress_enabled', label: '启用图片压缩', type: 'bool' },
    ],
  },
  {
    id: 'basic', title: '基本', icon: <Settings2 size={15} />,
    fields: [
      { key: 'admins_id', label: '管理员 ID', path: 'top', hint: '逗号分隔' },
      { key: 'unique_session', label: '隔离会话', type: 'bool', path: 'platform', hint: '群成员上下文独立' },
      { key: 'wake_prefix', label: '唤醒词', path: 'top', hint: '逗号分隔, 默认 /' },
      { key: 'friend_message_needs_wake_prefix', label: '私聊消息需要唤醒词', type: 'bool', path: 'platform' },
      { key: 'reply_prefix', label: '回复时的文本前缀', path: 'platform' },
      { key: 'reply_with_mention', label: '回复时 @ 发送人', type: 'bool', path: 'platform' },
      { key: 'reply_with_quote', label: '回复时引用发送人消息', type: 'bool', path: 'platform' },
      { key: 'forward_threshold', label: '转发消息的字数阈值', type: 'number', path: 'platform' },
      { key: 'ignore_bot_self_message', label: '是否忽略机器人自身的消息', type: 'bool', path: 'platform' },
      { key: 'ignore_at_all', label: '是否忽略 @ 全体成员事件', type: 'bool', path: 'platform' },
    ],
  },
  {
    id: 'whitelist', title: '白名单', icon: <Users size={15} />,
    fields: [
      { key: 'enable_id_white_list', label: '启用白名单', type: 'bool', path: 'platform' },
      { key: 'id_whitelist', label: '白名单 ID 列表', path: 'platform', hint: '逗号分隔; 空列表=不启用 (所有放行)' },
      { key: 'id_whitelist_log', label: '白名单输出日志', type: 'bool', path: 'platform' },
      { key: 'wl_ignore_admin_on_group', label: '管理员群组消息无视白名单', type: 'bool', path: 'platform' },
      { key: 'wl_ignore_admin_on_friend', label: '管理员私聊消息无视白名单', type: 'bool', path: 'platform' },
    ],
  },
  {
    id: 'ratelimit', title: '速率限制', icon: <Timer size={15} />,
    fields: [
      { key: 'rate_limit_time', label: '消息速率限制时间 (秒)', type: 'number', path: 'ratelimit' },
      { key: 'rate_limit_count', label: '消息速率限制计数', type: 'number', path: 'ratelimit' },
      { key: 'rate_limit_strategy', label: '速率限制策略', type: 'select', options: ['stall', 'drop'], path: 'ratelimit' },
    ],
  },
  {
    id: 'safety', title: '内容安全', icon: <ShieldCheck size={15} />,
    fields: [
      { key: 'also_use_in_response', label: '同时检查模型的响应内容', type: 'bool', path: 'cs' },
      { key: 'cs_keywords', label: '额外关键词 (正则)', type: 'textarea', path: 'cs' },
    ],
  },
  {
    id: 'segment', title: '分段回复', icon: <MessageSquare size={15} />,
    fields: [
      { key: 'segment_enable', label: '启用分段回复', type: 'bool', path: 'seg' },
      { key: 'segment_only_llm', label: '仅对 LLM 结果分段', type: 'bool', path: 'seg' },
      { key: 'segment_interval_method', label: '间隔方法', type: 'select', options: ['random', 'log'], path: 'seg' },
      { key: 'segment_interval', label: '随机间隔时间 (min,max)', path: 'seg' },
      { key: 'segment_words_threshold', label: '分段回复字数阈值', type: 'number', path: 'seg' },
      { key: 'segment_split_mode', label: '分段模式', type: 'select', options: ['regex', 'words'], path: 'seg' },
      { key: 'segment_regex', label: '分段正则表达式', path: 'seg' },
    ],
  },
  {
    id: 'group', title: '群聊上下文感知', icon: <Gauge size={15} />,
    fields: [
      { key: 'enable_group_chat_context', label: '群聊消息记录注入上下文', type: 'bool' },
      { key: 'group_chat_max_messages', label: '注入上下文最大消息数量', type: 'number' },
      { key: 'group_chat_image_caption_provider_id', label: '群聊图片转述模型' },
      { key: 'persist_group_messages', label: '持久化群聊消息记录', type: 'bool' },
      { key: 'persist_max_messages', label: '持久化最大消息数量', type: 'number' },
    ],
  },
]

export default function AstrbotConfigPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cmd-config'],
    queryFn: () => api.get<{ ok: boolean; config: string }>('/api/cmd-config'),
  })
  const [cfg, setCfg] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.config) setCfg(parseConfig(data.config))
  }, [data])

  const ps = (cfg['provider_settings'] as Record<string, any>) ?? {}
  const plat = (cfg['platform_settings'] as Record<string, any>) ?? {}

  const cs = (cfg['content_safety'] as Record<string, any>) ?? {}
  const seg = ((cfg['platform_settings'] as Record<string, any>)?.segmented_reply as Record<string, any>) ?? {}
  const rl = ((cfg['platform_settings'] as Record<string, any>)?.rate_limit as Record<string, any>) ?? {}

  function getVal(f: Field): any {
    if (f.path === 'top') return cfg[f.key]
    if (f.path === 'platform') return plat[f.key]
    if (f.path === 'cs') return f.key === 'cs_keywords' ? ((cs['internal_keywords'] as any)?.extra_keywords ?? []).join(', ') : cs[f.key]
    if (f.path === 'seg') return seg[f.key.replace('segment_', '')]
    if (f.path === 'ratelimit') return rl[f.key.replace('rate_limit_', '')]
    return ps[f.key]
  }
  function setVal(f: Field, v: any) {
    setCfg((prev) => {
      const next = { ...prev }
      if (f.path === 'top') next[f.key] = v
      else if (f.path === 'platform') next['platform_settings'] = { ...(next['platform_settings'] as any), [f.key]: v }
      else if (f.path === 'cs') {
        if (f.key === 'cs_keywords') {
          const curCs = (next['content_safety'] as any) ?? {}
          next['content_safety'] = { ...curCs, internal_keywords: { ...((curCs.internal_keywords as any) ?? {}), extra_keywords: String(v).split(',').map((s: string) => s.trim()).filter(Boolean) } }
        } else {
          next['content_safety'] = { ...((next['content_safety'] as any) ?? {}), [f.key]: v }
        }
      }
      else if (f.path === 'seg') {
        const curPlat = (next['platform_settings'] as any) ?? {}
        const curSeg = curPlat.segmented_reply ?? {}
        const key = f.key.replace('segment_', '')
        next['platform_settings'] = { ...curPlat, segmented_reply: { ...curSeg, [key]: v } }
      }
      else if (f.path === 'ratelimit') {
        const curPlat = (next['platform_settings'] as any) ?? {}
        next['platform_settings'] = { ...curPlat, rate_limit: { ...(curPlat.rate_limit ?? {}), [f.key.replace('rate_limit_', '')]: v } }
      }
      else next['provider_settings'] = { ...(next['provider_settings'] as any), [f.key]: v }
      return next
    })
  }
  function norm(f: Field, v: any): any {
    if (f.type === 'number') return v === '' ? undefined : Number(v)
    if (f.type === 'bool') return !!v
    return v
  }

  async function save() {
    setSaving(true)
    try {
      const r = await api.post<{ ok: boolean; message: string }>('/api/cmd-config', { config: JSON.stringify(cfg) })
      toast.success(r.message || '已保存')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !data) {
    return <div className="flex h-full items-center justify-center text-foreground-muted"><Loader2 className="mr-2 animate-spin" size={18} /> 加载配置…</div>
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Settings2 size={20} className="text-primary-500" /> AstrBot 配置
          </h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">
            完整设置 (Agent/模型/人格/知识库/搜索/电脑/主动/上下文/其他) · 保存自动备份, 重启 AstrBot 生效
          </p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存配置
        </button>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.id} className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="text-primary-500">{sec.icon}</span>
            <span className="text-[14px] font-semibold text-foreground">{sec.title}</span>
          </div>
          <div className="space-y-3.5 p-4">
            {sec.fields.map((f) => {
              const val = getVal(f)
              return (
                <div key={f.key} className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">{f.label}</div>
                    {f.hint && <div className="mt-0.5 text-[11.5px] text-foreground-muted/70">{f.hint}</div>}
                  </div>
                  <div className="w-[260px] shrink-0">
                    {f.type === 'bool' ? (
                      <button onClick={() => setVal(f, !val)} className={`relative h-6 w-11 rounded-full transition-colors ${val ? 'bg-primary-500' : 'bg-surface-solid'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${val ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    ) : f.type === 'select' ? (
                      <select value={String(val ?? '')} onChange={(e) => setVal(f, e.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground">
                        {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={String(val ?? '')} onChange={(e) => setVal(f, e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-border bg-surface-solid px-2.5 py-1.5 text-[13px] text-foreground" />
                    ) : f.type === 'number' ? (
                      <input type="number" value={val === undefined || val === '' ? '' : Number(val)} onChange={(e) => setVal(f, norm(f, e.target.value))} className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground" />
                    ) : (
                      <input type="text" value={String(val ?? '')} onChange={(e) => setVal(f, e.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}