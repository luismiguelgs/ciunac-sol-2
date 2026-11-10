import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as verify } from '@/app/api/security/otp/verify/route'
import { POST as notify } from '@/app/api/security/notifications/route'
import { POST as proxy } from '@/app/api/ciunac/[...path]/route'
import { signIn } from '@/auth'
import { OtpSignInError } from '@/modules/security/server/auth-config'
import { SecurityError } from '@/modules/security/server/security-error'
import { readNewStudentVerifiedSession } from '@/modules/security/server/new-student-session'
import { readVerifiedSessionFromRequest, readOtpChallenge, writeVerifiedSession } from '@/modules/security/server/session'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { getNewStudentPrograms } from '@/modules/solicitud-nuevo/infrastructure/server/q10-program.repository'
import { createOtpChallenge } from '@/modules/security/server/otp'
import { readUploadProof, readRegistrationProof } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session'

vi.mock('@/auth', () => ({ signIn: vi.fn() }))
vi.mock('@/modules/solicitud-nuevo/infrastructure/server/flow-session', () => ({ readUploadProof: vi.fn(), readRegistrationProof: vi.fn(), saveRegistrationProof: vi.fn() }))
vi.mock('@/modules/security/server/new-student-session', () => ({ readNewStudentVerifiedSession: vi.fn() }))
vi.mock('@/modules/security/server/ciunac-client', () => ({ ciunacRequest: vi.fn() }))
vi.mock('@/modules/solicitud-nuevo/infrastructure/server/q10-program.repository', () => ({ getNewStudentPrograms: vi.fn() }))
vi.mock('@/modules/security/server/session', () => ({
  readVerifiedSessionFromRequest: vi.fn(), readConsultationSessionFromRequest: vi.fn(),
  readOtpChallenge: vi.fn(), writeVerifiedSession: vi.fn(), clearOtpChallenge: vi.fn(),
  writeOtpChallenge: vi.fn(), writeNotificationReceipt: vi.fn(),
  readServerOtpChallenge: vi.fn(), saveServerOtpChallenge: vi.fn(),
}))

