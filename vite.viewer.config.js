import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds the standalone viewer as ONE self-contained HTML file with everything
// inlined. Emitted to public/viewer-template.html; the studio fetches it, injects
// the user's { config, data } payload, and offers it as a downloadable site.
export default defineConfig({
  base: '/',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'viewer-dist',
    emptyOutDir: true,
    rollupOptions: { input: 'viewer.html' },
  },
})
