import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uniModule from '@dcloudio/vite-plugin-uni'

const uni =
  (uniModule as unknown as { default?: typeof uniModule }).default ?? uniModule

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
