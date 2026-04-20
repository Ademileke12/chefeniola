/**
 * Unit tests for CatalogService
 * Tests catalog operations: getCatalog, refreshCatalog, updateAvailability
 */

import { CatalogService, AvailabilityStatus } from '@/lib/services/catalogService'
import { cacheManager } from '@/lib/services/cacheManager'
import { gelatoService } from '@/lib/services/gelatoService'
import { createClient } from '@supabase/supabase-js'
import type { GelatoProductDetails } from '@/types/gelato'

// Mock dependencies
jest.mock('@/lib/services/cacheManager', () => ({
  cacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    isValid: jest.fn(),
  },
}))

jest.mock('@/lib/services/gelatoService', () => ({
  gelatoService: {
    getExpandedProductCatalog: jest.fn(),
  },
}))

jest.mock('@supabase/supabase-js')

describe('CatalogService', () => {
  let catalogService: CatalogService
  let mockSupabaseClient: any

  // Mock product data
  const mockGelatoProducts: GelatoProductDetails[] = [
    {
      productUid: 'test-product-1',
      attributes: {
        GarmentCategory: 'T-Shirts',
        GarmentSubcategory: 'Crew Neck',
        Brand: 'Test Brand',
      },
    },
    {
      productUid: 'test-product-2',
      attributes: {
        GarmentCategory: 'Hoodies',
        GarmentSubcategory: 'Pullover',
        Brand: 'Test Brand',
      },
    },
  ]

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create a shared mock client that will be reused
    const mockQueryResult = {
      data: [],
      error: null,
    }

    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue(mockQueryResult),
      upsert: jest.fn().mockResolvedValue(mockQueryResult),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue(mockQueryResult),
    }

    // Setup Supabase mock to return the shared client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)

    // Create new service instance
    catalogService = new CatalogService()
  })

  describe('getCatalog', () => {
    it('should return cached data when cache is valid', async () => {
      const cachedProducts = [
        {
          uid: 'test-product-1',
          title: 'T-Shirts',
          description: 'Crew Neck',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      // Mock cache hit
      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: cachedProducts,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Mock database query for availability
      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      const result = await catalogService.getCatalog()

      expect(result.metadata.source).toBe('cache')
      expect(result.products.length).toBeGreaterThan(0)
      expect(cacheManager.get).toHaveBeenCalledWith('gelato:catalog:v1')
    })

    it('should fetch fresh data when cache is empty', async () => {
      // Mock cache miss
      ;(cacheManager.get as jest.Mock).mockResolvedValue(null)

      // Mock Gelato API
      ;(gelatoService.getExpandedProductCatalog as jest.Mock).mockResolvedValue(
        mockGelatoProducts
      )

      // Mock database operations
      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      // Mock cache set
      ;(cacheManager.set as jest.Mock).mockResolvedValue(undefined)

      const result = await catalogService.getCatalog()

      expect(result.metadata.source).toBe('api')
      expect(gelatoService.getExpandedProductCatalog).toHaveBeenCalled()
      expect(cacheManager.set).toHaveBeenCalled()
    })

    it('should filter discontinued products when includeDiscontinued is false', async () => {
      const cachedProducts = [
        {
          uid: 'test-product-1',
          title: 'Available Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
        {
          uid: 'test-product-2',
          title: 'Discontinued Product',
          description: '',
          category: 'Hoodies',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: cachedProducts,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      mockSupabaseClient.in.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'test-product-2',
            status: 'discontinued',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      const result = await catalogService.getCatalog({ includeDiscontinued: false })

      expect(result.products.length).toBe(1)
      expect(result.products[0].uid).toBe('test-product-1')
    })

    it('should serve stale cache on error', async () => {
      const staleProducts = [
        {
          uid: 'test-product-1',
          title: 'Stale Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      // First call returns null (cache miss), second call returns stale cache
      ;(cacheManager.get as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          data: staleProducts,
          cachedAt: new Date(Date.now() - 100000000),
          expiresAt: new Date(Date.now() - 1000),
        })

      // Mock API error
      ;(gelatoService.getExpandedProductCatalog as jest.Mock).mockRejectedValue(
        new Error('API unavailable')
      )

      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      const result = await catalogService.getCatalog()

      expect(result.products.length).toBeGreaterThan(0)
      expect(result.metadata.source).toBe('cache')
    })
  })

  describe('refreshCatalog', () => {
    it('should invalidate cache and fetch fresh data', async () => {
      ;(gelatoService.getExpandedProductCatalog as jest.Mock).mockResolvedValue(
        mockGelatoProducts
      )

      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      ;(cacheManager.invalidate as jest.Mock).mockResolvedValue(undefined)
      ;(cacheManager.set as jest.Mock).mockResolvedValue(undefined)

      const result = await catalogService.refreshCatalog()

      expect(cacheManager.invalidate).toHaveBeenCalledWith('gelato:catalog:v1')
      expect(gelatoService.getExpandedProductCatalog).toHaveBeenCalled()
      expect(result.metadata.source).toBe('api')
    })

    it('should prevent concurrent refreshes', async () => {
      ;(gelatoService.getExpandedProductCatalog as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockGelatoProducts), 100))
      )

      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      ;(cacheManager.invalidate as jest.Mock).mockResolvedValue(undefined)
      ;(cacheManager.set as jest.Mock).mockResolvedValue(undefined)
      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: [],
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Start two refreshes simultaneously
      const refresh1 = catalogService.refreshCatalog()
      const refresh2 = catalogService.refreshCatalog()

      await Promise.all([refresh1, refresh2])

      // Should only call API once
      expect(gelatoService.getExpandedProductCatalog).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateAvailability', () => {
    it('should detect and insert new products', async () => {
      const products = [
        {
          uid: 'new-product-1',
          title: 'New Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      await catalogService.updateAvailability(products)

      expect(mockSupabaseClient.upsert).toHaveBeenCalled()
      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0]
      expect(upsertCall[0].status).toBe('new')
    })

    it('should detect discontinued products', async () => {
      const products = [
        {
          uid: 'active-product',
          title: 'Active Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            uid: 'active-product',
            name: 'Active Product',
            type: 'T-Shirts',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'old-product',
            name: 'Old Product',
            type: 'Hoodies',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      await catalogService.updateAvailability(products)

      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0]
      const discontinuedProduct = upsertCall.find((p: any) => p.uid === 'old-product')
      expect(discontinuedProduct?.status).toBe('discontinued')
    })

    it('should transition new products to available', async () => {
      const products = [
        {
          uid: 'test-product-1',
          title: 'Test Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            name: 'Test Product',
            type: 'T-Shirts',
            status: 'new',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      await catalogService.updateAvailability(products)

      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0]
      expect(upsertCall[0].status).toBe('available')
    })

    it('should record availability history for status changes', async () => {
      const products = [
        {
          uid: 'test-product-1',
          title: 'Test Product',
          description: '',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            name: 'Test Product',
            type: 'T-Shirts',
            status: 'new',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      await catalogService.updateAvailability(products)

      expect(mockSupabaseClient.insert).toHaveBeenCalled()
      const historyCall = mockSupabaseClient.insert.mock.calls[0][0]
      expect(historyCall[0].status).toBe('available')
      expect(historyCall[0].product_uid).toBe('test-product-1')
    })
  })

  describe('getProductAvailability', () => {
    it('should return availability map for products', async () => {
      const productUids = ['product-1', 'product-2']

      mockSupabaseClient.in.mockResolvedValue({
        data: [
          {
            uid: 'product-1',
            status: 'available',
            last_seen: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            uid: 'product-2',
            status: 'new',
            last_seen: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
          },
        ],
        error: null,
      })

      const result = await catalogService.getProductAvailability(productUids)

      expect(result['product-1'].status).toBe('available')
      expect(result['product-2'].status).toBe('new')
    })

    it('should return empty map for empty input', async () => {
      const result = await catalogService.getProductAvailability([])
      expect(result).toEqual({})
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      const result = await catalogService.getProductAvailability(['product-1'])
      expect(result).toEqual({})
    })
  })

  describe('exponential backoff on rate limits', () => {
    it('should retry with exponential backoff on rate limit errors', async () => {
      const rateLimitError = new Error('rate limit exceeded')
      
      ;(cacheManager.get as jest.Mock).mockResolvedValue(null)
      ;(gelatoService.getExpandedProductCatalog as jest.Mock)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockGelatoProducts)

      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [],
        error: null,
      })
      mockSupabaseClient.insert.mockResolvedValue({
        data: [],
        error: null,
      })

      ;(cacheManager.set as jest.Mock).mockResolvedValue(undefined)

      const startTime = Date.now()
      const result = await catalogService.getCatalog()
      const duration = Date.now() - startTime

      // Should have retried with delays (1s + 2s = 3s minimum)
      expect(duration).toBeGreaterThanOrEqual(3000)
      expect(result.products.length).toBeGreaterThan(0)
    })
  })

  describe('status filtering', () => {
    it('should filter products by single status', async () => {
      const cachedProducts = [
        {
          uid: 'test-product-1',
          title: 'T-Shirts',
          description: 'Crew Neck',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
        {
          uid: 'test-product-2',
          title: 'Hoodies',
          description: 'Pullover',
          category: 'Hoodies',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      // Mock cache hit
      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: cachedProducts,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Mock database response with different statuses
      mockSupabaseClient.in.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'test-product-2',
            status: 'new',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      // Get catalog filtered by 'available' status
      const result = await catalogService.getCatalog({ status: 'available' })

      expect(result.products).toHaveLength(1)
      expect(result.products[0].uid).toBe('test-product-1')
      expect(result.products[0].availabilityStatus).toBe('available')
    })

    it('should filter products by multiple statuses', async () => {
      const cachedProducts = [
        {
          uid: 'test-product-1',
          title: 'T-Shirts',
          description: 'Crew Neck',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
        {
          uid: 'test-product-2',
          title: 'Hoodies',
          description: 'Pullover',
          category: 'Hoodies',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
        {
          uid: 'test-product-3',
          title: 'Mugs',
          description: 'Ceramic',
          category: 'Mugs',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      // Mock cache hit
      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: cachedProducts,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Mock database response with different statuses
      mockSupabaseClient.in.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'test-product-2',
            status: 'new',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'test-product-3',
            status: 'discontinued',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      // Get catalog filtered by 'available' and 'new' statuses
      const result = await catalogService.getCatalog({ status: ['available', 'new'] })

      expect(result.products).toHaveLength(2)
      expect(result.products.map(p => p.uid)).toContain('test-product-1')
      expect(result.products.map(p => p.uid)).toContain('test-product-2')
      expect(result.products.map(p => p.uid)).not.toContain('test-product-3')
    })

    it('should combine status filter with includeDiscontinued option', async () => {
      const cachedProducts = [
        {
          uid: 'test-product-1',
          title: 'T-Shirts',
          description: 'Crew Neck',
          category: 'T-Shirts',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
        {
          uid: 'test-product-2',
          title: 'Hoodies',
          description: 'Pullover',
          category: 'Hoodies',
          availableSizes: [],
          availableColors: [],
          basePrice: 0,
          variants: {},
        },
      ]

      // Mock cache hit
      ;(cacheManager.get as jest.Mock).mockResolvedValue({
        data: cachedProducts,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      // Mock database response with different statuses
      mockSupabaseClient.in.mockResolvedValue({
        data: [
          {
            uid: 'test-product-1',
            status: 'available',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            uid: 'test-product-2',
            status: 'discontinued',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })

      // Get catalog with includeDiscontinued=false (should filter out discontinued)
      const result = await catalogService.getCatalog({ includeDiscontinued: false })

      expect(result.products).toHaveLength(1)
      expect(result.products[0].uid).toBe('test-product-1')
      expect(result.products[0].availabilityStatus).toBe('available')
    })
  })

  describe('getProductsByStatus', () => {
    it('should query products by single status from database', async () => {
      const mockProducts = [
        {
          uid: 'test-product-1',
          name: 'T-Shirts',
          type: 'apparel',
          status: 'available',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      // Mock the in method to return the products
      mockSupabaseClient.in.mockResolvedValue({
        data: mockProducts,
        error: null,
      })

      const result = await catalogService.getProductsByStatus('available')

      expect(result).toHaveLength(1)
      expect(result[0].uid).toBe('test-product-1')
      expect(result[0].status).toBe('available')
    })

    it('should query products by multiple statuses from database', async () => {
      const mockProducts = [
        {
          uid: 'test-product-1',
          name: 'T-Shirts',
          type: 'apparel',
          status: 'available',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          uid: 'test-product-2',
          name: 'Hoodies',
          type: 'apparel',
          status: 'new',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      // Mock the in method to return the products
      mockSupabaseClient.in.mockResolvedValue({
        data: mockProducts,
        error: null,
      })

      const result = await catalogService.getProductsByStatus(['available', 'new'])

      expect(result).toHaveLength(2)
      expect(result.map(p => p.uid)).toContain('test-product-1')
      expect(result.map(p => p.uid)).toContain('test-product-2')
    })

    it('should handle database errors gracefully', async () => {
      // Mock the in method to return an error
      mockSupabaseClient.in.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })

      await expect(catalogService.getProductsByStatus('available')).rejects.toMatchObject({
        message: 'Database error'
      })
    })
  })

})
