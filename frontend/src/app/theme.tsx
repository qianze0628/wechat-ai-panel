// NapCat 主题管理: data-theme 切换 + 自定义主色 + localStorage 持久化
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'
const THEME_KEY = 'wechat-ai-panel-theme'
const ACCENT_KEY = 'wechat-ai-panel-accent'

// 预设主色板 (用户可 DIY, napcat 也是这么做的): 名字 → { light: 主色, dark: 主色 }
export const ACCENT_PRESETS: { name: string; color: string; dark: string; label: string }[] = [
  { name: 'pink', color: '#F33B7C', dark: '#f31260', label: '樱花粉' },
  { name: 'blue', color: '#3b82f6', dark: '#3b82f6', label: '冰霜蓝' },
  { name: 'green', color: '#10b981', dark: '#10b981', label: '薄荷绿' },
  { name: 'purple', color: '#8b5cf6', dark: '#8b5cf6', label: '葡萄紫' },
  { name: 'orange', color: '#f97316', dark: '#fb923c', label: '蜜桃橙' },
  { name: 'teal', color: '#14b8a6', dark: '#2dd4bf', label: '青碧蓝' },
]

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
  accent: string
  setAccent: (hex: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  accent: ACCENT_PRESETS[0].color,
  setAccent: () => {},
})

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  return 'light' // 默认亮色粉蓝
}

function getInitialAccent(): string {
  try {
    return localStorage.getItem(ACCENT_KEY) || ACCENT_PRESETS[0].color
  } catch {
    return ACCENT_PRESETS[0].color
  }
}

/** 把 6 位 hex 主色扩展成 primary 色阶 (50~600) 写进 CSS 变量 */
function normalizeHex(hex: string): string {
  let h = hex.replace('#', '').trim()
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return h.length === 6 ? '#' + h : '#F33B7C'
}

function applyAccent(hex: string) {
  const root = document.documentElement
  const normalized = normalizeHex(hex)
  const palette = buildPaletteScale(normalized)
  root.style.setProperty('--primary-50', palette['50'])
  root.style.setProperty('--primary-100', palette['100'])
  root.style.setProperty('--primary-200', palette['200'])
  root.style.setProperty('--primary-300', palette['300'])
  root.style.setProperty('--primary-400', palette['400'])
  root.style.setProperty('--primary-500', palette['500'])
  root.style.setProperty('--primary-600', palette['600'])
  // 边框/描边跟随主色 (hex + 透明度 8 位格式)
  root.style.setProperty('--border', normalized + '40')
  root.style.setProperty('--border-dark', normalized + '66')
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixRgb(base: [number, number, number], toward: [number, number, number], factor: number): string {
  return '#' + base.map((c, i) => Math.round(c + (toward[i] - c) * factor).toString(16).padStart(2, '0')).join('')
}

/** 从主色生成 Tailwind 式色阶 (在给定色基础上向白/黑方向走) */
function buildPaletteScale(hex: string): Record<string, string> {
  const base = hexToRgb(hex)
  const light = [255, 255, 255] as [number, number, number]
  const dark = [0, 0, 0] as [number, number, number]
  return {
    '50': mixRgb(base, light, 0.92),
    '100': mixRgb(base, light, 0.84),
    '200': mixRgb(base, light, 0.66),
    '300': mixRgb(base, light, 0.42),
    '400': mixRgb(base, light, 0.2),
    '500': hex,
    '600': mixRgb(base, dark, 0.22),
    '700': mixRgb(base, dark, 0.4),
    '800': mixRgb(base, dark, 0.6),
    '900': mixRgb(base, dark, 0.8),
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)
  const [accent, setAccentState] = useState<string>(getInitialAccent)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  // 应用自定义主色
  useEffect(() => {
    applyAccent(accent)
    try {
      localStorage.setItem(ACCENT_KEY, accent)
    } catch {
      /* ignore */
    }
  }, [accent])

  const setTheme = (t: ThemeMode) => setThemeState(t)
  const toggleTheme = () => setThemeState((t) => (t === 'light' ? 'dark' : 'light'))
  const setAccent = (hex: string) => setAccentState(hex)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export { buildPaletteScale }