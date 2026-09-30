import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAppOrigin } from '@/modules/security/server/environment';
import { SecurityError } from '@/modules/security/server/security-error';

const MAX_JSON_BYTES = 1024 * 1024;

/** Exige coincidencia exacta con APP_BASE_URL; controla origen, no identidad ni permisos. */
export function assertTrustedOrigin(request: NextRequest): void {
  const origin = request.headers.get('origin');
  if (!origin || origin !== getAppOrigin()) {
    throw new SecurityError('INVALID_ORIGIN', 403, 'Request origin is not allowed');
  }
}

/** Comprueba Content-Type, tamano declarado y JSON; devuelve unknown para validacion posterior. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  const contentLength = Number(request.headers.get('content-length') ?? '0');

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new SecurityError('INVALID_REQUEST', 415, 'Content-Type must be application/json');
  }

  // Solo limita la cabecera declarada: no mide bytes reales si Content-Length falta o es incorrecto.
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new SecurityError('INVALID_REQUEST', 413, 'Request payload is too large');
  }

  try {
    return await request.json();
  } catch {
    throw new SecurityError('INVALID_REQUEST', 400, 'Request body is not valid JSON');
  }
}

/** Valida y transforma la entrada con Zod; rechaza con 400 sin revelar los detalles del schema. */
export async function parseJsonBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const payload = await readJsonBody(request);

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new SecurityError('INVALID_REQUEST', 400, 'Request body is invalid');
  }

  return parsed.data;
}
