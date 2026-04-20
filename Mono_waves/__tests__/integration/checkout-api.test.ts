/**
 * Integration Tests for Checkout API
 * 
 * Tests the POST /api/checkout endpoint for creating Stripe checkout sessions.
 * 
 * Requirements: 6.2, 6.4, 7.1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/checkout/route'
import type { Cart, CartItem, ShippingAddress } from '@/types'

// Mock the services
const mockGetCart = jest.fn()
const mockCreateCheckoutSession = jest.fn()
const mockGetShippingCost = jest.fn()

jest.mock('@/lib/services/cartService', () => ({
  cartService: {
    getCart: mockGetCart,
  },
}))

jest.mock('@/lib/services/stripeService', () => ({
  stripeService: {
    createCheckoutSession: mockCreateCheckoutSession,
  },
}))

jest.mock('@/lib/services/shippingService', () => ({
  shippingService: {
    getShippingCost: mockGetShippingCost,
  },
}))

describe('POST /api/checkout', () => {
  const validShippingAddress: ShippingAddress = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postCode: '10001',
    country: 'US',
    phone: '+1-555-123-4567',
  }

  const validCartItems: CartItem[] = [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Test T-Shirt',
      size: 'M',
      color: 'Blue',
      quantity: 2,
      price: 29.99,
      imageUrl: 'https://example.com/image.jpg',
    },
  ]

  const validCart: Cart = {
    id: 'cart-1',
    sessionId: 'session-123',
    items: validCartItems,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-08T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mocks
    mockGetCart.mockResolvedValue(validCart)
    mockCreateCheckoutSession.mockResolvedValue('https://checkout.stripe.com/session-123')
    mockGetShippingCost.mockResolvedValue({
      cost: 10.00,
      currency: 'USD',
      estimatedDays: 7,
      method: 'Standard Shipping'
    })
  })

  describe('Successful checkout session creation', () => {
    it('should create checkout session with valid data', async () => {
      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')
      expect(data.message).toBe('Checkout session created successfully')

      // Verify service calls
      expect(mockGetCart).toHaveBeenCalledWith('session-123')
      expect(mockGetShippingCost).toHaveBeenCalledWith({
        items: [
          {
            productUid: 'prod-1',
            quantity: 2
          }
        ],
        shippingAddress: {
          country: 'US',
          state: 'NY',
          postCode: '10001'
        }
      })
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        cartItems: validCartItems,
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
        successUrl: expect.stringContaining('/confirmation'),
        cancelUrl: expect.stringContaining('/cart?cancelled=true'),
        shippingCost: 10.00, // Shipping cost should be included
      })
    })

    it('should use fallback shipping cost when shipping service fails', async () => {
      mockGetShippingCost.mockRejectedValue(new Error('Shipping service unavailable'))

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')

      // Verify fallback shipping cost is used
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 10.00, // Fallback shipping cost
        })
      )
    })
  })

  describe('Validation errors', () => {
    it('should return 400 when session ID is missing', async () => {
      const requestBody = {
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required')
    })

    it('should return 400 when customer email is missing', async () => {
      const requestBody = {
        sessionId: 'session-123',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Customer email is required')
    })

    it('should return 400 when shipping address is missing', async () => {
      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Shipping address is required')
    })

    it('should return 400 for invalid email format', async () => {
      const requestBody = {
        sessionId: 'session-123',
        customerEmail: 'invalid-email',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 for incomplete shipping address', async () => {
      const incompleteAddress = {
        firstName: 'John',
        lastName: '', // Missing last name
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postCode: '10001',
        country: 'US',
        phone: '+1-555-123-4567',
      }

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: incompleteAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid shipping address')
      expect(data.details.missingFields).toContain('lastName')
    })

    it('should return 400 for invalid phone number', async () => {
      const invalidPhoneAddress = {
        ...validShippingAddress,
        phone: 'abc123', // Invalid phone format
      }

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: invalidPhoneAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid phone number format')
    })

    it('should return 400 when cart is empty', async () => {
      const emptyCart: Cart = {
        ...validCart,
        items: [],
      }
      mockGetCart.mockResolvedValue(emptyCart)

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cart is empty')
    })

    it('should return 400 for invalid cart item quantity', async () => {
      const invalidCart: Cart = {
        ...validCart,
        items: [
          {
            ...validCartItems[0],
            quantity: 0, // Invalid quantity
          },
        ],
      }
      mockGetCart.mockResolvedValue(invalidCart)

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid quantity for item')
    })

    it('should return 400 for invalid cart item price', async () => {
      const invalidCart: Cart = {
        ...validCart,
        items: [
          {
            ...validCartItems[0],
            price: 0, // Invalid price
          },
        ],
      }
      mockGetCart.mockResolvedValue(invalidCart)

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid price for item')
    })
  })

  describe('Service errors', () => {
    it('should return 400 when cart service fails', async () => {
      mockGetCart.mockRejectedValue(new Error('Failed to fetch cart'))

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unable to retrieve cart')
    })

    it('should return 500 when Stripe configuration is missing', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('STRIPE_SECRET_KEY is not configured')
      )

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Payment service configuration error')
    })

    it('should return 502 when Stripe API fails', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('Stripe API error: Invalid request')
      )

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('Payment service error')
    })

    it('should return 500 for unexpected errors', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('Unexpected error')
      )

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create checkout session')
    })
  })

  describe('Edge cases', () => {
    it('should handle multiple cart items correctly', async () => {
      const multipleItemsCart: Cart = {
        ...validCart,
        items: [
          validCartItems[0],
          {
            id: 'item-2',
            productId: 'prod-2',
            productName: 'Test Hoodie',
            size: 'L',
            color: 'Red',
            quantity: 1,
            price: 49.99,
            imageUrl: 'https://example.com/hoodie.jpg',
          },
        ],
      }
      mockGetCart.mockResolvedValue(multipleItemsCart)

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          cartItems: multipleItemsCart.items,
          shippingCost: 10.00, // Shipping cost should be included
        })
      )
    })

    it('should handle address with optional addressLine2', async () => {
      const addressWithoutLine2 = {
        ...validShippingAddress,
        addressLine2: undefined,
      }

      const requestBody = {
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: addressWithoutLine2,
      }

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBeDefined()
    })
  })
})