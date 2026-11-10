import { describe, expect, it } from 'vitest'
import {
  isVerifiedNewStudentSession, socialEmailPolicy, newStudentRedirect,
  type NewStudentSession,
} from '@/modules/security/domain/new-student-auth'

describe('TEST-AN-009..011 / TEST-SEG-011..012: provider email policy', () => {
  it('accepts verified Gmail and Workspace without requiring OTP', () => {
    expect(socialEmailPolicy('google', { email: ' Test@Gmail.com ', email_verified: true }).verified).toBe(true)
    expect(socialEmailPolicy('google', { email: 'test@example.test', email_verified: true, hd: 'example.test' }).verified).toBe(true)
  })
  it.each([
    { email: 'test@gmail.com', email_verified: false },
    { email: 'test@gmail.com', email_verified: 'true' },
    { email: 'test@example.test', email_verified: true },
    { email: 'invalid', email_verified: true }, {},
  ])('requires OTP for insufficient Google email evidence: %j', (profile) => {
    expect(socialEmailPolicy('google', profile)).toMatchObject({ allowed: true, verified: false })
  })
  it('rejects Microsoft and unknown providers in this iteration', () => {
    expect(socialEmailPolicy('microsoft-entra-id', { email: 'test@example.test' }).allowed).toBe(false)
    expect(socialEmailPolicy('unknown', {} ).allowed).toBe(false)
  })
})

describe('NUEVO session boundary and redirects', () => {
  const session: NewStudentSession = {
    user: { email: 'test@example.test' },
    newStudent: { purpose: 'NUEVO', provider: 'google', emailVerified: true, expiresAt: 1000 },
  }
  it('requires usable email, explicit verification and strictly future absolute expiry', () => {
    expect(isVerifiedNewStudentSession(session, 999)).toBe(true)
    expect(isVerifiedNewStudentSession(session, 1000)).toBe(false)
    expect(isVerifiedNewStudentSession(null, 0)).toBe(false)
    expect(isVerifiedNewStudentSession({ ...session, user: { email: null } }, 0)).toBe(false)
    expect(isVerifiedNewStudentSession({ ...session, newStudent: { ...session.newStudent!, emailVerified: false } }, 0)).toBe(false)
    expect(isVerifiedNewStudentSession({ user: session.user }, 0)).toBe(false)
    const retired = { ...session, newStudent: { ...session.newStudent!, provider: 'microsoft-entra-id' } }
    expect(isVerifiedNewStudentSession(retired as NewStudentSession, 0)).toBe(false)
  })
  it.each(['https://attacker.test/', '//attacker.test/solicitud-nuevo', '/consulta-solicitud', '/api/ciunac/q10/estudiantes', 'javascript:alert(1)'])(
    'rejects return URL %s', (url) => expect(newStudentRedirect(url, 'https://portal.test')).toBe('https://portal.test/solicitud-nuevo'),
  )
  it('accepts only the local workflow entry', () => {
    expect(newStudentRedirect('/solicitud-nuevo', 'https://portal.test')).toBe('https://portal.test/solicitud-nuevo')
  })
})
