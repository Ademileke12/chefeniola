/**
 * Rate Limiter Utility
 * 
 * Implements rate limiting for API endpoints to prevent abuse
 * Specifically designed for admin login protection
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  lockedUntil?: number
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxAttempts: number // Maximum attempts allowed
  windowMs: number // Time window in milliseconds
  lockoutMs: number // Lockout duration after max attempts
}

// Default configuration for admin login
export const ADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (e.g., IP address, email)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining attempts
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = ADMIN_LOGIN_RATE_LIMIT
): {
  isLimited: boolean
  remaining: number
  resetTime: number
  lockedUntil?: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Check if currently locked out
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      isLimited: true,
      remaining: 0,
      resetTime: entry.lockedUntil,
      lockedUntil: entry.lockedUntil,
    }
  }

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 0,
      resetTime: now + config.windowMs,
    })
    
    return {
      isLimited: false,
      remaining: config.maxAttempts,
      resetTime: now + config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxAttempts) {
    // Apply lockout
    const lockedUntil = now + config.lockoutMs
    rateLimitStore.set(identifier, {
      ...entry,
      lockedUntil,
    })

    return {
      isLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      lockedUntil,
    }
  }

  return {
    isLimited: false,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Record a failed attempt
 * 
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export function recordAttempt(
  identifier: string,
  config: RateLimitConfig = ADMIN_LOGIN_RATE_LIMIT
): void {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
  } else {
    rateLimitStore.set(identifier, {
      ...entry,
      count: entry.count + 1,
    })
  }
}

/**
 * Reset rate limit for an identifier
 * Useful for successful logins
 * 
 * @param identifier - Unique identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove if both reset time and lockout have expired
    if (entry.resetTime < now && (!entry.lockedUntil || entry.lockedUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}
