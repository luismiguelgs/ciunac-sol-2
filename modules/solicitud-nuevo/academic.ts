import { z } from 'zod'

export const studentCodeMaxLength = 10
export const studentCodeSchema = z.string().trim().min(1).max(studentCodeMaxLength, 'El código de alumno debe tener como máximo 10 caracteres.').nullable()

export const academicDataSchema = z.object({
  tipoEstudiante: z.enum(['PG', 'PRE', 'POS']),
  facultadId: z.number().int().positive().nullable(),
  escuelaId: z.number().int().positive().nullable(),
  codigo: studentCodeSchema,
}).strict().superRefine((data, ctx) => {
  if (data.tipoEstudiante === 'PG') return
  for (const field of ['facultadId', 'escuelaId', 'codigo'] as const) {
    if (data[field] === null) ctx.addIssue({ code: 'custom', path: [field], message: 'Campo obligatorio para estudiantes UNAC.' })
  }
})
export type AcademicData = z.infer<typeof academicDataSchema>

export const academicCatalogSchema = z.object({
  facultades: z.array(z.object({ id: z.number().int().positive(), nombre: z.string().min(1) })),
  escuelas: z.array(z.object({
    id: z.number().int().positive(), nombre: z.string().min(1), facultadId: z.number().int().positive(),
    tipo: z.enum(['PRE', 'POS']).nullable().optional(),
  })),
})
export type AcademicCatalog = z.infer<typeof academicCatalogSchema>

export function validateAcademicCatalog(data: AcademicData, catalog: AcademicCatalog): void {
  if (data.facultadId !== null && !catalog.facultades.some((f) => f.id === data.facultadId)) throw new Error('La facultad ya no está disponible.')
  if (data.escuelaId === null) return
  const school = catalog.escuelas.find((s) => s.id === data.escuelaId)
  if (!school || (data.facultadId !== null && school.facultadId !== data.facultadId)) throw new Error('La escuela no corresponde a la facultad.')
  if (data.tipoEstudiante !== 'PG' && school.tipo !== data.tipoEstudiante) throw new Error('La escuela no corresponde al nivel seleccionado.')
}

export const identityDocumentSchema = z.object({
  id: z.string().min(1).max(254), viewLink: z.url().max(2048).refine((v) => new URL(v).protocol === 'https:'),
  name: z.string().min(1).max(254), documentType: z.enum(['DNI', 'CE']), documentNumber: z.string().min(8).max(9),
})
export type IdentityDocument = z.infer<typeof identityDocumentSchema>

export function schoolOptions(data: AcademicData, catalog: AcademicCatalog) {
  return catalog.escuelas.filter((s) => s.facultadId === data.facultadId && s.tipo === data.tipoEstudiante)
}

export const identityFilePolicy = {
  maxBytes: 8 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] as const,
}
