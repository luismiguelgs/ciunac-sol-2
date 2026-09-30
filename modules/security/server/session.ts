import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  CONSULTATION_TYPES,
  OTP_PURPOSES,
  type ConsultationType,
  type NotificationType,
  type OtpPurpose,
} from '@/modules/security/domain/security.types';
import { getOtpSessionSecret } from '@/modules/security/server/environment';
import type { OtpChallenge } from '@/modules/security/server/otp';
import { decryptToken, encryptToken } from '@/modules/security/server/token-crypto';

const VERIFIED_SESSION_MS = 15 * 60 * 1000;
const CONSULTATION_SESSION_MS = 10 * 60 * 1000;
const CHALLENGE_COOKIE_MS = 15 * 60 * 1000;
const NOTIFICATION_RECEIPT_MS = 15 * 60 * 1000;
const NOTIFICATION_TYPES: NotificationType[] = ['CERTIFICADO', 'CONSTANCIA', 'BECA', 'UBICACION', 'REGISTER'];

export type VerifiedSession = {
  kind: 'verified-email';
  email: string;
  purpose: OtpPurpose;
  expiresAt: number;
};

export type ConsultationSession = {
  kind: 'consultation';
  documento: string;
  type: ConsultationType;
  expiresAt: number;
};

export type NotificationReceipt = {
  kind: 'notification-receipt';
  receiptId: string;
  type: NotificationType;
  reference: string;
  expiresAt: number;
};

type CookieDefinition<T extends { expiresAt: number }> = {
  name: string;
  maxAgeMs: number;
  validate: (value: unknown) => value is T;
  enforceExpiration: boolean;
};

// El desafio puede leerse vencido: otp.ts informa expiracion y conserva historial para el reenvio.
const challengeCookie = defineCookie<OtpChallenge>(
  'ciunac_otp_challenge',
  CHALLENGE_COOKIE_MS,
  isOtpChallenge,
  false,
);
const verifiedCookie = defineCookie(
  'ciunac_verified_session',
  VERIFIED_SESSION_MS,
  isVerifiedSession,
);
const consultationCookie = defineCookie(
  'ciunac_consultation_session',
  CONSULTATION_SESSION_MS,
  isConsultationSession,
);
const receiptCookie = defineCookie(
  'ciunac_notification_receipt',
  NOTIFICATION_RECEIPT_MS,
  isNotificationReceipt,
);

/** Recupera el desafio validado estructuralmente; su expiracion se decide en la operacion OTP. */
export function readOtpChallenge(request: NextRequest): OtpChallenge | null {
  return readRequestCookie(request, challengeCookie);
}

/** Guarda en la respuesta el nuevo desafio o sus intentos reducidos, cifrados en cookie. */
export function writeOtpChallenge(response: NextResponse, challenge: OtpChallenge): void {
  writeCookie(response, challengeCookie, challenge);
}

/** Expira la cookie en el navegador; no revoca copias antiguas en un almacen server-side. */
export function clearOtpChallenge(response: NextResponse): void {
  clearCookie(response, challengeCookie);
}

/** Lee correo verificado desde un Route Handler; rechaza cookie invalida, vencida o proposito distinto. */
export function readVerifiedSessionFromRequest(
  request: NextRequest,
  purpose?: OtpPurpose,
): VerifiedSession | null {
  const session = readRequestCookie(request, verifiedCookie);
  return session && (!purpose || session.purpose === purpose) ? session : null;
}

/** Emite 15 minutos de sesion de correo para un proposito, sin autorizar otros flujos. */
export function writeVerifiedSession(
  response: NextResponse,
  email: string,
  purpose: OtpPurpose,
  now = Date.now(),
): void {
  writeCookie(response, verifiedCookie, {
    kind: 'verified-email',
    email: email.trim().toLowerCase(),
    purpose,
    expiresAt: now + VERIFIED_SESSION_MS,
  });
}

/** Equivalente server-side para paginas que leen cookies() sin disponer de NextRequest. */
export async function readVerifiedSession(purpose?: OtpPurpose): Promise<VerifiedSession | null> {
  const session = await readServerCookie(verifiedCookie);
  return session && (!purpose || session.purpose === purpose) ? session : null;
}

/** Emite 10 minutos de consulta por documento/tipo; no acredita identidad ni correo del solicitante. */
export function writeConsultationSession(
  response: NextResponse,
  documento: string,
  type: ConsultationType,
  now = Date.now(),
): void {
  writeCookie(response, consultationCookie, {
    kind: 'consultation',
    documento,
    type,
    expiresAt: now + CONSULTATION_SESSION_MS,
  });
}

/** Lee una consulta vigente para el BFF; el consumidor decide tipo y autorizacion del recurso. */
export function readConsultationSessionFromRequest(request: NextRequest): ConsultationSession | null {
  return readRequestCookie(request, consultationCookie);
}

