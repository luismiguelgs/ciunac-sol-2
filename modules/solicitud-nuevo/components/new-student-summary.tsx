import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { NewStudent } from '../model'
import { useEffect, useState } from 'react'
import { requestJson } from '@/modules/shared/infrastructure/http/browser-http'
import { academicCatalogSchema, type AcademicCatalog } from '../academic'

type Props = {
  student: NewStudent
}

const genderNames = { F: 'FEMENINO', M: 'MASCULINO' } as const

export default function NewStudentSummary({ student }: Props) {
  const [catalog, setCatalog] = useState<AcademicCatalog | null>(null)
  useEffect(() => {
    let cancelled = false
    void requestJson('/api/solicitud-nuevo/catalogos', 'GET').then((value) => {
      if (!cancelled) setCatalog(academicCatalogSchema.parse(value))
    }).catch(() => { /* Values remain selected; the server validates the catalog at submission. */ })
    return () => { cancelled = true }
  }, [])
  const rows = [
    ['Primer Apellido', student.firstLastName],
    ['Segundo Apellido', student.secondLastName],
    ['Primer Nombre', student.firstName],
    ['Segundo Nombre', student.secondName ?? 'No consignado'],
    ['Tipo de Documento', student.document.type],
    ['Número de Documento', student.document.number],
    ['Género', genderNames[student.gender]],
    ['Fecha de Nacimiento', format(new Date(`${student.birthDate}T00:00:00`), 'dd/MM/yyyy', { locale: es })],
    ['Teléfono', student.phone],
    ['Email', student.email],
    ['Programa', student.program.name],
    ['Tipo de alumno', { PG: 'Público general', PRE: 'Pregrado UNAC', POS: 'Posgrado UNAC' }[student.academicData.tipoEstudiante]],
    ['Facultad', catalog?.facultades.find((f) => f.id === student.academicData.facultadId)?.nombre ?? (student.academicData.facultadId ? 'Facultad seleccionada' : 'No consignada')],
    ['Escuela', catalog?.escuelas.find((s) => s.id === student.academicData.escuelaId)?.nombre ?? (student.academicData.escuelaId ? 'Escuela seleccionada' : 'No consignada')],
    ['Código de alumno', student.academicData.codigo ?? 'No consignado'],
    ['Documento cargado', student.identityDocument.name],
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}:</p>
          <p className="break-words text-sm font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}
