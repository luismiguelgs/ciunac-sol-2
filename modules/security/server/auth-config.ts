import 'server-only'
import { CredentialsSignin, type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { NEW_STUDENT_SESSION_SECONDS, newStudentRedirect, socialEmailPolicy } from '../domain/new-student-auth'
import { getAppOrigin, getAuthSecret, getOtpSessionSecret } from './environment'
import { readServerOtpChallenge, saveServerOtpChallenge } from './session'
import { verifyEmailOtp } from './verify-email-otp'
import { SecurityError } from './security-error'

export class OtpSignInError extends CredentialsSignin {
  constructor(readonly securityError: SecurityError) {
    super()
    this.code = securityError.code
  }
}

export function availableNewStudentProviders() {
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()),
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
})

export function createAuthConfig(): NextAuthConfig {
  const providers: NextAuthConfig['providers'] = [Credentials({
    id: 'email-otp',
    name: 'Correo con código',
    credentials: { email: {}, code: {} },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials)
      if (!parsed.success) throw new OtpSignInError(new SecurityError('INVALID_REQUEST', 400, 'Invalid OTP input'))
      try {
        const result = verifyEmailOtp(await readServerOtpChallenge(), {
          ...parsed.data, purpose: 'NUEVO',
        }, getOtpSessionSecret())
        await saveServerOtpChallenge(!result.ok && result.code === 'VERIFICATION_FAILED' ? result.challenge : null)
        if (!result.ok) {
          throw new SecurityError(result.code, result.code === 'MAX_ATTEMPTS' ? 429 : 400, 'OTP rejected')
        }
        return { id: `email-otp:${result.challenge.challengeId}`, email: result.challenge.email }
      } catch (error) {
        if (error instanceof SecurityError) throw new OtpSignInError(error)
        throw error
      }
    },
  })]
  const available = availableNewStudentProviders()
  if (available.google) providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: { params: { scope: 'openid profile email' } },
    checks: ['pkce', 'state', 'nonce'],
  }))
  return {
    providers,
    secret: getAuthSecret(),
    trustHost: true,
    session: { strategy: 'jwt', maxAge: NEW_STUDENT_SESSION_SECONDS },
    pages: { signIn: '/solicitud-nuevo', error: '/solicitud-nuevo' },
    callbacks: {
      async signIn({ account, profile }) {
        return account?.provider === 'email-otp'
          || socialEmailPolicy(account?.provider ?? '', profile ?? {}).allowed
      },
      async jwt({ token, user, account, profile }) {
        if (account && user) {
          const provider = account.provider
          if (provider !== 'google' && provider !== 'email-otp') return null
          const policy = provider === 'email-otp'
            ? { email: user.email, verified: true }
            : socialEmailPolicy(provider, profile ?? {})
          token.email = policy.email
          token.newStudent = {
            purpose: 'NUEVO', provider, emailVerified: policy.verified,
            expiresAt: Date.now() + NEW_STUDENT_SESSION_SECONDS * 1000,
          }
        }
        // Ignore session/update data from the browser, including email and expiry.
        if (!token.newStudent || token.newStudent.expiresAt <= Date.now()
          || !['google', 'email-otp'].includes(token.newStudent.provider)) return null
        return token
      },
      async session({ token }) {
        return {
          user: { email: token.email ?? null },
          newStudent: token.newStudent,
          expires: new Date(token.newStudent!.expiresAt).toISOString(),
        }
      },
      async redirect({ url }) { return newStudentRedirect(url, getAppOrigin()) },
    },
    logger: {
      // Auth.js errors can include credentials/provider data. Log only the class.
      error(error) { console.error('[auth]', error.name) },
      warn(code) { console.warn('[auth]', code) },
    },
  }
}
