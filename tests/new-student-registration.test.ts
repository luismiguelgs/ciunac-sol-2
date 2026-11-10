import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { academicDataSchema, schoolOptions, validateAcademicCatalog, type AcademicCatalog } from '@/modules/solicitud-nuevo/academic'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { readNewStudentVerifiedSession } from '@/modules/security/server/new-student-session'
import { POST as upload } from '@/app/api/solicitud-nuevo/documento/route'
import { POST as retryCode } from '@/app/api/solicitud-nuevo/codigo/route'
import { saveUploadProof, readUploadProof, readRegistrationProof } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session'
import { validateNewStudentRequest } from '@/modules/solicitud-nuevo/infrastructure/server/new-student-request-validation'
import { getNewStudentPrograms } from '@/modules/solicitud-nuevo/infrastructure/server/q10-program.repository'
import { registerNewStudentOnServer } from '@/modules/solicitud-nuevo/infrastructure/server/registration'
import { q10StudentRequestSchema } from '@/modules/solicitud-nuevo/infrastructure/q10-api.schemas'
import { SecurityError } from '@/modules/security/server/security-error'

const jar = vi.hoisted(() => new Map<string, string>())
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => jar.has(name) ? { value: jar.get(name) } : undefined,
  set: (name: string, value: string) => jar.set(name, value) }) }))
vi.mock('@/modules/security/server/ciunac-client', () => ({ ciunacRequest: vi.fn() }))
vi.mock('@/modules/security/server/new-student-session', () => ({ readNewStudentVerifiedSession: vi.fn() }))
vi.mock('@/modules/solicitud-nuevo/infrastructure/server/q10-program.repository', () => ({ getNewStudentPrograms: vi.fn() }))
const session = { kind: 'verified-email' as const, purpose: 'NUEVO' as const, email: 'test@example.test', expiresAt: Date.now() + 900000 }
const catalog: AcademicCatalog = { facultades: [{ id: 1, nombre: 'Facultad de prueba' }, { id: 2, nombre: 'Otra facultad' }], escuelas: [
  { id: 10, nombre: 'Escuela PRE', facultadId: 1, tipo: 'PRE' }, { id: 11, nombre: 'Escuela POS', facultadId: 1, tipo: 'POS' },
  { id: 12, nombre: 'Histórica sin clasificar', facultadId: 1, tipo: null }, { id: 20, nombre: 'Otra PRE', facultadId: 2, tipo: 'PRE' },
] }
const drive = { success: true, id: 'test-file', name: 'test.pdf', folder: 'DNIS', viewLink: 'https://drive.google.com/file/d/test-file/view', downloadLink: 'https://drive.google.com/uc?id=test-file' }
const completed = { status: 'COMPLETED', estudiante: { id: '11111111-1111-4111-8111-111111111111', idQ10: 'test-q10', numeroDocumento: '00000000' }, programaRegistrado: true }
const body = { Primer_apellido: 'PRUEBA', Segundo_apellido: 'FICTICIA', Primer_nombre: 'ALUMNO', Email: session.email,
  Codigo_tipo_identificacion: 'PE01', Numero_identificacion: '00000000', Genero: 'F', Fecha_nacimiento: '2000-01-01T00:00:00.000Z',
  Telefono: '900000000', Celular: '900000000', Codigo_programa: 'TEST', tipoEstudiante: 'PRE', facultadId: 1, escuelaId: 10, codigo: 'TEST-CODE', imgDoc: drive.viewLink }
function jsonRequest(data: object = {}, origin = 'https://portal.test') {
  return new NextRequest('https://portal.test/api/solicitud-nuevo/codigo', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) })
}
function uploadRequest(file = new File(['%PDF-1.7\nfixture'], 'test.pdf', { type: 'application/pdf' }), extra?: [string, string]) {
  const form = new FormData(); form.set('file', file); form.set('documentType', 'DNI'); form.set('documentNumber', '00000000')
  if (extra) form.set(...extra)
  return new NextRequest('https://portal.test/api/solicitud-nuevo/documento', { method: 'POST', headers: { origin: 'https://portal.test' }, body: form })
}
async function seedUpload() { await saveUploadProof({ id: drive.id, name: drive.name, viewLink: drive.viewLink, documentType: 'DNI', documentNumber: '00000000', email: session.email, expiresAt: session.expiresAt }) }
beforeEach(() => {
  jar.clear(); vi.stubEnv('OTP_SESSION_SECRET', 'test-only-flow-secret-at-least-32-bytes'); vi.stubEnv('APP_BASE_URL', 'https://portal.test')
  vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(session)
  vi.mocked(getNewStudentPrograms).mockResolvedValue([{ code: 'TEST', name: 'Programa de prueba' }])
  vi.mocked(ciunacRequest).mockImplementation(async (path, options) => {
    if (path === 'facultades') return catalog.facultades
    if (path === 'escuelas') return catalog.escuelas
    if (path === 'upload/DNIS') return drive
    if (path === 'q10/estudiantes') return completed
    if (path === `estudiantes/${completed.estudiante.id}`) return { id: completed.estudiante.id, ...(options?.body as object) }
    throw new Error('Unexpected provider call')
  })
})

