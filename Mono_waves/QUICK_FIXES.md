# Quick Security Fixes - Implementation Guide

**Date**: April 4, 2026  
**Estimated Time**: 2-4 hours  
**Priority**: HIGH

These are security improvements that can be implemented immediately without major architectural changes.

---

## 1. Fix Rate Limiter Memory Leak (30 minutes)

**File**: `lib/security.ts`

**Current Issue**: Map grows indefinitely

**Fix**:
```typescript
import { NextRequest, NextResponse } from 'next/server'

/**
 * Basic in-memory rate limiter with cleanup
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // 10 requests per minute
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Periodic cleanup of old entries
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now - record.lastReset > WINDOW_MS * 2) {
        rateLimitMap.delete(ip)
      }
    }
  }, CLEANUP_INTERVAL)
}

export function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now }

    if (now - record.lastReset > WINDOW_MS) {
        record.count = 1
        record.lastReset = now
    } else {
        record.count++
    }

    rateLimitMap.set(ip, record)
    return record.count <= MAX_REQUESTS
}

export function validateCSRF(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const method = request.method
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (!origin && !referer) return false
        if (origin && !origin.startsWith(appUrl)) return false
        if (referer && !referer.startsWith(appUrl)) return false
    }

    return true
}

export async function securityCheck(request: NextRequest) {
    if (!validateCSRF(request)) {
        return NextResponse.json({ error: 'Forbidden: CSRF validation failed' }, { status: 403 })
    }

    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    return null
}
```

---

## 2. Create Secure Logger with PII Redaction (45 minutes)

**New File**: `lib/logger.ts`

```typescript
/**
 * Secure logger with PII redaction
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  [key: string]: any
}

// PII patterns to redact
const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  { pattern: /\b\d{16}\b/g, replacement: '[CARD_REDACTED]' },
  { pattern: /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: 'Bearer [TOKEN_REDACTED]' },
  { pattern: /"password"\s*:\s*"[^"]*"/g, replacement: '"password":"[REDACTED]"' },
  { pattern: /"token"\s*:\s*"[^"]*"/g, replacement: '"token":"[REDACTED]"' },
]

/**
 * Redact PII from string
 */
function redactPII(text: string): string {
  let redacted = text
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }
  return redacted
}

/**
 * Redact PII from object
 */
function redactObject(obj: any): any {
  if (typeof obj === 'string') {
    return redactPII(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactObject)
  }
  
  if (obj && typeof obj === 'object') {
    const redacted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys
      if (['password', 'token', 'secret', 'apiKey', 'api_key'].includes(key)) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = redactObject(value)
      }
    }
    return redacted
  }
  
  return obj
}

/**
 * Format log message
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(redactObject(context))}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${redactPII(message)}${contextStr}`
}

/**
 * Logger class
 */
