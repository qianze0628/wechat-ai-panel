// 配置文件 (仿 AstrBot 配置文件页): 查看/编辑 AstrBot cmd_config.json, 自动备份
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save, FileCode2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../app/toast'

export default function ConfigFilePage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cmd-config'],
    queryFn: () => api.get<{ ok: boolean; config: string; path: string }>('/api/cmd-config'),
  })
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">配置文件</h1>
        <p className="mt-0.5 text-[13px] text-foreground-muted">
          AstrBot 主配置 (cmd_config.json) · 保存时自动备份
          {data?.path && <span className="ml-2 opacity-70">{data.path}</span>}
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-foreground-muted">
          <Loader2 className="mr-2 animate-spin" size={18} /> 加载配置…
        </div>
      ) : (
        <>
          {/* 编辑器 */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <FileCode2 size={15} className="text-primary-500" /> cmd_config.json
              </span>
              {saved && (
                <span className="flex items-center gap-1 text-[12px] text-success">
                  <CheckCircle2 size={13} /> 已保存
                </span>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setSaved(false)
              }}
              spellCheck={false}
              className="h-[420px] w-full resize-none bg-surface-solid p-4 font-mono text-[12.5px] leading-relaxed text-foreground focus:outline-none"
              placeholder={data?.config ?? '加载中…'}
            />
          </div>

          {/* 保存 + 刷新 */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground-muted hover:bg-surface-solid"
            >
              <RefreshCw size={13} /> 重新加载
            </button>
            <button
              onClick={async () => {
                setSaving(true)
                try {
                  // 校验 JSON
                  let parsed: unknown
                  try {
                    parsed = JSON.parse(text)
                  } catch {
                    toast.error('配置不是合法 JSON, 请检查格式')
                    setSaving(false)
                    return
                  }
                  const r = await api.post<{ ok: boolean; message: string }>('/api/cmd-config', {
                    config: JSON.stringify(parsed),
                  })
                  toast.success(r.message || '配置已保存 (重启 AstrBot 生效)')
                  setSaved(true)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : '保存失败')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存配置
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 text-[12px] text-foreground-muted">
            修改配置后需重启 AstrBot 生效。保存前会先备份当前配置到 data/backups/。
          </div>
        </>
      )}
    </div>
  )
}