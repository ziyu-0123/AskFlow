import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Mock 服务地址
        changeOrigin: true, // 解决跨域
        // rewrite: (path) => path        // 不重写路径，保持 /api 前缀
      },
    },
  },
})
