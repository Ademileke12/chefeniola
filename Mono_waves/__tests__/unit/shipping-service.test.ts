/**
 * Unit tests for Shipping Service
 * 
 * Tests:
 * - Successful API response parsing
 * - Caching behavior
 * - Fallback on API errors
 * - Various address formats
 * 
 * Requirements: 5.1, 5.2, 5.5
 */

import type { ShippingCostRequest, ShippingCostResponse } from '@/lib/services/shippingService'

// Mock fetch globally
global.fetch = jest.fn()

// Import after mocking
import { getShippingCost, shippingService, clearShippingCache } from '@/lib/services/shippingService'

describe('Shipping Service', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear the shipping cache between tests
    clearShippingCache()
    // Reset environment
    process.env = { ...originalEnv, GELATO_API_KEY: 'test-api-key' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Successful API Response Parsing', () => {
    it('should parse successful Gelato API response correctly', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: {
              amount: 12.50,
              currency: 'USD'
            },
            estimatedDeliveryDays: 7,
            methodName: 'Standard Shipping'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [
          { productUid: 'gelato-123', quantity: 1 }
        ],
        shippingAddress: {
          country: 'USA',
          state: 'NY',
          postCode: '10001'
        }
      }

      const result = await getShippingCost(request)

      expect(result).toEqual({
        cost: 12.50,
        currency: 'USD',
        estimatedDays: 7,
        method: 'Standard Shipping'
      })
    })

    it('should use first shipping option when multiple are returned', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 10.00, currency: 'USD' },
            estimatedDeliveryDays: 10,
            methodName: 'Economy'
          },
          {
            price: { amount: 15.00, currency: 'USD' },
            estimatedDeliveryDays: 5,
            methodName: 'Express'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'CA', postCode: '90001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
      expect(result.method).toBe('Economy')
    })

    it('should handle multiple items in request', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 18.00, currency: 'USD' },
            estimatedDeliveryDays: 8,
            methodName: 'Standard Shipping'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [
          { productUid: 'gelato-123', quantity: 2 },
          { productUid: 'gelato-456', quantity: 1 }
        ],
        shippingAddress: { country: 'USA', state: 'TX', postCode: '75001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(18.00)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('gelato-123')
        })
      )
    })

    it('should send correct headers to Gelato API', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 10.00, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      await getShippingCost(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v4/shipping/quotes'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'test-api-key'
          }
        })
      )
    })
  })

  describe('Caching Behavior', () => {
    it('should cache shipping quotes for 5 minutes', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 12.50, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      // First call - should hit API
      const result1 = await getShippingCost(request)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const result2 = await getShippingCost(request)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1, not 2

      // Results should be identical
      expect(result1).toEqual(result2)
    })

    it('should use different cache keys for different addresses', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 12.50, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request1: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const request2: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'CA', postCode: '90001' }
      }

      await getShippingCost(request1)
      await getShippingCost(request2)

      // Should call API twice for different addresses
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should use different cache keys for different items', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 12.50, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request1: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const request2: ShippingCostRequest = {
        items: [{ productUid: 'gelato-456', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      await getShippingCost(request1)
      await getShippingCost(request2)

      // Should call API twice for different items
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should use different cache keys for different quantities', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 12.50, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request1: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const request2: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 2 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      await getShippingCost(request1)
      await getShippingCost(request2)

      // Should call API twice for different quantities
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Fallback on API Errors', () => {
    it('should return $10 fallback when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result).toEqual({
        cost: 10.00,
        currency: 'USD',
        estimatedDays: 10,
        method: 'Standard Shipping (Estimated)'
      })
    })

    it('should return $10 fallback when API returns no shipping options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shippingOptions: [] })
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
      expect(result.method).toContain('Estimated')
    })

    it('should return $10 fallback when API throws network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
      expect(result.currency).toBe('USD')
    })

    it('should return $10 fallback when API returns invalid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
    })

    it('should not cache fallback responses', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('API error'))

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          shippingOptions: [
            {
              price: { amount: 12.50, currency: 'USD' },
              estimatedDeliveryDays: 7,
              methodName: 'Standard'
            }
          ]
        })
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      // First call - should return fallback
      const result1 = await getShippingCost(request)
      expect(result1.cost).toBe(10.00)

      // Second call - should retry API and get real cost
      const result2 = await getShippingCost(request)
      expect(result2.cost).toBe(12.50)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle API returning 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Endpoint not found'
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
    })

    it('should handle API returning 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: { country: 'USA', state: 'NY', postCode: '10001' }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
    })
  })

  describe('Various Address Formats', () => {
    it('should handle US addresses', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 12.50, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: {
          country: 'USA',
          state: 'NY',
          postCode: '10001'
        }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(12.50)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"country":"USA"')
        })
      )
    })

    it('should handle Canadian addresses', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 15.00, currency: 'CAD' },
            estimatedDeliveryDays: 10,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: {
          country: 'CAN',
          state: 'ON',
          postCode: 'M5H 2N2'
        }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(15.00)
      expect(result.currency).toBe('CAD')
    })

    it('should handle UK addresses', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 8.50, currency: 'GBP' },
            estimatedDeliveryDays: 5,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: {
          country: 'GBR',
          state: '',
          postCode: 'SW1A 1AA'
        }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(8.50)
      expect(result.currency).toBe('GBP')
    })

    it('should handle addresses with different postal code formats', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 10.00, currency: 'USD' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const postalCodes = ['10001', '10001-1234', '90210', 'M5H 2N2', 'SW1A 1AA']

      for (const postCode of postalCodes) {
        mockFetch.mockClear()
        
        const request: ShippingCostRequest = {
          items: [{ productUid: 'gelato-123', quantity: 1 }],
          shippingAddress: {
            country: 'USA',
            state: 'NY',
            postCode
          }
        }

        const result = await getShippingCost(request)
        expect(result.cost).toBeGreaterThan(0)
      }
    })

    it('should handle addresses with empty state field', async () => {
      const mockApiResponse = {
        shippingOptions: [
          {
            price: { amount: 10.00, currency: 'EUR' },
            estimatedDeliveryDays: 7,
            methodName: 'Standard'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response)

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: {
          country: 'DEU',
          state: '',
          postCode: '10115'
        }
      }

      const result = await getShippingCost(request)

      expect(result.cost).toBe(10.00)
    })
  })

  describe('Input Validation', () => {
    it('should throw error when items array is empty', async () => {
      const request: ShippingCostRequest = {
        items: [],
        shippingAddress: {
          country: 'USA',
          state: 'NY',
          postCode: '10001'
        }
      }

      await expect(getShippingCost(request)).rejects.toThrow(
        'At least one item is required for shipping cost calculation'
      )
    })

    it('should throw error when shipping address is missing', async () => {
      const request = {
        items: [{ productUid: 'gelato-123', quantity: 1 }]
      } as ShippingCostRequest

      await expect(getShippingCost(request)).rejects.toThrow(
        'Shipping address is required for shipping cost calculation'
      )
    })

    it('should use fallback when GELATO_API_KEY is not configured', async () => {
      delete process.env.GELATO_API_KEY

      const request: ShippingCostRequest = {
        items: [{ productUid: 'gelato-123', quantity: 1 }],
        shippingAddress: {
          country: 'USA',
          state: 'NY',
          postCode: '10001'
        }
      }

      // Should fall back to $10 when API key is missing
      const result = await getShippingCost(request)
      
      expect(result.cost).toBe(10.00)
      expect(result.method).toContain('Estimated')
    })
  })

  describe('Service Export', () => {
    it('should export shippingService object with getShippingCost method', () => {
      expect(shippingService).toBeDefined()
      expect(shippingService.getShippingCost).toBeDefined()
      expect(typeof shippingService.getShippingCost).toBe('function')
    })

    it('should have getShippingCost as standalone export', () => {
      expect(getShippingCost).toBeDefined()
      expect(typeof getShippingCost).toBe('function')
    })

    it('should export clearShippingCache for testing', () => {
      expect(clearShippingCache).toBeDefined()
      expect(typeof clearShippingCache).toBe('function')
    })
  })
})