const secret = 'test-only-secret-with-more-than-32-bytes'
const verified = { kind: 'verified-email' as const, email: 'test@example.test', purpose: 'NUEVO' as const, expiresAt: Date.now() + 900000 }
const body = {
  Primer_apellido: 'PRUEBA', Segundo_apellido: 'FICTICIA', Primer_nombre: 'ALUMNO', Email: verified.email,
  Codigo_tipo_identificacion: 'PE01', Numero_identificacion: '00000000', Genero: 'F',
  Fecha_nacimiento: '2000-01-01T00:00:00.000Z', Telefono: '900000000', Celular: '900000000', Codigo_programa: 'TEST',
  tipoEstudiante: 'PG', facultadId: null, escuelaId: null, codigo: null, imgDoc: 'https://drive.google.com/file/d/test-file/view',
}
function request(path: string, body: object, origin = 'https://portal.test') {
  return new NextRequest(`https://portal.test${path}`, { method: 'POST',
    headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
const context = () => ({ params: Promise.resolve({ path: ['q10', 'estudiantes'] }) })
beforeEach(() => {
  vi.stubEnv('APP_BASE_URL', 'https://portal.test')
  vi.stubEnv('OTP_SESSION_SECRET', secret)
  vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(null)
  vi.mocked(readVerifiedSessionFromRequest).mockReturnValue(null)
  vi.mocked(ciunacRequest).mockResolvedValue({ status: 'COMPLETED', estudiante: { id: '11111111-1111-4111-8111-111111111111', idQ10: 'test-q10', numeroDocumento: '00000000' }, programaRegistrado: true })
  vi.mocked(readRegistrationProof).mockResolvedValue(null)
  vi.mocked(readUploadProof).mockResolvedValue({ id: 'test-file', name: 'test.pdf', documentType: 'DNI', documentNumber: '00000000', viewLink: body.imgDoc, email: verified.email, expiresAt: Date.now() + 900000 })
  vi.mocked(getNewStudentPrograms).mockResolvedValue([{ code: 'TEST', name: 'Programa de prueba' }])
})

describe('NUEVO OTP bridge and legacy compatibility', () => {
  it('starts Auth.js Credentials and keeps the public success shape', async () => {
    const response = await verify(request('/api/security/otp/verify', { email: verified.email, purpose: 'NUEVO', code: '123456' }))
    expect(await response.json()).toEqual({ ok: true })
    expect(signIn).toHaveBeenCalledWith('email-otp', { email: verified.email, code: '123456', redirect: false })
    expect(writeVerifiedSession).not.toHaveBeenCalled()
    expect(ciunacRequest).not.toHaveBeenCalled()
  })
  it('maps OTP rejection to the existing error envelope', async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new OtpSignInError(new SecurityError('MAX_ATTEMPTS', 429, 'private diagnostic')))
    const response = await verify(request('/api/security/otp/verify', { email: verified.email, purpose: 'NUEVO', code: '123456' }))
    expect(response.status).toBe(429)
    const result = await response.json()
    expect(result).toMatchObject({ ok: false, error: { code: 'MAX_ATTEMPTS' }, correlationId: expect.any(String) })
    expect(JSON.stringify(result)).not.toContain('private diagnostic')
  })
  it('keeps other OTP purposes on their existing session mechanism', async () => {
    const { challenge } = createOtpChallenge({ email: verified.email, purpose: 'BECA', secret, generateCode: () => '123456' })
    vi.mocked(readOtpChallenge).mockReturnValue(challenge)
    const response = await verify(request('/api/security/otp/verify', { email: verified.email, purpose: 'BECA', code: '123456' }))
    expect(response.status).toBe(200)
    expect(writeVerifiedSession).toHaveBeenCalledWith(expect.anything(), verified.email, 'BECA')
    expect(signIn).not.toHaveBeenCalled()
  })
})

describe('TEST-SEG-007..009: deny before external calls', () => {
  it('does not accept a legacy NUEVO cookie for registration or REGISTER', async () => {
    vi.mocked(readVerifiedSessionFromRequest).mockReturnValue(verified)
    expect((await proxy(request('/api/ciunac/q10/estudiantes', body), context())).status).toBe(401)
    expect((await notify(request('/api/security/notifications', { type: 'REGISTER', reference: '00000000' }))).status).toBe(401)
    expect(ciunacRequest).not.toHaveBeenCalled()
    expect(getNewStudentPrograms).not.toHaveBeenCalled()
  })
  it('rejects forged origin before OTP sign-in or notification', async () => {
    vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(verified)
    expect((await verify(request('/api/security/otp/verify', {}, 'https://attacker.test'))).status).toBe(403)
    expect((await notify(request('/api/security/notifications', { type: 'REGISTER', reference: '00000000' }, 'https://attacker.test'))).status).toBe(403)
    expect(signIn).not.toHaveBeenCalled()
    expect(ciunacRequest).not.toHaveBeenCalled()
  })
  it('revalidates body email and program with the Auth.js identity', async () => {
    vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(verified)
    expect((await proxy(request('/api/ciunac/q10/estudiantes', { ...body, Email: 'other@example.test' }), context())).status).toBe(422)
    expect(ciunacRequest).not.toHaveBeenCalled()
    vi.mocked(getNewStudentPrograms).mockResolvedValueOnce([])
    expect((await proxy(request('/api/ciunac/q10/estudiantes', body), context())).status).toBe(422)
    expect(ciunacRequest).not.toHaveBeenCalled()
    expect((await proxy(request('/api/ciunac/q10/estudiantes', body), context())).status).toBe(200)
    const { codigo, ...providerBody } = body
    void codigo
    expect(ciunacRequest).toHaveBeenCalledExactlyOnceWith('q10/estudiantes', { method: 'POST', body: providerBody })
  })
  it('takes REGISTER recipient from the session and preserves receipt issuance', async () => {
    vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(verified)
    vi.mocked(readRegistrationProof).mockResolvedValue({ email: verified.email, documentNumber: '00000000', codigo: null, status: 'completed', expiresAt: Date.now() + 900000, requestHash: 'test' })
    const response = await notify(request('/api/security/notifications', { type: 'REGISTER', reference: '00000000' }))
    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ ok: true, receiptId: expect.any(String) })
    expect(ciunacRequest).toHaveBeenCalledExactlyOnceWith('mailer', { method: 'POST', body: { type: 'REGISTER', email: verified.email, user: '00000000' } })
  })
  it('does not grant student read/write or other notification purposes through Auth.js', async () => {
    vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(verified)
    expect((await proxy(request('/api/ciunac/estudiantes', {}), { params: Promise.resolve({ path: ['estudiantes'] }) })).status).toBe(401)
    expect((await notify(request('/api/security/notifications', { type: 'BECA', reference: '00000000' }))).status).toBe(401)
    expect(ciunacRequest).not.toHaveBeenCalled()
    expect(readNewStudentVerifiedSession).not.toHaveBeenCalled()
  })
  it('retains legacy permissions and recipient for other notifications', async () => {
    vi.mocked(readVerifiedSessionFromRequest).mockReturnValue({ ...verified, purpose: 'BECA' })
    const response = await notify(request('/api/security/notifications', { type: 'BECA', reference: '00000000' }))
    expect(response.status).toBe(202)
    expect(readNewStudentVerifiedSession).not.toHaveBeenCalled()
  })
})
