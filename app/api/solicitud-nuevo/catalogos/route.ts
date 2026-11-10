import { NextResponse } from 'next/server'
import { handleSecurityRoute } from '@/modules/security/server/responses'
import { requireNewStudent } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session'
import { getAcademicCatalog } from '@/modules/solicitud-nuevo/infrastructure/server/academic-catalog.repository'

export const runtime = 'nodejs'
export async function GET() {
  return handleSecurityRoute('new-student.catalog.failed', async () => {
    await requireNewStudent()
    return NextResponse.json(await getAcademicCatalog(), { headers: { 'Cache-Control': 'no-store' } })
  })
}
