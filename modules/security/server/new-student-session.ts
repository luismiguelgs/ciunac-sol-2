import 'server-only'
import { auth } from '@/auth'
import { isVerifiedNewStudentSession, normalizeAuthEmail } from '../domain/new-student-auth'
import type { VerifiedSession } from './session'

/** One server time snapshot keeps SSR and the first client render consistent. */
export async function readNewStudentPageSession() {
  return { session: await auth(), serverNow: Date.now() }
}

/** Narrow compatibility projection; never accepts the legacy NUEVO cookie. */
export async function readNewStudentVerifiedSession(): Promise<VerifiedSession | null> {
  const session = await auth()
  if (!isVerifiedNewStudentSession(session)) return null
  return {
    kind: 'verified-email', purpose: 'NUEVO',
    email: normalizeAuthEmail(session?.user?.email)!,
    expiresAt: session!.newStudent!.expiresAt,
  }
}
