import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar({ sassVariables: false }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
