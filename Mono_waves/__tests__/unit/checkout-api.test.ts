/**
 * Unit Tests for Checkout API Route
 * 
 * Tests the POST /api/checkout endpoint validation and logic.
 * 
 * Requirements: 6.2, 6.4, 7.1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the services before importing the route
const mockGetCart = jest.fn()
const mockCreateCheckoutSession = jest.fn()

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

// Mock NextRequest and NextResponse
const mockJson = jest.fn()
const mockRequest = {
  json: mockJson,
} as any

const mockNextResponse = {
  json: jest.fn((data: any, options?: any) => ({
    status: options?.status || 200,
    json: () => Promise.resolve(data),
  })),
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}))

// Import the route handler after mocking
import { POST } from '@/app/api/checkout/route'
import type { Cart, CartItem, ShippingAddress } from '@/types'

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
    mockJson.mockResolvedValue({
      sessionId: 'session-123',
      customerEmail: '[email protected]',
      shippingAddress: validShippingAddress,
    })
  })

  describe('Successful checkout session creation', () => {
    it('should create checkout session with valid data', async () => {
      const response = await POST(mockRequest)

      expect(mockGetCart).toHaveBeenCalledWith('session-123')
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        cartItems: validCartItems,
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
        successUrl: expect.stringContaining('/order/confirmation'),
        cancelUrl: expect.stringContaining('/cart?cancelled=true'),
      })
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        checkoutUrl: 'https://checkout.stripe.com/session-123',
        message: 'Checkout session created successfully',
      })
    })
  })

  describe('Validation errors', () => {
    it('should return 400 when session ID is missing', async () => {
      mockJson.mockResolvedValue({
        customerEmail: '[email protected]',
        shippingAddress: validShippingAddress,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    })

    it('should return 400 when customer email is missing', async () => {
      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        shippingAddress: validShippingAddress,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Customer email is required' },
        { status: 400 }
      )
    })

    it('should return 400 when shipping address is missing', async () => {
      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        customerEmail: '[email protected]',
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    })

    it('should return 400 for invalid email format', async () => {
      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        customerEmail: 'invalid-email',
        shippingAddress: validShippingAddress,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid email format' },
        { status: 400 }
      )
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

      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: incompleteAddress,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          error: 'Invalid shipping address',
          details: {
            missingFields: ['lastName']
          }
        },
        { status: 400 }
      )
    })

    it('should return 400 for invalid phone number', async () => {
      const invalidPhoneAddress = {
        ...validShippingAddress,
        phone: 'abc123', // Invalid phone format
      }

      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: invalidPhoneAddress,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    })

    it('should return 400 when cart is empty', async () => {
      const emptyCart: Cart = {
        ...validCart,
        items: [],
      }
      mockGetCart.mockResolvedValue(emptyCart)

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Cart is empty' },
        { status: 400 }
      )
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

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid quantity for item Test T-Shirt' },
        { status: 400 }
      )
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

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid price for item Test T-Shirt' },
        { status: 400 }
      )
    })
  })

  describe('Service errors', () => {
    it('should return 400 when cart service fails', async () => {
      mockGetCart.mockRejectedValue(new Error('Failed to fetch cart'))

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Unable to retrieve cart' },
        { status: 400 }
      )
    })

    it('should return 500 when Stripe configuration is missing', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('STRIPE_SECRET_KEY is not configured')
      )

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Payment service configuration error' },
        { status: 500 }
      )
    })

    it('should return 502 when Stripe API fails', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('Stripe API error: Invalid request')
      )

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Payment service error' },
        { status: 502 }
      )
    })

    it('should return 500 for unexpected errors', async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error('Unexpected error')
      )

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
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

      await POST(mockRequest)

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          cartItems: multipleItemsCart.items,
        })
      )
    })

    it('should handle address with optional addressLine2', async () => {
      const addressWithoutLine2 = {
        ...validShippingAddress,
        addressLine2: undefined,
      }

      mockJson.mockResolvedValue({
        sessionId: 'session-123',
        customerEmail: '[email protected]',
        shippingAddress: addressWithoutLine2,
      })

      await POST(mockRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        checkoutUrl: 'https://checkout.stripe.com/session-123',
        message: 'Checkout session created successfully',
      })
    })
  })
})