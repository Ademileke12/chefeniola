/**
 * Integration Tests: Gelato API Routes
 * 
 * Comprehensive integration tests for Gelato API endpoints:
 * - GET /api/gelato/catalog (admin)
 * - GET /api/gelato/product/[uid] (admin)
 * 
 * Task: 14.2 Create Gelato API routes
 * Requirements: 1.2, 2.1
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getCatalog } from '@/app/api/gelato/catalog/route'
import { GET as getProductDetails } from '@/app/api/gelato/product/[uid]/route'

// Mock functions
const mockGetProductCatalog = jest.fn()
const mockGetProductDetails = jest.fn()

// Mock Gelato service
jest.mock('@/lib/services/gelatoService', () => ({
  getProductCatalog: mockGetProductCatalog,
  getProductDetails: mockGetProductDetails,
  GelatoApiError: class GelatoApiError extends Error {
    constructor(message: string, public statusCode: number, public responseBody: string) {
      super(message)
      this.name = 'GelatoApiError'
    }
  },
}))

/**
 * Helper function to create HTTP request
 */
function createRequest(url: string, method: string = 'GET'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Gelato API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Test: GET /api/gelato/catalog - Product Catalog
   * Validates: Requirements 1.2, 2.1
   */
  describe('GET /api/gelato/catalog - Product Catalog', () => {
    it('should return product catalog successfully', async () => {
      // Arrange
      const mockProducts = [
        {
          uid: 'apparel_product_gca_t-shirt_1',
          title: 'Classic T-Shirt',
          description: 'Comfortable cotton t-shirt',
          availableSizes: ['S', 'M', 'L', 'XL'],
          availableColors: [
            { name: 'White', code: '#FFFFFF' },
            { name: 'Black', code: '#000000' },
          ],
          basePrice: 19.99,
        },
        {
          uid: 'apparel_product_gca_hoodie_1',
          title: 'Classic Hoodie',
          description: 'Warm and cozy hoodie',
          availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
          availableColors: [
            { name: 'Gray', code: '#808080' },
            { name: 'Navy', code: '#000080' },
          ],
          basePrice: 39.99,
        },
      ]

      mockGetProductCatalog.mockResolvedValue(mockProducts)

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const response = await getCatalog(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.products).toEqual(mockProducts)
      expect(data.count).toBe(2)
      expect(data.timestamp).toBeDefined()
      expect(mockGetProductCatalog).toHaveBeenCalledTimes(1)
    })

    it('should return empty catalog when no products available', async () => {
      // Arrange
      mockGetProductCatalog.mockResolvedValue([])

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const response = await getCatalog(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.products).toEqual([])
      expect(data.count).toBe(0)
      expect(data.timestamp).toBeDefined()
    })

    it('should handle Gelato API configuration error', async () => {
      // Arrange
      mockGetProductCatalog.mockRejectedValue(
        new Error('GELATO_API_KEY is not configured')
      )

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const response = await getCatalog(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Gelato API is not configured')
    })

    it('should handle Gelato API errors', async () => {
      // Arrange
      const { GelatoApiError } = jest.requireActual('@/lib/services/gelatoService') as any
      const apiError = new GelatoApiError(
        'Gelato API error: 503 Service Unavailable',
        503,
        'Service temporarily unavailable'
      )
      mockGetProductCatalog.mockRejectedValue(apiError)

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const response = await getCatalog(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(502)
      expect(data.error).toBe('Failed to fetch products from Gelato API')
    })

    it('should handle unexpected errors', async () => {
      // Arrange
      mockGetProductCatalog.mockRejectedValue(
        new Error('Unexpected network error')
      )

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const response = await getCatalog(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch product catalog')
    })

    it('should include timestamp in response', async () => {
      // Arrange
      const mockProducts = [
        {
          uid: 'test_product_1',
          title: 'Test Product',
          description: 'Test description',
          availableSizes: ['M'],
          availableColors: [{ name: 'White', code: '#FFFFFF' }],
          basePrice: 25.00,
        },
      ]

      mockGetProductCatalog.mockResolvedValue(mockProducts)

      const request = createRequest('http://localhost:3000/api/gelato/catalog')

      // Act
      const beforeTime = new Date().toISOString()
      const response = await getCatalog(request)
      const afterTime = new Date().toISOString()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(data.timestamp >= beforeTime).toBe(true)
      expect(data.timestamp <= afterTime).toBe(true)
    })
  })

  /**
   * Test: GET /api/gelato/product/[uid] - Product Details
   * Validates: Requirements 1.2, 2.1
   */
  describe('GET /api/gelato/product/[uid] - Product Details', () => {
    it('should return product details successfully', async () => {
      // Arrange
      const mockProduct = {
        uid: 'apparel_product_gca_t-shirt_1',
        title: 'Classic T-Shirt',
        description: 'Comfortable cotton t-shirt',
        availableSizes: ['S', 'M', 'L', 'XL'],
        availableColors: [
          { name: 'White', code: '#FFFFFF' },
          { name: 'Black', code: '#000000' },
        ],
        basePrice: 19.99,
        material: '100% Cotton',
        weight: '180 gsm',
      }

      mockGetProductDetails.mockResolvedValue(mockProduct)

      const request = createRequest('http://localhost:3000/api/gelato/product/apparel_product_gca_t-shirt_1')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: 'apparel_product_gca_t-shirt_1' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.product).toEqual(mockProduct)
      expect(data.timestamp).toBeDefined()
      expect(mockGetProductDetails).toHaveBeenCalledWith('apparel_product_gca_t-shirt_1')
    })

    it('should return error for missing UID', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/gelato/product/')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: '' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Product UID is required')
      expect(mockGetProductDetails).not.toHaveBeenCalled()
    })

    it('should return error for whitespace-only UID', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/gelato/product/   ')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: '   ' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Product UID is required')
      expect(mockGetProductDetails).not.toHaveBeenCalled()
    })

    it('should handle Gelato API configuration error', async () => {
      // Arrange
      mockGetProductDetails.mockRejectedValue(
        new Error('GELATO_API_KEY is not configured')
      )

      const request = createRequest('http://localhost:3000/api/gelato/product/test_uid')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: 'test_uid' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Gelato API is not configured')
    })

    it('should handle invalid product UID error', async () => {
      // Arrange
      mockGetProductDetails.mockRejectedValue(
        new Error('Product UID is required')
      )

      const request = createRequest('http://localhost:3000/api/gelato/product/invalid')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: 'invalid' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid product UID')
    })

    it('should handle Gelato API errors', async () => {
      // Arrange
      const { GelatoApiError } = jest.requireActual('@/lib/services/gelatoService') as any
      const apiError = new GelatoApiError(
        'Gelato API error: 404 Not Found',
        404,
        'Product not found'
      )
      mockGetProductDetails.mockRejectedValue(apiError)

      const request = createRequest('http://localhost:3000/api/gelato/product/nonexistent')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: 'nonexistent' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(502)
      expect(data.error).toBe('Failed to fetch product details from Gelato API')
    })

    it('should handle unexpected errors', async () => {
      // Arrange
      mockGetProductDetails.mockRejectedValue(
        new Error('Unexpected network error')
      )

      const request = createRequest('http://localhost:3000/api/gelato/product/test_uid')

      // Act
      const response = await getProductDetails(request, {
        params: { uid: 'test_uid' },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch product details')
    })

    it('should handle UIDs with special characters', async () => {
      // Arrange
      const specialUid = 'apparel_product-gca/t-shirt_1'
      const mockProduct = {
        uid: specialUid,
        title: 'Special T-Shirt',
        description: 'Test product',
        availableSizes: ['M'],
        availableColors: [{ name: 'White', code: '#FFFFFF' }],
        basePrice: 20.00,
      }

      mockGetProductDetails.mockResolvedValue(mockProduct)

      const request = createRequest(`http://localhost:3000/api/gelato/product/${encodeURIComponent(specialUid)}`)

      // Act
      const response = await getProductDetails(request, {
        params: { uid: specialUid },
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.product).toEqual(mockProduct)
      expect(mockGetProductDetails).toHaveBeenCalledWith(specialUid)
    })

    it('should include timestamp in response', async () => {
      // Arrange
      const mockProduct = {
        uid: 'test_product_1',
        title: 'Test Product',
        description: 'Test description',
        availableSizes: ['M'],
        availableColors: [{ name: 'White', code: '#FFFFFF' }],
        basePrice: 25.00,
      }

      mockGetProductDetails.mockResolvedValue(mockProduct)

      const request = createRequest('http://localhost:3000/api/gelato/product/test_product_1')

      // Act
      const beforeTime = new Date().toISOString()
      const response = await getProductDetails(request, {
        params: { uid: 'test_product_1' },
      })
      const afterTime = new Date().toISOString()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.timestamp).toBeDefined()
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(data.timestamp >= beforeTime).toBe(true)
      expect(data.timestamp <= afterTime).toBe(true)
    })
  })
})
