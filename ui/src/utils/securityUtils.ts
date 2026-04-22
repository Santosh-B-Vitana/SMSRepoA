import { z } from 'zod';

// ============================================
// SECURITY UTILITIES - Industry Grade
// ============================================

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Required for React
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  connectSrc: ["'self'", "https:"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
} as const;

// XSS Prevention - HTML Entity Encoding
export function encodeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SQL Injection Prevention - Escape special characters
export function escapeSqlLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// URL Validation with whitelist
const ALLOWED_DOMAINS = [
  'vitanaschools.edu',
  'schoolsystem.com',
  'localhost',
];

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    
    // Only allow same-origin or whitelisted domains
    if (parsed.origin === window.location.origin) return true;
    
    return ALLOWED_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Relative URLs are safe
    return url.startsWith('/') && !url.startsWith('//');
  }
}

// CSRF Token Management
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function storeCsrfToken(token: string): void {
  sessionStorage.setItem('csrf_token', token);
}

export function getCsrfToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}

export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken();
  return storedToken === token && token.length === 64;
}

// Secure Data Masking
export function maskSensitiveData(data: string, type: 'phone' | 'email' | 'aadhaar' | 'pan' | 'account'): string {
  switch (type) {
    case 'phone':
      return data.length >= 10 ? `${data.slice(0, 2)}****${data.slice(-4)}` : '****';
    case 'email':
      const [local, domain] = data.split('@');
      if (!domain) return '****';
      return `${local[0]}***@${domain}`;
    case 'aadhaar':
      return data.length === 12 ? `XXXX-XXXX-${data.slice(-4)}` : '****';
    case 'pan':
      return data.length === 10 ? `${data.slice(0, 2)}****${data.slice(-2)}` : '****';
    case 'account':
      return data.length >= 4 ? `****${data.slice(-4)}` : '****';
    default:
      return '****';
  }
}

// Password Strength Checker
export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  suggestions: string[];
  color: string;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters');

  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Use both uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else suggestions.push('Include at least one number');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else suggestions.push('Add a special character (!@#$%^&*)');

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    suggestions.push('Avoid repeated characters');
  }

  if (/^(password|123456|qwerty|admin)/i.test(password)) {
    score = 0;
    suggestions.push('Avoid common passwords');
  }

  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    suggestions: suggestions.slice(0, 3),
    color: colors[Math.min(score, 4)],
  };
}

// Activity Logging
export interface ActivityLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

class ActivityLogger {
  private logs: ActivityLog[] = [];
  private maxLogs = 1000;

  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    const log: ActivityLog = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.logs.unshift(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // In production, send to backend
    this.persistLog(log);
  }

  private persistLog(log: ActivityLog): void {
    // Store in sessionStorage for current session (would be API call in production)
    try {
      const stored = sessionStorage.getItem('activity_logs');
      const logs = stored ? JSON.parse(stored) : [];
      logs.unshift(log);
      sessionStorage.setItem('activity_logs', JSON.stringify(logs.slice(0, 100)));
    } catch {
      // Silently fail if storage is full
    }
  }

  getRecentLogs(limit = 50): ActivityLog[] {
    return this.logs.slice(0, limit);
  }

  getLogsByUser(userId: string, limit = 50): ActivityLog[] {
    return this.logs.filter(log => log.userId === userId).slice(0, limit);
  }

  getLogsByModule(module: string, limit = 50): ActivityLog[] {
    return this.logs.filter(log => log.module === module).slice(0, limit);
  }

  getFailedAttempts(limit = 50): ActivityLog[] {
    return this.logs.filter(log => !log.success).slice(0, limit);
  }
}

export const activityLogger = new ActivityLogger();

// Input Sanitization Schemas
export const sanitizationSchemas = {
  // Alphanumeric with spaces
  name: z.string().trim().regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),
  
  // Indian phone number
  phoneIndia: z.string().regex(/^[+]?91[-\s]?[6-9]\d{9}$/, 'Invalid Indian phone number'),
  
  // Aadhaar number
  aadhaar: z.string().regex(/^\d{12}$/, 'Invalid Aadhaar number'),
  
  // PAN number
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number'),
  
  // IFSC code
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  
  // Pincode
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code'),
  
  // UDISE code
  udise: z.string().regex(/^\d{11}$/, 'Invalid UDISE code'),
  
  // Safe text (no script tags or special chars)
  safeText: z.string().transform(val => encodeHtmlEntities(val.trim())),
  
  // Safe search query
  searchQuery: z.string()
    .trim()
    .max(100, 'Search query too long')
    .transform(val => val.replace(/[<>{}]/g, '')),
};

// Secure File Upload Validation
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
} as const;

export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  spreadsheet: 10 * 1024 * 1024, // 10MB
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileUpload(
  file: File,
  type: keyof typeof ALLOWED_FILE_TYPES
): FileValidationResult {
  const allowedTypes = ALLOWED_FILE_TYPES[type] as readonly string[];
  const maxSize = MAX_FILE_SIZES[type];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }

  // Check for suspicious file names
  if (/[<>:"|?*]/.test(file.name)) {
    return { valid: false, error: 'File name contains invalid characters' };
  }

  return { valid: true };
}

// Secure Cookie Options (for reference when backend is implemented)
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict' as const,
  maxAge: 8 * 60 * 60, // 8 hours
  path: '/',
};

// Security Headers (for reference when backend is implemented)
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Brute Force Protection - IP-based (client-side representation)
interface BruteForceEntry {
  attempts: number;
  blockedUntil: number | null;
  lastAttempt: number;
}

const bruteForceStore = new Map<string, BruteForceEntry>();

export function checkBruteForce(identifier: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const entry = bruteForceStore.get(identifier);

  if (!entry) {
    return { allowed: true };
  }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / 60000);
    return {
      allowed: false,
      message: `Too many attempts. Blocked for ${remainingMinutes} more minute(s).`,
    };
  }

  // Reset if block expired
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    bruteForceStore.delete(identifier);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordBruteForceAttempt(identifier: string): void {
  const now = Date.now();
  const entry = bruteForceStore.get(identifier) || {
    attempts: 0,
    blockedUntil: null,
    lastAttempt: now,
  };

  entry.attempts++;
  entry.lastAttempt = now;

  // Block after 10 failed attempts
  if (entry.attempts >= 10) {
    entry.blockedUntil = now + 30 * 60 * 1000; // 30 minutes
  }

  bruteForceStore.set(identifier, entry);
}

export function clearBruteForce(identifier: string): void {
  bruteForceStore.delete(identifier);
}
