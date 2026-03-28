import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

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
import type { NextRequest } from 'next/server'

/**
 * Helper function to create NextRequest for testing
 */
function createRequest(url: string, method: string = 'GET'): NextRequest {
  return {
    url,
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  } as NextRequest
}

describe('Dashboard Metrics API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('should return complete dashboard data with products and orders', async () => {
      // Mock orders data for metrics (minimal fields)
      const mockAllOrdersData = [
        { 
          total: 29.99, 
          status: 'payment_confirmed',
        },
        { 
          total: 59.99, 
          status: 'shipped',
        }
      ]

      // Mock recent orders data for display (full fields)
      const mockRecentOrdersData = [
        { 
          id: '1', 
          order_number: 'ORD-001', 
          customer_name: 'John Doe', 
          customer_email: 'john@example.com',
          total: 29.99, 
          status: 'payment_confirmed',
          created_at: '2024-01-01T10:00:00Z',
          items: [{ product_id: '1', quantity: 1 }]
        },
        { 
          id: '2', 
          order_number: 'ORD-002', 
          customer_name: 'Jane Smith', 
          customer_email: 'jane@example.com',
          total: 59.99, 
          status: 'shipped',
          created_at: '2024-01-02T10:00:00Z',
          items: [{ product_id: '2', quantity: 2 }]
        }
      ]

      // Mock products data
      const mockProductsData = [
        {
          id: '1',
          name: 'Test Product 1',
          price: 29.99,
          published: true,
          gelato_product_uid: 'GP001',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '2', 
          name: 'Test Product 2',
          price: 59.99,
          published: true,
          gelato_product_uid: 'GP002',
          created_at: '2024-01-02T10:00:00Z'
        }
      ]

      // Mock products count
      const mockProductsCount = 15

      // Setup mocks for orders metrics query (first call - minimal fields)
      const mockOrdersMetricsQuery = {
        select: jest.fn().mockResolvedValue({
          data: mockAllOrdersData,
          error: null
        })
      }

      // Setup mocks for recent orders query (second call - full fields)
      const mockRecentOrdersQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockRecentOrdersData,
              error: null
            })
          })
        })
      }

      // Setup mocks for products query
      const mockProductsQuery = {
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

      // Setup mocks for products count query
      const mockProductsCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: mockProductsCount,
            error: null
          })
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          // Return different mocks for different calls
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            return mockOrdersMetricsQuery // First call for metrics
          } else {
            return mockRecentOrdersQuery // Second call for recent orders
          }
        }
        if (table === 'products') {
          // Return different mocks for different calls
          const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
          if (callCount === 1) {
            return mockProductsQuery // First call for products list
          } else {
            return mockProductsCountQuery // Second call for products count
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify metrics calculation
      expect(data.metrics).toEqual({
        totalSales: 89.98, // Both orders are completed statuses
        totalOrders: 2,
        totalProducts: 15,
        totalRevenue: 89.98
      })

      // Verify products array is returned
      expect(data.products).toEqual(mockProductsData)
      
      // Verify orders array is returned (limited to 10)
      expect(data.orders).toEqual(mockRecentOrdersData)
      
      // Verify products query was called with correct parameters
      expect(mockProductsQuery.select).toHaveBeenCalledWith('id, name, price, published, gelato_product_uid, created_at')
      expect(mockProductsQuery.select().eq).toHaveBeenCalledWith('published', true)
      expect(mockProductsQuery.select().eq().order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockProductsQuery.select().eq().order().limit).toHaveBeenCalledWith(10)
      
      expect(data.timestamp).toBeDefined()
      expect(data.errors).toBeUndefined() // No errors should be present
    })

    it('should limit products to 10 most recent with correct ordering', async () => {
      // Mock 15 products to test the limit
      const mockProductsData = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        price: 29.99 + i,
        published: true,
        gelato_product_uid: `GP${String(i + 1).padStart(3, '0')}`,
        created_at: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`
      }))

      // Setup mocks for products query
      const mockProductsQuery = {
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

      // Setup mocks for orders (minimal for this test)
      const mockOrdersMetricsQuery = {
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const mockRecentOrdersQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }

      // Setup mocks for products count
      const mockProductsCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 15, // Total products in database
            error: null
          })
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            return mockOrdersMetricsQuery
          } else {
            return mockRecentOrdersQuery
          }
        }
        if (table === 'products') {
          const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
          if (callCount === 1) {
            return mockProductsQuery // First call for products list
          } else {
            return mockProductsCountQuery // Second call for products count
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Verify products array contains exactly 10 items
      expect(data.products).toHaveLength(10)
      
      // Verify the query was called with correct parameters for limiting and ordering
      expect(mockProductsQuery.select).toHaveBeenCalledWith('id, name, price, published, gelato_product_uid, created_at')
      expect(mockProductsQuery.select().eq).toHaveBeenCalledWith('published', true)
      expect(mockProductsQuery.select().eq().order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockProductsQuery.select().eq().order().limit).toHaveBeenCalledWith(10)
    })

    it('should handle empty orders data', async () => {
      // Setup mocks for empty data
      const mockOrdersMetricsQuery = {
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const mockRecentOrdersQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }

      const mockProductsQuery = {
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

      const mockProductsCountQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            error: null
          })
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            return mockOrdersMetricsQuery
          } else {
            return mockRecentOrdersQuery
          }
        }
        if (table === 'products') {
          const callCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'products').length
          if (callCount === 1) {
            return mockProductsQuery
          } else {
            return mockProductsCountQuery
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

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

    it('should handle null orders data', async () => {
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            // First call - metrics query
            return {
              select: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }
          } else {
            // Second call - recent orders query
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            }
          }
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: null,
                error: null
              })
            })
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })
    })

    it('should calculate sales correctly excluding pending orders', async () => {
      const mockOrdersMetricsData = [
        { total: 100.00, status: 'payment_confirmed' },
        { total: 200.00, status: 'pending' }, // Should not be included in sales
        { total: 150.00, status: 'shipped' },
        { total: 75.00, status: 'cancelled' } // Should not be included in sales
      ]

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            // First call - metrics query
            return {
              select: jest.fn().mockResolvedValue({
                data: mockOrdersMetricsData,
                error: null
              })
            }
          } else {
            // Second call - recent orders query
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
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 10,
                error: null
              })
            })
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(data.metrics.totalSales).toBe(250.00) // Only confirmed and shipped
      expect(data.metrics.totalRevenue).toBe(525.00) // All orders
      expect(data.metrics.totalOrders).toBe(4)
    })

    it('should handle orders database error gracefully with partial data', async () => {
      // Mock products data succeeds
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

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            // First call - metrics query fails
            return {
              select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
              })
            }
          } else {
            // Second call - recent orders query fails
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' }
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

      // Should return 200 with partial data and errors array
      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 5,
        totalRevenue: 0
      })
      expect(data.products).toEqual(mockProductsData)
      expect(data.orders).toEqual([])
      expect(data.errors).toContain('Failed to fetch orders metrics: Database connection failed')
      expect(data.errors).toContain('Failed to fetch recent orders: Database connection failed')
    })

    it('should handle products database error gracefully with partial data', async () => {
      // Mock orders data succeeds
      const mockOrdersMetricsData = [
        { 
          total: 29.99, 
          status: 'payment_confirmed',
        }
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
          items: [{ product_id: '1', quantity: 1 }]
        }
      ]

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            // First call - metrics query
            return {
              select: jest.fn().mockResolvedValue({
                data: mockOrdersMetricsData,
                error: null
              })
            }
          } else {
            // Second call - recent orders query
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
                      data: null,
                      error: { message: 'Products table error' }
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
                  error: { message: 'Products count error' }
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

      // Should return 200 with partial data and errors array
      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 29.99,
        totalOrders: 1,
        totalProducts: 0,
        totalRevenue: 29.99
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual(mockRecentOrdersData)
      expect(data.errors).toContain('Failed to fetch products: Products table error')
      expect(data.errors).toContain('Failed to fetch products count: Products count error')
    })

    it('should handle decimal precision correctly', async () => {
      const mockOrdersMetricsData = [
        { total: 29.99, status: 'payment_confirmed' },
        { total: 19.95, status: 'shipped' },
        { total: 15.50, status: 'delivered' }
      ]

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          const ordersCallCount = mockSupabaseAdmin.from.mock.calls.filter(call => call[0] === 'orders').length
          if (ordersCallCount === 1) {
            // First call - metrics query
            return {
              select: jest.fn().mockResolvedValue({
                data: mockOrdersMetricsData,
                error: null
              })
            }
          } else {
            // Second call - recent orders query
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
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 5,
                error: null
              })
            })
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(data.metrics.totalSales).toBe(65.44)
      expect(data.metrics.totalRevenue).toBe(65.44)
    })

    it('should handle all order statuses correctly', async () => {
      const mockOrdersData = [
        { total: 10.00, status: 'pending' },
        { total: 20.00, status: 'payment_confirmed' },
        { total: 30.00, status: 'submitted_to_gelato' },
        { total: 40.00, status: 'printing' },
        { total: 50.00, status: 'shipped' },
        { total: 60.00, status: 'delivered' },
        { total: 70.00, status: 'cancelled' },
        { total: 80.00, status: 'failed' }
      ]

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockOrdersData,
              error: null
            })
          }
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                count: 8,
                error: null
              })
            })
          }
        }
        return {}
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      // Only completed statuses should count as sales
      expect(data.metrics.totalSales).toBe(200.00) // 20+30+40+50+60
      expect(data.metrics.totalRevenue).toBe(360.00) // All orders
      expect(data.metrics.totalOrders).toBe(8)
    })

    it('should handle null/undefined order totals safely', async () => {
      const mockOrdersData = [
        { total: 29.99, status: 'payment_confirmed' },
        { total: null, status: 'shipped' }, // null total
        { total: undefined, status: 'delivered' }, // undefined total
        { status: 'payment_confirmed' } // missing total field
      ]

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockOrdersData,
                error: null
              })
            })
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

      expect(response.status).toBe(200)
      // Should only count the valid total (29.99), treating null/undefined as 0
      expect(data.metrics.totalSales).toBe(29.99)
      expect(data.metrics.totalRevenue).toBe(29.99)
      expect(data.metrics.totalOrders).toBe(4)
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseAdmin.from.mockImplementation(() => {
        throw new Error('Unexpected database error')
      })

      const request = createRequest('http://localhost:3000/api/admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Critical server error occurred')
      expect(data.errors).toContain('Unexpected database error')
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
})