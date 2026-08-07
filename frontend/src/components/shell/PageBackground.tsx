// NapCat 背景光斑: 三层模糊光斑 (粉/蓝/紫) + 渐变, 固定不移动
export default function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 渐变背景 */}
      <div
        className="absolute inset-0 transition-colors duration-200"
        style={{
          background:
            'linear-gradient(135deg, var(--background-alt) 0%, var(--background) 48%, #FFF2F6 100%)',
        }}
      />
      {/* 光斑 1: 粉 (左上) */}
      <div
        className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-[0.38]"
        style={{ background: '#FF7FAC', filter: 'blur(110px)' }}
      />
      {/* 光斑 2: 冰蓝 (右上) */}
      <div
        className="absolute -top-24 right-[-10%] h-[400px] w-[400px] rounded-full opacity-[0.32]"
        style={{ background: '#88C0D0', filter: 'blur(110px)' }}
      />
      {/* 光斑 3: 淡紫 (底部) */}
      <div
        className="absolute bottom-[-20%] left-1/3 h-[360px] w-[520px] rounded-full opacity-[0.3]"
        style={{ background: '#C3B8F2', filter: 'blur(120px)' }}
      />
    </div>
  )
}