import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextAuthConfig } from 'next-auth'
import { createOtpChallenge } from '@/modules/security/server/otp'
import { createAuthConfig, OtpSignInError, availableNewStudentProviders } from '@/modules/security/server/auth-config'
import type Credentials from 'next-auth/providers/credentials'
import { readServerOtpChallenge, saveServerOtpChallenge } from '@/modules/security/server/session'

vi.mock('@/modules/security/server/session', () => ({
  readServerOtpChallenge: vi.fn(), saveServerOtpChallenge: vi.fn(),
}))

const secret = 'test-only-secret-with-more-than-32-bytes'
type JwtCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>
type SessionCallback = NonNullable<NonNullable<NextAuthConfig['callbacks']>['session']>
beforeEach(() => {
  vi.useRealTimers()
  vi.stubEnv('AUTH_SECRET', secret)
  vi.stubEnv('OTP_SESSION_SECRET', secret)
  for (const name of ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_MICROSOFT_ENTRA_ID_ID', 'AUTH_MICROSOFT_ENTRA_ID_SECRET']) vi.stubEnv(name, '')
})

describe('Auth.js configuration and callbacks', () => {
  it('only enables completely configured social providers', () => {
    expect(availableNewStudentProviders()).toEqual({ google: false })
    vi.stubEnv('AUTH_GOOGLE_ID', 'test-id')
    expect(availableNewStudentProviders().google).toBe(false)
    vi.stubEnv('AUTH_GOOGLE_SECRET', 'test-secret')
    expect(availableNewStudentProviders().google).toBe(true)
    expect(createAuthConfig().providers).toHaveLength(2)
  })
  it('requires an independent Auth.js secret', () => {
    vi.stubEnv('AUTH_SECRET', '')
    expect(createAuthConfig).toThrow('Missing server configuration: AUTH_SECRET')
  })
  it('expires absolutely and ignores browser-supplied session updates', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const jwt = createAuthConfig().callbacks!.jwt!
    const token = await jwt({ token: { sub: 'provider-subject' }, user: { id: 'provider-subject' },
      account: { provider: 'google', type: 'oidc', providerAccountId: 'provider-subject' },
      profile: { email: 'test@gmail.com', email_verified: true },
    } as Parameters<JwtCallback>[0])
    expect(token?.newStudent).toMatchObject({ emailVerified: true, expiresAt: 901000 })
    vi.setSystemTime(500000)
    const updated = await jwt({ token, trigger: 'update', session: {
      email: 'attacker@example.test', newStudent: { expiresAt: 99999999 },
    } } as Parameters<JwtCallback>[0])
    expect(updated?.email).toBe('test@gmail.com')
    expect(updated?.newStudent?.expiresAt).toBe(901000)
    vi.setSystemTime(901000)
    expect(await jwt({ token } as Parameters<JwtCallback>[0])).toBeNull()
    vi.useRealTimers()
  })
  it('keeps unaccredited social logins pending and exposes no OAuth tokens', async () => {
    const config = createAuthConfig()
    const token = await config.callbacks!.jwt!({ token: {}, user: { id: 'sub' },
      account: { provider: 'google', type: 'oidc', providerAccountId: 'sub', access_token: 'must-not-leak' },
      profile: { email: 'test@example.test', email_verified: true },
    } as Parameters<JwtCallback>[0])
    expect(token?.newStudent?.emailVerified).toBe(false)
    const session = await config.callbacks!.session!({ token, session: {} } as Parameters<SessionCallback>[0])
    expect(Object.keys(session).sort()).toEqual(['expires', 'newStudent', 'user'])
    expect(session.user).toEqual({ email: 'test@example.test' })
    expect(JSON.stringify(session)).not.toContain('must-not-leak')
  })
  it('does not register Microsoft even when its credentials are configured', () => {
    vi.stubEnv('AUTH_MICROSOFT_ENTRA_ID_ID', 'test-microsoft-client')
    vi.stubEnv('AUTH_MICROSOFT_ENTRA_ID_SECRET', 'test-secret')
    expect(availableNewStudentProviders()).toEqual({ google: false })
    expect(createAuthConfig().providers).toHaveLength(1)
  })
  it('rejects Microsoft in the sign-in callback', async () => {
    const signIn = createAuthConfig().callbacks!.signIn!
    expect(await signIn({ user: { id: 'test' }, account: { provider: 'microsoft-entra-id', type: 'oidc', providerAccountId: 'test' }, profile: { tid: 'organization' } })).toBe(false)
  })
  it('invalidates previously issued Microsoft sessions', async () => {
    const jwt = createAuthConfig().callbacks!.jwt!
    const token = { email: 'test@example.test', newStudent: {
      purpose: 'NUEVO', provider: 'microsoft-entra-id', emailVerified: true, expiresAt: Date.now() + 900000,
    } }
    expect(await jwt({ token } as Parameters<JwtCallback>[0])).toBeNull()
  })
})

describe('TEST-SEG-005 / email-otp Credentials', () => {
  function authorize() {
    const provider = createAuthConfig().providers[0] as ReturnType<typeof Credentials> & {
      options: { authorize: ReturnType<typeof Credentials>['authorize'] }
    }
    return provider.options!.authorize!
  }
  function challenge(purpose: 'NUEVO' | 'BECA' = 'NUEVO') {
    return createOtpChallenge({ email: 'test@example.test', purpose, secret, generateCode: () => '123456' }).challenge
  }
  it('consumes a matching code and returns only a verified identity', async () => {
    vi.mocked(readServerOtpChallenge).mockResolvedValue(challenge())
    const user = await authorize()({ email: ' Test@Example.test ', code: '123456' }, new Request('https://portal.test'))
    expect(user?.email).toBe('test@example.test')
    expect(saveServerOtpChallenge).toHaveBeenCalledWith(null)
  })
  it('decrements attempts on failure and clears terminal challenges', async () => {
    const issued = challenge()
    vi.mocked(readServerOtpChallenge).mockResolvedValue(issued)
    await expect(authorize()({ email: issued.email, code: '654321' }, new Request('https://portal.test'))).rejects.toBeInstanceOf(OtpSignInError)
    expect(saveServerOtpChallenge).toHaveBeenLastCalledWith(expect.objectContaining({ attemptsRemaining: 4 }))
    vi.mocked(readServerOtpChallenge).mockResolvedValue({ ...issued, attemptsRemaining: 1 })
    await expect(authorize()({ email: issued.email, code: '654321' }, new Request('https://portal.test'))).rejects.toMatchObject({ code: 'MAX_ATTEMPTS' })
    expect(saveServerOtpChallenge).toHaveBeenLastCalledWith(null)
  })
  it.each(['email', 'purpose', 'expired', 'consumed', 'missing'])( 'rejects a mismatching %s challenge', async (kind) => {
    const issued = challenge(kind === 'purpose' ? 'BECA' : 'NUEVO')
    if (kind === 'email') issued.email = 'other@example.test'
    if (kind === 'expired') issued.expiresAt = Date.now() - 1
    if (kind === 'consumed') issued.consumedAt = Date.now()
    vi.mocked(readServerOtpChallenge).mockResolvedValue(kind === 'missing' ? null : issued)
    await expect(authorize()({ email: 'test@example.test', code: '123456' }, new Request('https://portal.test'))).rejects.toBeInstanceOf(OtpSignInError)
  })
})
