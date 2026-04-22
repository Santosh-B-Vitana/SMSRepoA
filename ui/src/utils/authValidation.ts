import { z } from 'zod';

// Login form validation schema with security constraints
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
});

// Super admin login schema with additional validation
export const superAdminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .refine(
      (email) => email.includes('superadmin') || email.includes('admin'),
      'This portal is for Super Administrators only'
    ),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
});

// Password strength validation (for future use when changing passwords)
export const passwordStrengthSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

export type LoginFormData = z.infer<typeof loginSchema>;
export type SuperAdminLoginFormData = z.infer<typeof superAdminLoginSchema>;

// Rate limiting state (client-side as a UI security measure)
interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
};

// Get rate limit state from session storage (cleared when browser closes)
function getRateLimitState(key: string): RateLimitState {
  try {
    const stored = sessionStorage.getItem(`rateLimit_${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { attempts: 0, lastAttempt: 0, lockedUntil: null };
}

// Save rate limit state
function setRateLimitState(key: string, state: RateLimitState): void {
  try {
    sessionStorage.setItem(`rateLimit_${key}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// Check if login is rate limited
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
  message: string | null;
} {
  const now = Date.now();
  const state = getRateLimitState(identifier);

  // Check if locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    const remainingMs = state.lockedUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(state.lockedUntil),
      message: `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
    };
  }

  // Reset if window has passed
  if (now - state.lastAttempt > RATE_LIMIT_CONFIG.windowMs) {
    const newState: RateLimitState = { attempts: 0, lastAttempt: now, lockedUntil: null };
    setRateLimitState(identifier, newState);
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      lockedUntil: null,
      message: null,
    };
  }

  const remainingAttempts = Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - state.attempts);
  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    lockedUntil: null,
    message: remainingAttempts <= 2 && remainingAttempts > 0
      ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before lockout.`
      : null,
  };
}

// Record a failed login attempt
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const state = getRateLimitState(identifier);

  const newAttempts = state.attempts + 1;
  const lockedUntil = newAttempts >= RATE_LIMIT_CONFIG.maxAttempts
    ? now + RATE_LIMIT_CONFIG.lockoutMs
    : null;

  setRateLimitState(identifier, {
    attempts: newAttempts,
    lastAttempt: now,
    lockedUntil,
  });
}

// Clear rate limit on successful login
export function clearRateLimit(identifier: string): void {
  sessionStorage.removeItem(`rateLimit_${identifier}`);
}

// Sanitize user input for display (prevent XSS)
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate a secure session token (for demo purposes - in production, use server-side)
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Mask sensitive data for logging
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}
