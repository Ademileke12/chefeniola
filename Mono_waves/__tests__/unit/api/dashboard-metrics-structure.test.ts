import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { DashboardMetrics } from '@/types'

// Mock Supabase BEFORE importing the route
const mockSupabaseAdmin = {
  from: jest.fn()
}

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: mockSupabaseAdmin
}))

// Mock NextResponse BEFORE importing the route
const mockNextResponse = {
  json: jest.fn((data: any, options?: any) => ({
    status: options?.status || 200,
    json: () => Promise.resolve(data),
  })),
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: class NextRequest {}
}))

// Import AFTER mocking
import { GET } from '@/app/api/admin/dashboard/route'

/**
 * Test suite to verify that the API maintains the existing metrics structure
 * as specified in Task 1.3: Maintain existing metrics structure
 * 
 * Requirements:
 * - Verify that the metrics structure includes: totalSales, totalOrders, totalProducts, totalRevenue
 * - Ensure backward compatibility with existing dashboard code
 * - The metrics should be calculated from real database data
 * - The structure should match the DashboardMetrics interface
 */
describe('Dashboard Metrics Structure Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Helper function to create mock request for testing
   */
  function createRequest(url: string, method: string = 'GET'): any {
    return {
      url,
      method,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    } as any
  }

  it('should maintain the exact metrics structure with all required fields', async () => {
    // Mock data
    const mockOrdersData = [
      { total: 100.00, status: 'payment_confirmed' },
      { total: 200.00, status: 'shipped' }
    ]

    const mockRecentOrdersData = [
      {
        id: '1',
        order_number: 'ORD-001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        total: 100.00,
        status: 'payment_confirmed',
        created_at: '2024-01-01T10:00:00Z',
        items: []
      }
    ]

    const mockProductsData = [
      {
        id: '1',
        name: 'Test Product',
        price: 29.99,
        published: true,
        gelato_product_uid: 'GP001',
        created_at: '2024-01-01T10:00:00Z'
      }
    ]

    // Setup mocks
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
        if (ordersCallCount === 1) {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockOrdersData,
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockRecentOrdersData,
                  error: null
                })
              })
            })
          }
        }
      }
      if (table === 'products') {
        const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockProductsData,
                    error: null
                  })
                })
              })
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 5,
                error: null
              })
            })
          }
        }
      }
      return {}
    })

    const request = createRequest('http://localhost:3000/api/admin/dashboard')
    const response = await GET(request)
    const data = await response.json()

    // Verify the metrics object exists
    expect(data).toHaveProperty('metrics')
    expect(data.metrics).toBeDefined()

    // Verify all four required fields are present
    expect(data.metrics).toHaveProperty('totalSales')
    expect(data.metrics).toHaveProperty('totalOrders')
    expect(data.metrics).toHaveProperty('totalProducts')
    expect(data.metrics).toHaveProperty('totalRevenue')

    // Verify the structure matches DashboardMetrics interface
    const metrics: DashboardMetrics = data.metrics
    expect(typeof metrics.totalSales).toBe('number')
    expect(typeof metrics.totalOrders).toBe('number')
    expect(typeof metrics.totalProducts).toBe('number')
    expect(typeof metrics.totalRevenue).toBe('number')

    // Verify no extra fields are added (backward compatibility)
    const expectedKeys = ['totalSales', 'totalOrders', 'totalProducts', 'totalRevenue']
    const actualKeys = Object.keys(data.metrics).sort()
    expect(actualKeys).toEqual(expectedKeys.sort())
  })

  it('should maintain metrics structure even with empty database', async () => {
    // Mock empty data
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
        if (ordersCallCount === 1) {
          return {
            select: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }
      }
      if (table === 'products') {
        const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
        if (callCount === 1) {
          return {
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
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 0,
                error: null
              })
            })
          }
        }
      }
      return {}
    })

    const request = createRequest('http://localhost:3000/api/admin/dashboard')
    const response = await GET(request)
    const data = await response.json()

    // Verify structure is maintained with zero values
    expect(data.metrics).toEqual({
      totalSales: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalRevenue: 0
    })

    // Verify all fields are numbers (not null or undefined)
    expect(typeof data.metrics.totalSales).toBe('number')
    expect(typeof data.metrics.totalOrders).toBe('number')
    expect(typeof data.metrics.totalProducts).toBe('number')
    expect(typeof data.metrics.totalRevenue).toBe('number')
  })

  it('should maintain metrics structure even when database queries fail', async () => {
    // Mock database errors
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
        if (ordersCallCount === 1) {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          }
        }
      }
      if (table === 'products') {
        const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' }
                  })
                })
              })
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: null,
                error: { message: 'Database error' }
              })
            })
          }
        }
      }
      return {}
    })

    const request = createRequest('http://localhost:3000/api/admin/dashboard')
    const response = await GET(request)
    const data = await response.json()

    // Even with errors, the structure should be maintained
    expect(data.metrics).toEqual({
      totalSales: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalRevenue: 0
    })

    // Verify the structure is intact
    const expectedKeys = ['totalSales', 'totalOrders', 'totalProducts', 'totalRevenue']
    const actualKeys = Object.keys(data.metrics).sort()
    expect(actualKeys).toEqual(expectedKeys.sort())
  })

  it('should calculate metrics correctly from real database data', async () => {
    // Mock realistic data
    const mockOrdersData = [
      { total: 29.99, status: 'payment_confirmed' },
      { total: 49.99, status: 'shipped' },
      { total: 19.99, status: 'pending' }, // Not included in totalSales
      { total: 39.99, status: 'delivered' }
    ]

    const mockRecentOrdersData = [
      {
        id: '1',
        order_number: 'ORD-001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        total: 29.99,
        status: 'payment_confirmed',
        created_at: '2024-01-01T10:00:00Z',
        items: []
      }
    ]

    const mockProductsData = [
      {
        id: '1',
        name: 'Product 1',
        price: 29.99,
        published: true,
        gelato_product_uid: 'GP001',
        created_at: '2024-01-01T10:00:00Z'
      }
    ]

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
        if (ordersCallCount === 1) {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockOrdersData,
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockRecentOrdersData,
                  error: null
                })
              })
            })
          }
        }
      }
      if (table === 'products') {
        const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockProductsData,
                    error: null
                  })
                })
              })
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 12,
                error: null
              })
            })
          }
        }
      }
      return {}
    })

    const request = createRequest('http://localhost:3000/api/admin/dashboard')
    const response = await GET(request)
    const data = await response.json()

    // Verify metrics are calculated correctly
    expect(data.metrics.totalSales).toBe(119.97) // Only completed orders
    expect(data.metrics.totalOrders).toBe(4) // All orders
    expect(data.metrics.totalProducts).toBe(12) // Published products count
    expect(data.metrics.totalRevenue).toBe(139.96) // All order totals

    // Verify structure is maintained
    const expectedKeys = ['totalSales', 'totalOrders', 'totalProducts', 'totalRevenue']
    const actualKeys = Object.keys(data.metrics).sort()
    expect(actualKeys).toEqual(expectedKeys.sort())
  })
})
