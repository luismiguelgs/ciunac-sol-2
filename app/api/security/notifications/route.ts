import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { OtpPurpose } from '@/modules/security/domain/security.types';
import { ciunacRequest } from '@/modules/security/server/ciunac-client';
import { assertTrustedOrigin, parseJsonBody } from '@/modules/security/server/request-security';
import { handleSecurityRoute } from '@/modules/security/server/responses';
import { notificationSchema } from '@/modules/security/server/schemas';
import {
  readVerifiedSessionFromRequest,
  writeNotificationReceipt,
} from '@/modules/security/server/session';
import { SecurityError } from '@/modules/security/server/security-error';
import { readNewStudentVerifiedSession } from '@/modules/security/server/new-student-session';
import { readRegistrationProof } from '@/modules/solicitud-nuevo/infrastructure/server/flow-session';

export const runtime = 'nodejs';

const PURPOSES_BY_NOTIFICATION: Record<string, OtpPurpose[]> = {
  CERTIFICADO: ['CERTIFICADO'],
  CONSTANCIA: ['CONSTANCIA'],
  BECA: ['BECA'],
  UBICACION: ['UBICACION'],
  REGISTER: ['NUEVO'],
};

/** Notifica una referencia al email de la sesion y emite comprobante tras aceptacion HTTP. */
export async function POST(request: NextRequest) {
  return handleSecurityRoute('security.notification.failed', async () => {
    assertTrustedOrigin(request);
    const input = await parseJsonBody(request, notificationSchema);
    const legacy = input.type === 'REGISTER' ? null : readVerifiedSessionFromRequest(request);
    const session = input.type === 'REGISTER'
      ? await readNewStudentVerifiedSession()
      : legacy?.purpose === 'NUEVO' ? null : legacy;

    if (!session) {
      throw new SecurityError('UNAUTHORIZED', 401, 'Verified session is required');
    }
    if (input.type === 'REGISTER') {
      const proof = await readRegistrationProof();
      if (!proof || proof.email !== session.email || proof.documentNumber !== input.reference || proof.status !== 'completed') {
        throw new SecurityError('FORBIDDEN', 403, 'Registration not completed for this session/reference');
      }
    }

    if (!PURPOSES_BY_NOTIFICATION[input.type].includes(session.purpose)) {
      throw new SecurityError('FORBIDDEN', 403, 'Notification does not match verified purpose');
    }

    await ciunacRequest('mailer', {
      method: 'POST',
      body: {
        // Mailer aun usa la plantilla CERTIFICADO para constancias; el permiso sigue siendo CONSTANCIA.
        type: input.type === 'CONSTANCIA' ? 'CERTIFICADO' : input.type,
        email: session.email,
        user: input.reference,
      },
    });

    const receiptId = randomUUID();
    const response = NextResponse.json({ ok: true, receiptId }, { status: 202 });
    // El comprobante acredita aceptacion HTTP, no entrega SMTP ni propiedad de la referencia.
    writeNotificationReceipt(response, receiptId, input.type, input.reference);
    return response;
  });
}