describe('CA-AN-016..019/030: explicit academic category', () => {
  it.each(['PG', 'PRE', 'POS'] as const)('limits student code to 10 characters for %s in domain and transport', tipoEstudiante => {
    const valid = { tipoEstudiante, facultadId: 1, escuelaId: 10, codigo: '1234567890' }
    expect(academicDataSchema.safeParse(valid).success).toBe(true)
    expect(q10StudentRequestSchema.safeParse({ ...body, ...valid }).success).toBe(true)
    expect(academicDataSchema.safeParse({ ...valid, codigo: '12345678901' }).success).toBe(false)
    expect(q10StudentRequestSchema.safeParse({ ...body, ...valid, codigo: '12345678901' }).success).toBe(false)
  })
  it.each([
    { facultadId: null, escuelaId: null, codigo: null },
    { facultadId: 1, escuelaId: 10, codigo: 'TEST' },
    { facultadId: 1, escuelaId: null, codigo: null },
    { facultadId: null, escuelaId: 10, codigo: 'TEST' },
  ])('preserves each academic value for PG: %j', (values) => {
    expect(academicDataSchema.parse({ tipoEstudiante: 'PG', ...values })).toEqual({ tipoEstudiante: 'PG', ...values })
  })
  it('does not default a missing/historical category to PG', () => {
    expect(academicDataSchema.safeParse({ facultadId: null, escuelaId: null, codigo: null }).success).toBe(false)
    expect(academicDataSchema.safeParse({ tipoEstudiante: 'PRE', facultadId: 1, escuelaId: 10, codigo: null }).success).toBe(false)
  })
  it('filters by both faculty and level; unclassified schools are not offered', () => {
    const pre = { tipoEstudiante: 'PRE' as const, facultadId: 1, escuelaId: 10, codigo: 'TEST' }
    expect(schoolOptions(pre, catalog).map((s) => s.id)).toEqual([10])
    expect(schoolOptions({ ...pre, tipoEstudiante: 'POS' }, catalog).map((s) => s.id)).toEqual([11])
    expect(() => validateAcademicCatalog({ ...pre, escuelaId: 11 }, catalog)).toThrow()
    expect(() => validateAcademicCatalog({ ...pre, escuelaId: 12 }, catalog)).toThrow()
    expect(() => validateAcademicCatalog({ ...pre, facultadId: 2 }, catalog)).toThrow()
  })
})

describe('CA-AN-031..033: identity document upload', () => {
  it('uploads only to DNIS and binds the returned viewLink to email/document', async () => {
    const response = await upload(uploadRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ viewLink: drive.viewLink, documentNumber: '00000000' })
    const call = vi.mocked(ciunacRequest).mock.calls[0]
    expect(call[0]).toBe('upload/DNIS')
    expect((call[1]?.body as FormData).get('nombre')).toMatch(/^DOCUMENTO_IDENTIDAD_00000000_/)
    expect(await readUploadProof()).toMatchObject({ email: session.email, documentNumber: '00000000', viewLink: drive.viewLink })
  })
  it.each([
    new File([], 'empty.pdf', { type: 'application/pdf' }),
    new File(['not-pdf'], 'fake.pdf', { type: 'application/pdf' }),
    new File(['%PDF-1.7'], 'fake.exe', { type: 'application/pdf' }),
    new File(['<svg/>'], 'fake.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }),
  ])('rejects invalid file $name before calling Drive', async (file) => {
    expect([400, 413]).toContain((await upload(uploadRequest(file))).status)
    expect(ciunacRequest).not.toHaveBeenCalled()
  })
  it('rejects arbitrary file IDs/folders and unauthenticated uploads', async () => {
    expect((await upload(uploadRequest(undefined, ['fileId', 'another-file']))).status).toBe(400)
    vi.mocked(readNewStudentVerifiedSession).mockResolvedValue(null)
    expect((await upload(uploadRequest())).status).toBe(401)
    expect(ciunacRequest).not.toHaveBeenCalled()
  })
  it('rejects an invalid upload response without issuing proof', async () => {
    vi.mocked(ciunacRequest).mockResolvedValueOnce({ ...drive, success: false })
    expect((await upload(uploadRequest())).status).toBe(502)
    expect(await readUploadProof()).toBeNull()
  })
  it('rejects links, documents or identities that do not match the upload', async () => {
    await seedUpload()
    await expect(validateNewStudentRequest({ ...body, imgDoc: 'https://drive.google.com/file/d/another/view' }, session)).rejects.toMatchObject({ status: 422 })
    await expect(validateNewStudentRequest({ ...body, Numero_identificacion: '11111111' }, session)).rejects.toMatchObject({ status: 422 })
    await expect(validateNewStudentRequest({ ...body, Email: 'other@example.test' }, { ...session, email: 'other@example.test' })).rejects.toMatchObject({ status: 422 })
    jar.set('ciunac_new_student_upload', 'tampered')
    await expect(validateNewStudentRequest(body, session)).rejects.toMatchObject({ status: 422 })
    expect(ciunacRequest).not.toHaveBeenCalled()
  })
})

