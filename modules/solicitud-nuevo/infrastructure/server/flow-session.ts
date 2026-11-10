import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { decryptToken, encryptToken } from '@/modules/security/server/token-crypto'
import { getOtpSessionSecret } from '@/modules/security/server/environment'
import { readNewStudentVerifiedSession } from '@/modules/security/server/new-student-session'
import { SecurityError } from '@/modules/security/server/security-error'
import { identityDocumentSchema } from '../../academic'
import { q10RegistrationResponseSchema } from '../q10-api.schemas'

const uploadProofSchema = identityDocumentSchema.extend({ email: z.email(), expiresAt: z.number() })
export type UploadProof = z.infer<typeof uploadProofSchema>
const registrationSchema = z.object({
  email: z.email(), documentNumber: z.string(), codigo: z.string().nullable(), expiresAt: z.number(),
  status: z.enum(['code_pending', 'completed', 'indeterminate']),
  requestHash: z.string(),
  result: q10RegistrationResponseSchema.optional(),
})
export type RegistrationProof = z.infer<typeof registrationSchema>
async function read<T extends { expiresAt: number }>(name: string, schema: z.ZodType<T>): Promise<T | null> {
  const value = (await cookies()).get(name)?.value
  if (!value) return null
  const parsed = schema.safeParse(decryptToken(value, getOtpSessionSecret()))
  return parsed.success && parsed.data.expiresAt > Date.now() ? parsed.data : null
}
async function write(name: string, value: { expiresAt: number }) {
  ;(await cookies()).set(name, encryptToken(value, getOtpSessionSecret()), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
    maxAge: Math.max(0, Math.floor((value.expiresAt - Date.now()) / 1000)),
  })
}
export const readUploadProof = () => read('ciunac_new_student_upload', uploadProofSchema)
export const saveUploadProof = (proof: UploadProof) => write('ciunac_new_student_upload', proof)
export const readRegistrationProof = () => read('ciunac_new_student_registration', registrationSchema)
export const saveRegistrationProof = (proof: RegistrationProof) => write('ciunac_new_student_registration', proof)
export async function requireNewStudent() {
  const session = await readNewStudentVerifiedSession()
  if (!session) throw new SecurityError('UNAUTHORIZED', 401, 'Verified NUEVO session required')
  return session
}
