/**
 * Unit Test: Orders Query Error Handling
 * 
 * Tests that the dashboard API handles orders query failures gracefully
 * Task: 1.4 - Handle orders query failures gracefully
 * 
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Supabase BEFORE importing
const mockSupabaseAdmin = {
  from: jest.fn()
}

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: mockSupabaseAdmin
}))

// Mock NextResponse BEFORE importing
const mockNextResponse = {
  json: jest.fn((data: any, options?: any) => ({
    status: options?.status || 200,
    json: async () => data,
  })),
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: class NextRequest {}
}))

// Import AFTER mocking
import { GET } from '@/app/api/admin/dashboard/route'

describe('Orders Query Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle orders metrics query failure gracefully', async () => {
    // Setup: First orders query (metrics) fails, but products succeed
    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        callCount++
        if (callCount === 1) {
          // First call - metrics query fails
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Orders metrics query failed' }
            })
          }
        } else {
          // Second call - recent orders query also fails
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Recent orders query failed' }
                })
              })
            })
          }
        }
      }
      
      if (table === 'products') {
        const productsCallCount = mockSupabaseAdmin.from.mock.calls.filter(c => c[0] === 'products').length
        if (productsCallCount === 1) {
          // Products list query succeeds
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: '1',
                        name: 'Test Product',
                        price: 29.99,
                        published: true,
                        gelato_product_uid: 'GP001',
                        created_at: '2024-01-01T00:00:00Z'
                      }
                    ],
                    error: null
                  })
                })
              })
            })
          }
        } else {
          // Products count query succeeds
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

    // Execute
    const mockRequest = {
      url: 'http://localhost:3000/api/admin/dashboard',
      method: 'GET',
      headers: new Headers()
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    // Verify: API returns 200 with partial data
    expect(response.status).toBe(200)
    
    // Verify: Metrics default to 0 for order-related fields
    expect(data.metrics.totalOrders).toBe(0)
    expect(data.metrics.totalRevenue).toBe(0)
    expect(data.metrics.totalSales).toBe(0)
    
    // Verify: Products data is still returned (partial functionality)
    expect(data.metrics.totalProducts).toBe(5)
    expect(data.products).toHaveLength(1)
    expect(data.products[0].name).toBe('Test Product')
    
    // Verify: Orders array is empty
    expect(data.orders).toEqual([])
    
    // Verify: Errors array contains appropriate error messages
    expect(data.errors).toBeDefined()
    expect(data.errors).toContain('Failed to fetch orders metrics: Orders metrics query failed')
    expect(data.errors).toContain('Failed to fetch recent orders: Recent orders query failed')
  })

  it('should handle recent orders query failure while metrics succeed', async () => {
    // Setup: Metrics query succeeds, but recent orders query fails
    let callCount = 0
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        callCount++
        if (callCount === 1) {
          // First call - metrics query succeeds
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { total: 100, status: 'payment_confirmed' },
                { total: 200, status: 'shipped' }
              ],
              error: null
            })
          }
        } else {
          // Second call - recent orders query fails
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Recent orders query failed' }
                })
              })
            })
          }
        }
      }
      
      if (table === 'products') {
        const productsCallCount = mockSupabaseAdmin.from.mock.calls.filter(c => c[0] === 'products').length
        if (productsCallCount === 1) {
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

    // Execute
    const mockRequest = {
      url: 'http://localhost:3000/api/admin/dashboard',
      method: 'GET',
      headers: new Headers()
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    // Verify: API returns 200 with partial data
    expect(response.status).toBe(200)
    
    // Verify: Metrics are calculated from successful query
    expect(data.metrics.totalOrders).toBe(2)
    expect(data.metrics.totalRevenue).toBe(300)
    expect(data.metrics.totalSales).toBe(300) // Both are completed statuses
    
    // Verify: Orders array is empty (recent orders query failed)
    expect(data.orders).toEqual([])
    
    // Verify: Error message for recent orders failure
    expect(data.errors).toBeDefined()
    expect(data.errors).toContain('Failed to fetch recent orders: Recent orders query failed')
  })

  it('should continue functioning when only orders queries fail', async () => {
    // Setup: Both orders queries fail, products succeed
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(c => c[0] === 'orders').length
        if (ordersCallCount === 1) {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' }
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection error' }
                })
              })
            })
          }
        }
      }
      
      if (table === 'products') {
        const productsCallCount = mockSupabaseAdmin.from.mock.calls.filter(c => c[0] === 'products').length
        if (productsCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: '1',
                        name: 'Product A',
                        price: 19.99,
                        published: true,
                        gelato_product_uid: 'GPA',
                        created_at: '2024-01-01T00:00:00Z'
                      },
                      {
                        id: '2',
                        name: 'Product B',
                        price: 29.99,
                        published: true,
                        gelato_product_uid: 'GPB',
                        created_at: '2024-01-02T00:00:00Z'
                      }
                    ],
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
                count: 10,
                error: null
              })
            })
          }
        }
      }
      
      return {}
    })

    // Execute
    const mockRequest = {
      url: 'http://localhost:3000/api/admin/dashboard',
      method: 'GET',
      headers: new Headers()
    } as any

    const response = await GET(mockRequest)
    const data = await response.json()

    // Verify: API continues to function
    expect(response.status).toBe(200)
    
    // Verify: Dashboard still displays available data
    expect(data.products).toHaveLength(2)
    expect(data.metrics.totalProducts).toBe(10)
    
    // Verify: Orders-related data is empty/zero
    expect(data.orders).toEqual([])
    expect(data.metrics.totalOrders).toBe(0)
    expect(data.metrics.totalRevenue).toBe(0)
    expect(data.metrics.totalSales).toBe(0)
    
    // Verify: Errors are logged
    expect(data.errors).toBeDefined()
    expect(data.errors.length).toBeGreaterThan(0)
  })
})
