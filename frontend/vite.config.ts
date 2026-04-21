import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 👈 이거 추가

export default defineConfig({
  base: "/laplace-web/",
  plugins: [
    tailwindcss(), // 👈 이거 추가
    react()
  ],
})