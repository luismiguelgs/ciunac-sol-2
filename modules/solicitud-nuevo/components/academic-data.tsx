'use client'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StepperControl } from '@/components/stepper'
import { requestJson } from '@/modules/shared/infrastructure/http/browser-http'
import { academicDataSchema, academicCatalogSchema, schoolOptions, studentCodeMaxLength, validateAcademicCatalog, type AcademicData, type AcademicCatalog } from '../academic'

type Props = {
  activeStep: number; steps: string[]; setActiveStep: React.Dispatch<React.SetStateAction<number>>
  defaultData: AcademicData | null; handleNext: (data: AcademicData) => void
}
const studentTypes = [
  { value: 'PG', label: 'Público general' },
  { value: 'PRE', label: 'Pregrado UNAC' },
  { value: 'POS', label: 'Posgrado UNAC' },
]

function AcademicSelect({ label, value, items, placeholder, disabled, onChange }: {
  label: string; value: string | null; items: { value: string; label: string }[]
  placeholder: string; disabled?: boolean; onChange: (value: string | null) => void
}) {
  const id = useId()
  return <Field data-disabled={disabled} className="min-w-0">
    <FieldLabel htmlFor={id} className="text-sm">{label}</FieldLabel>
    <Select<string> items={items} value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full min-w-0 text-sm data-[size=default]:h-10">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map(item => <SelectItem key={item.value} value={item.value}
          className="min-h-10 py-2 pr-8 text-sm [&>span:first-child]:min-w-0 [&>span:first-child]:shrink">
          <span className="whitespace-normal break-words">{item.label}</span>
        </SelectItem>)}
      </SelectContent>
    </Select>
  </Field>
}
export default function AcademicDataStep({ defaultData, handleNext, ...stepper }: Props) {
  const [data, setData] = useState<Omit<AcademicData, 'tipoEstudiante'> & { tipoEstudiante: AcademicData['tipoEstudiante'] | '' }>(defaultData ?? {
    tipoEstudiante: '', facultadId: null, escuelaId: null, codigo: null,
  })
  const [catalog, setCatalog] = useState<AcademicCatalog | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const codeId = useId()
  async function loadCatalog() {
    setLoading(true)
    try { setCatalog(academicCatalogSchema.parse(await requestJson('/api/solicitud-nuevo/catalogos', 'GET'))); setCatalogError(false) }
    catch { setCatalogError(true) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let cancelled = false
    void requestJson('/api/solicitud-nuevo/catalogos', 'GET').then((value) => {
      if (!cancelled) setCatalog(academicCatalogSchema.parse(value))
    }).catch(() => { if (!cancelled) setCatalogError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])
  const schools = catalog && data.tipoEstudiante ? schoolOptions(data as AcademicData, catalog) : []
  return <form noValidate className="space-y-5" onSubmit={(event) => {
    event.preventDefault()
    const parsed = academicDataSchema.safeParse(data)
    if (!parsed.success) {
      setError(parsed.error.issues.find(issue => issue.path[0] === 'codigo' && issue.code === 'too_big')?.message
        ?? 'Selecciona tu condición y completa facultad, escuela y código para pregrado o posgrado.')
      return
    }
    if (data.tipoEstudiante !== 'PG' && !catalog) { setError('El catálogo académico no está disponible. Reintenta.'); return }
    try {
      if (catalog) validateAcademicCatalog(parsed.data, catalog)
      handleNext(parsed.data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa los datos académicos.') }
  }}>
    <h2 className="text-xl font-semibold">Condición académica</h2>
    <AcademicSelect label="Tipo de alumno" value={data.tipoEstudiante || null} items={studentTypes}
      placeholder="Selecciona una opción" onChange={(value) => {
        const tipoEstudiante = (value ?? '') as AcademicData['tipoEstudiante'] | ''
        const school = catalog?.escuelas.find((s) => s.id === data.escuelaId)
        setData({ ...data, tipoEstudiante, escuelaId: tipoEstudiante === 'PG' || school?.tipo === tipoEstudiante ? data.escuelaId : null })
        setError('')
      }} />
    {data.tipoEstudiante && data.tipoEstudiante !== 'PG' && <div className="grid gap-4 sm:grid-cols-2">
      <AcademicSelect label="Facultad" value={data.facultadId === null ? null : String(data.facultadId)}
        items={catalog?.facultades.map(f => ({ value: String(f.id), label: f.nombre })) ?? []}
        placeholder="Selecciona tu facultad" disabled={loading || !catalog}
        onChange={value => setData({ ...data, facultadId: value ? Number(value) : null, escuelaId: null })} />
      <AcademicSelect label="Escuela" value={data.escuelaId === null ? null : String(data.escuelaId)}
        items={schools.map(s => ({ value: String(s.id), label: s.nombre }))}
        placeholder="Selecciona tu escuela" disabled={loading || !data.facultadId || !catalog}
        onChange={value => setData({ ...data, escuelaId: value ? Number(value) : null })} />
      <Field className="min-w-0">
        <FieldLabel htmlFor={codeId} className="text-sm">Código de alumno</FieldLabel>
        <Input id={codeId} className="h-10 text-base md:text-sm" value={data.codigo ?? ''} maxLength={studentCodeMaxLength}
          aria-describedby={`${codeId}-description`}
          onChange={(e) => setData({ ...data, codigo: e.target.value.trim() || null })} />
        <FieldDescription id={`${codeId}-description`}>Máximo {studentCodeMaxLength} caracteres.</FieldDescription>
      </Field>
      {data.facultadId && !loading && !schools.length && <p role="status">No hay escuelas disponibles para esta facultad y nivel.</p>}
    </div>}
    {data.tipoEstudiante === 'PG' && <p className="text-sm text-muted-foreground">No necesitas completar datos UNAC. Si ya los ingresaste, se conservarán.</p>}
    {catalogError && <div role="status">No se pudo cargar el catálogo académico. Puedes continuar como público general si corresponde. <Button type="button" variant="outline" disabled={loading} onClick={() => void loadCatalog()}>Reintentar catálogo</Button></div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <StepperControl {...stepper} size="lg" type="submit" />
  </form>
}
