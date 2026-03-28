/**
 * Unit Tests for Gelato Service Error Handling
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate specific error scenarios and edge cases for Gelato API integration.
 * 
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { gelatoService, GelatoApiError } from '@/lib/services/gelatoService'
import type { GelatoOrderData } from '@/types/gelato'

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch as any

describe('Gelato Service Error Handling', () => {
  const originalEnv = process.env.GELATO_API_KEY

  beforeEach(() => {
    // Set a test API key
    process.env.GELATO_API_KEY = 'test_api_key_12345'
    mockFetch.mockClear()
  })

  afterEach(() => {
    // Restore original environment
    process.env.GELATO_API_KEY = originalEnv
  })

  /**
   * Test API failure scenarios
   * Requirements: 8.5, 19.2
   */
  describe('API Failure Scenarios', () => {
    it('should throw GelatoApiError on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error occurred',
      })

      await expect(gelatoService.getProductCatalog()).rejects.toThrow(GelatoApiError)
    })

    it('should throw GelatoApiError on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      })

      await expect(gelatoService.getProductCatalog()).rejects.toThrow(GelatoApiError)
    })

    it('should throw GelatoApiError on 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Product not found',
      })

      await expect(gelatoService.getProductDetails('invalid-uid')).rejects.toThrow(
        GelatoApiError
      )
    })

    it('should throw GelatoApiError on 400 bad request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid order data',
      })

      const orderData: GelatoOrderData = {
        orderReferenceId: 'test-order-123',
        customerReferenceId: 'customer-456',
        currency: 'USD',
        items: [
          {
            itemReferenceId: 'item-1',
            productUid: 'product-uid',
            files: [{ type: 'default', url: 'https://example.com/design.png' }],
            quantity: 1,
          },
        ],
        shipmentMethodUid: 'standard',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '1234567890',
        },
      }

      await expect(gelatoService.createOrder(orderData)).rejects.toThrow(GelatoApiError)
    })

    it('should include status code and response body in GelatoApiError', async () => {
      const errorBody = 'Detailed error message'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => errorBody,
      })

      try {
        await gelatoService.getProductCatalog()
        // Should not reach here
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeInstanceOf(GelatoApiError)
        expect(error.statusCode).toBe(503)
        expect(error.responseBody).toBe(errorBody)
      }
    })
  })

  /**
   * Test network timeout handling
   * Requirements: 8.5, 19.2
   */
  describe('Network Timeout Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'))

      await expect(gelatoService.getProductCatalog()).rejects.toThrow('Network request failed')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(gelatoService.getProductDetails('test-uid')).rejects.toThrow(
        'Request timeout'
      )
    })

    it('should handle connection refused errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      await expect(gelatoService.getOrderStatus('test-order-id')).rejects.toThrow(
        'ECONNREFUSED'
      )
    })
  })

  /**
   * Test invalid product UID handling
   * Requirements: 8.5, 19.2
   */
  describe('Invalid Product UID Handling', () => {
    it('should throw error for empty product UID', async () => {
      await expect(gelatoService.getProductDetails('')).rejects.toThrow(
        'Product UID is required'
      )
    })

    it('should throw error for whitespace-only product UID', async () => {
      await expect(gelatoService.getProductDetails('   ')).rejects.toThrow(
        'Product UID is required'
      )
    })

    it('should handle 404 for non-existent product UID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Product with UID "non-existent-uid" not found',
      })

      await expect(
        gelatoService.getProductDetails('non-existent-uid')
      ).rejects.toThrow(GelatoApiError)
    })

    it('should URL-encode product UID in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uid: 'test/uid',
          title: 'Test Product',
          availableSizes: ['M'],
          availableColors: [],
          basePrice: 10,
          currency: 'USD',
          description: 'Test',
        }),
      })

      await gelatoService.getProductDetails('test/uid')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test%2Fuid'),
        expect.any(Object)
      )
    })
  })

  /**
   * Test missing API key handling
   * Requirements: 19.2
   */
  describe('Missing API Key Handling', () => {
    it('should throw error when GELATO_API_KEY is not set', async () => {
      delete process.env.GELATO_API_KEY

      await expect(gelatoService.getProductCatalog()).rejects.toThrow(
        'GELATO_API_KEY is not configured'
      )
    })

    it('should throw error when GELATO_API_KEY is empty string', async () => {
      process.env.GELATO_API_KEY = ''

      await expect(gelatoService.getProductCatalog()).rejects.toThrow(
        'GELATO_API_KEY is not configured'
      )
    })
  })

  /**
   * Test order validation
   * Requirements: 8.5, 19.2
   */
  describe('Order Validation', () => {
    it('should throw error for missing order reference ID', async () => {
      const orderData: any = {
        orderReferenceId: '',
        customerReferenceId: 'customer-456',
        currency: 'USD',
        items: [
          {
            itemReferenceId: 'item-1',
            productUid: 'product-uid',
            files: [{ type: 'default', url: 'https://example.com/design.png' }],
            quantity: 1,
          },
        ],
        shipmentMethodUid: 'standard',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '1234567890',
        },
      }

      await expect(gelatoService.createOrder(orderData)).rejects.toThrow(
        'Order reference ID is required'
      )
    })

    it('should throw error for empty items array', async () => {
      const orderData: GelatoOrderData = {
        orderReferenceId: 'test-order-123',
        customerReferenceId: 'customer-456',
        currency: 'USD',
        items: [],
        shipmentMethodUid: 'standard',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '1234567890',
        },
      }

      await expect(gelatoService.createOrder(orderData)).rejects.toThrow(
        'Order must contain at least one item'
      )
    })

    it('should throw error for missing shipping address', async () => {
      const orderData: any = {
        orderReferenceId: 'test-order-123',
        customerReferenceId: 'customer-456',
        currency: 'USD',
        items: [
          {
            itemReferenceId: 'item-1',
            productUid: 'product-uid',
            files: [{ type: 'default', url: 'https://example.com/design.png' }],
            quantity: 1,
          },
        ],
        shipmentMethodUid: 'standard',
        shippingAddress: null,
      }

      await expect(gelatoService.createOrder(orderData)).rejects.toThrow(
        'Shipping address is required'
      )
    })
  })

  /**
   * Test order status validation
   * Requirements: 8.5, 19.2
   */
  describe('Order Status Validation', () => {
    it('should throw error for empty order ID', async () => {
      await expect(gelatoService.getOrderStatus('')).rejects.toThrow(
        'Gelato order ID is required'
      )
    })

    it('should throw error for whitespace-only order ID', async () => {
      await expect(gelatoService.getOrderStatus('   ')).rejects.toThrow(
        'Gelato order ID is required'
      )
    })

    it('should URL-encode order ID in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: 'test/order/123',
          status: 'pending',
          items: [],
        }),
      })

      await gelatoService.getOrderStatus('test/order/123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test%2Forder%2F123'),
        expect.any(Object)
      )
    })
  })
})
