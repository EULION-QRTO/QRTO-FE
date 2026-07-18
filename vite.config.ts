import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// 순수 React SPA (Vite). "@/*" 별칭은 src 를 가리킨다.
export default defineConfig({
  plugins: [react()],
  server: {
    // 기본 5174 로 띄우되, 이미 사용 중이면 다음 빈 포트를 자동으로 찾는다.
    port: 5174,
    strictPort: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
