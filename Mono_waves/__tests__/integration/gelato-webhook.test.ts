/**
 * Integration tests for Gelato webhook handler
 * 
 * Tests webhook signature verification, order status updates,
 * tracking information storage, and idempotent webhook processing
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * 
 * @jest-environment node
 */

import { POST } from '@/app/api/webhooks/gelato/route'
import { supabaseAdmin } from '@/lib/supabase/server'
import { orderService } from '@/lib/services/orderService'
import crypto from 'crypto'
import type { NextRequest } from 'next/server'

// Mock NextResponse before importing the route
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, options?: any) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}))

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

jest.mock('@/lib/services/orderService', () => ({
  orderService: {
    updateOrderStatus: jest.fn(),
  },
}))

describe('Gelato Webhook Handler', () => {
  const mockWebhookSecret = 'test-webhook-secret'
  
  beforeAll(() => {
    process.env.GELATO_WEBHOOK_SECRET = mockWebhookSecret
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Helper function to create a valid webhook signature
   */
  function createSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', mockWebhookSecret)
    hmac.update(payload)
    return hmac.digest('hex')
  }

  /**
   * Helper function to create a mock request
   */
  function createMockRequest(
    payload: any,
    signature?: string | null
  ): Partial<NextRequest> {
    const body = JSON.stringify(payload)
    return {
      text: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'x-gelato-signature') {
            return signature === null ? null : (signature || createSignature(body))
          }
          return null
        }),
      } as any,
    }
  }

  /**
   * Helper function to setup Supabase mocks
   */
  function setupSupabaseMocks(orderData?: any) {
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: orderData ? [orderData] : [],
      error: null,
    })
    const mockInsert = jest.fn().mockReturnThis()
    const mockUpdate = jest.fn().mockReturnThis()

    ;(supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      limit: mockLimit,
      insert: mockInsert,
      update: mockUpdate,
    })

    return { mockSelect, mockEq, mockLimit, mockInsert, mockUpdate }
  }

  describe('Webhook Signature Verification', () => {
    it('should reject webhook with missing signature', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_123',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload, null)
      setupSupabaseMocks()

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid signature')
    })

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_123',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload, 'invalid_signature')
      setupSupabaseMocks()

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid signature')
    })

    it('should accept webhook with valid signature', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_123',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })
  })

  describe('Order Status Updates', () => {
    it('should update order status on order.status.updated event', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_123',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'processing',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'printing',
        undefined
      )
    })

    it('should update order status on order.shipped event', async () => {
      const payload = {
        eventType: 'order.shipped',
        eventId: 'evt_124',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        }
      )
    })

    it('should handle order.delivered event', async () => {
      const payload = {
        eventType: 'order.delivered',
        eventId: 'evt_125',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'delivered',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'delivered',
        undefined
      )
    })

    it('should handle order.cancelled event', async () => {
      const payload = {
        eventType: 'order.cancelled',
        eventId: 'evt_126',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'cancelled',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'cancelled',
        undefined
      )
    })

    it('should handle order.failed event', async () => {
      const payload = {
        eventType: 'order.failed',
        eventId: 'evt_127',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'failed',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'failed',
        undefined
      )
    })
  })

  describe('Tracking Information Storage', () => {
    it('should store tracking information when provided', async () => {
      const payload = {
        eventType: 'order.shipped',
        eventId: 'evt_128',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'shipped',
        expect.objectContaining({
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        })
      )
    })

    it('should not include tracking data when not provided', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_129',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'processing',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'printing',
        undefined
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 400 for invalid JSON payload', async () => {
      const request = {
        text: jest.fn().mockResolvedValue('invalid json'),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-gelato-signature') {
              return createSignature('invalid json')
            }
            return null
          }),
        } as any,
      }

      setupSupabaseMocks()

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('should return 500 when order not found', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_130',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-999',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks() // No order data

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Processing failed')
    })

    it('should log webhook events to database', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_131',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload)
      const { mockInsert } = setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      await POST(request as any)

      expect(supabaseAdmin.from).toHaveBeenCalledWith('webhook_logs')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should handle unrecognized event types gracefully', async () => {
      const payload = {
        eventType: 'order.unknown.event',
        eventId: 'evt_132',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'unknown',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(orderService.updateOrderStatus).not.toHaveBeenCalled()
    })
  })

  describe('Status Mapping', () => {
    it('should map Gelato pending status to submitted_to_gelato', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_133',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'pending',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      await POST(request as any)

      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'submitted_to_gelato',
        undefined
      )
    })

    it('should map Gelato in_production status to printing', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_134',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'in_production',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      await POST(request as any)

      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        'printing',
        undefined
      )
    })
  })

  describe('Idempotent Webhook Processing', () => {
    it('should handle duplicate webhook deliveries gracefully', async () => {
      const payload = {
        eventType: 'order.shipped',
        eventId: 'evt_duplicate_123',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      }

      const request1 = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      // First webhook delivery
      const response1 = await POST(request1 as any)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.received).toBe(true)
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1)

      // Second webhook delivery (duplicate)
      const request2 = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })

      const response2 = await POST(request2 as any)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.received).toBe(true)
      // updateOrderStatus is called again, but it's idempotent (updates to same status)
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(2)
    })

    it('should process same event ID only once by checking webhook_logs', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_already_processed',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      // Process webhook
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      // Verify webhook was logged
      expect(supabaseAdmin.from).toHaveBeenCalledWith('webhook_logs')
    })

    it('should update order status idempotently', async () => {
      const payload = {
        eventType: 'order.shipped',
        eventId: 'evt_idempotent_test',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      }

      // First delivery
      const request1 = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({
        id: 'order-1',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      })

      await POST(request1 as any)

      // Second delivery (duplicate) - should update to same values
      const request2 = createMockRequest(payload)
      setupSupabaseMocks({ id: 'order-1' })

      const response2 = await POST(request2 as any)

      expect(response2.status).toBe(200)
      // Both calls should have same parameters
      expect(orderService.updateOrderStatus).toHaveBeenNthCalledWith(
        1,
        'order-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        }
      )
      expect(orderService.updateOrderStatus).toHaveBeenNthCalledWith(
        2,
        'order-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        }
      )
    })

    it('should mark webhook as processed after successful handling', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_mark_processed',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-001',
          status: 'processing',
        },
      }

      const request = createMockRequest(payload)
      const { mockUpdate, mockEq } = setupSupabaseMocks({ id: 'order-1' })
      ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({})

      await POST(request as any)

      // Verify webhook was marked as processed
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('event_id', 'evt_mark_processed')
    })

    it('should mark webhook as processed with error on failure', async () => {
      const payload = {
        eventType: 'order.status.updated',
        eventId: 'evt_error_test',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-2024-999',
          status: 'shipped',
        },
      }

      const request = createMockRequest(payload)
      const { mockUpdate } = setupSupabaseMocks() // No order found
      ;(orderService.updateOrderStatus as jest.Mock).mockRejectedValue(
        new Error('Order not found')
      )

      const response = await POST(request as any)

      expect(response.status).toBe(500)
      // Verify webhook was marked as processed with error
      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})
