import { test, expect, type Page } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { encode } from 'next-auth/jwt'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { testEnvironment } from './fixtures/environment.mjs'

const authSecret = 'test-only-auth-secret-000000000000000000000000'
const dto = { Primer_apellido: 'PRUEBA', Segundo_apellido: 'FICTICIA', Primer_nombre: 'ALUMNO',
  Email: 'test@example.test', Codigo_tipo_identificacion: 'PE01', Numero_identificacion: '00000000', Genero: 'F',
  Fecha_nacimiento: '2000-01-01T00:00:00.000Z', Telefono: '900000000', Celular: '900000000', Codigo_programa: 'TEST' }

async function interceptProvider(page: Page, mode: 'verified' | 'pending' | 'cancel' | 'invalid-state' = 'verified') {
  await page.route(/https:\/\/accounts\.google\.com\/test\/authorize.*/, async (route) => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('scope')).toBe('openid profile email')
    const callback = new URL(url.searchParams.get('redirect_uri')!)
    const state = url.searchParams.get('state')
    if (state) callback.searchParams.set('state', mode === 'invalid-state' ? 'invalid-state' : state)
    if (mode === 'cancel') callback.searchParams.set('error', 'access_denied')
    else callback.searchParams.set('code', Buffer.from(JSON.stringify({ mode, nonce: url.searchParams.get('nonce'), challenge: url.searchParams.get('code_challenge') })).toString('base64url'))
    await route.fulfill({ status: 302, headers: { location: callback.href }, body: '' })
  })
}

async function completeEmailAccess(page: Page) {
  await page.locator('input[name="email"]').fill('test@example.test')
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.locator('input[autocomplete="one-time-code"]')).toBeEnabled()
  const mail = JSON.parse(await readFile('.next-e2e/test-mail.json', 'utf8'))
  await page.locator('input[autocomplete="one-time-code"]').fill(mail.code)
  await page.getByRole('button', { name: 'Verificar código y continuar', exact: true }).click()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.route('https://www.google.com/recaptcha/api.js*', async (route) => {
    const onload = new URL(route.request().url()).searchParams.get('onload')
    await route.fulfill({ contentType: 'text/javascript', body: `
      window.grecaptcha = {
        render(el, opts) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = 'CAPTCHA de prueba';
          button.onclick = () => opts.callback('test-captcha-token');
          (typeof el === 'string' ? document.getElementById(el) : el).appendChild(button); return 1;
        }, getResponse() { return 'test-captcha-token'; }, reset() {}, ready(fn) { fn(); }
      }; window.___grecaptcha_cfg = {}; setTimeout(() => window[${JSON.stringify(onload)}]?.(), 0);` })
  })
})

test.describe('Google OAuth', () => {
  test('TEST-AN-009/010: Google verified OAuth return and reload', async ({ page }) => {
    await interceptProvider(page)
    await page.goto('/solicitud-nuevo')
    await page.getByRole('button', { name: 'Continuar con Google', exact: true }).click()
    await expect(page.getByText('Correo validado:', { exact: false }).first()).toBeVisible()
    await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
    await expect(page.getByTestId('verification-splash')).toHaveCount(0)
    const session = await (await page.request.get('/api/auth/session')).json()
    expect(session.newStudent.emailVerified).toBe(true)
    expect(JSON.stringify(session)).not.toContain('test-access-token')
    await page.reload()
    await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cambiar de cuenta', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Continuar con Google', exact: true })).toBeVisible()
    expect(await (await page.request.get('/api/auth/session')).json()).toBeNull()
  })
  test('TEST-AN-011: Google insufficient email evidence stays pending', async ({ page }) => {
    await interceptProvider(page, 'pending')
    await page.goto('/solicitud-nuevo')
    await page.getByRole('button', { name: 'Continuar con Google', exact: true }).click()
    await expect(page.getByText('Para continuar, verifica tu correo con un código.')).toBeVisible()
    await expect(page.getByLabel('Primer Apellido', { exact: true })).not.toBeVisible()
    const response = await page.request.post('/api/ciunac/q10/estudiantes', { headers: { origin: 'http://localhost:3100' }, data: dto })
    expect(response.status()).toBe(401)
    await completeEmailAccess(page)
    const confirmed = await (await page.request.get('/api/auth/session')).json()
    expect(confirmed.newStudent).toMatchObject({ provider: 'email-otp', emailVerified: true })
  })
})

