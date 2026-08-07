// 丝滑 Toggle 开关: framer-motion layout 弹簧动画
// 用法: <Toggle checked={on} onChange={setOn} label="解说" disabled={busy} />
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  title,
  id,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label?: ReactNode
  title?: string
  id?: string
}) {
  return (
    <label
      htmlFor={id}
      title={title}
      className={`relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer items-center select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange()
      }}
    >
      {/* 轨道 */}
      <motion.span
        aria-hidden
        animate={{ backgroundColor: checked ? 'var(--primary-500)' : 'var(--surface-solid)' }}
        className={`absolute inset-0 rounded-full transition-opacity ${
          checked ? '' : 'border border-border'
        }`}
      />
      {/* 滑块: layout 弹簧动画 (比 CSS transition 更跟手) */}
      <motion.span
        aria-hidden
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        animate={{ x: checked ? 20 : 0 }}
        className="absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
      />
      <span className="sr-only">{label}</span>
    </label>
  )
}