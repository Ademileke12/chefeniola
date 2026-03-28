/**
 * Unit Tests: Dashboard API HTTP Status Codes
 * 
 * Tests to verify appropriate HTTP status codes are returned for different scenarios:
 * - 200 for successful requests (including partial success with some query failures)
 * - 500 for critical server errors
 * 
 * Task: 1.4 Return appropriate HTTP status codes
 * Requirements: 4.4 (API error handling)
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getDashboardMetrics } from '@/app/api/admin/dashboard/route'
import { supabaseAdmin } from '@/lib/supabase/server'

// Mock Supabase admin client
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

/**
 * Helper function to create HTTP request
 */
function createRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Dashboard API HTTP Status Codes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('200 OK - Successful Requests', () => {
    it('should return 200 when all queries succeed', async () => {
      // Arrange
      const mockOrders = [
        { 
          id: '1',
          order_number: 'ORD-001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          total: 100.00, 
          status: 'payment_confirmed',
          created_at: '2024-01-01T10:00:00Z',
          items: []
        },
      ]

      const mockProducts = [
        {
          id: '1',
          name: 'Test Product',
          price: 29.99,
          published: true,
          gelato_product_uid: 'GP001',
          created_at: '2024-01-01T10:00:00Z'
        }
      ]

      const mockFrom = jest.fn()
      
      // All orders query for metrics
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: mockOrders,
          error: null,
        })
      })
      
      // Recent orders query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockOrders,
              error: null,
            })
          })
        })
      })
      
      // Products query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockProducts,
                error: null
              })
            })
          })
        })
      })
      
      // Products count query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
            error: null
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.errors).toBeUndefined()
      expect(data.metrics).toBeDefined()
      expect(data.products).toEqual(mockProducts)
      expect(data.orders).toEqual(mockOrders)
    })

    it('should return 200 with empty data when database is empty', async () => {
      // Arrange
      const mockFrom = jest.fn()
      
      // All orders query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        })
      })
      
      // Recent orders query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            })
          })
        })
      })
      
      // Products query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })
      
      // Products count query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            error: null
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual([])
    })

    it('should return 200 with partial data when orders query fails', async () => {
      // Arrange
      const mockProducts = [
        {
          id: '1',
          name: 'Test Product',
          price: 29.99,
          published: true,
          gelato_product_uid: 'GP001',
          created_at: '2024-01-01T10:00:00Z'
        }
      ]

      const mockFrom = jest.fn()
      
      // All orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Orders query failed' },
        })
      })
      
      // Recent orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Recent orders query failed' },
            })
          })
        })
      })
      
      // Products query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockProducts,
                error: null
              })
            })
          })
        })
      })
      
      // Products count query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
            error: null
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert - Partial success returns 200
      expect(response.status).toBe(200)
      expect(data.errors).toBeDefined()
      expect(data.errors).toContain('Failed to fetch orders metrics: Orders query failed')
      expect(data.errors).toContain('Failed to fetch recent orders: Recent orders query failed')
      expect(data.products).toEqual(mockProducts)
      expect(data.orders).toEqual([])
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 1,
        totalRevenue: 0
      })
    })

    it('should return 200 with partial data when products query fails', async () => {
      // Arrange
      const mockOrders = [
        { 
          id: '1',
          order_number: 'ORD-001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          total: 100.00, 
          status: 'payment_confirmed',
          created_at: '2024-01-01T10:00:00Z',
          items: []
        },
      ]

      const mockFrom = jest.fn()
      
      // All orders query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: mockOrders,
          error: null,
        })
      })
      
      // Recent orders query succeeds
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockOrders,
              error: null,
            })
          })
        })
      })
      
      // Products query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Products query failed' }
              })
            })
          })
        })
      })
      
      // Products count query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Products count failed' }
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert - Partial success returns 200
      expect(response.status).toBe(200)
      expect(data.errors).toBeDefined()
      expect(data.errors).toContain('Failed to fetch products: Products query failed')
      expect(data.errors).toContain('Failed to fetch products count: Products count failed')
      expect(data.orders).toEqual(mockOrders)
      expect(data.products).toEqual([])
      expect(data.metrics).toEqual({
        totalSales: 100.00,
        totalOrders: 1,
        totalProducts: 0,
        totalRevenue: 100.00
      })
    })

    it('should return 200 with partial data when multiple queries fail', async () => {
      // Arrange
      const mockFrom = jest.fn()
      
      // All orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Orders metrics failed' },
        })
      })
      
      // Recent orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Recent orders failed' },
            })
          })
        })
      })
      
      // Products query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Products failed' }
              })
            })
          })
        })
      })
      
      // Products count query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Products count failed' }
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert - Even with all queries failing, returns 200 with fallback data
      expect(response.status).toBe(200)
      expect(data.errors).toBeDefined()
      expect(data.errors.length).toBe(4)
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual([])
    })
  })

  describe('500 Internal Server Error - Critical Failures', () => {
    it('should return 500 when an unexpected exception occurs', async () => {
      // Arrange
      const mockFrom = jest.fn().mockImplementation(() => {
        throw new Error('Critical database connection failure')
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Critical server error occurred')
      expect(data.errors).toContain('Critical database connection failure')
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual([])
    })

    it('should return 500 when supabaseAdmin is undefined', async () => {
      // Arrange
      const originalFrom = jest.mocked(supabaseAdmin).from
      // @ts-ignore - Intentionally setting to undefined to test error handling
      jest.mocked(supabaseAdmin).from = undefined

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Critical server error occurred')
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })

      // Restore
      jest.mocked(supabaseAdmin).from = originalFrom
    })

    it('should return 500 when JSON parsing fails', async () => {
      // Arrange
      const mockFrom = jest.fn()
      
      // Return data that will cause JSON serialization issues
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ total: BigInt(9007199254740991) }], // BigInt cannot be serialized
          error: null,
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Critical server error occurred')
    })

    it('should return 500 with proper error structure on critical failure', async () => {
      // Arrange
      const mockFrom = jest.fn().mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined')
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')

      // Act
      const response = await getDashboardMetrics(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('errors')
      expect(data).toHaveProperty('metrics')
      expect(data).toHaveProperty('products')
      expect(data).toHaveProperty('orders')
      expect(data).toHaveProperty('timestamp')
      expect(data.error).toBe('Critical server error occurred')
      expect(data.errors).toContain('Cannot read property of undefined')
    })
  })

  describe('Status Code Documentation', () => {
    it('should document that 200 is returned for partial success', async () => {
      // This test documents the API behavior:
      // 200 OK is returned even when some queries fail, as long as the API
      // can return a valid response structure with partial data.
      // This allows the dashboard to display available data while showing
      // errors for failed sections.
      
      const mockFrom = jest.fn()
      
      // One query succeeds, others fail
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [{ total: 100, status: 'payment_confirmed' }],
          error: null,
        })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed' },
            })
          })
        })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Failed' }
              })
            })
          })
        })
      })
      
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: { message: 'Failed' }
          })
        })
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await getDashboardMetrics(request)

      expect(response.status).toBe(200)
    })

    it('should document that 500 is returned only for critical errors', async () => {
      // This test documents the API behavior:
      // 500 Internal Server Error is returned only when a critical,
      // unexpected error occurs that prevents the API from returning
      // any valid response structure (e.g., uncaught exceptions,
      // database connection failures at the client level).
      
      const mockFrom = jest.fn().mockImplementation(() => {
        throw new Error('Critical system failure')
      })

      jest.mocked(supabaseAdmin).from = mockFrom

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await getDashboardMetrics(request)

      expect(response.status).toBe(500)
    })
  })
})