test('TEST-AN-036: verification Splash follows the desktop breakpoint without resetting email', async ({ page }) => {
  await mkdir('.next-e2e/verification-splash', { recursive: true })
  await page.goto('/solicitud-nuevo')
  const email = page.locator('input[name="email"]')
  await email.fill('splash@example.test')
  const splash = page.getByTestId('verification-splash')
  for (const width of [390, 768, 1023, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 })
    await expect(email).toHaveValue('splash@example.test')
    await expect(page.getByRole('button', { name: 'Continuar con Google', exact: true })).toBeVisible()
    if (width >= 1024) {
      await expect(splash).toBeVisible()
      await expect.poll(() => splash.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
      const formBox = await page.locator('form').boundingBox()
      const imageBox = await splash.boundingBox()
      expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(imageBox!.x)
      await expect(splash.locator('img')).toHaveCSS('object-fit', 'cover')
      await expect(splash.locator('img')).toHaveCSS('object-position', '50% 50%')
    } else await expect(splash).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `.next-e2e/verification-splash/email-${width}.png`, fullPage: true, animations: 'disabled' })
  }
})

test('TEST-AN-036: Splash stays for OTP and verified email, and disappears in basic data', async ({ page }) => {
  await mkdir('.next-e2e/verification-splash', { recursive: true })
  await page.setViewportSize({ width: 1366, height: 1080 })
  await page.goto('/solicitud-nuevo')
  await page.locator('input[name="email"]').fill('test@example.test')
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  const code = page.locator('input[autocomplete="one-time-code"]')
  await expect(code).toBeEnabled()
  await expect(page.getByTestId('verification-splash')).toBeVisible()
  await code.fill('123')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('verification-splash')).toBeHidden()
  await expect(code).toHaveValue('123')
  await page.setViewportSize({ width: 1366, height: 1080 })
  await expect(code).toHaveValue('123')
  await expect(page.getByTestId('verification-splash')).toBeVisible()
  await page.screenshot({ path: '.next-e2e/verification-splash/otp-desktop.png', fullPage: true, animations: 'disabled' })
  const mail = JSON.parse(await readFile('.next-e2e/test-mail.json', 'utf8'))
  await code.fill(mail.code)
  await page.getByRole('button', { name: 'Verificar código y continuar', exact: true }).click()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
  await expect(page.getByTestId('verification-splash')).toHaveCount(0)
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tu correo está verificado', exact: true })).toBeVisible()
  await expect(page.getByTestId('verification-splash')).toBeVisible()
  await page.screenshot({ path: '.next-e2e/verification-splash/verified-desktop.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Continuar con este correo', exact: true }).click()
  await expect(page.getByTestId('verification-splash')).toHaveCount(0)
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
})

for (const mode of ['cancel', 'invalid-state'] as const) {
  test(`TEST-SEG-011: OAuth ${mode} does not issue a session`, async ({ page }) => {
    await interceptProvider(page, mode)
    await page.goto('/solicitud-nuevo')
    await page.getByRole('button', { name: 'Continuar con Google', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'No se completó el acceso' })).toBeVisible()
    expect(await (await page.request.get('/api/auth/session')).json()).toBeNull()
  })
}

test('Microsoft is unavailable even with configured environment variables', async ({ page }) => {
  await page.goto('/solicitud-nuevo')
  await expect(page.getByRole('button', { name: /Microsoft/ })).toHaveCount(0)
  const providers = await (await page.request.get('/api/auth/providers')).json()
  expect(Object.keys(providers).sort()).toEqual(['email-otp', 'google'])
  const callback = await page.request.get('/api/auth/callback/microsoft-entra-id?code=test-only', { maxRedirects: 0 })
  expect(callback.headers().location ?? '').not.toContain('login.microsoftonline.com')
  expect(await (await page.request.get('/api/auth/session')).json()).toBeNull()
})

