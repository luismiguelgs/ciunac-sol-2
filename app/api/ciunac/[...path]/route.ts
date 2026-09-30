import { NextRequest, NextResponse } from 'next/server'
import {
  assertCiunacProxyAccess,
  resolveCiunacProxyOperation,
  type CiunacProxyMethod,
} from '@/app/api/ciunac/proxy-policy'
import {
  validateCiunacProxyBody,
  validateCiunacProxyResponse,
} from '@/app/api/ciunac/proxy-validation'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { assertTrustedOrigin } from '@/modules/security/server/request-security'
import { handleSecurityRoute } from '@/modules/security/server/responses'
import {
  readConsultationSessionFromRequest,
  readVerifiedSessionFromRequest,
} from '@/modules/security/server/session'
import { SecurityError } from '@/modules/security/server/security-error'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ path: string[] }> }

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/

/** Autoriza y valida la operacion antes de reenviarla; no decide reglas de negocio. */
async function handle(request: NextRequest, context: RouteContext, method: CiunacProxyMethod) {
  return handleSecurityRoute('security.bff.request.failed', async () => {
    const { path: segments } = await context.params
    if (!segments.length || segments.some((segment) => !SAFE_SEGMENT.test(segment))) {
      throw new SecurityError('INVALID_REQUEST', 400, 'Invalid API path')
    }

    const path = segments.join('/')
    const operation = resolveCiunacProxyOperation(method, path)
    if (!operation) throw new SecurityError('FORBIDDEN', 403, 'API operation is not allowed')

    // Son permisos distintos: correo verificado para registro, consulta para documentos digitales.
    const verified = readVerifiedSessionFromRequest(request)
    const consultation = readConsultationSessionFromRequest(request)
    assertCiunacProxyAccess(operation, verified, consultation)
    if (method !== 'GET') assertTrustedOrigin(request)

    const body = await validateCiunacProxyBody(request, method, operation, verified)
    const data = await ciunacRequest<unknown>(path, { method, body })
    validateCiunacProxyResponse(operation, data, verified)

    // Un exito sin cuerpo no se inventa como objeto: conserva el contrato HTTP 204.
    return data === null
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(data)
  })
}

/** Expone solo las lecturas admitidas por la politica, no un proxy publico libre. */
export function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context, 'GET')
}

/** Canaliza creaciones y uploads por las mismas guardas de sesion y validacion. */
export function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context, 'POST')
}

/** Canaliza las actualizaciones permitidas; no reintenta escrituras automaticamente. */
export function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context, 'PATCH')
}