/** Protege paginas de resultados comparando tipo/documento cuando se proporcionan. */
export async function readConsultationSession(
  type?: ConsultationType,
  documento?: string,
): Promise<ConsultationSession | null> {
  const session = await readServerCookie(consultationCookie);
  if (!session || (type && session.type !== type)) return null;
  if (documento && session.documento !== documento.toUpperCase()) return null;
  return session;
}

/** Guarda 15 minutos el comprobante de aceptacion HTTP del correo para tipo y referencia. */
export function writeNotificationReceipt(
  response: NextResponse,
  receiptId: string,
  type: NotificationType,
  reference: string,
  now = Date.now(),
): void {
  writeCookie(response, receiptCookie, {
    kind: 'notification-receipt',
    receiptId,
    type,
    reference,
    expiresAt: now + NOTIFICATION_RECEIPT_MS,
  });
}

/** Confirma receiptId, tipo, vigencia y referencia opcional antes de mostrar la finalizacion. */
export async function readNotificationReceipt(
  receiptId: string | undefined,
  type: NotificationType,
  reference?: string,
): Promise<NotificationReceipt | null> {
  if (!receiptId) return null;
  const receipt = await readServerCookie(receiptCookie);
  if (!receipt || receipt.receiptId !== receiptId || receipt.type !== type) return null;
  if (reference && receipt.reference !== reference) return null;
  return receipt;
}

// Agrupa nombre, validador y politica de vigencia para reutilizar cifrado sin mezclar tipos de sesion.
function defineCookie<T extends { expiresAt: number }>(
  name: string,
  maxAgeMs: number,
  validate: (value: unknown) => value is T,
  enforceExpiration = true,
): CookieDefinition<T> {
  return { name, maxAgeMs, validate, enforceExpiration };
}

// Adapta las cookies de NextRequest al mismo lector usado por Server Components.
function readRequestCookie<T extends { expiresAt: number }>(
  request: NextRequest,
  definition: CookieDefinition<T>,
): T | null {
  return decodeCookie(definition, request.cookies.get(definition.name)?.value);
}

// cookies() es asincrono en Next; la validacion posterior no depende de esa API.
async function readServerCookie<T extends { expiresAt: number }>(
  definition: CookieDefinition<T>,
): Promise<T | null> {
  const cookieStore = await cookies();
  return decodeCookie(definition, cookieStore.get(definition.name)?.value);
}

// Descifrar no prueba forma ni vigencia: ambas comprobaciones preceden al uso del payload.
function decodeCookie<T extends { expiresAt: number }>(
  definition: CookieDefinition<T>,
  value: string | undefined,
): T | null {
  const payload = decryptToken<unknown>(value, getOtpSessionSecret());
  if (!definition.validate(payload)) return null;
  if (definition.enforceExpiration && payload.expiresAt <= Date.now()) return null;
  return payload;
}

// Cifra el payload y agrega Set-Cookie a la respuesta; no escribe estado persistente en servidor.
function writeCookie<T extends { expiresAt: number }>(
  response: NextResponse,
  definition: CookieDefinition<T>,
  payload: T,
): void {
  response.cookies.set(
    definition.name,
    encryptToken(payload, getOtpSessionSecret()),
    cookieOptions(definition.maxAgeMs),
  );
}

// Mantiene nombre/path y fuerza maxAge=0 para eliminar la cookie correcta en el navegador.
function clearCookie<T extends { expiresAt: number }>(response: NextResponse, definition: CookieDefinition<T>): void {
  response.cookies.set(definition.name, '', { ...cookieOptions(0), maxAge: 0 });
}

// maxAge usa segundos; Secure solo en produccion permite desarrollo HTTP local sin cambiar HttpOnly.
function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

// Estas guardas comprueban estructura; los plazos y permisos se evaluan al leer o verificar.
function isOtpChallenge(value: unknown): value is OtpChallenge {
  return isRecord(value)
    && typeof value.challengeId === 'string'
    && typeof value.email === 'string'
    && isPurpose(value.purpose)
    && typeof value.codeHash === 'string'
    && typeof value.expiresAt === 'number'
    && Number.isInteger(value.attemptsRemaining)
    && Array.isArray(value.sentAt)
    && value.sentAt.every((item) => typeof item === 'number');
}

function isVerifiedSession(value: unknown): value is VerifiedSession {
  return isRecord(value) && value.kind === 'verified-email' && typeof value.email === 'string'
    && isPurpose(value.purpose) && typeof value.expiresAt === 'number';
}

function isConsultationSession(value: unknown): value is ConsultationSession {
  return isRecord(value) && value.kind === 'consultation' && typeof value.documento === 'string'
    && CONSULTATION_TYPES.some((type) => type === value.type) && typeof value.expiresAt === 'number';
}

function isNotificationReceipt(value: unknown): value is NotificationReceipt {
  return isRecord(value) && value.kind === 'notification-receipt' && typeof value.receiptId === 'string'
    && NOTIFICATION_TYPES.some((type) => type === value.type) && typeof value.reference === 'string'
    && typeof value.expiresAt === 'number';
}

function isPurpose(value: unknown): value is OtpPurpose {
  return OTP_PURPOSES.some((purpose) => purpose === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
