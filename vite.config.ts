import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// 고객용 주문(/order, /pickup)과 점주용 POS/운영자(그 외 경로)를 하나의 SPA로 서비스한다.
// "@/*" 별칭은 점주/운영자 쪽 코드(src/admin)가 쓰던 것을 그대로 유지한다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/admin', import.meta.url)),
    },
  },
  server: {
    // IPv4/IPv6 양쪽에 바인딩해 localhost(127.0.0.1 / ::1) 접속이 모두 되게 한다.
    host: true,
    // 백엔드 CORS 허용 origin이 http://localhost:5173 이므로 포트를 고정한다.
    port: 5173,
    strictPort: true,
  },
})
