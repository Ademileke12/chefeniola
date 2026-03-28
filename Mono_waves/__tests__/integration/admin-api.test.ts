/**
 * Integration Tests: Admin API Routes
 * 
 * Comprehensive integration tests for admin functionality:
 * - GET /api/admin/dashboard (metrics)
 * - POST /api/upload (design files)
 * 
 * Task: 14.1 Create admin API routes
 * Requirements: 11.1, 11.2, 11.3, 11.4, 14.1, 14.2, 14.3
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getDashboardMetrics } from '@/app/api/admin/dashboard/route'
import { POST as uploadFile } from '@/app/api/upload/route'
import { supabaseAdmin } from '@/lib/supabase/server'
import { fileService } from '@/lib/services/fileService'

// Mock Supabase admin client
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

// Mock file service
jest.mock('@/lib/services/fileService')

const mockFileService = {
  uploadDesign: jest.fn(),
}

// Replace the mocked module
jest.mocked(fileService).uploadDesign = mockFileService.uploadDesign

/**
 * Helper function to create HTTP request
 */
function createRequest(url: string, method: string = 'GET', body?: any): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Helper function to create multipart form data request
 */
function createFormDataRequest(url: string, file: File): NextRequest {
  const formData = new FormData()
  formData.append('file', file)
  
  return new NextRequest(url, {
    method: 'POST',
    body: formData,
  })
}

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Test: GET /api/admin/dashboard - Dashboard Metrics
   * Validates: Requirements 11.1, 11.2, 11.3, 11.4
   */
  describe('GET /api/admin/dashboard - Dashboard Metrics', () => {
    it('should return all dashboard metrics successfully', async () => {
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
        { 
          id: '2',
          order_number: 'ORD-002',
          customer_name: 'Jane Smith',
          customer_email: 'jane@example.com',
          total: 150.00, 
          status: 'shipped',
          created_at: '2024-01-02T10:00:00Z',
          items: []
        },
        { 
          id: '3',
          order_number: 'ORD-003',
          customer_name: 'Bob Wilson',
          customer_email: 'bob@example.com',
          total: 200.00, 
          status: 'delivered',
          created_at: '2024-01-03T10:00:00Z',
          items: []
        },
        { 
          id: '4',
          order_number: 'ORD-004',
          customer_name: 'Alice Brown',
          customer_email: 'alice@example.com',
          total: 50.00, 
          status: 'pending',
          created_at: '2024-01-04T10:00:00Z',
          items: []
        },
      ]

      const mockProducts = [
        {
          id: '1',
          name: 'Test Product 1',
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
            count: 25,
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
      expect(data.metrics).toBeDefined()
      expect(data.metrics.totalSales).toBe(450.00) // Sum of completed orders
      expect(data.metrics.totalOrders).toBe(4)
      expect(data.metrics.totalProducts).toBe(25)
      expect(data.metrics.totalRevenue).toBe(500.00) // Sum of all orders
      expect(data.products).toEqual(mockProducts)
      expect(data.orders).toEqual(mockOrders)
      expect(data.timestamp).toBeDefined()
      expect(data.errors).toBeUndefined() // No errors should be present
    })

    it('should calculate total sales from completed orders only', async () => {
      // Arrange
      const mockOrders = [
        { total: 100.00, status: 'payment_confirmed' },
        { total: 150.00, status: 'shipped' },
        { total: 200.00, status: 'pending' }, // Should not be included in sales
        { total: 50.00, status: 'failed' }, // Should not be included in sales
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
            count: 10,
            error: null,
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
      expect(data.metrics.totalSales).toBe(250.00) // Only completed orders
      expect(data.metrics.totalRevenue).toBe(500.00) // All orders
    })

    it('should handle empty database gracefully', async () => {
      // Arrange
      const mockFrom = jest.fn()
      
      // All orders query for metrics
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
      expect(data.metrics.totalSales).toBe(0)
      expect(data.metrics.totalOrders).toBe(0)
      expect(data.metrics.totalProducts).toBe(0)
      expect(data.metrics.totalRevenue).toBe(0)
    })

    it('should handle database errors for orders query gracefully', async () => {
      // Arrange
      const mockFrom = jest.fn()
      
      // All orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        })
      })
      
      // Recent orders query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            })
          })
        })
      })
      
      // Products query succeeds (for graceful fallback)
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
      
      // Products count query succeeds
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

      // Assert - Should return 200 with partial data and errors
      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual([])
      expect(data.errors).toContain('Failed to fetch orders metrics: Database connection failed')
      expect(data.errors).toContain('Failed to fetch recent orders: Database connection failed')
    })

    it('should handle database errors for products query gracefully', async () => {
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
      
      // All orders query for metrics succeeds
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

      // Assert - Should return 200 with partial data and errors
      expect(response.status).toBe(200)
      expect(data.metrics).toEqual({
        totalSales: 100.00,
        totalOrders: 1,
        totalProducts: 0,
        totalRevenue: 100.00
      })
      expect(data.products).toEqual([])
      expect(data.orders).toEqual(mockOrders)
      expect(data.errors).toContain('Failed to fetch products: Products query failed')
      expect(data.errors).toContain('Failed to fetch products count: Products count failed')
    })

    it('should round monetary values to 2 decimal places', async () => {
      // Arrange
      const mockOrders = [
        { total: 33.333, status: 'payment_confirmed' },
        { total: 66.666, status: 'shipped' },
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
            count: 5,
            error: null,
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
      expect(data.metrics.totalSales).toBe(100.00)
      expect(data.metrics.totalRevenue).toBe(100.00)
    })
  })

  /**
   * Test: POST /api/upload - File Upload
   * Validates: Requirements 14.1, 14.2, 14.3
   */
  describe('POST /api/upload - Design File Upload', () => {
    it('should upload valid image file successfully', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'design.png', { type: 'image/png' })
      const mockUrl = 'https://example.com/storage/designs/123-abc.png'
      
      mockFileService.uploadDesign.mockResolvedValue(mockUrl)
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(mockUrl)
      expect(data.filename).toBe('design.png')
      expect(data.type).toBe('image/png')
      expect(fileService.uploadDesign).toHaveBeenCalledWith(mockFile)
    })

    it('should upload JPEG file successfully', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'photo.jpg', { type: 'image/jpeg' })
      const mockUrl = 'https://example.com/storage/designs/456-def.jpg'
      
      mockFileService.uploadDesign.mockResolvedValue(mockUrl)
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(mockUrl)
      expect(data.filename).toBe('photo.jpg')
      expect(data.type).toBe('image/jpeg')
    })

    it('should upload SVG file successfully', async () => {
      // Arrange
      const mockFile = new File(['<svg></svg>'], 'vector.svg', { type: 'image/svg+xml' })
      const mockUrl = 'https://example.com/storage/designs/789-ghi.svg'
      
      mockFileService.uploadDesign.mockResolvedValue(mockUrl)
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(mockUrl)
      expect(data.filename).toBe('vector.svg')
      expect(data.type).toBe('image/svg+xml')
    })

    it('should upload PDF file successfully', async () => {
      // Arrange
      const mockFile = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' })
      const mockUrl = 'https://example.com/storage/designs/012-jkl.pdf'
      
      mockFileService.uploadDesign.mockResolvedValue(mockUrl)
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(mockUrl)
      expect(data.filename).toBe('document.pdf')
      expect(data.type).toBe('application/pdf')
    })

    it('should return error when no file is provided', async () => {
      // Arrange
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided. Please upload a file.')
    })

    it('should return error for invalid file type', async () => {
      // Arrange
      const mockFile = new File(['test'], 'document.txt', { type: 'text/plain' })
      
      mockFileService.uploadDesign.mockRejectedValue(
        new Error('File validation failed: Invalid file type: text/plain')
      )
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('File validation failed')
      expect(data.details).toContain('Invalid file type')
    })

    it('should return error for file size exceeding limit', async () => {
      // Arrange
      const mockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      
      mockFileService.uploadDesign.mockRejectedValue(
        new Error('File validation failed: File size exceeds maximum')
      )
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('File validation failed')
      expect(data.details).toContain('File size exceeds maximum')
    })

    it('should return error for empty file', async () => {
      // Arrange
      const mockFile = new File([], 'empty.png', { type: 'image/png' })
      
      mockFileService.uploadDesign.mockRejectedValue(
        new Error('File validation failed: File is empty')
      )
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('File validation failed')
      expect(data.details).toContain('File is empty')
    })

    it('should handle storage upload failures', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'design.png', { type: 'image/png' })
      
      mockFileService.uploadDesign.mockRejectedValue(
        new Error('File upload failed: Storage service unavailable')
      )
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to upload file to storage')
    })

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'design.png', { type: 'image/png' })
      
      mockFileService.uploadDesign.mockRejectedValue(
        new Error('Unexpected error occurred')
      )
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to upload file')
    })

    it('should include file metadata in successful response', async () => {
      // Arrange
      const fileContent = 'x'.repeat(1024) // 1KB
      const mockFile = new File([fileContent], 'design.png', { type: 'image/png' })
      const mockUrl = 'https://example.com/storage/designs/123-abc.png'
      
      mockFileService.uploadDesign.mockResolvedValue(mockUrl)
      
      const request = createFormDataRequest('http://localhost:3000/api/upload', mockFile)

      // Act
      const response = await uploadFile(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(mockUrl)
      expect(data.filename).toBe('design.png')
      expect(data.size).toBe(1024)
      expect(data.type).toBe('image/png')
    })
  })
})
