import type { Config } from 'tailwindcss'

// NapCat Pink Glass 主题 Token (映射 CSS Variables)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
        },
        secondary: {
          100: 'var(--secondary-100)',
          300: 'var(--secondary-300)',
          500: 'var(--secondary-500)',
        },
        background: 'var(--background)',
        'background-alt': 'var(--background-alt)',
        foreground: 'var(--foreground)',
        'foreground-muted': 'var(--foreground-muted)',
        surface: 'var(--surface)',
        'surface-solid': 'var(--surface-solid)',
        border: 'var(--border)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '10px',
      },
      fontFamily: {
        sans: ['Nunito', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      transitionDuration: {
        160: '160ms',
        180: '180ms',
        240: '240ms',
      },
    },
  },
  plugins: [],
} satisfies Config