test('TEST-AN-002/009: email and code issue Auth.js, never the legacy NUEVO session', async ({ page, context }) => {
  await page.goto('/solicitud-nuevo')
  await completeEmailAccess(page)
  const session = await (await page.request.get('/api/auth/session')).json()
  expect(session.user.email).toBe('test@example.test')
  expect(session.newStudent.provider).toBe('email-otp')
  const cookies = await context.cookies()
  expect(cookies.some((cookie) => cookie.name === 'ciunac_verified_session')).toBe(false)
  expect(cookies.find((cookie) => cookie.name === 'authjs.session-token')).toMatchObject({ httpOnly: true, sameSite: 'Lax' })
})

test('TEST-SEG-006/012: tampered, expired or retired-provider sessions cannot register or notify', async ({ page, context }) => {
  for (const token of ['tampered-token', await encode({ secret: authSecret, salt: 'authjs.session-token', token: {
    email: 'test@example.test', newStudent: { purpose: 'NUEVO', provider: 'google', emailVerified: true, expiresAt: Date.now() - 1000 },
  } }), await encode({ secret: authSecret, salt: 'authjs.session-token', token: {
    email: 'test@example.test', newStudent: { purpose: 'NUEVO', provider: 'microsoft-entra-id', emailVerified: true, expiresAt: Date.now() + 900000 },
  } })]) {
    await context.addCookies([{ name: 'authjs.session-token', value: token, url: 'http://localhost:3100' }])
    const registration = await page.request.post('/api/ciunac/q10/estudiantes', { headers: { origin: 'http://localhost:3100' }, data: dto })
    const notification = await page.request.post('/api/security/notifications', { headers: { origin: 'http://localhost:3100' }, data: { type: 'REGISTER', reference: '00000000' } })
    expect(registration.status()).toBe(401)
    expect(notification.status()).toBe(401)
  }
})

test('TEST-AN-011: absolute expiry returns to verification without exposing the next step', async ({ page }) => {
  await page.clock.install()
  await interceptProvider(page)
  await page.goto('/solicitud-nuevo')
  await page.getByRole('button', { name: 'Continuar con Google', exact: true }).click()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar con este correo', exact: true }).click()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toBeVisible()
  await page.clock.fastForward(901000)
  await expect(page.getByText('Tu sesión venció. Verifica de nuevo el mismo correo para continuar.')).toBeVisible()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).not.toBeVisible()
})

test('TEST-SEG-005: actual Credentials errors preserve attempt counts and public error codes', async ({ page }) => {
  const headers = { origin: 'http://localhost:3100' }
  const request = await page.request.post('/api/security/otp/request', { headers, data: {
    email: 'test@example.test', purpose: 'NUEVO', captchaToken: 'test-captcha-token',
  } })
  expect(request.status()).toBe(202)
  const mail = JSON.parse(await readFile('.next-e2e/test-mail.json', 'utf8'))
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await page.request.post('/api/security/otp/verify', { headers, data: {
      email: mail.email, purpose: 'NUEVO', code: mail.code === '999999' ? '888888' : '999999',
    } })
    expect(response.status()).toBe(attempt === 5 ? 429 : 400)
    expect(await response.json()).toMatchObject({ ok: false, error: {
      code: attempt === 5 ? 'MAX_ATTEMPTS' : 'VERIFICATION_FAILED',
    } })
  }
  expect(await (await page.request.get('/api/auth/session')).json()).toBeNull()
})

