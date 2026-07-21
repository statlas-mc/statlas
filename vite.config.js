import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The studio app itself. Deployed to GitHub Pages under /statlas/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/statlas/' : '/',
  plugins: [react()],
  server: { host: true, port: 5174 },
}))
