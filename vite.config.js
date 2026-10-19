import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'
import { fileURLToPath } from 'url'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    vueI18n({
      include: path.resolve(__dirname, './src/locales/**'),
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
