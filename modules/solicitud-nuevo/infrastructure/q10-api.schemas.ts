import { z } from 'zod'
import { academicDataSchema, studentCodeSchema } from '../academic'

export const q10ProgramSchema = z.object({
  Codigo: z.string().trim().min(1).max(80),
  Nombre: z.string().trim().min(1).max(254),
  Numero_resolucion: z.string().nullable(),
}).passthrough()

export const q10ProgramArraySchema = z.array(q10ProgramSchema)

export type Q10ProgramResponseDto = z.output<typeof q10ProgramSchema>

export const q10StudentRequestSchema = z.object({
  Primer_apellido: z.string().trim().min(2).max(80),
  Segundo_apellido: z.string().trim().min(2).max(80),
  Primer_nombre: z.string().trim().min(2).max(80),
  Segundo_nombre: z.string().trim().min(1).max(80).optional(),
  Email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  Codigo_tipo_identificacion: z.enum(['PE01', 'PE02']),
  Numero_identificacion: z.string().trim().max(9),
  Genero: z.enum(['F', 'M']),
  Fecha_nacimiento: z.string().datetime(),
  Telefono: z.string().regex(/^\d{9}$/),
  Celular: z.string().regex(/^\d{9}$/),
  Codigo_programa: z.string().trim().min(1).max(80),
  tipoEstudiante: z.enum(['PG', 'PRE', 'POS']),
  facultadId: z.number().int().positive().nullable(),
  escuelaId: z.number().int().positive().nullable(),
  codigo: studentCodeSchema,
  imgDoc: z.url().refine((v) => new URL(v).protocol === 'https:'),
}).strict().superRefine((data, context) => {
  // Validate only the academic projection; the transport also contains Q10 fields.
  const projected = academicDataSchema.safeParse({ tipoEstudiante: data.tipoEstudiante, facultadId: data.facultadId, escuelaId: data.escuelaId, codigo: data.codigo })
  if (!projected.success) for (const issue of projected.error.issues) context.addIssue({ code: 'custom', path: issue.path, message: issue.message })
  const validDocument = data.Codigo_tipo_identificacion === 'PE01'
    ? /^\d{8}$/.test(data.Numero_identificacion)
    : /^[A-Za-z0-9]{9}$/.test(data.Numero_identificacion)
  if (!validDocument) {
    context.addIssue({ code: 'custom', path: ['Numero_identificacion'], message: 'Invalid document' })
  }
})

export const q10RegistrationResponseSchema = z.object({
  status: z.literal('COMPLETED'),
  estudiante: z.object({ id: z.uuid(), idQ10: z.string().min(1), numeroDocumento: z.string().min(1) }),
  programaRegistrado: z.literal(true),
})

export type Q10RegistrationResponseDto = z.output<typeof q10RegistrationResponseSchema>
export type Q10StudentRequestDto = z.output<typeof q10StudentRequestSchema>
