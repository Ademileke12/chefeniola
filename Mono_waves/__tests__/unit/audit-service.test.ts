/**
 * Unit tests for AuditService
 * 
 * Tests the audit logging and querying functionality
 */

import { auditService, AuditEvent, AuditFilters } from '@/lib/services/auditService'
import { supabaseAdmin } from '@/lib/supabase/server'

// Mock Supabase admin client
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logEvent', () => {
    it('should log an event to the database', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.logEvent({
        eventType: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlationId: 'test-correlation-id',
        metadata: { amount: 100 },
      })

      expect(mockFrom).toHaveBeenCalledWith('audit_events')
      expect(mockInsert).toHaveBeenCalledWith({
        event_type: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlation_id: 'test-correlation-id',
        user_id: undefined,
        metadata: { amount: 100 },
        security_flags: null,
      })
    })

    it('should handle errors gracefully without throwing', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: new Error('Database error'),
      })
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      // Should not throw
      await expect(
        auditService.logEvent({
          eventType: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          correlationId: 'test-correlation-id',
          metadata: {},
        })
      ).resolves.not.toThrow()
    })

    it('should handle missing required fields gracefully', async () => {
      const mockInsert = jest.fn()
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      // Missing correlationId
      await auditService.logEvent({
        eventType: 'payment.completed',
        severity: 'info',
        source: 'stripe',
        correlationId: '',
        metadata: {},
      })

      // Should not call insert with invalid data
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should include security flags when provided', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.logEvent({
        eventType: 'security.payment_amount_mismatch',
        severity: 'critical',
        source: 'stripe',
        correlationId: 'test-correlation-id',
        metadata: {},
        securityFlags: ['AMOUNT_MISMATCH', 'FRAUD_SUSPECTED'],
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          security_flags: ['AMOUNT_MISMATCH', 'FRAUD_SUSPECTED'],
        })
      )
    })
  })

  describe('getEvents', () => {
    it('should fetch events with default filters', async () => {
      const mockData = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          event_type: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          correlation_id: 'test-1',
          metadata: {},
          security_flags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const events = await auditService.getEvents()

      expect(mockFrom).toHaveBeenCalledWith('audit_events')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('timestamp', { ascending: false })
      expect(mockRange).toHaveBeenCalledWith(0, 99) // Default limit 100
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('payment.completed')
    })

    it('should filter by event type', async () => {
      const mockEq = jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })
      const mockOrder = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.getEvents({ eventType: 'payment.completed' })

      expect(mockEq).toHaveBeenCalledWith('event_type', 'payment.completed')
    })

    it('should filter by multiple event types', async () => {
      const mockIn = jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })
      const mockOrder = jest.fn().mockReturnValue({ in: mockIn })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.getEvents({
        eventType: ['payment.completed', 'payment.failed'],
      })

      expect(mockIn).toHaveBeenCalledWith('event_type', [
        'payment.completed',
        'payment.failed',
      ])
    })

    it('should filter by severity', async () => {
      const mockEq = jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })
      const mockOrder = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.getEvents({ severity: 'critical' })

      expect(mockEq).toHaveBeenCalledWith('severity', 'critical')
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const mockLte = jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })
      const mockGte = jest.fn().mockReturnValue({ lte: mockLte })
      const mockOrder = jest.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.getEvents({ startDate, endDate })

      expect(mockGte).toHaveBeenCalledWith('timestamp', startDate.toISOString())
      expect(mockLte).toHaveBeenCalledWith('timestamp', endDate.toISOString())
    })

    it('should handle database errors gracefully', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const events = await auditService.getEvents()

      expect(events).toEqual([])
    })
  })

  describe('getSecurityAlerts', () => {
    it('should fetch events with critical or error severity', async () => {
      const mockData = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          event_type: 'webhook.signature_failed',
          severity: 'critical',
          source: 'stripe',
          correlation_id: 'test-1',
          metadata: {},
          security_flags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockIn = jest.fn().mockReturnValue({ range: mockRange })
      const mockOrder = jest.fn().mockReturnValue({ in: mockIn })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const alerts = await auditService.getSecurityAlerts()

      expect(mockIn).toHaveBeenCalledWith('severity', ['critical', 'error'])
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('critical')
    })

    it('should respect custom limit', async () => {
      const mockRange = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockIn = jest.fn().mockReturnValue({ range: mockRange })
      const mockOrder = jest.fn().mockReturnValue({ in: mockIn })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      await auditService.getSecurityAlerts(25)

      expect(mockRange).toHaveBeenCalledWith(0, 24) // limit 25
    })
  })

  describe('generateAuditReport', () => {
    it('should generate a comprehensive audit report', async () => {
      const mockData = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          event_type: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          correlation_id: 'test-1',
          metadata: {},
          security_flags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          timestamp: '2024-01-01T01:00:00Z',
          event_type: 'webhook.signature_failed',
          severity: 'critical',
          source: 'stripe',
          correlation_id: 'test-2',
          metadata: {},
          security_flags: ['SIGNATURE_INVALID'],
          created_at: '2024-01-01T01:00:00Z',
        },
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockLte = jest.fn().mockReturnValue({ range: mockRange })
      const mockGte = jest.fn().mockReturnValue({ lte: mockLte })
      const mockOrder = jest.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const report = await auditService.generateAuditReport(startDate, endDate)

      expect(report.startDate).toEqual(startDate)
      expect(report.endDate).toEqual(endDate)
      expect(report.summary.totalEvents).toBe(2)
      expect(report.summary.eventsBySeverity.info).toBe(1)
      expect(report.summary.eventsBySeverity.critical).toBe(1)
      expect(report.summary.eventsBySource.stripe).toBe(2)
      expect(report.securityAlerts).toHaveLength(1)
      expect(report.criticalEvents).toHaveLength(1)
      expect(report.recommendations).toBeDefined()
    })

    it('should generate recommendations based on event data', async () => {
      const mockData = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          event_type: 'webhook.signature_failed',
          severity: 'critical',
          source: 'stripe',
          correlation_id: 'test-1',
          metadata: {},
          security_flags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockLte = jest.fn().mockReturnValue({ range: mockRange })
      const mockGte = jest.fn().mockReturnValue({ lte: mockLte })
      const mockOrder = jest.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const report = await auditService.generateAuditReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(report.recommendations.join(' ')).toContain(
        'webhook signature verification failures'
      )
    })

    it('should recommend no issues when system is healthy', async () => {
      const mockData = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          event_type: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          correlation_id: 'test-1',
          metadata: {},
          security_flags: [],
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockLte = jest.fn().mockReturnValue({ range: mockRange })
      const mockGte = jest.fn().mockReturnValue({ lte: mockLte })
      const mockOrder = jest.fn().mockReturnValue({ gte: mockGte })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
      ;(supabaseAdmin.from as jest.Mock) = mockFrom

      const report = await auditService.generateAuditReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(report.recommendations).toContain(
        'No significant issues detected. System is operating normally.'
      )
    })
  })
})
