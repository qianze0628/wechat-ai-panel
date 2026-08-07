// 备份恢复: AstrBot 配置备份列表 + 一键恢复
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from '../app/toast'
import {
  Archive,
  ArchiveRestore,
  RefreshCw,
  TriangleAlert,
  Loader2,
  Clock,
  HardDrive,
} from 'lucide-react'
import { panelApi } from '../api'
import type { BackupItem } from '../types/api'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function BackupsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: panelApi.backups,
    refetchInterval: 10000,
  })

  const [confirm, setConfirm] = useState<BackupItem | null>(null)
  const [restoring, setRestoring] = useState(false)

  const backups: BackupItem[] = data?.backups ?? []

  async function doRestore(item: BackupItem) {
    setRestoring(true)
    setConfirm(null)
    try {
      const r = await panelApi.restore(item.path)
      if (r.ok === false) {
        toast.error(r.message || '恢复失败')
      } else {
        toast.success('配置已恢复并重启 AstrBot')
      }
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败')
    } finally {
      setRestoring(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-foreground-muted">
        <Loader2 className="mr-2 animate-spin" size={18} /> 正在加载…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      {/* 确认弹窗 */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirm(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-[400px] p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
              <TriangleAlert size={18} className="text-danger" />
              确认恢复配置
            </div>
            <p className="text-[13px] text-foreground-muted">
              将把 AstrBot 配置恢复为备份 <span className="mono font-semibold text-foreground">{confirm.time}</span>{' '}
              的内容 (当前配置会先备份)，并重启 AstrBot。
            </p>
            <div className="mt-2 rounded-lg bg-surface-solid p-3 text-[12px]">
              <div className="flex justify-between text-foreground-muted">
                <span>大小</span>
                <span className="mono text-foreground">{formatSize(confirm.size)}</span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5 text-foreground-muted">
                <span>路径</span>
                <span className="mono break-all text-[11px] text-foreground-muted/90">{confirm.path}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground-muted hover:bg-surface-solid"
              >
                取消
              </button>
              <button
                onClick={() => doRestore(confirm)}
                disabled={restoring}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {restoring ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                {restoring ? '恢复中…' : '确认恢复'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">备份恢复</h1>
          <p className="mt-0.5 text-[13px] text-foreground-muted">AstrBot 配置每次写入前的原始快照</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {/* 备份列表 */}
      {backups.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 p-10 text-center">
          <Archive size={36} className="text-foreground-muted/30" />
          <div className="text-[14px] font-semibold text-foreground">暂无备份</div>
          <div className="text-[12.5px] text-foreground-muted">
            执行一次「OneBot 一键配置」或任何 AstrBot 配置变更后，会自动在此创建原始快照。
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {backups.map((b) => (
            <motion.div
              key={b.path}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="glass-panel flex items-center gap-3 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-500">
                <ArchiveRestore size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                  <Clock size={13} className="text-foreground-muted" />
                  备份时间 {b.time}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[12px] text-foreground-muted">
                  <span className="flex items-center gap-1">
                    <HardDrive size={11} /> {formatSize(b.size)}
                  </span>
                  <span className="mono max-w-[360px] truncate" title={b.path}>
                    {b.path}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setConfirm(b)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] text-danger transition-colors hover:bg-danger/10"
              >
                <ArchiveRestore size={14} /> 恢复
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* 说明 */}
      <div className="flex items-start gap-2 rounded-lg bg-surface p-4 text-[12.5px] text-foreground-muted">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
        恢复操作会先用当前配置创建新备份，再原子写回所选快照，最后重启 AstrBot。恢复前建议先登录 AstrBot WebUI 确认当前状态。
      </div>
    </div>
  )
}