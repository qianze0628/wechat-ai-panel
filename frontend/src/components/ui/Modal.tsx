// 通用 Modal: napcat 风格弹窗
// - spring 弹簧缩放 + 遮罩淡入淡出 (AnimatePresence 支持退出动画)
// - 毛玻璃遮罩 + 玻璃面板
// - esc 关闭、点击遮罩关闭、可锁定 body 滚动
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
  /** 遮罩点击是否关闭 (默认 true) */
  dismissable?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 420,
  dismissable = true,
}: ModalProps) {
  // Esc 关闭 + 锁定滚动
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismissable && onClose()}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />
          {/* 面板: spring 弹簧进出 */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth }}
            className="glass-panel relative w-full overflow-hidden p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          >
            {title !== undefined && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                  {title}
                </div>
                <button
                  onClick={onClose}
                  aria-label="关闭弹窗"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-50 hover:text-primary-500"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="text-[13px] text-foreground-muted">{children}</div>
            {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}