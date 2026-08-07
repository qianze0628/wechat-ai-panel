// 危险操作确认弹窗 (基于 Modal): 红色强调 + 骨架屏式按钮 loading
import { motion } from 'framer-motion'
import { Loader2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import Modal from './Modal'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  danger?: boolean
  busy?: boolean
}

export default function ConfirmModal({
  open,
  onClose,
  title = '确认操作',
  children,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  danger = true,
  busy,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <TriangleAlert size={18} className={danger ? 'text-danger' : 'text-primary-500'} />
          {title}
        </span>
      }
      footer={
        <>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-[13px] text-foreground-muted transition-colors hover:bg-surface-solid disabled:opacity-50"
          >
            {cancelText}
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              danger ? 'bg-danger' : 'bg-primary-500'
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmText}
          </motion.button>
        </>
      }
    >
      {children}
    </Modal>
  )
}