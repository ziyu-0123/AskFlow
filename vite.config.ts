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
  build: {
    rollupOptions: {
      output: {
        // 将稳定的第三方依赖拆为独立 vendor chunk，
        // 1) 减小入口 index.js 体积 2) 提升浏览器长期缓存命中率
        // 注意：Rolldown 的 manualChunks 只支持函数形式（Rollup 允许对象形式）
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // React 全家桶（每个页面都要用，单独 chunk 一次加载后长期缓存）
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler|react-is|react-router|react-router-dom|react-redux)[\\/]/.test(
              id
            )
          ) {
            return 'react-vendor'
          }
          // antd 不强制拆分：让 Rolldown 按组件自动拆分（按需加载更优）
          // 图表库（仅 stat 页使用，单独 chunk 按需加载）
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) {
            return 'recharts-vendor'
          }
          // Redux 生态
          if (/[\\/]node_modules[\\/](@reduxjs|immer|redux-undo)[\\/]/.test(id)) {
            return 'redux-vendor'
          }
          // 拖拽库（仅 Edit 页使用）
          if (/[\\/]node_modules[\\/]@dnd-kit[\\/]/.test(id)) {
            return 'dnd-vendor'
          }
        },
      },
    },
  },
})
