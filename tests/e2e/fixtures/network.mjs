// Loaded only by the test runner's child Node processes. Application code has no test bypass.
import { createHash, createSign, generateKeyPairSync } from 'node:crypto'
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'

if (process.env.CIUNAC_E2E !== '1') throw new Error('Network doubles must only run in the isolated E2E process')
const originalFetch = globalThis.fetch
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
const registrations = new Map()
const failedCodes = new Set()
function record(value) {
  mkdirSync(resolve('.next-e2e'), { recursive: true })
  appendFileSync(resolve('.next-e2e/student-events.jsonl'), JSON.stringify(value) + '\n')
}
function jwt(claims) {
  const data = [{ alg: 'RS256', kid: 'test-key' }, claims].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  return `${data}.${createSign('RSA-SHA256').update(data).sign(privateKey).toString('base64url')}`
}

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return originalFetch(input, init)
  if (url.hostname === 'api.q10.com' && url.pathname === '/v1/programas') {
    return json([{ Codigo: 'TEST', Nombre: 'Inglés de prueba', Numero_resolucion: null }])
  }
  if (url.hostname === 'www.google.com' && url.pathname.endsWith('/siteverify')) return json({ success: true })
  if (url.hostname === 'ciunac.test') {
    if (url.pathname === '/facultades') return json([{ id: 1, nombre: 'Facultad de prueba', codigo: 'TEST' }])
    if (url.pathname === '/escuelas') return json([
      { id: 10, nombre: 'Escuela pregrado', facultadId: 1, tipo: 'PRE' },
      { id: 11, nombre: 'Escuela posgrado', facultadId: 1, tipo: 'POS' },
      { id: 12, nombre: 'Escuela histórica', facultadId: 1, tipo: null },
    ])
    if (url.pathname === '/upload/DNIS') {
      const form = init?.body
      if (!(form instanceof FormData) || !(form.get('file') instanceof File) || form.has('fileId')) return json({}, 400)
      const id = 'fixture-' + createHash('sha256').update(String(form.get('nombre'))).digest('hex').slice(0, 12)
      record({ event: 'upload', name: form.get('nombre'), id })
      return json({ success: true, id, name: form.get('nombre') + '.pdf', folder: 'DNIS', viewLink: `https://drive.google.com/file/d/${id}/view`, downloadLink: `https://drive.google.com/uc?id=${id}` })
    }
    if (url.pathname === '/mailer') {
      const body = JSON.parse(init?.body ?? '{}')
      if (body.type === 'RANDOM') {
        mkdirSync(resolve('.next-e2e'), { recursive: true })
        writeFileSync(resolve('.next-e2e/test-mail.json'), JSON.stringify({ email: body.email, code: String(body.number) }))
      }
      return json({ accepted: true })
    }
    if (url.pathname === '/q10/estudiantes') {
      const body = JSON.parse(init?.body ?? '{}')
      record({ event: 'register', body })
      if (Object.hasOwn(body, 'codigo')) return json({}, 400)
      if (body.Numero_identificacion === '00000003') return json({ code: 'Q10_CREATED_PROGRAM_PENDING', retryAllowed: false }, 502)
      const id = `00000000-0000-4000-8000-${body.Numero_identificacion.padStart(12, '0')}`
      registrations.set(id, body)
      return json({ status: 'COMPLETED', programaRegistrado: true, estudiante: { id, idQ10: 'Q10-' + body.Numero_identificacion, numeroDocumento: body.Numero_identificacion } })
    }
    if (url.pathname.startsWith('/estudiantes/') && init?.method === 'PATCH') {
      const id = url.pathname.split('/').at(-1)
      const body = JSON.parse(init.body)
      record({ event: 'code', id, codigo: body.codigo })
      if (!registrations.has(id) || Object.keys(body).join() !== 'codigo') return json({}, 400)
      if (body.codigo === 'RETRY-CODE' && !failedCodes.has(id)) { failedCodes.add(id); return json({}, 503) }
      return json({ id, codigo: body.codigo })
    }
    throw new Error('Unexpected CIUNAC operation in authentication tests')
  }
  if (url.hostname === 'accounts.google.com') {
    const base = url.origin
    if (url.pathname.endsWith('/.well-known/openid-configuration')) return json({
      issuer: 'https://accounts.google.com',
      authorization_endpoint: `${base}/test/authorize`, token_endpoint: `${base}/test/token`, userinfo_endpoint: `${base}/test/userinfo`,
      jwks_uri: `${base}/test/jwks`, response_types_supported: ['code'], subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      code_challenge_methods_supported: ['S256'],
    })
    if (url.pathname === '/test/jwks') return json({ keys: [jwk] })
    if (url.pathname === '/test/token') {
      const form = new URLSearchParams(init?.body ?? (input instanceof Request ? await input.text() : ''))
      const code = JSON.parse(Buffer.from(form.get('code'), 'base64url').toString())
      if (code.challenge && createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url') !== code.challenge) {
        return json({ error: 'invalid_grant' }, 400)
      }
      const claims = {
        iss: 'https://accounts.google.com', sub: 'test-subject-google', aud: 'test-google-client',
        iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300,
        ...(code.nonce ? { nonce: code.nonce } : {}),
        email: code.mode === 'verified' ? 'test@gmail.com' : 'test@example.test', email_verified: true,
      }
      return json({ access_token: 'test-access-token', token_type: 'Bearer', expires_in: 300, id_token: jwt(claims) })
    }
  }
  throw new Error(`Blocked external network in E2E fixture: ${url.origin}${url.pathname}`)
}
