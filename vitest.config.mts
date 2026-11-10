import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: {
    '@': fileURLToPath(new URL('.', import.meta.url)),
    'server-only': fileURLToPath(new URL('./tests/fixtures/server-only.ts', import.meta.url)),
  } },
  test: {
    environment: 'node', include: ['tests/**/*.test.ts'], clearMocks: true, pool: 'threads',
    server: { deps: { inline: ['next-auth'] } },
  },
})
