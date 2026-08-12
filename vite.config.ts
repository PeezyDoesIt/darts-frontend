import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import vue from '@vitejs/plugin-vue'
import path from 'path'
// vitest/config re-exports Vite's defineConfig with the `test` key typed
import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { host: true },
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar({ sassVariables: false }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // Quasar's client entry touches `window` at import time, so any component test
    // that pulls in a view fails to even load under vitest's default node environment.
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,js}', 'src/**/*.{test,spec}.{ts,js}'],
    // tests/smoke is Playwright — it must not be collected by vitest. This used to exclude
    // tests/e2e for Cypress, which has not existed here since the move to Playwright.
    exclude: ['node_modules', 'dist', 'tests/smoke/**'],
  },
})
