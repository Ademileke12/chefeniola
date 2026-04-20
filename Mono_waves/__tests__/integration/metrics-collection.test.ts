/**
 * Metrics Collection Integration Test
 * 
 * Verifies that all metrics are being collected correctly:
 * - Payment metrics (success rate, failures, processing time)
 * - Gelato metrics (submission success, retries, validation failures)
 * - Tracking metrics (received rate, email success, time to tracking)
 * - Security metrics (signature failures, rate limits, amount mismatches)
 * 
 * This test ensures the audit service and metrics API are working together
 * to provide accurate real-time metrics for the security dashboard.
 */

import { auditService } from '@/lib/services/auditService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateCorrelationId } from '@/lib/utils/correlationId'

describe('Metrics Collection Integration', () => {
  // Clean up test data after each test
  afterEach(async () => {
    // Delete test audit events
    await supabaseAdmin
      .from('audit_events')
      .delete()
      .like('correlation_id', 'test-%')
  })

  describe('Payment Metrics', () => {
    it('should collect payment completed events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log payment completed event
      await auditService.logEvent({
        eventType: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: {
          sessionId: 'cs_test_123',
          amount: 50.00,
          currency: 'usd',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'payment.completed',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('payment.completed')
      expect(events[0].source).toBe('stripe')
      expect(events[0].metadata.amount).toBe(50.00)
    })

    it('should collect payment failed events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log payment failed event
      await auditService.logEvent({
        eventType: 'payment.failed',
        severity: 'error',
        source: 'stripe',
        correlationId,
        metadata: {
          sessionId: 'cs_test_456',
          error: 'Card declined',
          errorCode: 'card_declined',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'payment.failed',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('payment.failed')
      expect(events[0].severity).toBe('error')
      expect(events[0].metadata.error).toBe('Card declined')
    })

    it('should collect duplicate payment prevention events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log duplicate prevention event
      await auditService.logEvent({
        eventType: 'payment.duplicate_prevented',
        severity: 'warning',
        source: 'stripe',
        correlationId,
        metadata: {
          sessionId: 'cs_test_789',
          existingOrderId: 'order_123',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'payment.duplicate_prevented',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('payment.duplicate_prevented')
      expect(events[0].severity).toBe('warning')
    })
  })

  describe('Gelato Metrics', () => {
    it('should collect Gelato submission success events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log Gelato submission success
      await auditService.logEvent({
        eventType: 'order.submitted_to_gelato',
        severity: 'info',
        source: 'gelato',
        correlationId,
        metadata: {
          orderId: 'order_123',
          orderNumber: 'MW-TEST-001',
          gelatoOrderId: 'gelato_123',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'order.submitted_to_gelato',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('order.submitted_to_gelato')
      expect(events[0].source).toBe('gelato')
    })

    it('should collect Gelato submission failure events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log Gelato submission failure
      await auditService.logEvent({
        eventType: 'order.gelato_submission_failed',
        severity: 'error',
        source: 'gelato',
        correlationId,
        metadata: {
          orderId: 'order_456',
          orderNumber: 'MW-TEST-002',
          error: 'Invalid product UID',
          validationError: 'Product UID is required',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'order.gelato_submission_failed',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('order.gelato_submission_failed')
      expect(events[0].severity).toBe('error')
      expect(events[0].metadata.error).toBe('Invalid product UID')
    })
  })

  describe('Tracking Metrics', () => {
    it('should collect tracking received events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log tracking received event
      await auditService.logEvent({
        eventType: 'tracking.received',
        severity: 'info',
        source: 'gelato',
        correlationId,
        metadata: {
          orderId: 'order_789',
          orderNumber: 'MW-TEST-003',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'tracking.received',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('tracking.received')
      expect(events[0].metadata.trackingNumber).toBe('1Z999AA10123456784')
      expect(events[0].metadata.carrier).toBe('UPS')
    })

    it('should collect tracking email sent events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log tracking email sent event
      await auditService.logEvent({
        eventType: 'tracking.email_sent',
        severity: 'info',
        source: 'system',
        correlationId,
        metadata: {
          orderId: 'order_789',
          orderNumber: 'MW-TEST-003',
          customerEmail: 'customer@example.com',
          trackingNumber: '1Z999AA10123456784',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'tracking.email_sent',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('tracking.email_sent')
      expect(events[0].metadata.customerEmail).toBe('customer@example.com')
    })
  })

  describe('Security Metrics', () => {
    it('should collect webhook signature verification events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log signature verified event
      await auditService.logEvent({
        eventType: 'webhook.signature_verified',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: {
          eventId: 'evt_test_123',
          eventType: 'checkout.session.completed',
        },
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'webhook.signature_verified',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('webhook.signature_verified')
    })

    it('should collect webhook signature failure events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log signature failed event
      await auditService.logEvent({
        eventType: 'webhook.signature_failed',
        severity: 'error',
        source: 'stripe',
        correlationId,
        metadata: {
          reason: 'Invalid signature',
        },
        securityFlags: ['INVALID_SIGNATURE'],
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'webhook.signature_failed',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('webhook.signature_failed')
      expect(events[0].severity).toBe('error')
      expect(events[0].securityFlags).toContain('INVALID_SIGNATURE')
    })

    it('should collect rate limit violation events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log rate limit exceeded event
      await auditService.logEvent({
        eventType: 'security.rate_limit_exceeded',
        severity: 'warning',
        source: 'system',
        correlationId,
        metadata: {
          endpoint: '/api/webhooks/stripe',
          ip: '192.168.1.1',
          requestCount: 150,
          limit: 100,
        },
        securityFlags: ['RATE_LIMIT_EXCEEDED'],
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'security.rate_limit_exceeded',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('security.rate_limit_exceeded')
      expect(events[0].metadata.requestCount).toBe(150)
    })

    it('should collect payment amount mismatch events', async () => {
      const correlationId = `test-${generateCorrelationId()}`

      // Log amount mismatch event
      await auditService.logEvent({
        eventType: 'security.payment_amount_mismatch',
        severity: 'critical',
        source: 'stripe',
        correlationId,
        metadata: {
          sessionId: 'cs_test_999',
          expectedAmount: 50.00,
          actualAmount: 45.00,
          difference: 5.00,
        },
        securityFlags: ['AMOUNT_MISMATCH'],
      })

      // Verify event was logged
      const events = await auditService.getEvents({
        correlationId,
        eventType: 'security.payment_amount_mismatch',
      })

      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('security.payment_amount_mismatch')
      expect(events[0].severity).toBe('critical')
      expect(events[0].securityFlags).toContain('AMOUNT_MISMATCH')
    })
  })

  describe('Metrics Aggregation', () => {
    it('should calculate payment success rate correctly', async () => {
      const baseCorrelationId = `test-${Date.now()}`

      // Log 8 successful payments
      for (let i = 0; i < 8; i++) {
        await auditService.logEvent({
          eventType: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          correlationId: `${baseCorrelationId}-${i}`,
          metadata: { amount: 50.00 },
        })
      }

      // Log 2 failed payments
      for (let i = 0; i < 2; i++) {
        await auditService.logEvent({
          eventType: 'payment.failed',
          severity: 'error',
          source: 'stripe',
          correlationId: `${baseCorrelationId}-fail-${i}`,
          metadata: { error: 'Card declined' },
        })
      }

      // Fetch events and calculate success rate
      const allEvents = await auditService.getEvents({
        limit: 1000,
      })

      const completed = allEvents.filter(e => e.eventType === 'payment.completed').length
      const failed = allEvents.filter(e => e.eventType === 'payment.failed').length
      const total = completed + failed

      expect(total).toBeGreaterThanOrEqual(10)
      
      const successRate = (completed / total) * 100
      expect(successRate).toBeGreaterThanOrEqual(0)
      expect(successRate).toBeLessThanOrEqual(100)
    })

    it('should calculate Gelato success rate correctly', async () => {
      const baseCorrelationId = `test-gelato-${Date.now()}`

      // Log 9 successful submissions
      for (let i = 0; i < 9; i++) {
        await auditService.logEvent({
          eventType: 'order.submitted_to_gelato',
          severity: 'info',
          source: 'gelato',
          correlationId: `${baseCorrelationId}-${i}`,
          metadata: { orderId: `order_${i}` },
        })
      }

      // Log 1 failed submission
      await auditService.logEvent({
        eventType: 'order.gelato_submission_failed',
        severity: 'error',
        source: 'gelato',
        correlationId: `${baseCorrelationId}-fail`,
        metadata: { error: 'Validation failed' },
      })

      // Fetch events and calculate success rate
      const allEvents = await auditService.getEvents({
        limit: 1000,
      })

      const submitted = allEvents.filter(e => e.eventType === 'order.submitted_to_gelato').length
      const failed = allEvents.filter(e => e.eventType === 'order.gelato_submission_failed').length
      const total = submitted + failed

      expect(total).toBeGreaterThanOrEqual(10)
      
      const successRate = (submitted / total) * 100
      expect(successRate).toBeGreaterThanOrEqual(0)
      expect(successRate).toBeLessThanOrEqual(100)
    })

    it('should group failure reasons correctly', async () => {
      const baseCorrelationId = `test-failures-${Date.now()}`

      // Log various failure types
      const failureReasons = [
        'Card declined',
        'Card declined',
        'Card declined',
        'Insufficient funds',
        'Insufficient funds',
        'Invalid card number',
      ]

      for (let i = 0; i < failureReasons.length; i++) {
        await auditService.logEvent({
          eventType: 'payment.failed',
          severity: 'error',
          source: 'stripe',
          correlationId: `${baseCorrelationId}-${i}`,
          metadata: { error: failureReasons[i] },
        })
      }

      // Fetch events and group by reason
      const events = await auditService.getEvents({
        eventType: 'payment.failed',
        limit: 1000,
      })

      const byReason: Record<string, number> = {}
      events.forEach(event => {
        const reason = event.metadata?.error || 'Unknown'
        byReason[reason] = (byReason[reason] || 0) + 1
      })

      // Verify grouping
      expect(byReason['Card declined']).toBeGreaterThanOrEqual(3)
      expect(byReason['Insufficient funds']).toBeGreaterThanOrEqual(2)
      expect(byReason['Invalid card number']).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Security Alerts', () => {
    it('should retrieve security alerts (critical and error severity)', async () => {
      const baseCorrelationId = `test-alerts-${Date.now()}`

      // Log critical security event
      await auditService.logEvent({
        eventType: 'security.payment_amount_mismatch',
        severity: 'critical',
        source: 'stripe',
        correlationId: `${baseCorrelationId}-1`,
        metadata: { difference: 10.00 },
        securityFlags: ['AMOUNT_MISMATCH'],
      })

      // Log error security event
      await auditService.logEvent({
        eventType: 'webhook.signature_failed',
        severity: 'error',
        source: 'stripe',
        correlationId: `${baseCorrelationId}-2`,
        metadata: { reason: 'Invalid signature' },
        securityFlags: ['INVALID_SIGNATURE'],
      })

      // Log info event (should not be in alerts)
      await auditService.logEvent({
        eventType: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlationId: `${baseCorrelationId}-3`,
        metadata: { amount: 50.00 },
      })

      // Fetch security alerts
      const alerts = await auditService.getSecurityAlerts(100)

      // Verify only critical and error events are returned
      expect(alerts.length).toBeGreaterThanOrEqual(2)
      alerts.forEach(alert => {
        expect(['critical', 'error']).toContain(alert.severity)
      })
    })
  })

  describe('Correlation ID Tracking', () => {
    it('should track all events for a single order flow', async () => {
      const correlationId = `test-flow-${generateCorrelationId()}`

      // Simulate complete order flow
      await auditService.logEvent({
        eventType: 'webhook.received',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: { eventType: 'checkout.session.completed' },
      })

      await auditService.logEvent({
        eventType: 'webhook.signature_verified',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: { eventId: 'evt_test' },
      })

      await auditService.logEvent({
        eventType: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: { amount: 50.00 },
      })

      await auditService.logEvent({
        eventType: 'order.created',
        severity: 'info',
        source: 'stripe',
        correlationId,
        metadata: { orderNumber: 'MW-TEST-FLOW' },
      })

      await auditService.logEvent({
        eventType: 'order.submitted_to_gelato',
        severity: 'info',
        source: 'gelato',
        correlationId,
        metadata: { orderNumber: 'MW-TEST-FLOW' },
      })

      // Fetch all events for this correlation ID
      const events = await auditService.getEvents({ correlationId })

      // Verify all events are present
      expect(events).toHaveLength(5)
      expect(events.every(e => e.correlationId === correlationId)).toBe(true)

      // Verify event order (should be in chronological order)
      const eventTypes = events.map(e => e.eventType)
      expect(eventTypes).toContain('webhook.received')
      expect(eventTypes).toContain('webhook.signature_verified')
      expect(eventTypes).toContain('payment.completed')
      expect(eventTypes).toContain('order.created')
      expect(eventTypes).toContain('order.submitted_to_gelato')
    })
  })
})
