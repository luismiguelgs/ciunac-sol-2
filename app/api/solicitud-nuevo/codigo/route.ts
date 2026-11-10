import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleSecurityRoute } from '@/modules/security/server/responses'
import { assertTrustedOrigin, parseJsonBody } from '@/modules/security/server/request-security'
import { SecurityError } from '@/modules/security/server/security-error'
import { requireNewStudent, readRegistrationProof } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session'
import { finishStudentCode } from '@/modules/solicitud-nuevo/infrastructure/server/registration'

export const runtime = 'nodejs'
export async function GET() {
  return handleSecurityRoute('new-student.recovery.failed', async () => {
    const session = await requireNewStudent()
    const proof = await readRegistrationProof()
    return NextResponse.json(proof?.email === session.email ? { status: proof.status, documentNumber: proof.documentNumber } : { status: 'none' }, { headers: { 'Cache-Control': 'no-store' } })
  })
}
export async function POST(request: NextRequest) {
  return handleSecurityRoute('new-student.code.failed', async () => {
    assertTrustedOrigin(request)
    await parseJsonBody(request, z.object({}).strict())
    const session = await requireNewStudent()
    const proof = await readRegistrationProof()
    if (!proof || proof.email !== session.email) throw new SecurityError('UNAUTHORIZED', 401, 'Missing registration proof')
    return NextResponse.json(await finishStudentCode(proof))
  })
}
