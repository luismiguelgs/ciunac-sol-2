import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 45000,
  use: { baseURL: 'http://localhost:3100', headless: true, channel: 'msedge' },
  webServer: {
    command: 'node tests/e2e/start-server.mjs --production', url: 'http://localhost:3100/api/auth/providers',
    reuseExistingServer: false, timeout: 120000,
  },
})
