import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Browser-only provider double; no CAPTCHA or mail is sent to an external service.
test.beforeEach(async ({ page }) => {
  await page.route('https://www.google.com/recaptcha/api.js*', async route => {
    const onload = new URL(route.request().url()).searchParams.get('onload')
    await route.fulfill({ contentType: 'text/javascript', body: `
      let token = '';
      window.grecaptcha = {
        render(el, opts) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = 'CAPTCHA de prueba';
          button.style.cssText = 'min-height:48px;width:' + (opts.size === 'compact' ? '164px' : '304px');
          button.onclick = () => { token = 'test-captcha-token'; opts.callback(token); };
          (typeof el === 'string' ? document.getElementById(el) : el).appendChild(button); return 1;
        }, getResponse() { return token; }, reset() { token = ''; }, ready(fn) { fn(); }
      }; window.___grecaptcha_cfg = {}; setTimeout(() => window[${JSON.stringify(onload)}]?.(), 0);` })
  })
})

async function sendCode(page: Page, email = 'test@example.test') {
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(email)
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible()
}

async function mockRequest(page: Page) {
  await page.route('**/api/security/otp/request', route => {
    expect(route.request().postDataJSON()).toMatchObject({ purpose: 'NUEVO', captchaToken: 'test-captcha-token' })
    return route.fulfill({ status: 202, json: { ok: true, expiresInSeconds: 300, resendInSeconds: 180 } })
  })
}

test('CA-AN-002: validation and CAPTCHA errors stay in the first step', async ({ page }) => {
  await page.goto('/solicitud-nuevo')
  await expect(page.getByLabel('Código de verificación', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Correo electrónico', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill('test@example.test')
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.locator('form').getByRole('alert')).toContainText('Confirma que no eres un robot')
  await expect(page.getByRole('heading', { name: 'Verifica tu correo' })).toBeVisible()
})

test('CA-AN-002: code step focuses input, preserves destination and returns to editable email', async ({ page }) => {
  await mockRequest(page)
  await page.goto('/solicitud-nuevo')
  await sendCode(page)
  const code = page.getByLabel('Código de verificación', { exact: true })
  await expect(code).toBeFocused()
  await expect(page.getByText('test@example.test', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Correo electrónico', exact: true })).toHaveCount(0)
  await code.fill('123456')
  await page.getByRole('button', { name: 'Cambiar correo', exact: true }).click()
  const email = page.getByRole('textbox', { name: 'Correo electrónico', exact: true })
  await expect(email).toHaveValue('test@example.test')
  await expect(email).toBeFocused()
  await expect(code).toHaveCount(0)
  await sendCode(page, 'other@example.test')
  await expect(code).toHaveValue('')
  await expect(page.getByText('other@example.test', { exact: true })).toBeVisible()
})

test('CA-AN-002 / CA-SEG-004: cooldown, expiry and resend use server timing', async ({ page }) => {
  await page.clock.install()
  await mockRequest(page)
  await page.goto('/solicitud-nuevo')
  await sendCode(page)
  await expect(page.getByRole('button', { name: 'Reenviar código', exact: true })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Revisa tu correo')
  await page.clock.fastForward(181000)
  await expect(page.getByRole('button', { name: 'Reenviar código', exact: true })).toBeEnabled()
  await page.clock.fastForward(120000)
  await expect(page.getByLabel('Código de verificación', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Verificar código y continuar' })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('El código expiró')
  await page.getByRole('button', { name: 'Reenviar código', exact: true }).click()
  await expect(page.locator('form').getByRole('alert')).toContainText('Confirma que no eres un robot')
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Reenviar código', exact: true }).click()
  await expect(page.getByLabel('Código de verificación', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Código de verificación', { exact: true })).toBeFocused()
  await expect(page.getByRole('status')).toContainText('Solicitamos un nuevo código')
})

test('CA-AN-002 / CA-SEG-005: request and verification failures preserve recovery actions', async ({ page }) => {
  await page.route('**/api/security/otp/request', route => route.fulfill({ status: 503,
    json: { ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'No se pudo enviar el código. Intenta nuevamente.' } } }))
  await page.goto('/solicitud-nuevo')
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill('test@example.test')
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.locator('form').getByRole('alert')).toContainText('No se pudo enviar el código')
  await expect(page.getByRole('button', { name: 'Enviar código', exact: true })).toBeEnabled()
  await mockRequest(page)
  await sendCode(page)
  await page.route('**/api/security/otp/verify', route => route.fulfill({ status: 400,
    json: { ok: false, error: { code: 'VERIFICATION_FAILED', message: 'El código no es correcto. Intenta nuevamente.' } } }))
  await page.getByLabel('Código de verificación', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verificar código y continuar' }).click()
  await expect(page.locator('form').getByRole('alert')).toContainText('El código no es correcto')
  await expect(page.getByLabel('Código de verificación', { exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Cambiar correo' })).toBeEnabled()
  await expect(page.getByLabel('Primer Apellido', { exact: true })).toHaveCount(0)
})

test('CA-AN-002: pending requests show progress and block duplicate actions', async ({ page }) => {
  let releaseRequest!: () => void
  let releaseVerification!: () => void
  const requestGate = new Promise<void>(resolve => { releaseRequest = resolve })
  const verificationGate = new Promise<void>(resolve => { releaseVerification = resolve })
  let sends = 0
  await page.route('**/api/security/otp/request', async route => {
    sends++
    await requestGate
    await route.fulfill({ status: 202, json: { ok: true, expiresInSeconds: 300, resendInSeconds: 180 } })
  })
  await page.route('**/api/security/otp/verify', async route => {
    await verificationGate
    await route.fulfill({ status: 503, json: { ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Intenta nuevamente.' } } })
  })
  await page.goto('/solicitud-nuevo')
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill('test@example.test')
  await page.getByRole('button', { name: 'CAPTCHA de prueba' }).click()
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enviando código...' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled()
  expect(sends).toBe(1)
  releaseRequest()
  await expect(page.getByLabel('Código de verificación', { exact: true })).toBeFocused()
  await page.getByLabel('Código de verificación', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Verificar código y continuar' }).click()
  await expect(page.getByRole('button', { name: 'Verificando...' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cambiar correo' })).toBeDisabled()
  releaseVerification()
  await expect(page.locator('form').getByRole('alert')).toContainText('Intenta nuevamente.')
  await expect(page.getByRole('button', { name: 'Verificar código y continuar' })).toBeEnabled()
})

for (const width of [320, 390, 768, 1366]) {
  test(`Guided verification layout and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockRequest(page)
    await page.goto('/solicitud-nuevo')
    // Interacting with the form waits for hydration before capturing the page.
    await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill('test@example.test')
    await expect(page.getByRole('button', { name: 'CAPTCHA de prueba' })).toBeVisible()
    for (const stage of ['email', 'code']) {
      if (stage === 'code') await sendCode(page)
      const illustration = page.locator('form img')
      if (width >= 768) {
        await expect(illustration).toBeVisible()
        await expect.poll(() => illustration.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      } else await expect(illustration).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const button = page.getByRole('button', { name: stage === 'email' ? 'Enviar código' : 'Verificar código y continuar', exact: true })
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      if (stage === 'email') expect(await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
      await page.screenshot({ path: `.next-e2e/verification-${stage}-${width}.png`, fullPage: true })
      const accessibility = await new AxeBuilder({ page }).include('form').analyze()
      expect(accessibility.violations).toEqual([])
    }
  })
}
