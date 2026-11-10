import type { OtpPurpose } from '../domain/security.types'
import { verifyOtpCode, type OtpChallenge } from './otp'
import { SecurityError } from './security-error'

export function verifyEmailOtp(
  challenge: OtpChallenge | null,
  input: { email: string; purpose: OtpPurpose; code: string },
  secret: string,
) {
  if (!challenge || challenge.email !== input.email || challenge.purpose !== input.purpose) {
    throw new SecurityError('VERIFICATION_FAILED', 400, 'OTP challenge does not match')
  }
  return verifyOtpCode(challenge, input.code, secret)
}
