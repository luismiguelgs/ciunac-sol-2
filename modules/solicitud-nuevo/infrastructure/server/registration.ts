import 'server-only'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { SecurityError } from '@/modules/security/server/security-error'
import type { VerifiedSession } from '@/modules/security/server/session'
import { q10RegistrationResponseSchema, type Q10StudentRequestDto } from '../q10-api.schemas'
import { readRegistrationProof, saveRegistrationProof, type RegistrationProof } from './flow-session'

export async function finishStudentCode(proof: RegistrationProof) {
  if (!proof.result || proof.status === 'indeterminate') throw new SecurityError('FORBIDDEN', 409, 'Registration outcome indeterminate')
  if (proof.status === 'completed') return proof.result
  try {
    const result = await ciunacRequest(`estudiantes/${proof.result.estudiante.id}`, { method: 'PATCH', body: { codigo: proof.codigo } })
    const updated = z.object({ id: z.string(), codigo: z.string() }).safeParse(result)
    if (!updated.success || updated.data.id !== proof.result.estudiante.id || updated.data.codigo !== proof.codigo) throw new Error('Code not confirmed')
    await saveRegistrationProof({ ...proof, status: 'completed' })
    return proof.result
  } catch {
    await saveRegistrationProof({ ...proof, status: 'code_pending' })
    return { status: 'CODE_PENDING' as const, documentNumber: proof.documentNumber }
  }
}

export async function registerNewStudentOnServer(body: Q10StudentRequestDto, session: VerifiedSession) {
  const requestHash = createHash('sha256').update(JSON.stringify(body)).digest('hex')
  const previous = await readRegistrationProof()
  if (previous?.email === session.email) {
    if (previous.documentNumber !== body.Numero_identificacion || previous.status === 'indeterminate' || previous.requestHash !== requestHash) {
      throw new SecurityError('FORBIDDEN', 409, 'Previous registration must be resolved before another attempt')
    }
    // A replay cannot alter the code or trigger Q10 a second time in this flow.
    return previous.status === 'completed' ? previous.result! : { status: 'CODE_PENDING', documentNumber: previous.documentNumber }
  }
  const proof: RegistrationProof = { email: session.email, documentNumber: body.Numero_identificacion,
    codigo: body.codigo, requestHash, status: 'indeterminate', expiresAt: Date.now() + 15 * 60 * 1000 }
  await saveRegistrationProof(proof)
  const { codigo: _codigo, ...providerBody } = body
  void _codigo
  let response: unknown
  try { response = await ciunacRequest('q10/estudiantes', { method: 'POST', body: providerBody }) }
  catch (error) {
    // The published contract reserves 502 for partial writes; validation errors are safe to correct.
    if (error instanceof SecurityError && [400, 422].includes(error.status)) await saveRegistrationProof({ ...proof, expiresAt: 0 })
    throw error
  }
  const parsed = q10RegistrationResponseSchema.safeParse(response)
  if (!parsed.success || parsed.data.estudiante.numeroDocumento !== body.Numero_identificacion) {
    throw new SecurityError('SERVICE_UNAVAILABLE', 502, 'Coordinated registration not confirmed')
  }
  const confirmed: RegistrationProof = { ...proof, result: parsed.data, status: body.codigo ? 'code_pending' : 'completed' }
  await saveRegistrationProof(confirmed)
  return body.codigo ? finishStudentCode(confirmed) : parsed.data
}
