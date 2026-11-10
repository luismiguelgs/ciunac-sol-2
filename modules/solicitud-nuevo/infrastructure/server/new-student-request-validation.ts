import 'server-only'

import type { Q10StudentRequestDto } from '../q10-api.schemas'
import { getNewStudentPrograms } from './q10-program.repository'
import { q10StudentRequestSchema } from '../q10-api.schemas'
import type { VerifiedSession } from '@/modules/security/server/session'
import { SecurityError } from '@/modules/security/server/security-error'
import { getAcademicCatalog } from './academic-catalog.repository'
import { academicDataSchema, validateAcademicCatalog } from '../../academic'
import { readUploadProof } from './flow-session'

export async function validateNewStudentRequest(
  body: unknown,
  session: VerifiedSession | null,
): Promise<Q10StudentRequestDto> {
  const parsed = q10StudentRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new SecurityError('INVALID_REQUEST', 400, 'New student payload is invalid')
  }

  if (session?.purpose !== 'NUEVO') {
    throw new SecurityError('UNAUTHORIZED', 401, 'Verified new student session is required')
  }
  if (parsed.data.Email !== session.email) {
    throw new SecurityError('INVALID_REQUEST', 422, 'Email does not match verified session')
  }
  const proof = await readUploadProof()
  if (!proof || proof.email !== session.email || proof.documentNumber !== parsed.data.Numero_identificacion
    || proof.documentType !== (parsed.data.Codigo_tipo_identificacion === 'PE01' ? 'DNI' : 'CE') || proof.viewLink !== parsed.data.imgDoc) {
    throw new SecurityError('INVALID_REQUEST', 422, 'Upload does not match verified identity/document')
  }
  const academic = academicDataSchema.parse({ tipoEstudiante: parsed.data.tipoEstudiante,
    facultadId: parsed.data.facultadId, escuelaId: parsed.data.escuelaId, codigo: parsed.data.codigo })
  if (academic.tipoEstudiante !== 'PG' || academic.facultadId !== null || academic.escuelaId !== null) {
    try { validateAcademicCatalog(academic, await getAcademicCatalog()) }
    catch { throw new SecurityError('INVALID_REQUEST', 422, 'Academic catalog selection invalid or unavailable') }
  }

  const programs = await getNewStudentPrograms()
  if (!programs.some((program) => program.code === parsed.data.Codigo_programa)) {
    throw new SecurityError('INVALID_REQUEST', 422, 'Selected Q10 program is not available')
  }

  return { ...parsed.data, Email: session.email }
}
