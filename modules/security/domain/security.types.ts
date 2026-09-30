// Flujos que verifican correo; no equivalen a los contextos de consulta por documento.
export const OTP_PURPOSES = [
  'CERTIFICADO',
  'BECA',
  'UBICACION',
  'CONSTANCIA',
  'NUEVO',
] as const;

export type OtpPurpose = (typeof OTP_PURPOSES)[number];

// CERTIFICADO es el contexto historico que tambien incluye consultas de constancias.
export const CONSULTATION_TYPES = ['CERTIFICADO', 'EXAMEN'] as const;

export type ConsultationType = (typeof CONSULTATION_TYPES)[number];

// REGISTER notifica el registro NUEVO; el endpoint traduce la plantilla legacy de CONSTANCIA.
export type NotificationType = 'CERTIFICADO' | 'CONSTANCIA' | 'BECA' | 'UBICACION' | 'REGISTER';
