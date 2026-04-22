// Rate Limiter Service - Mock Implementation
// In production, replace with Redis-based limiter (Upstash, etc.)

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimitAsync(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const record = this.limits.get(key);

    // No record or expired window
    if (!record || now > record.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }

    // Within window
    if (record.count < this.config.maxRequests) {
      record.count++;
      return {
        allowed: true,
        remaining: this.config.maxRequests - record.count,
        resetTime: record.resetTime
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  // Simple synchronous check for mock implementation
  checkLimit(key: string, maxRequests: number = 100): boolean {
    const now = Date.now();
    const record = this.limits.get(key);

    // No record or expired window
    if (!record || now > record.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    // Within window
    if (record.count < maxRequests) {
      record.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  reset(key: string): void {
    this.limits.delete(key);
  }
}

// School-specific rate limiters
export const feeApiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // 100 requests per minute per school
});

export const paymentLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20 // 20 payment requests per minute per school
});

// Single instance for all modules
export const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100
});

// Helper to check rate limit
export async function checkRateLimit(
  schoolId: string,
  limiter: RateLimiter = feeApiLimiter
): Promise<void> {
  const result = await limiter.checkLimitAsync(schoolId);
  
  if (!result.allowed) {
    const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);
    throw new Error(
      `Rate limit exceeded. Please try again in ${waitTime} seconds.`
    );
  }
}

export { RateLimiter };
