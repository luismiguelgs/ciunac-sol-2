import { z } from 'zod'

export const NEW_STUDENT_SESSION_SECONDS = 15 * 60
export type NewStudentProvider = 'google' | 'email-otp'
export type NewStudentAuth = {
  purpose: 'NUEVO'
  provider: NewStudentProvider
  emailVerified: boolean
  expiresAt: number
}
export type NewStudentSession = {
  user?: { email?: string | null }
  newStudent?: NewStudentAuth
}

export function normalizeAuthEmail(value: unknown): string | null {
  const result = z.string().trim().email().max(254).safeParse(value)
  return result.success ? result.data.toLowerCase() : null
}

/** Called only with the profile validated by Auth.js, never browser-supplied claims. */
export function socialEmailPolicy(provider: string, profile: Record<string, unknown>) {
  const email = normalizeAuthEmail(profile.email)
  if (provider === 'google') {
    return {
      allowed: true,
      email,
      verified: Boolean(email && profile.email_verified === true
        && (email.endsWith('@gmail.com') || (typeof profile.hd === 'string' && profile.hd.length > 0))),
    }
  }
  return { allowed: false, email: null, verified: false }
}

export function isVerifiedNewStudentSession(
  session: NewStudentSession | null | undefined,
  now = Date.now(),
): boolean {
  const context = session?.newStudent
  return Boolean(context?.purpose === 'NUEVO' && context.emailVerified === true
    && ['google', 'email-otp'].includes(context.provider)
    && Number.isFinite(context.expiresAt) && context.expiresAt > now
    && normalizeAuthEmail(session?.user?.email))
}

export function newStudentRedirect(url: string, baseUrl: string): string {
  const home = new URL('/solicitud-nuevo', baseUrl)
  try {
    const target = new URL(url, baseUrl)
    if (target.origin === home.origin && target.pathname === home.pathname) return target.href
  } catch { /* Invalid return URLs use the fixed workflow entry. */ }
  return home.href
}
