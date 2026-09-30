import { z } from 'zod';
import { CONSULTATION_TYPES, OTP_PURPOSES } from '@/modules/security/domain/security.types';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const captchaTokenSchema = z.string().trim().min(10).max(4096);

// Entrada no confiable: normaliza email y admite solo propositos OTP y token con formato esperado.
export const otpRequestSchema = z.object({
  email: emailSchema,
  purpose: z.enum(OTP_PURPOSES),
  captchaToken: captchaTokenSchema,
}).strict();

// Validar seis digitos no verifica el OTP: la comparacion con el desafio ocurre en otp.ts.
export const otpVerifySchema = z.object({
  email: emailSchema,
  purpose: z.enum(OTP_PURPOSES),
  code: z.string().regex(/^\d{6}$/),
}).strict();

// El contexto de consultas aplica despues su regla mas estricta de documento (8 o 9 caracteres).
export const consultationSchema = z.object({
  documento: z.string().trim().min(8).max(12).regex(/^[A-Za-z0-9]+$/).transform((value) => value.toUpperCase()),
  type: z.enum(CONSULTATION_TYPES),
  captchaToken: captchaTokenSchema,
}).strict();

// Recibe tipo y referencia, nunca destinatario; el email se obtiene de la sesion verificada.
export const notificationSchema = z.object({
  type: z.enum(['CERTIFICADO', 'CONSTANCIA', 'BECA', 'UBICACION', 'REGISTER']),
  reference: z.string().trim().min(1).max(80),
}).strict();
