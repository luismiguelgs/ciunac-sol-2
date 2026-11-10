import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

export function testEnvironment(port = '3100', social = true) {
  const env = {
    ...process.env, CIUNAC_E2E: '1',
    AUTH_SECRET: 'test-only-auth-secret-000000000000000000000000',
    OTP_SESSION_SECRET: 'test-only-otp-secret-000000000000000000000000',
    APP_BASE_URL: `http://localhost:${port}`, AUTH_URL: `http://localhost:${port}`,
    API_URL: 'https://ciunac.test', NEXT_PUBLIC_API_URL: 'https://ciunac.test', API_KEY: 'test-only',
    API_KEY_Q10: 'test-only', RECAPTCHA_SECRET_KEY: 'test-only', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'test-only',
    AUTH_GOOGLE_ID: social ? 'test-google-client' : '', AUTH_GOOGLE_SECRET: social ? 'test-only' : '',
    // Deliberately configured: the deferred provider must stay unavailable regardless.
    AUTH_MICROSOFT_ENTRA_ID_ID: 'test-microsoft-client', AUTH_MICROSOFT_ENTRA_ID_SECRET: 'test-only',
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/e2e/fixtures/fonts.cjs'),
    NODE_OPTIONS: `--import=${pathToFileURL(resolve('tests/e2e/fixtures/network.mjs')).href}`,
  }
  return env
}
