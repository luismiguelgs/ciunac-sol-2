import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertTrustedOrigin } from '@/modules/security/server/request-security'
import { handleSecurityRoute } from '@/modules/security/server/responses'
import { SecurityError } from '@/modules/security/server/security-error'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { validateFileUpload } from '@/modules/shared/infrastructure/server/file-upload-validation'
import { identityFilePolicy } from '@/modules/solicitud-nuevo/academic'
import { requireNewStudent, saveUploadProof } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session'

export const runtime = 'nodejs'
const uploadResult = z.object({
  success: z.literal(true), id: z.string().min(1).max(254), name: z.string().min(1).max(254), folder: z.string().min(1),
  viewLink: z.url().max(2048).refine((value) => new URL(value).origin === 'https://drive.google.com'),
  downloadLink: z.url(),
})
export async function POST(request: NextRequest) {
  return handleSecurityRoute('new-student.document.failed', async () => {
    assertTrustedOrigin(request)
    const session = await requireNewStudent()
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) throw new SecurityError('INVALID_REQUEST', 415, 'Multipart required')
    const reader = request.body?.getReader()
    if (!reader) throw new SecurityError('INVALID_FILE', 400, 'Missing file')
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > identityFilePolicy.maxBytes + 256 * 1024) {
        await reader.cancel()
        throw new SecurityError('INVALID_FILE', 413, 'Multipart too large')
      }
      chunks.push(value)
    }
    let form: FormData
    try { form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': contentType } }).formData() }
    catch { throw new SecurityError('INVALID_REQUEST', 400, 'Invalid multipart') }
    if ([...form.keys()].some((key) => !['file', 'documentType', 'documentNumber'].includes(key))
      || ['file', 'documentType', 'documentNumber'].some((key) => form.getAll(key).length !== 1)) {
      throw new SecurityError('INVALID_REQUEST', 400, 'Unexpected upload fields')
    }
    const type = form.get('documentType')
    const number = String(form.get('documentNumber') ?? '').trim().toUpperCase()
    if (!((type === 'DNI' && /^\d{8}$/.test(number)) || (type === 'CE' && /^[A-Z0-9]{9}$/.test(number)))) {
      throw new SecurityError('INVALID_REQUEST', 400, 'Invalid identity document')
    }
    const file = await validateFileUpload(form, identityFilePolicy)
    const body = new FormData()
    body.set('file', file)
    body.set('nombre', `DOCUMENTO_IDENTIDAD_${number}_${randomUUID()}`)
    const parsed = uploadResult.safeParse(await ciunacRequest('upload/DNIS', { method: 'POST', body, timeoutMs: 60000 }))
    if (!parsed.success) throw new SecurityError('SERVICE_UNAVAILABLE', 502, 'Invalid Drive upload response')
    const document = { id: parsed.data.id, name: parsed.data.name, viewLink: parsed.data.viewLink, documentType: type as 'DNI' | 'CE', documentNumber: number }
    await saveUploadProof({ ...document, email: session.email, expiresAt: session.expiresAt })
    return NextResponse.json(document)
  })
}
