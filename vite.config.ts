import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // IPv4/IPv6 양쪽에 바인딩해 localhost(127.0.0.1 / ::1) 접속이 모두 되게 한다.
    host: true,
    // 백엔드 CORS 허용 origin이 http://localhost:5173 이므로 포트를 고정한다.
    port: 5173,
    strictPort: true,
  },
})
