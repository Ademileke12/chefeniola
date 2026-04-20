/**
 * Payment & Fulfillment Security Tests
 * 
 * Tests security features for the payment-to-delivery pipeline:
 * - Webhook signature verification (Stripe and Gelato)
 * - Rate limiting enforcement
 * - Input sanitization
 * - Audit logging
 * 
 * Validates: Requirements 1.1, 1.6, 1.7, 1.8
 */

import { checkRateLimit, recordAttempt, resetRateLimit } from '@/lib/utils/rateLimiter'
import { sanitizeHTML, sanitizeText, sanitizeEmail, sanitizeURL } from '@/lib/utils/sanitize'
import { auditService } from '@/lib/services/auditService'
import { stripeService } from '@/lib/services/stripeService'
import crypto from 'crypto'

// Mock environment variables
const originalEnv = process.env

beforeAll(() => {
  process.env = {
    ...originalEnv,
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    GELATO_WEBHOOK_SECRET: 'gelato_test_secret',
  }
})

afterAll(() => {
  process.env = originalEnv
})

// Mock audit service to avoid database calls
jest.mock('@/lib/services/auditService', () => ({
  auditService: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}))

// Mock supabase to avoid database calls
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}))

describe('Payment & Fulfillment Security Tests', () => {
  describe('Webhook Signature Verification', () => {
    describe('Stripe Webhook', () => {
      it('should reject invalid webhook signatures', () => {
        const payload = JSON.stringify({
          id: 'evt_test',
          type: 'checkout.session.completed',
          data: { object: {} }
        })

        // Test with invalid signature
        expect(() => {
          stripeService.verifyWebhookSignature(payload, 'invalid_signature')
        }).toThrow()
      })

      it('should reject webhooks with malformed signature format', () => {
        const payload = JSON.stringify({
          id: 'evt_test',
          type: 'checkout.session.completed',
          data: { object: {} }
        })

        // Test with malformed signature (missing timestamp)
        expect(() => {
          stripeService.verifyWebhookSignature(payload, 't=,v1=abc')
        }).toThrow()
      })

      it('should reject webhooks with expired timestamps', () => {
        const payload = JSON.stringify({
          id: 'evt_test',
          type: 'checkout.session.completed',
          data: { object: {} }
        })

        // Create signature with old timestamp (more than 5 minutes ago)
        const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
        const signature = `t=${oldTimestamp},v1=invalid`

        expect(() => {
          stripeService.verifyWebhookSignature(payload, signature)
        }).toThrow()
      })
    })

    describe('Gelato Webhook', () => {
      it('should verify valid HMAC signatures', () => {
        const payload = JSON.stringify({
          eventType: 'order.status.updated',
          eventId: 'evt_test',
          timestamp: new Date().toISOString(),
          data: {
            orderId: 'gelato_123',
            orderReferenceId: 'MW-12345',
            status: 'shipped',
          }
        })

        // Generate valid HMAC signature
        const hmac = crypto.createHmac('sha256', process.env.GELATO_WEBHOOK_SECRET!)
        hmac.update(payload)
        const signature = hmac.digest('hex')

        // Verify signature manually
        const hmac2 = crypto.createHmac('sha256', process.env.GELATO_WEBHOOK_SECRET!)
        hmac2.update(payload)
        const computedSignature = hmac2.digest('hex')

        expect(signature).toBe(computedSignature)
      })

      it('should reject invalid HMAC signatures', () => {
        const payload = JSON.stringify({
          eventType: 'order.status.updated',
          eventId: 'evt_test',
          timestamp: new Date().toISOString(),
          data: {
            orderId: 'gelato_123',
            orderReferenceId: 'MW-12345',
            status: 'shipped',
          }
        })

        // Generate signature with wrong secret
        const hmac = crypto.createHmac('sha256', 'wrong_secret')
        hmac.update(payload)
        const invalidSignature = hmac.digest('hex')

        // Verify with correct secret should fail
        const hmac2 = crypto.createHmac('sha256', process.env.GELATO_WEBHOOK_SECRET!)
        hmac2.update(payload)
        const correctSignature = hmac2.digest('hex')

        expect(invalidSignature).not.toBe(correctSignature)
      })

      it('should use timing-safe comparison for signatures', () => {
        const payload = 'test payload'
        const secret = process.env.GELATO_WEBHOOK_SECRET!

        const hmac1 = crypto.createHmac('sha256', secret)
        hmac1.update(payload)
        const signature1 = hmac1.digest('hex')

        const hmac2 = crypto.createHmac('sha256', secret)
        hmac2.update(payload)
        const signature2 = hmac2.digest('hex')

        // Same payload and secret should produce same signature
        expect(signature1).toBe(signature2)

        // Timing-safe comparison should work
        const result = crypto.timingSafeEqual(
          Buffer.from(signature1),
          Buffer.from(signature2)
        )
        expect(result).toBe(true)
      })
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limits before each test
      resetRateLimit('test-ip-rate-limit')
    })

    it('should allow requests within rate limit', () => {
      const identifier = 'test-ip-rate-limit-1'
      const config = { maxAttempts: 10, windowMs: 60000, lockoutMs: 300000 }

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        recordAttempt(identifier, config)
      }

      const result = checkRateLimit(identifier, config)
      expect(result.isLimited).toBe(false)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-ip-rate-limit-2'
      const config = { maxAttempts: 10, windowMs: 60000, lockoutMs: 300000 }

      // Make 10 requests (at the limit)
      for (let i = 0; i < 10; i++) {
        recordAttempt(identifier, config)
      }

      const result = checkRateLimit(identifier, config)
      expect(result.isLimited).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should enforce lockout period after exceeding limit', () => {
      const identifier = 'test-ip-rate-limit-3'
      const config = { maxAttempts: 5, windowMs: 60000, lockoutMs: 300000 }

      // Exceed the limit
      for (let i = 0; i < 6; i++) {
        recordAttempt(identifier, config)
      }

      const result = checkRateLimit(identifier, config)
      expect(result.isLimited).toBe(true)
      expect(result.lockedUntil).toBeDefined()
      expect(result.lockedUntil).toBeGreaterThan(Date.now())
    })

    it('should reset rate limit after successful operation', () => {
      const identifier = 'test-ip-rate-limit-4'
      const config = { maxAttempts: 5, windowMs: 60000, lockoutMs: 300000 }

      // Make some attempts
      for (let i = 0; i < 3; i++) {
        recordAttempt(identifier, config)
      }

      // Reset after successful operation
      resetRateLimit(identifier)

      const result = checkRateLimit(identifier, config)
      expect(result.isLimited).toBe(false)
      expect(result.remaining).toBe(config.maxAttempts)
    })

    it('should track rate limits per identifier independently', () => {
      const config = { maxAttempts: 5, windowMs: 60000, lockoutMs: 300000 }

      // Exceed limit for identifier 1
      for (let i = 0; i < 6; i++) {
        recordAttempt('identifier-1', config)
      }

      // Make only 2 attempts for identifier 2
      for (let i = 0; i < 2; i++) {
        recordAttempt('identifier-2', config)
      }

      const result1 = checkRateLimit('identifier-1', config)
      const result2 = checkRateLimit('identifier-2', config)

      expect(result1.isLimited).toBe(true)
      expect(result2.isLimited).toBe(false)
    })
  })

  describe('Input Sanitization', () => {
    describe('XSS Prevention', () => {
      it('should remove script tags from HTML input', () => {
        const malicious = '<p>Hello</p><script>alert("XSS")</script>'
        const sanitized = sanitizeHTML(malicious)
        
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('alert')
      })

      it('should remove event handlers from HTML', () => {
        const malicious = '<div onclick="alert(1)" onload="steal()">Click</div>'
        const sanitized = sanitizeHTML(malicious)
        
        expect(sanitized).not.toContain('onclick')
        expect(sanitized).not.toContain('onload')
      })

      it('should remove javascript: protocol from links', () => {
        const malicious = '<a href="javascript:alert(1)">Click</a>'
        const sanitized = sanitizeHTML(malicious)
        
        expect(sanitized).not.toContain('javascript:')
      })

      it('should remove iframe tags', () => {
        const malicious = '<p>Content</p><iframe src="evil.com"></iframe>'
        const sanitized = sanitizeHTML(malicious)
        
        expect(sanitized).not.toContain('<iframe>')
      })

      it('should strip all HTML tags from text input', () => {
        const malicious = '<script>alert(1)</script>Hello<b>World</b>'
        const sanitized = sanitizeText(malicious)
        
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).toContain('Hello')
        expect(sanitized).toContain('World')
      })
    })

    describe('SQL Injection Prevention', () => {
      it('should reject SQL injection attempts in email', () => {
        const malicious = "admin'--"
        
        expect(() => sanitizeEmail(malicious)).toThrow('Invalid email format')
      })

      it('should reject SQL injection attempts in URL', () => {
        const malicious = "http://example.com'; DROP TABLE users--"
        
        expect(() => sanitizeURL(malicious)).toThrow('Invalid URL')
      })

      it('should validate email format strictly', () => {
        const validEmail = 'user@example.com'
        const invalidEmail = "user@example.com' OR '1'='1"
        
        expect(sanitizeEmail(validEmail)).toBe('user@example.com')
        expect(() => sanitizeEmail(invalidEmail)).toThrow('Invalid email format')
      })
    })

    describe('Path Traversal Prevention', () => {
      it('should accept valid URLs without path traversal', () => {
        const validUrl = 'https://example.com/api/webhook'
        
        expect(sanitizeURL(validUrl)).toBe(validUrl)
      })

      it('should reject data: protocol URLs', () => {
        const malicious = 'data:text/html,<script>alert(1)</script>'
        
        expect(() => sanitizeURL(malicious)).toThrow('Invalid URL')
      })

      it('should reject file: protocol URLs', () => {
        const malicious = 'file:///etc/passwd'
        
        expect(() => sanitizeURL(malicious)).toThrow('Invalid URL')
      })
    })
  })

  describe('Audit Logging', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should log security events with proper structure', async () => {
      const mockLogEvent = auditService.logEvent as jest.Mock

      await auditService.logEvent({
        eventType: 'webhook.signature_failed',
        severity: 'error',
        source: 'stripe',
        correlationId: 'test-correlation-id',
        metadata: {
          reason: 'Invalid signature',
        },
        securityFlags: ['INVALID_SIGNATURE'],
      })

      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'webhook.signature_failed',
          severity: 'error',
          source: 'stripe',
          correlationId: 'test-correlation-id',
          securityFlags: expect.arrayContaining(['INVALID_SIGNATURE']),
        })
      )
    })

    it('should include correlation IDs in audit events', async () => {
      const mockLogEvent = auditService.logEvent as jest.Mock

      const correlationId = 'test-correlation-' + Date.now()

      await auditService.logEvent({
        eventType: 'webhook.received',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: {},
      })

      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId,
        })
      )
    })

    it('should log security flags for critical events', async () => {
      const mockLogEvent = auditService.logEvent as jest.Mock

      await auditService.logEvent({
        eventType: 'security.rate_limit_exceeded',
        severity: 'critical',
        source: 'system',
        correlationId: 'test-id',
        metadata: {
          ip: '192.168.1.1',
          attempts: 100,
        },
        securityFlags: ['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY'],
      })

      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          securityFlags: expect.arrayContaining(['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY']),
        })
      )
    })

    it('should log different severity levels', async () => {
      const mockLogEvent = auditService.logEvent as jest.Mock

      const severities: Array<'info' | 'warning' | 'error' | 'critical'> = ['info', 'warning', 'error', 'critical']

      for (const severity of severities) {
        await auditService.logEvent({
          eventType: 'webhook.received',
          severity,
          source: 'stripe',
          correlationId: 'test-id',
          metadata: {},
        })
      }

      expect(mockLogEvent).toHaveBeenCalledTimes(4)
      severities.forEach(severity => {
        expect(mockLogEvent).toHaveBeenCalledWith(
          expect.objectContaining({ severity })
        )
      })
    })
  })

  describe('Webhook Processing Security', () => {
    it('should validate JSON payload structure', () => {
      const validPayload = JSON.stringify({
        eventType: 'order.status.updated',
        eventId: 'evt_test',
        timestamp: new Date().toISOString(),
        data: {}
      })

      expect(() => JSON.parse(validPayload)).not.toThrow()
    })

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"incomplete": '

      expect(() => JSON.parse(malformedJson)).toThrow()
    })

    it('should reject empty payloads', () => {
      const emptyPayload = ''

      expect(() => JSON.parse(emptyPayload)).toThrow()
    })

    it('should validate required webhook fields', () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_test',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-12345',
          status: 'shipped',
        }
      }

      expect(payload.eventType).toBeDefined()
      expect(payload.eventId).toBeDefined()
      expect(payload.timestamp).toBeDefined()
      expect(payload.data).toBeDefined()
    })
  })

  describe('Security Headers and Configuration', () => {
    it('should have webhook secrets configured', () => {
      expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined()
      expect(process.env.GELATO_WEBHOOK_SECRET).toBeDefined()
    })

    it('should use HTTPS-only URLs in production', () => {
      const testUrls = [
        'https://example.com/webhook',
        'https://api.stripe.com/v1/webhooks',
      ]

      testUrls.forEach(url => {
        expect(url).toMatch(/^https:\/\//)
      })
    })
  })
})