describe('CA-AN-034/035: registration and local code recovery', () => {
  it('sends classification/document to the backend, then code only to the returned CIUNAC ID', async () => {
    await seedUpload()
    const valid = await validateNewStudentRequest(body, session)
    expect(await registerNewStudentOnServer(valid, session)).toEqual(completed)
    const create = vi.mocked(ciunacRequest).mock.calls.find(([path]) => path === 'q10/estudiantes')!
    expect(create[1]?.body).toMatchObject({ tipoEstudiante: 'PRE', facultadId: 1, escuelaId: 10, imgDoc: drive.viewLink })
    expect(create[1]?.body).not.toHaveProperty('codigo')
    expect(create[1]?.body).not.toHaveProperty('Direccion')
    expect(ciunacRequest).toHaveBeenCalledWith(`estudiantes/${completed.estudiante.id}`, { method: 'PATCH', body: { codigo: 'TEST-CODE' } })
    expect((await readRegistrationProof())?.status).toBe('completed')
    await registerNewStudentOnServer(valid, session)
    expect(vi.mocked(ciunacRequest).mock.calls.filter(([path]) => path === 'q10/estudiantes')).toHaveLength(1)
  })
  it.each([
    { facultadId: null, escuelaId: null, codigo: null },
    { facultadId: 1, escuelaId: null, codigo: null },
    { facultadId: 1, escuelaId: 10, codigo: 'TEST-CODE' },
  ])('keeps PG null/partial/full values in the registration payload: %j', async (values) => {
    const pg = q10StudentRequestSchema.parse({ ...body, tipoEstudiante: 'PG', ...values })
    await registerNewStudentOnServer(pg, session)
    expect(ciunacRequest).toHaveBeenCalledWith('q10/estudiantes', { method: 'POST', body: expect.objectContaining({ tipoEstudiante: 'PG', facultadId: values.facultadId, escuelaId: values.escuelaId }) })
    expect(vi.mocked(ciunacRequest).mock.calls.filter(([path]) => path === 'q10/estudiantes')).toHaveLength(1)
  })
  it('retries only code after PATCH failure; client cannot choose another ID or code', async () => {
    const base = vi.mocked(ciunacRequest).getMockImplementation()!
    let failed = false
    vi.mocked(ciunacRequest).mockImplementation(async (path, options) => {
      if (path.startsWith('estudiantes/') && !failed) { failed = true; throw new Error('Temporary save failure') }
      return base(path, options)
    })
    const input = q10StudentRequestSchema.parse(body)
    expect(await registerNewStudentOnServer(input, session)).toEqual({ status: 'CODE_PENDING', documentNumber: '00000000' })
    expect((await retryCode(jsonRequest({ id: 'attacker-id', codigo: 'wrong' }))).status).toBe(400)
    expect((await retryCode(jsonRequest())).status).toBe(200)
    expect((await readRegistrationProof())?.status).toBe('completed')
    expect(vi.mocked(ciunacRequest).mock.calls.filter(([path]) => path === 'q10/estudiantes')).toHaveLength(1)
    await expect(registerNewStudentOnServer({ ...input, codigo: 'changed' }, session)).rejects.toMatchObject({ status: 409 })
  })
  it.each([null, { recorded: true }, { ...completed, programaRegistrado: false }, { ...completed, estudiante: { ...completed.estudiante, numeroDocumento: '11111111' } }])('does not announce completion for invalid or partial results: %j', async (value) => {
    vi.mocked(ciunacRequest).mockResolvedValueOnce(value)
    await expect(registerNewStudentOnServer(q10StudentRequestSchema.parse(body), session)).rejects.toMatchObject({ status: 502 })
    await expect(registerNewStudentOnServer(q10StudentRequestSchema.parse(body), session)).rejects.toMatchObject({ status: 409 })
    expect(ciunacRequest).toHaveBeenCalledTimes(1)
  })
  it('does not retry an uncertain provider failure and does not PATCH anything', async () => {
    vi.mocked(ciunacRequest).mockRejectedValueOnce(new SecurityError('UPSTREAM_ERROR', 503, 'partial'))
    await expect(registerNewStudentOnServer(q10StudentRequestSchema.parse(body), session)).rejects.toThrow()
    expect((await readRegistrationProof())?.status).toBe('indeterminate')
    expect((await retryCode(jsonRequest())).status).toBe(409)
    expect(ciunacRequest).toHaveBeenCalledTimes(1)
  })
})
