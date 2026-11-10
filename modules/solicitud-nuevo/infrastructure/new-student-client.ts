import { AppError, normalizeAppError } from '@/modules/shared/application/errors/app-error'
import { requestJson } from '@/modules/shared/infrastructure/http/browser-http'
import { mailApiRepository } from '@/modules/shared/infrastructure/api/mail-api.repository'
import type { NewStudent } from '../model'
import { toQ10StudentRequestDto } from './q10-api.mapper'
import { q10RegistrationResponseSchema } from './q10-api.schemas'

export async function registerQ10Student(student: NewStudent): Promise<{ status: 'completed' | 'code_pending' }> {
  const body = toQ10StudentRequestDto(student)
  const result = await requestJson<unknown>('/api/ciunac/q10/estudiantes', 'POST', body, 45000)
  if (result && typeof result === 'object' && 'status' in result && result.status === 'CODE_PENDING') return { status: 'code_pending' }
  const parsed = q10RegistrationResponseSchema.safeParse(result)
  if (!parsed.success) {
    throw new AppError({
      code: 'EXTERNAL_SERVICE',
      message: 'Q10 devolvio una respuesta no valida. No vuelva a registrar al estudiante.',
      details: { issueCount: parsed.error.issues.length },
    })
  }
  return { status: 'completed' }
}

export async function retryStudentCode(): Promise<string> {
  const response = await requestJson<unknown>('/api/solicitud-nuevo/codigo', 'POST', {}, 30000)
  const parsed = q10RegistrationResponseSchema.safeParse(response)
  if (!parsed.success) throw new AppError({ code: 'EXTERNAL_SERVICE', message: 'El registro está guardado, pero el código de alumno sigue pendiente. Reintenta solo este guardado.' })
  return parsed.data.estudiante.numeroDocumento
}

export async function sendNewStudentNotification(documentNumber: string): Promise<string> {
  try {
    return await mailApiRepository.send({ type: 'REGISTER', reference: documentNumber })
  } catch (error) {
    throw normalizeAppError(error, 'El estudiante se guardo, pero el correo no pudo enviarse.')
  }
}
