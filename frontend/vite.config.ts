import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发: Vite 5173, 代理 /api、/qr.png、/astrbot 到 FastAPI 8080
// 生产: base=/static/, 构建产物输出到 ../static 由 FastAPI 提供
export default defineConfig({
  base: '/static/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/qr.png': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/astrbot': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
