// 轻量自研 Toast: 全局容器 + toast.success/error API + framer-motion 进出动画
// (替代 react-hot-toast, 避免 Vite tree-shaking 把 <Toaster> 剪掉的兼容问题)
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CircleCheck, CircleX } from 'lucide-react'

type ToastType = 'success' | 'error'
interface ToastItem {
  id: number
  type: ToastType
  text: string
}

// 模块级监听器: ToastProvider 挂载后注册 push 实现
let pushImpl: ((type: ToastType, text: string) => void) | null = null
let nextId = 1

/** 供任意组件调用: 与 Provider 解耦, 即使未挂载也安全不报错 */
export const toast = {
  success: (text: string) => pushImpl?.('success', text),
  error: (text: string) => pushImpl?.('error', text),
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, text: string) => {
    const id = nextId++
    setToasts((prev) => [...prev.slice(-4), { id, type, text }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  // 挂载时注册, 卸载时清除
  useEffect(() => {
    pushImpl = push
    return () => {
      pushImpl = null
    }
  }, [push])

  return (
    <>
      {children}
      {/* 固定右上角容器 */}
      <div
        className="pointer-events-none fixed top-5 right-5 z-[999] flex w-80 flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl ${
                t.type === 'success'
                  ? 'border-success/40 bg-surface-solid'
                  : 'border-danger/50 bg-surface-solid'
              }`}
              style={{ color: 'var(--foreground)' }}
            >
              {t.type === 'success' ? (
                <CircleCheck size={16} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <CircleX size={16} className="mt-0.5 shrink-0 text-danger" />
              )}
              <span className="leading-snug">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}