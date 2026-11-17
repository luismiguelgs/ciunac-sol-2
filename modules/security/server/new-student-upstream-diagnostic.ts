const FIELDS = [
  'Primer_apellido', 'Segundo_apellido', 'Primer_nombre', 'Segundo_nombre',
  'Email', 'Codigo_tipo_identificacion', 'Numero_identificacion', 'Genero',
  'Fecha_nacimiento', 'Telefono', 'Celular', 'Codigo_programa', 'Direccion',
  'Lugar_nacimiento', 'Lugar_residencia', 'Consecutivo_sedejornada',
  'Consecutivo_periodo', 'tipoEstudiante', 'facultadId', 'escuelaId', 'codigo', 'imgDoc',
] as const
const CODES = ['Q10_ID_ALREADY_LINKED', 'Q10_ID_CONFLICT', 'Q10_UNAVAILABLE'] as const

export type NewStudentUpstreamDiagnostic = {
  upstreamCode: typeof CODES[number] | 'UNRECOGNIZED' | null
  validationFields: (typeof FIELDS[number])[]
  detail: 'json' | 'unavailable' | 'too_large'
}

/** Untrusted provider messages are reduced to fixed field/code names, never logged. */
export async function readNewStudentUpstreamDiagnostic(response: Response): Promise<NewStudentUpstreamDiagnostic> {
  const result: NewStudentUpstreamDiagnostic = { upstreamCode: null, validationFields: [], detail: 'unavailable' }
  const reader = response.body?.getReader()
  if (!reader) return result
  try {
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 16 * 1024) { result.detail = 'too_large'; return result }
      chunks.push(chunk.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes))
    result.detail = 'json'
    const fields = new Set<typeof FIELDS[number]>()
    function visit(value: unknown, depth = 0): void {
      if (depth > 6) return
      if (typeof value === 'string') {
        for (const field of FIELDS) {
          if (value.startsWith(`${field} `) || value.startsWith(`property ${field} `)) fields.add(field)
        }
      } else if (Array.isArray(value)) {
        for (const item of value) visit(item, depth + 1)
      } else if (value && typeof value === 'object') {
        const item = value as Record<string, unknown>
        if (typeof item.code === 'string') {
          result.upstreamCode = CODES.find((code) => code === item.code) ?? 'UNRECOGNIZED'
        }
        for (const field of FIELDS) if (item.property === field) fields.add(field)
        for (const key of ['message', 'error', 'errors', 'children']) visit(item[key], depth + 1)
      }
    }
    visit(body)
    result.validationFields = [...fields].sort()
  } catch { /* Diagnostics must not change the original HTTP rejection. */ }
  finally {
    try { await reader.cancel() } catch { /* The stream may already be closed. */ }
    reader.releaseLock()
  }
  return result
}
