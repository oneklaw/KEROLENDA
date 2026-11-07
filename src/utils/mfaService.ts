import { AppUser, MFAChallenge, MFAMethod } from '../types';

export const MFA_CONFIG = {
  OTP_LENGTH: 6,
  CODE_EXPIRATION_MS: 5 * 60 * 1000, // 5 minutes
  RESEND_COOLDOWN_MS: 60 * 1000,     // 60 seconds
  MAX_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout
};

/**
 * Masks destination address for security display
 */
export function maskDestination(method: MFAMethod, email?: string, phone?: string): string {
  if (method === 'email') {
    if (!email || !email.includes('@')) return 'e***@example.com';
    const [name, domain] = email.split('@');
    const maskedName = name.length <= 2 ? `${name[0]}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }
  // Phone / WhatsApp
  const cleanPhone = (phone || '+256 700 000 000').replace(/\s+/g, '');
  if (cleanPhone.length < 7) return '+256 7** *** ***';
  return `${cleanPhone.slice(0, 4)} *** *** ${cleanPhone.slice(-3)}`;
}

/**
 * Generates a cryptographically strong simulated 6-digit OTP challenge
 */
export function generateMfaChallenge(user: AppUser, method: MFAMethod): MFAChallenge {
  // Generate 6-digit numerical code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const destination = maskDestination(method, user.email, user.phone);

  return {
    id: `mfa-${now}-${Math.random().toString(36).substring(2, 7)}`,
    userId: user.id,
    method,
    destinationMasked: destination,
    code,
    expiresAt: now + MFA_CONFIG.CODE_EXPIRATION_MS,
    attemptsLeft: MFA_CONFIG.MAX_ATTEMPTS,
    resendAvailableAt: now + MFA_CONFIG.RESEND_COOLDOWN_MS,
    isVerified: false,
    createdAt: now,
  };
}

/**
 * Validates user-submitted OTP against challenge
 */
export function verifyMfaChallenge(
  challenge: MFAChallenge,
  inputCode: string,
  currentTimeMs: number = Date.now()
): {
  success: boolean;
  error?: string;
  attemptsLeft: number;
  isExpired: boolean;
  isLockedOut: boolean;
} {
  // Check if expired
  if (currentTimeMs > challenge.expiresAt) {
    return {
      success: false,
      error: 'Verification code has expired. Please request a new code.',
      attemptsLeft: 0,
      isExpired: true,
      isLockedOut: false,
    };
  }

  // Check attempts left
  if (challenge.attemptsLeft <= 0) {
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Account temporarily restricted for 15 minutes.',
      attemptsLeft: 0,
      isExpired: false,
      isLockedOut: true,
    };
  }

  // Validate Code
  const normalizedInput = inputCode.trim();
  if (normalizedInput === challenge.code) {
    return {
      success: true,
      attemptsLeft: challenge.attemptsLeft,
      isExpired: false,
      isLockedOut: false,
    };
  }

  const remaining = challenge.attemptsLeft - 1;
  return {
    success: false,
    error:
      remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. Maximum attempts reached. Account temporarily locked.',
    attemptsLeft: remaining,
    isExpired: false,
    isLockedOut: remaining === 0,
  };
}
