import { requestJson } from '@/modules/shared/infrastructure/http/browser-http';
import { AppError } from '@/modules/shared/application/errors/app-error';
import { ConsultationType, NotificationType, OtpPurpose } from '@/modules/security/domain/security.types';

// Usa transporte same-origin y rechaza payloads falsy; el generico no valida su estructura en runtime.
async function postSecurity<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const payload = await requestJson<TResponse>(path, 'POST', body);
  if (!payload) {
    throw new AppError({ code: 'EXTERNAL_SERVICE', message: 'El servicio devolvio una respuesta no valida.' });
  }
  return payload;
}

/** Solicita el envio del OTP al servidor y obtiene tiempos para la UI, nunca el codigo generado. */
export function requestOtp(email: string, purpose: OtpPurpose, captchaToken: string) {
  return postSecurity<{
    ok: true;
    expiresInSeconds: number;
    resendInSeconds: number;
  }, { email: string; purpose: OtpPurpose; captchaToken: string }>(
    '/api/security/otp/request',
    { email, purpose, captchaToken },
  );
}

/** Envia el codigo introducido; solo el servidor lo compara y emite la cookie HttpOnly. */
export function verifyOtp(email: string, purpose: OtpPurpose, code: string) {
  return postSecurity<{ ok: true }, { email: string; purpose: OtpPurpose; code: string }>(
    '/api/security/otp/verify',
    { email, purpose, code },
  );
}

/** Consulta existencia con CAPTCHA y valida ok/found; la lista completa se carga en otra peticion. */
export async function consultByDocument(documento: string, type: ConsultationType, captchaToken: string) {
  const response = await postSecurity<unknown, { documento: string; type: ConsultationType; captchaToken: string }>(
    '/api/security/consulta',
    { documento, type, captchaToken },
  );
  if (!isConsultationCheckResponse(response)) {
    throw new AppError({
      code: 'EXTERNAL_SERVICE',
      message: 'El servicio de consulta devolvio una respuesta no valida.',
    });
  }
  return response;
}

/** Notifica una referencia ya guardada; devuelve receiptId sin repetir el registro del feature. */
export function sendSecureNotification(type: NotificationType, reference: string) {
  return postSecurity<{ ok: true; receiptId: string }, { type: NotificationType; reference: string }>(
    '/api/security/notifications',
    { type, reference },
  );
}

// Comprueba solo el pequeno contrato de seguridad, sin importar schemas internos de consultas.
function isConsultationCheckResponse(value: unknown): value is { ok: true; found: boolean } {
  return typeof value === 'object'
    && value !== null
    && 'ok' in value
    && value.ok === true
    && 'found' in value
    && typeof value.found === 'boolean';
}
