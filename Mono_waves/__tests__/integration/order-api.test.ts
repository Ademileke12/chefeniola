/**
 * Integration Tests: Order Tracking API Routes
 * 
 * Comprehensive integration tests for order tracking functionality:
 * - GET /api/orders (admin)
 * - GET /api/orders/[id] (admin) 
 * - POST /api/orders/track (public)
 * 
 * Task: 12.2 Write integration tests for order tracking
 * Requirements: 9.2, 9.3, 9.5, 12.1
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET as getOrders } from '@/app/api/orders/route'
import { GET as getOrderById } from '@/app/api/orders/[id]/route'
import { POST as trackOrder } from '@/app/api/orders/track/route'
import { orderService } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/types/order'

// Mock the order service
jest.mock('@/lib/services/orderService')

const mockOrderService = {
  getAllOrders: jest.fn(),
  getOrderById: jest.fn(),
  trackOrder: jest.fn(),
}

// Replace the mocked module
jest.mocked(orderService).getAllOrders = mockOrderService.getAllOrders
jest.mocked(orderService).getOrderById = mockOrderService.getOrderById  
jest.mocked(orderService).trackOrder = mockOrderService.trackOrder

// Test fixtures
const mockOrder: Order = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  orderNumber: 'MW-ABC123-DEF4',
  customerEmail: 'john.doe@example.com',
  customerName: 'John Doe',
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    postCode: '12345',
    country: 'US',
    phone: '+1234567890',
  },
  items: [
    {
      productId: 'prod-1',
      productName: 'Test T-Shirt',
      size: 'M',
      color: 'Blue',
      quantity: 1,
      price: 29.99,
      designUrl: 'https://example.com/design.png',
      gelatoProductUid: 'gelato-123',
    },
  ],
  subtotal: 29.99,
  shippingCost: 10.00,
  total: 39.99,
  stripePaymentId: 'pi_test_123',
  status: 'payment_confirmed',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Additional test fixtures for comprehensive testing
const mockShippedOrder: Order = {
  ...mockOrder,
  id: '456e7890-e89b-12d3-a456-426614174001',
  orderNumber: 'MW-XYZ789-GHI2',
  status: 'shipped',
  trackingNumber: '1Z999AA10123456784',
  carrier: 'UPS',
}

const mockDeliveredOrder: Order = {
  ...mockOrder,
  id: '789e0123-e89b-12d3-a456-426614174002',
  orderNumber: 'MW-LMN456-OPQ8',
  customerEmail: 'jane.smith@example.com',
  customerName: 'Jane Smith',
  status: 'delivered',
  trackingNumber: '1Z999AA10123456785',
  carrier: 'FedEx',
}

const mockOrderWithMultipleItems: Order = {
  ...mockOrder,
  id: '012e3456-e89b-12d3-a456-426614174003',
  orderNumber: 'MW-RST123-UVW9',
  items: [
    {
      productId: 'prod-1',
      productName: 'Test T-Shirt',
      size: 'M',
      color: 'Blue',
      quantity: 2,
      price: 29.99,
      designUrl: 'https://example.com/design1.png',
      gelatoProductUid: 'gelato-123',
    },
    {
      productId: 'prod-2',
      productName: 'Test Hoodie',
      size: 'L',
      color: 'Black',
      quantity: 1,
      price: 49.99,
      designUrl: 'https://example.com/design2.png',
      gelatoProductUid: 'gelato-456',
    },
  ],
  subtotal: 109.97,
  total: 119.97,
}
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

describe('Order Tracking Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Test: GET /api/orders - Get all orders (admin)
   * Validates: Requirements 12.1
   */
  describe('GET /api/orders - Admin Order Management', () => {
    it('should return all orders without filters', async () => {
      // Arrange
      const orders = [mockOrder, mockShippedOrder, mockDeliveredOrder]
      mockOrderService.getAllOrders.mockResolvedValue(orders)
      const request = createRequest('http://localhost:3000/api/orders')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(3)
      expect(data.orders).toEqual(orders)
      expect(data.count).toBe(3)
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith({})
    })

    it('should filter orders by status', async () => {
      // Arrange
      const shippedOrders = [mockShippedOrder]
      mockOrderService.getAllOrders.mockResolvedValue(shippedOrders)
      const request = createRequest('http://localhost:3000/api/orders?status=shipped')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0].status).toBe('shipped')
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith({ status: 'shipped' })
    })

    it('should filter orders by search term', async () => {
      // Arrange
      const searchResults = [mockOrder]
      mockOrderService.getAllOrders.mockResolvedValue(searchResults)
      const request = createRequest('http://localhost:3000/api/orders?search=john.doe')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(1)
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith({ search: 'john.doe' })
    })

    it('should return error for invalid status', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/orders?status=invalid')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid status')
    })

    it('should handle date range filters', async () => {
      // Arrange
      mockOrderService.getAllOrders.mockResolvedValue([mockOrder])
      const request = createRequest('http://localhost:3000/api/orders?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z'
      })
    })

    it('should return error for invalid date format', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/orders?startDate=invalid-date')

      // Act
      const response = await getOrders(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid startDate format')
    })
  })

  /**
   * Test: GET /api/orders/[id] - Get order by ID (admin)
   * Validates: Requirements 12.1
   */
  describe('GET /api/orders/[id] - Order Detail Retrieval', () => {
    it('should return complete order details by valid ID', async () => {
      // Arrange
      mockOrderService.getOrderById.mockResolvedValue(mockOrderWithMultipleItems)
      const request = createRequest('http://localhost:3000/api/orders/012e3456-e89b-12d3-a456-426614174003')

      // Act
      const response = await getOrderById(request, {
        params: { id: '012e3456-e89b-12d3-a456-426614174003' }
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.order).toEqual(mockOrderWithMultipleItems)
      expect(data.order.items).toHaveLength(2)
      expect(data.order.items[0].productName).toBe('Test T-Shirt')
      expect(data.order.items[1].productName).toBe('Test Hoodie')
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith('012e3456-e89b-12d3-a456-426614174003')
    })

    it('should return order with tracking information when available', async () => {
      // Arrange
      mockOrderService.getOrderById.mockResolvedValue(mockShippedOrder)
      const request = createRequest('http://localhost:3000/api/orders/456e7890-e89b-12d3-a456-426614174001')

      // Act
      const response = await getOrderById(request, {
        params: { id: '456e7890-e89b-12d3-a456-426614174001' }
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.order.trackingNumber).toBe('1Z999AA10123456784')
      expect(data.order.carrier).toBe('UPS')
      expect(data.order.status).toBe('shipped')
    })

    it('should return 404 for non-existent order', async () => {
      // Arrange
      mockOrderService.getOrderById.mockResolvedValue(null)
      const request = createRequest('http://localhost:3000/api/orders/123e4567-e89b-12d3-a456-426614174000')

      // Act
      const response = await getOrderById(request, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Order not found')
    })

    it('should return error for invalid UUID format', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/orders/invalid-uuid')

      // Act
      const response = await getOrderById(request, {
        params: { id: 'invalid-uuid' }
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order ID format')
    })

    it('should return error for missing order ID', async () => {
      // Arrange
      const request = createRequest('http://localhost:3000/api/orders/')

      // Act
      const response = await getOrderById(request, {
        params: { id: '' }
      })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid order ID is required')
    })
  })

  /**
   * Test: POST /api/orders/track - Track order (public)
   * Validates: Requirements 9.2, 9.3, 9.5
   */
  describe('POST /api/orders/track - Order Tracking', () => {
    describe('Valid Tracking Requests', () => {
      it('should return order for valid email and order number', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(mockOrder)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com',
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.order.orderNumber).toBe('MW-ABC123-DEF4')
        expect(data.order.customerEmail).toBeUndefined() // Should not expose customer email in response
        expect(data.message).toBe('Order found successfully')
        expect(mockOrderService.trackOrder).toHaveBeenCalledWith('john.doe@example.com', 'MW-ABC123-DEF4')
      })

      it('should return shipped order with tracking information', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(mockShippedOrder)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com',
          orderNumber: 'MW-XYZ789-GHI2'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.order.status).toBe('shipped')
        expect(data.order.trackingNumber).toBe('1Z999AA10123456784')
        expect(data.order.carrier).toBe('UPS')
        expect(data.order.items).toHaveLength(1)
        expect(data.order.shippingAddress).toBeDefined()
      })

      it('should return delivered order with complete details', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(mockDeliveredOrder)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'jane.smith@example.com',
          orderNumber: 'MW-LMN456-OPQ8'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.order.status).toBe('delivered')
        expect(data.order.trackingNumber).toBe('1Z999AA10123456785')
        expect(data.order.carrier).toBe('FedEx')
        expect(data.order.total).toBe(39.99)
      })

      it('should handle case-insensitive email matching', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(mockOrder)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'JOHN.DOE@EXAMPLE.COM',
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(mockOrderService.trackOrder).toHaveBeenCalledWith('john.doe@example.com', 'MW-ABC123-DEF4')
      })

      it('should trim whitespace from inputs', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(mockOrder)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: '  john.doe@example.com  ',
          orderNumber: '  MW-ABC123-DEF4  '
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(mockOrderService.trackOrder).toHaveBeenCalledWith('john.doe@example.com', 'MW-ABC123-DEF4')
      })
    })

    describe('Invalid Tracking Requests', () => {
      it('should return 404 for non-matching email/order combination', async () => {
        // Arrange
        mockOrderService.trackOrder.mockResolvedValue(null)
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'wrong.email@example.com',
          orderNumber: 'MW-NONEXISTENT'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(404)
        expect(data.error).toBe('Order not found or email does not match')
        expect(data.message).toBe('Please check your email address and order number and try again.')
      })

      it('should return error for missing email', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Email is required')
      })

      it('should return error for missing order number', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Order number is required')
      })

      it('should return error for invalid email format', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'invalid-email',
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid email format')
      })

      it('should return error for invalid order number format', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com',
          orderNumber: 'INVALID-FORMAT'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid order number format')
      })

      it('should return error for empty email', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: '',
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Email is required')
      })

      it('should return error for empty order number', async () => {
        // Arrange
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com',
          orderNumber: ''
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(data.error).toBe('Order number is required')
      })
    })

    describe('Error Handling', () => {
      it('should handle service errors gracefully', async () => {
        // Arrange
        mockOrderService.trackOrder.mockRejectedValue(new Error('Database connection failed'))
        const request = createRequest('http://localhost:3000/api/orders/track', 'POST', {
          email: 'john.doe@example.com',
          orderNumber: 'MW-ABC123-DEF4'
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to track order')
      })

      it('should handle malformed JSON request', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/orders/track', {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // Act
        const response = await trackOrder(request)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to track order')
      })
    })
  })
})