// 插件详情: 元数据 + 连通状态 + 配置表单 (由 _conf_schema.json 自动渲染) + 启禁用
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Power,
  ExternalLink,
  Settings2,
  Info,
} from 'lucide-react'
import { pluginCenterApi, type AstrPlugin } from '../api'
import { toast } from '../app/toast'

// ---- 类型定义 (对齐 AstrBot _conf_schema.json) ----
type SchemaItem = {
  description?: string
  type?: string
  default?: unknown
  hint?: string
  options?: (string | { label?: string; value?: string })[]
  items?: { type?: string; description?: string }
}
type SchemaSection = {
  description?: string
  type?: string
  hint?: string
  items?: Record<string, SchemaItem>
}

function defaultValue(item: SchemaItem): unknown {
  if (item.default !== undefined) return item.default
  switch (item.type) {
    case 'bool':
      return false
    case 'int':
    case 'float':
      return 0
    case 'list':
      return []
    default:
      return ''
  }
}

export default function PluginDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pluginId = id ? decodeURIComponent(id) : ''

  const { data: listData } = useQuery({
    queryKey: ['plugin-center'],
    queryFn: pluginCenterApi.list,
  })
  const plugin: AstrPlugin | undefined = (listData?.plugins ?? []).find((p) => p.id === pluginId)

  const { data: confData, isLoading: confLoading } = useQuery({
    queryKey: ['plugin-config', pluginId],
    queryFn: () => pluginCenterApi.config(pluginId),
    enabled: !!pluginId,
  })

  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // 初始化: schema 默认值 + 已有配置合并
  useEffect(() => {
    if (!confData) return
    const merged: Record<string, unknown> = {}
    const schema = confData.schema as Record<string, SchemaSection> | undefined
    if (schema) {
      for (const section of Object.values(schema)) {
        for (const [k, item] of Object.entries(section?.items ?? {})) {
          merged[k] = defaultValue(item)
        }
      }
    }
    // 已有配置覆盖默认
    Object.assign(merged, confData.config ?? {})
    setConfig(merged)
  }, [confData])

  const schema = confData?.schema as Record<string, SchemaSection> | undefined
  const schemaSections = useMemo(() => Object.entries(schema ?? {}), [schema])
  // schema 声明过的所有键 (保存时只保留这些)
  const schemaKeys = useMemo(() => {
    const set = new Set<string>()
    for (const section of schemaSections) {
      for (const k of Object.keys(section[1]?.items ?? {})) set.add(k)
    }
    return set
  }, [schemaSections])

  if (confLoading || !plugin) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载插件…
      </div>
    )
  }

  async function saveConfig() {
    setSaving(true)
    try {
      // 清掉空串数字键 (避免 config.json 出现 "key": "")
      const cleaned: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(config)) {
        if (v !== '') cleaned[k] = v
      }
      const r = await pluginCenterApi.saveConfig(pluginId, cleaned)
      toast.success(r.message || '配置已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function toggle() {
    if (!plugin) return
    try {
      const r = await pluginCenterApi.toggle(pluginId, !plugin.enabled)
      toast.success(r.message || '操作成功')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  // 设置值: 移除 schema 未声明的键 (schema 变更后旧键不残留)
  function setValue(key: string, v: unknown) {
    setConfig((prev) => {
      const next = { ...prev, [key]: v }
      for (const k of Object.keys(next)) {
        if (!schemaKeys.has(k)) delete next[k]
      }
      return next
    })
  }

  function renderField(key: string, item: SchemaItem) {
    const type = item.type ?? 'string'
    const value = config[key]

    // bool → 开关
    if (type === 'bool') {
      return (
        <button
          onClick={() => setValue(key, !value)}
          className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-surface-solid'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              value ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      )
    }
    // options → 下拉
    if (item.options && item.options.length > 0) {
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => setValue(key, e.target.value)}
          className="h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
        >
          {item.options.map((opt, i) => {
            const label = typeof opt === 'string' ? opt : (opt.label ?? opt.value ?? '')
            const val = typeof opt === 'string' ? opt : (opt.value ?? '')
            return (
              <option key={i} value={val}>
                {label}
              </option>
            )
          })}
        </select>
      )
    }
    // int/float → 数字 (空输入保持空, 保存时移除该键而非存 '')
    if (type === 'int' || type === 'float') {
      return (
        <input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => {
            if (e.target.value === '') {
              setValue(key, '') // 保存时过滤掉
            } else {
              setValue(key, Number(e.target.value))
            }
          }}
          className="h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
        />
      )
    }
    // list → 简单逗号分隔
    if (type === 'list') {
      const listVal = Array.isArray(value) ? value.join(', ') : String(value ?? '')
      return (
        <input
          type="text"
          value={listVal}
          onChange={(e) => setValue(key, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="多个值用逗号分隔"
          className="h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
        />
      )
    }
    // 默认 text
    return (
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => setValue(key, e.target.value)}
        className="h-9 w-full max-w-[360px] rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
      />
    )
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      {/* 返回 + 标题 */}
      <div className="flex items-center gap-3">
        <Link
          to="/plugins"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-solid text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            {plugin.display_name || plugin.name}
            <span className="rounded-md bg-surface-solid px-1.5 py-0.5 text-[11px] font-medium text-foreground-muted">
              v{plugin.version}
            </span>
          </h1>
          <p className="mt-0.5 text-[12.5px] text-foreground-muted">
            {plugin.author && `by ${plugin.author}`}
            {plugin.repo && (
              <a
                href={plugin.repo}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-primary-500 hover:underline"
              >
                <ExternalLink size={11} /> 仓库
              </a>
            )}
          </p>
        </div>
        {/* 操作 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              plugin.enabled
                ? 'bg-surface-solid text-foreground-muted hover:text-danger'
                : 'bg-success/15 text-success hover:bg-success/25'
            }`}
          >
            <Power size={13} /> {plugin.enabled ? '已启用' : '已禁用'}
          </button>
        </div>
      </div>

      {/* 描述 */}
      {plugin.desc && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-[13px] leading-relaxed text-foreground-muted">
          {plugin.desc}
        </div>
      )}

      {/* 连通状态 */}
      <div
        className={`flex items-start gap-2.5 rounded-2xl border p-4 ${
          plugin.compatible
            ? 'border-success/30 bg-success/5'
            : 'border-warning/30 bg-warning/5'
        }`}
      >
        {plugin.compatible ? (
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />
        ) : (
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-warning" />
        )}
        <div>
          <div className="text-[13px] font-semibold text-foreground">
            {plugin.compatible ? '适配微信桥接 (OneBot)' : '可能不适配微信桥接'}
          </div>
          <div className="mt-0.5 text-[12px] text-foreground-muted">
            {plugin.compatible_note || '该插件声明支持 OneBot 协议, 可与 wechat-bot 协同工作。'}
          </div>
        </div>
      </div>

      {/* 配置 */}
      {schemaSections.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Settings2 size={15} className="text-primary-500" />
            <span className="text-[14px] font-semibold text-foreground">配置</span>
          </div>
          <div className="divide-y divide-border/60">
            {schemaSections.map(([sectionName, section]) => (
              <div key={sectionName} className="p-4">
                <div className="mb-1 text-[13px] font-semibold text-foreground">
                  {section.description || sectionName}
                </div>
                {section.hint && (
                  <div className="mb-3 flex items-start gap-1.5 text-[12px] text-foreground-muted/80">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>{section.hint}</span>
                  </div>
                )}
                <div className="space-y-3.5">
                  {Object.entries(section.items ?? {}).map(([key, item]) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-foreground">
                          {item.description || key}
                        </div>
                        {item.hint && (
                          <div className="mt-0.5 text-[11.5px] leading-snug text-foreground-muted/70">
                            {item.hint}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">{renderField(key, item)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* 保存 */}
          <div className="flex justify-end border-t border-border px-4 py-3">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? '保存中…' : '保存配置'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-4 text-[12.5px] text-foreground-muted">
          该插件没有可配置项 (未提供配置 schema)。
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
        修改配置或切换启用状态后，需重启 AstrBot 生效。
      </div>
    </div>
  )
}