test('TEST-AN-009: missing social configuration disables buttons and preserves email access', async ({ page }) => {
  const next = resolve('node_modules/next/dist/bin/next')
  const child = spawn(process.execPath, [next, 'start', '--port', '3101'], {
    env: testEnvironment('3101', false), stdio: 'ignore', windowsHide: true,
  })
  try {
    await expect.poll(async () => {
      try { return (await page.request.get('http://localhost:3101/api/auth/providers')).ok() }
      catch { return false }
    }, { timeout: 30000 }).toBe(true)
    await page.goto('http://localhost:3101/solicitud-nuevo')
    await expect(page.getByRole('button', { name: 'Continuar con Google', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Microsoft/ })).toHaveCount(0)
    await expect(page.getByText('Google aún no está configurado. Puedes acceder con correo y código.')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Enviar código', exact: true })).toBeEnabled()
  } finally { child.kill() }
})

async function expectLargeNavigation(page: Page, names = ['Anterior', 'Siguiente']) {
  for (const name of names) {
    const button = page.getByRole('button', { name, exact: true })
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    expect(await button.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  }
}

async function fillBasicData(page: Page, documentNumber: string) {
  await interceptProvider(page)
  await page.goto('/solicitud-nuevo')
  await page.getByRole('button', { name: 'Continuar con Google', exact: true }).click()
  // Wait for an actual client transition after the SSR OAuth return before typing.
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar con este correo', exact: true }).click()
  await page.getByLabel('Primer Apellido', { exact: true }).fill('Prueba')
  await expectLargeNavigation(page)
  await page.getByLabel('Segundo Apellido', { exact: true }).fill('Ficticia')
  await page.getByLabel('Primer Nombre', { exact: true }).fill('Alumno')
  await page.locator('input[name="phone"]').fill('900000000')
  await page.getByLabel('Número de Documento', { exact: true }).fill(documentNumber)
  await page.getByRole('combobox', { name: 'Programa', exact: true }).click()
  await page.getByRole('option', { name: /Inglés de prueba/ }).click()
  await page.getByRole('button', { name: /Fecha de Nacimiento/ }).click()
  await page.getByRole('combobox', { name: 'Año', exact: true }).click()
  await page.getByRole('option', { name: '2000', exact: true }).click()
  await page.getByRole('combobox', { name: 'Mes', exact: true }).click()
  await page.getByRole('option', { name: 'Enero', exact: true }).click()
  await page.locator('button[data-day="1/1/2000"]').click()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Condición académica' })).toBeVisible()
  await expectLargeNavigation(page)
}
async function uploadIdentity(page: Page) {
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Documento de identidad' })).toBeVisible()
  await expect(page.getByText('Solo necesitas una cara de tu documento.', { exact: true })).toBeVisible()
  await expect(page.getByText(/ambas caras|parte posterior|Sobre el acceso a tu archivo|cualquier persona que tenga su enlace/i)).toHaveCount(0)
  await page.screenshot({ path: '.next-e2e/document-upload-empty.png', fullPage: true, animations: 'disabled' })
  await expect(page.getByRole('button', { name: 'Subir documento y continuar' })).toBeDisabled()
  await expectLargeNavigation(page, ['Anterior', 'Subir documento y continuar'])
  await page.getByLabel('Archivo del documento').setInputFiles({ name: 'documento-ficticio.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nfictional-test-document') })
  await expect(page.getByRole('button', { name: 'Cambiar archivo', exact: true })).toBeEnabled()
  const uploaded = page.waitForResponse((r) => r.url().endsWith('/api/solicitud-nuevo/documento') && r.status() === 200)
  await page.getByRole('button', { name: 'Subir documento y continuar' }).click()
  await uploaded
  await expect(page.getByText('Formulario de consentimiento', { exact: true })).toBeVisible()
}
async function acceptAndRegister(page: Page) {
  for (const name of ['Anterior', 'Finalizar']) {
    const button = page.getByRole('button', { name, exact: true })
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    expect(await button.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  }
  await page.getByRole('switch', { name: 'Los datos proporcionados son los correctos', exact: true }).check()
  await page.getByRole('switch', { name: 'Acepta todos los términos y condiciones', exact: true }).check()
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
}
async function eventsFor(documentNumber: string) {
  const lines = (await readFile('.next-e2e/student-events.jsonl', 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
  return lines.filter((e) => e.event === 'register' && e.body.Numero_identificacion === documentNumber)
}

test('CA-AN-018/031..034: PG uploads before summary, then registers with null academic fields', async ({ page }) => {
  await fillBasicData(page, '00000001')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Público general', exact: true }).click()
  await uploadIdentity(page)
  expect(await page.request.get('/api/solicitud-nuevo/codigo').then((r) => r.json())).toEqual({ status: 'none' })
  await acceptAndRegister(page)
  await expect(page).toHaveURL(/\/solicitud-nuevo\/finalizar\?receipt=/)
  const [event] = await eventsFor('00000001')
  expect(event.body).toMatchObject({ tipoEstudiante: 'PG', facultadId: null, escuelaId: null })
  expect(event.body.imgDoc).toMatch(/^https:\/\/drive\.google\.com\/file\/d\//)
  expect(event.body).not.toHaveProperty('codigo')
  expect(event.body).not.toHaveProperty('Direccion')
})

test('CA-AN-031/032: document selection, removal, drop and upload failure remain recoverable', async ({ page }) => {
  await fillBasicData(page, '00000006')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Público general', exact: true }).click()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Documento de identidad', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  const input = page.getByLabel('Archivo del documento', { exact: true })
  const submit = page.getByRole('button', { name: 'Subir documento y continuar', exact: true })
  await input.setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('test') })
  await expect(page.getByRole('alert').filter({ hasText: 'Este formato no es válido' })).toBeVisible()
  await expect(submit).toBeDisabled()
  await input.setInputFiles({ name: 'documento-prueba.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=', 'base64') })
  await expect(page.getByAltText('Vista previa del documento seleccionado')).toBeVisible()
  await expect(submit).toBeEnabled()
  await page.screenshot({ path: '.next-e2e/document-upload-image-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Quitar archivo', exact: true }).click()
  await expect(submit).toBeDisabled()
  await expect(page.getByAltText('Vista previa del documento seleccionado')).toHaveCount(0)
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['%PDF-1.7\nfictional-test-document'], 'documento-arrastrado.pdf', { type: 'application/pdf' }))
    return data
  })
  await page.getByRole('group', { name: 'Zona de carga del documento' }).dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(page.getByText('documento-arrastrado.pdf', { exact: true })).toBeVisible()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/solicitud-nuevo/documento', async route => {
    await gate
    await route.fulfill({ status: 503, json: { ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'No se pudo subir el documento. Intenta de nuevo.' } } })
  })
  await submit.click()
  await expect(page.getByRole('button', { name: 'Subiendo documento…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cambiar archivo', exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudo subir' })).toBeVisible()
  await expect(page.getByText('documento-arrastrado.pdf', { exact: true })).toBeVisible()
  await expect(submit).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.unroute('**/api/solicitud-nuevo/documento')
  await submit.click()
  await expect(page.getByText('Formulario de consentimiento', { exact: true })).toBeVisible()
  for (const name of ['Anterior', 'Finalizar']) {
    expect((await page.getByRole('button', { name, exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Finalizar', exact: true }).locator('..').screenshot({ path: '.next-e2e/final-actions-mobile.png' })
})

test('CA-AN-017/018/035: PRE filters schools, preserves values through PG, and retries only code', async ({ page }) => {
  await fillBasicData(page, '00000002')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Pregrado UNAC', exact: true }).click()
  await page.getByRole('combobox', { name: 'Facultad', exact: true }).click()
  await page.getByRole('option', { name: 'Facultad de prueba', exact: true }).click()
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await expect(page.getByRole('option')).toHaveText(['Escuela pregrado'])
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await page.getByRole('option', { name: 'Escuela pregrado', exact: true }).click()
  await page.getByLabel('Código de alumno', { exact: true }).fill('RETRY-CODE')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Público general', exact: true }).click()
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Pregrado UNAC', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Escuela', exact: true })).toContainText('Escuela pregrado')
  await expect(page.getByLabel('Código de alumno', { exact: true })).toHaveValue('RETRY-CODE')
  await uploadIdentity(page)
  await acceptAndRegister(page)
  await expect(page.getByRole('button', { name: 'Reintentar guardado del código' }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Reintentar guardado del código' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar guardado del código' }).first().click()
  await expect(page).toHaveURL(/\/solicitud-nuevo\/finalizar\?receipt=/)
  expect(await eventsFor('00000002')).toHaveLength(1)
})

test('CA-AN-017/019: POS has its own schools and requires a code', async ({ page }) => {
  await fillBasicData(page, '00000004')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Posgrado UNAC', exact: true }).click()
  await page.getByRole('combobox', { name: 'Facultad', exact: true }).click()
  await page.getByRole('option', { name: 'Facultad de prueba', exact: true }).click()
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await expect(page.getByRole('option')).toHaveText(['Escuela posgrado'])
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await page.getByRole('option', { name: 'Escuela posgrado', exact: true }).click()
  await page.screenshot({ path: '.next-e2e/academic-step-desktop.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Selecciona tu condición' })).toBeVisible()
  await page.getByLabel('Código de alumno', { exact: true }).fill('POS-TEST')
  await uploadIdentity(page)
  await acceptAndRegister(page)
  await expect(page).toHaveURL(/\/solicitud-nuevo\/finalizar\?receipt=/)
})

test('CA-AN-022/035: partial provider registration never offers a second creation', async ({ page }) => {
  await fillBasicData(page, '00000003')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Público general', exact: true }).click()
  await uploadIdentity(page)
  await acceptAndRegister(page)
  await expect(page.getByText(/No vuelva a enviar el formulario/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByText(/No vuelva a enviar el formulario/).first()).toBeVisible()
  expect(await eventsFor('00000003')).toHaveLength(1)
})

test('academic and document steps remain usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await fillBasicData(page, '00000005')
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Pregrado UNAC', exact: true }).click()
  await page.getByRole('combobox', { name: 'Facultad', exact: true }).click()
  await page.getByRole('option', { name: 'Facultad de prueba', exact: true }).click()
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await page.getByRole('option', { name: 'Escuela pregrado', exact: true }).click()
  await page.getByLabel('Código de alumno', { exact: true }).fill('MOB-TEST')
  await page.screenshot({ path: '.next-e2e/academic-step-mobile.png', fullPage: true })
  await page.getByRole('combobox', { name: 'Facultad', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Facultad de prueba', exact: true })).toBeVisible()
  await page.screenshot({ path: '.next-e2e/academic-select-mobile.png', fullPage: true, animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Documento de identidad' })).toBeVisible()
  await page.screenshot({ path: '.next-e2e/document-step-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('New student text controls enforce names 80, phone 9, DNI 8, CE 9 and student code 10', async ({ page }) => {
  await fillBasicData(page, '00000007')
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  for (const name of ['Primer Apellido', 'Segundo Apellido', 'Primer Nombre', 'Segundo Nombre']) {
    const input = page.getByLabel(name, { exact: true })
    await input.fill('A'.repeat(81))
    await expect(input).toHaveValue('A'.repeat(80))
  }
  const phone = page.locator('input[name="phone"]')
  await phone.fill('9000000009')
  await expect(phone).toHaveValue('900000000')
  const document = page.getByLabel('Número de Documento', { exact: true })
  await document.fill('123456789')
  await expect(document).toHaveValue('12345678')
  await page.getByRole('radio', { name: 'Carnet de Extranjería', exact: true }).check()
  await document.fill('AB1234567890')
  await expect(document).toHaveValue('AB1234567')
  await page.getByRole('radio', { name: 'Documento de Identidad', exact: true }).check()
  await document.fill('00000007')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await page.getByRole('combobox', { name: 'Tipo de alumno', exact: true }).click()
  await page.getByRole('option', { name: 'Pregrado UNAC', exact: true }).click()
  await page.getByRole('combobox', { name: 'Facultad', exact: true }).click()
  await page.getByRole('option', { name: 'Facultad de prueba', exact: true }).click()
  await page.getByRole('combobox', { name: 'Escuela', exact: true }).click()
  await page.getByRole('option', { name: 'Escuela pregrado', exact: true }).click()
  const code = page.getByLabel('Código de alumno', { exact: true })
  await code.fill('12345678901')
  await expect(code).toHaveValue('1234567890')
  await code.press('End')
  await code.press('1')
  await expect(code).toHaveValue('1234567890')
  await expect(page.getByText('Máximo 10 caracteres.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Documento de identidad', exact: true })).toBeVisible()
})

