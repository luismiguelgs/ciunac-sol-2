import 'server-only';
import { SecurityError } from '@/modules/security/server/security-error';

const MIN_SECRET_BYTES = 32;

// Falla cerrado si falta configuracion; el mensaje tecnico identifica el nombre, nunca el valor.
function requireValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new SecurityError('SERVICE_UNAVAILABLE', 503, `Missing server configuration: ${name}`);
  }

  return value;
}

// Normaliza una URL configurada y permite solo el fallback explicitamente indicado por el consumidor.
function requireUrl(name: string, fallbackName?: string): string {
  const rawValue = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : '');

  if (!rawValue) {
    throw new SecurityError('SERVICE_UNAVAILABLE', 503, `Missing server configuration: ${name}`);
  }

  try {
    return new URL(rawValue).toString().replace(/\/$/, '');
  } catch {
    throw new SecurityError('SERVICE_UNAVAILABLE', 503, `Invalid server configuration: ${name}`);
  }
}

/** Credencial privada y URL de CIUNAC; el fallback de URL se lee unicamente en servidor. */
export function getCiunacConfig() {
  return {
    apiKey: requireValue('API_KEY'),
    apiUrl: requireUrl('API_URL', 'NEXT_PUBLIC_API_URL'),
  };
}

/** Exige la clave privada del proveedor CAPTCHA, sin recurrir a la site key publica. */
export function getCaptchaSecret(): string {
  return requireValue('RECAPTCHA_SECRET_KEY');
}

/** Exige al menos 32 bytes UTF-8 para el secreto usado por HMAC y cookies cifradas. */
export function getOtpSessionSecret(): string {
  const secret = requireValue('OTP_SESSION_SECRET');

  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new SecurityError(
      'SERVICE_UNAVAILABLE',
      503,
      `Invalid server configuration: OTP_SESSION_SECRET must contain at least ${MIN_SECRET_BYTES} bytes`,
    );
  }

  return secret;
}

/** Obtiene esquema, host y puerto autorizados para comparar el Origin de las escrituras. */
export function getAppOrigin(): string {
  return new URL(requireUrl('APP_BASE_URL')).origin;
}

/** Credencial server-only para consumidores Q10 directos, como su catalogo de programas. */
export function getQ10ApiKey(): string {
  return requireValue('API_KEY_Q10');
}
