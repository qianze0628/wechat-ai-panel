// 成功结果弹窗: 弹簧弹入的勾选图标 + 内容 + 关闭按钮 (用于安装完成等)
import { motion } from 'framer-motion'
import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import Modal from './Modal'

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}

export default function SuccessModal({ open, onClose, title = '操作成功', children }: SuccessModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <motion.span
            initial={{ scale: 0, rotate: -60 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 0.05 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15"
          >
            <CircleCheck size={16} className="text-success" />
          </motion.span>
          {title}
        </span>
      }
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          知道了
        </button>
      }
    >
      {children}
    </Modal>
  )
}