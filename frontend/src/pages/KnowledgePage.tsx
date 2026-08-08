// 知识库 (仿 AstrBot): 集合配置 + 文件清单 (kb.db 同源, 不写库只管配置)
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, Library, Database, FolderOpen } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

interface KBFile {
  name: string
  size: number
  dir: boolean
}

const kbApi = {
  get: () =>
    api.get<{ ok: boolean; config: Record<string, unknown>; files: KBFile[] }>('/api/kb'),
  save: (config: Record<string, unknown>) => api.post<{ ok: boolean; message: string }>('/api/kb', config),
}

export default function KnowledgePage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['kb'], queryFn: kbApi.get })
  const [names, setNames] = useState<string[]>([])
  const [defaultKb, setDefaultKb] = useState('')
  const [fusionTopK, setFusionTopK] = useState(20)
  const [finalTopK, setFinalTopK] = useState(5)
  const [agentic, setAgentic] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data?.config) return
    const c = data.config
    setNames(Array.isArray(c.kb_names) ? (c.kb_names as string[]) : [])
    setDefaultKb(String(c.default_kb_collection ?? ''))
    setFusionTopK(Number(c.kb_fusion_top_k ?? 20))
    setFinalTopK(Number(c.kb_final_top_k ?? 5))
    setAgentic(Boolean(c.kb_agentic_mode))
  }, [data])

  async function save() {
    setSaving(true)
    try {
      const r = await kbApi.save({
        kb_names: names,
        default_kb_collection: defaultKb,
        kb_fusion_top_k: fusionTopK,
        kb_final_top_k: finalTopK,
        kb_agentic_mode: agentic,
      })
      toast.success(r.message || '已保存')
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 加载知识库…
      </div>
    )
  }

  const totalSize = data.files.reduce((s, f) => s + (f.dir ? 0 : f.size), 0)
  const totalSizeMB: string = (totalSize / 1024 / 1024).toFixed(1)

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <Library size={20} className="text-primary-500" /> 知识库
        </h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          AstrBot 知识库 (kb.db) · 配置集合与检索参数
        </p>
      </div>

      {/* 配置区 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Database size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">知识库配置</span>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-foreground">知识库集合 (每行一个)</label>
            <textarea
              value={names.join('\n')}
              onChange={(e) => setNames(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
              rows={3}
              className="w-full max-w-[360px] resize-none rounded-lg border border-border bg-surface-solid p-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              placeholder="如: 我的知识库"
            />
            <div className="mt-1 text-[11px] text-foreground-muted">
              在 AstrBot WebUI 创建集合后在此登记; 多个集合换行。
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">默认集合</label>
              <input
                type="text"
                value={defaultKb}
                onChange={(e) => setDefaultKb(e.target.value)}
                placeholder="默认使用的集合名"
                className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">Agentic 模式</label>
              <button
                onClick={() => setAgentic(!agentic)}
                className={`relative h-6 w-11 rounded-full transition-colors ${agentic ? 'bg-primary-500' : 'bg-surface-solid'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    agentic ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">融合召回 TopK</label>
              <input
                type="number"
                value={fusionTopK}
                onChange={(e) => setFusionTopK(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground">最终 TopK</label>
              <input
                type="number"
                value={finalTopK}
                onChange={(e) => setFinalTopK(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-border bg-surface-solid px-2.5 text-[13px] text-foreground focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 文件区 */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FolderOpen size={15} className="text-primary-500" />
          <span className="text-[14px] font-semibold text-foreground">知识库文件</span>
          <span className="ml-auto text-[11.5px] text-foreground-muted">
            {data.files.length} 项 · {totalSizeMB} MB
          </span>
        </div>
        <div className="divide-y divide-border/60">
          {data.files.length === 0 && (
            <div className="p-4 text-[12.5px] text-foreground-muted">
              暂无文件。请在 AstrBot WebUI 上传文档以创建集合。
            </div>
          )}
          {data.files.map((f) => (
            <div key={f.name} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-foreground-muted">{f.dir ? '📁' : '📄'}</span>
              <span className="flex-1 truncate text-[13px] text-foreground">{f.name}</span>
              <span className="text-[11.5px] text-foreground-muted">
                {f.dir ? '目录' : `${(f.size / 1024).toFixed(1)} KB`}
              </span>
            </div>
          ))}
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
        知识库实际内容由 AstrBot 管理 (data/knowledge_base/kb.db)。面板负责配置集合名与检索参数。
      </div>
    </div>
  )
}