class Logger {
  private minLevel: LogLevel = 'info'

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
    if (envLevel && ['error', 'warn', 'info', 'debug'].includes(envLevel)) {
      this.minLevel = envLevel
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug']
    return levels.indexOf(level) <= levels.indexOf(this.minLevel)
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(formatLog('error', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(formatLog('warn', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(formatLog('info', message, context))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(formatLog('debug', message, context))
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { redactPII, redactObject }
```

**Usage Example**:
```typescript
import { logger } from '@/lib/logger'

// Instead of:
console.error('Error uploading file:', error)

// Use:
logger.error('Error uploading file', { 
  errorMessage: error.message,
  // Stack trace will be redacted if it contains PII
})
```

---

## 3. Add CSRF Protection to Missing Endpoints (1 hour)

### 3.1 Products API

**File**: `app/api/products/route.ts`

Add at the top of POST handler:
```typescript
export async function POST(request: NextRequest) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}
```

### 3.2 Product Update/Delete

**File**: `app/api/products/[id]/route.ts`

```typescript
import { securityCheck } from '@/lib/security'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}
```

### 3.3 Admin Settings

**File**: `app/api/admin/settings/route.ts`

```typescript
import { securityCheck } from '@/lib/security'

export async function PUT(request: NextRequest) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}
```

### 3.4 Admin Support

**File**: `app/api/admin/support/[id]/route.ts`

```typescript
import { securityCheck } from '@/lib/security'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Add CSRF check
  const csrfError = await securityCheck(request)
  if (csrfError) return csrfError

  // Existing code...
}
```

---

## 4. Update Error Logging to Use Secure Logger (30 minutes)

Replace all `console.error` calls with secure logger:

### Example: Upload Route

**File**: `app/api/upload/route.ts`

```typescript
import { logger } from '@/lib/logger'

// Replace:
console.error('Upload error details:', uploadError)
console.error('Error message:', uploadError.message)
console.error('Error stack:', uploadError.stack)

// With:
logger.error('Upload error occurred', {
  errorMessage: uploadError.message,
  errorType: uploadError.name,
  // Don't log stack trace in production
})
```

### Example: Webhook Routes

**File**: `app/api/webhooks/stripe/route.ts`

```typescript
import { logger } from '@/lib/logger'

// Replace:
console.log(`Order created: ${order.orderNumber}`)
console.log(`Order submitted to Gelato: ${order.orderNumber}`)

// With:
logger.info('Order created', { orderNumber: order.orderNumber })
logger.info('Order submitted to Gelato', { orderNumber: order.orderNumber })
```

---

## 5. Add Security Headers (15 minutes)

**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.gelato.com https://api.xroute.ai",
              "frame-src 'self' https://js.stripe.com",
            ].join('; ')
          }
        ],
      },
    ]
  },
  
  // Existing config...
}

module.exports = nextConfig
```

---

## 6. Create Pre-commit Hook for Secret Detection (20 minutes)

**File**: `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: check-json
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: detect-private-key

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
        exclude: package-lock.json
```

**Installation**:
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Create baseline
detect-secrets scan > .secrets.baseline

# Test
pre-commit run --all-files
```

---

## 7. Add Environment Variable Validation (15 minutes)

**New File**: `lib/env.ts`

```typescript
/**
 * Environment variable validation
 */

interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NEXT_PUBLIC_APP_URL: string
}

interface OptionalEnvVars {
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  GELATO_API_KEY?: string
  GELATO_WEBHOOK_SECRET?: string
  XROUTE_API_KEY?: string
  ADMIN_EMAIL?: string
  LOG_LEVEL?: string
}

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const required: (keyof RequiredEnvVars)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      `Please check your .env.local file.`
    )
  }
}

/**
 * Get environment variable with validation
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  
  return value || defaultValue!
}

// Validate on import (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv()
}
```

**Usage in services**:
```typescript
import { getEnv } from '@/lib/env'

// Instead of:
const apiKey = process.env.GELATO_API_KEY

// Use:
const apiKey = getEnv('GELATO_API_KEY')
```

---

## 8. Testing the Fixes

### Test Rate Limiter
```bash
# Run 15 requests quickly
for i in {1..15}; do
  curl http://localhost:3000/api/cart
done

# Should see "Too Many Requests" after 10
```

### Test Logger
```typescript
// __tests__/unit/logger.test.ts
import { redactPII, redactObject } from '@/lib/logger'

describe('Logger PII Redaction', () => {
  it('should redact email addresses', () => {
    const text = 'User email is john@example.com'
    expect(redactPII(text)).toBe('User email is [EMAIL_REDACTED]')
  })

  it('should redact phone numbers', () => {
    const text = 'Call 555-123-4567'
    expect(redactPII(text)).toBe('Call [PHONE_REDACTED]')
  })

  it('should redact passwords in objects', () => {
    const obj = { username: 'john', password: 'secret123' }
    const redacted = redactObject(obj)
    expect(redacted.password).toBe('[REDACTED]')
  })
})
```

### Test CSRF Protection
```bash
# Should fail (no origin header)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Should succeed (with origin)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"name":"Test"}'
```

---

## Implementation Checklist

- [ ] Fix rate limiter memory leak
- [ ] Create secure logger with PII redaction
- [ ] Add CSRF protection to all admin endpoints
- [ ] Update all error logging to use secure logger
- [ ] Add security headers to Next.js config
- [ ] Set up pre-commit hooks for secret detection
- [ ] Add environment variable validation
- [ ] Test all fixes
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

---

## Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| Rate limiter fix | 30 min | HIGH |
| Secure logger | 45 min | HIGH |
| CSRF protection | 1 hour | HIGH |
| Update logging | 30 min | HIGH |
| Security headers | 15 min | MEDIUM |
| Pre-commit hooks | 20 min | MEDIUM |
| Env validation | 15 min | LOW |
| Testing | 30 min | HIGH |

**Total**: ~4 hours

---

## After Implementation

1. Run full test suite
2. Check for any broken functionality
3. Monitor error logs
4. Update team documentation
5. Schedule code review
6. Plan deployment

---

**Created**: April 4, 2026  
**Status**: Ready for Implementation  
**Owner**: Backend Team
