import { NextRequest, NextResponse } from 'next/server';
import { getOtpSessionSecret } from '@/modules/security/server/environment';
import { signIn } from '@/auth';
import { OtpSignInError } from '@/modules/security/server/auth-config';
import { verifyEmailOtp } from '@/modules/security/server/verify-email-otp';
import { assertTrustedOrigin, parseJsonBody } from '@/modules/security/server/request-security';
import { handleSecurityRoute, securityErrorResponse } from '@/modules/security/server/responses';
import { otpVerifySchema } from '@/modules/security/server/schemas';
import {
  clearOtpChallenge,
  readOtpChallenge,
  writeOtpChallenge,
  writeVerifiedSession,
} from '@/modules/security/server/session';
import { SecurityError } from '@/modules/security/server/security-error';

export const runtime = 'nodejs';

/** Verifica email, proposito y codigo; sustituye el desafio por una sesion al acertar. */
export async function POST(request: NextRequest) {
  return handleSecurityRoute('security.otp.verify.failed', async (correlationId) => {
    assertTrustedOrigin(request);
    const input = await parseJsonBody(request, otpVerifySchema);
    if (input.purpose === 'NUEVO') {
      try {
        await signIn('email-otp', { email: input.email, code: input.code, redirect: false });
      } catch (error) {
        if (error instanceof OtpSignInError) throw error.securityError;
        throw error;
      }
      return NextResponse.json({ ok: true });
    }
    const challenge = readOtpChallenge(request);
    const result = verifyEmailOtp(challenge, input, getOtpSessionSecret());
    if (!result.ok) {
      const response = securityErrorResponse(
        'security.otp.verify.rejected',
        correlationId,
        new SecurityError(result.code, result.code === 'MAX_ATTEMPTS' ? 429 : 400, 'OTP verification rejected'),
      );

      // Un codigo incorrecto conserva el contador reducido; los rechazos terminales limpian la cookie.
      if (result.code === 'VERIFICATION_FAILED') {
        writeOtpChallenge(response, result.challenge);
      } else {
        clearOtpChallenge(response);
      }
      return response;
    }

    const response = NextResponse.json({ ok: true });
    // Esta limpieza cubre el flujo normal, no el replay deliberado de una cookie anterior.
    clearOtpChallenge(response);
    writeVerifiedSession(response, result.challenge.email, result.challenge.purpose);
    return response;
  });
}
