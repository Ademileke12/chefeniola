/**
 * Unit tests for Order Service
 * 
 * Tests order operations including:
 * - Order creation
 * - Order retrieval
 * - Order tracking
 * - Order status updates
 * - Gelato submission
 */

import { orderService } from '@/lib/services/orderService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { gelatoService } from '@/lib/services/gelatoService'
import type { CreateOrderData, OrderItem, ShippingAddress } from '@/types/order'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

// Mock Gelato service
jest.mock('@/lib/services/gelatoService', () => ({
  gelatoService: {
    createOrder: jest.fn(),
  },
}))

describe('Order Service', () => {
  const mockShippingAddress: ShippingAddress = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postCode: '10001',
    country: 'US',
    phone: '+1234567890',
  }

  const mockOrderItems: OrderItem[] = [
    {
      productId: 'prod-1',
      productName: 'Test T-Shirt',
      size: 'M',
      color: 'Black',
      quantity: 2,
      price: 29.99,
      designUrl: 'https://example.com/design.png',
      gelatoProductUid: 'gelato-uid-1',
    },
  ]

  const mockCreateOrderData: CreateOrderData = {
    customerEmail: 'john.doe@example.com',
    stripePaymentId: 'pi_test_123',
    items: mockOrderItems,
    shippingAddress: mockShippingAddress,
    total: 69.98,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const mockDbOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: null,
        status: 'payment_confirmed',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.createOrder(mockCreateOrderData)

      expect(result).toBeDefined()
      expect(result.orderNumber).toBe('MW-TEST-001')
      expect(result.customerEmail).toBe('john.doe@example.com')
      expect(result.status).toBe('payment_confirmed')
      expect(result.total).toBe(69.98)
    })

    it('should reject order with invalid email', async () => {
      const invalidData = {
        ...mockCreateOrderData,
        customerEmail: 'invalid-email',
      }

      await expect(orderService.createOrder(invalidData)).rejects.toThrow(
        'Valid customer email is required'
      )
    })

    it('should reject order without stripe payment ID', async () => {
      const invalidData: CreateOrderData = {
        customerEmail: 'john.doe@example.com',
        stripePaymentId: '',
        items: mockOrderItems,
        shippingAddress: mockShippingAddress,
        total: 69.98,
      }

      await expect(orderService.createOrder(invalidData)).rejects.toThrow(
        'Stripe payment ID is required'
      )
    })

    it('should reject order without items', async () => {
      const invalidData: CreateOrderData = {
        customerEmail: 'john.doe@example.com',
        stripePaymentId: 'pi_test_123',
        items: [],
        shippingAddress: mockShippingAddress,
        total: 69.98,
      }

      await expect(orderService.createOrder(invalidData)).rejects.toThrow(
        'Order must contain at least one item'
      )
    })
  })

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const mockDbOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: null,
        status: 'payment_confirmed',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getOrderById('order-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('order-1')
      expect(result?.orderNumber).toBe('MW-TEST-001')
    })

    it('should return null when order not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getOrderById('nonexistent')

      expect(result).toBeNull()
    })

    it('should reject without order ID', async () => {
      await expect(orderService.getOrderById('')).rejects.toThrow(
        'Order ID is required'
      )
    })
  })

  describe('trackOrder', () => {
    it('should return order when email and order number match', async () => {
      const mockDbOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: null,
        status: 'shipped',
        tracking_number: '1Z999AA10123456784',
        carrier: 'UPS',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.trackOrder(
        'john.doe@example.com',
        'MW-TEST-001'
      )

      expect(result).toBeDefined()
      expect(result?.orderNumber).toBe('MW-TEST-001')
      expect(result?.trackingNumber).toBe('1Z999AA10123456784')
      expect(result?.carrier).toBe('UPS')
    })

    it('should return null when email does not match', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.trackOrder(
        'john.doe@example.com',
        'MW-TEST-001'
      )

      expect(result).toBeNull()
    })

    it('should reject invalid email', async () => {
      await expect(
        orderService.trackOrder('invalid-email', 'MW-TEST-001')
      ).rejects.toThrow('Valid email is required')
    })

    it('should reject without order ID', async () => {
      await expect(
        orderService.trackOrder('john.doe@example.com', '')
      ).rejects.toThrow('Order ID is required')
    })
  })

  describe('getAllOrders', () => {
    it('should return all orders without filters', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'MW-TEST-001',
          customer_email: 'john.doe@example.com',
          customer_name: 'John Doe',
          shipping_address: mockShippingAddress,
          items: mockOrderItems,
          subtotal: 59.98,
          shipping_cost: 10.00,
          total: 69.98,
          stripe_payment_id: 'pi_test_123',
          stripe_session_id: null,
          gelato_order_id: null,
          status: 'payment_confirmed',
          tracking_number: null,
          carrier: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getAllOrders()

      expect(result).toHaveLength(1)
      expect(result[0].orderNumber).toBe('MW-TEST-001')
    })

    it('should filter orders by status', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'MW-TEST-001',
          customer_email: 'john.doe@example.com',
          customer_name: 'John Doe',
          shipping_address: mockShippingAddress,
          items: mockOrderItems,
          subtotal: 59.98,
          shipping_cost: 10.00,
          total: 69.98,
          stripe_payment_id: 'pi_test_123',
          stripe_session_id: null,
          gelato_order_id: null,
          status: 'shipped',
          tracking_number: '1Z999AA10123456784',
          carrier: 'UPS',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getAllOrders({ status: 'shipped' })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('shipped')
    })
  })

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const mockUpdatedOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: 'gelato-123',
        status: 'printing',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedOrder,
          error: null,
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.updateOrderStatus('order-1', 'printing')

      expect(result.status).toBe('printing')
    })

    it('should update order status with tracking data', async () => {
      const mockUpdatedOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: 'gelato-123',
        status: 'shipped',
        tracking_number: '1Z999AA10123456784',
        carrier: 'UPS',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedOrder,
          error: null,
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.updateOrderStatus('order-1', 'shipped', {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      })

      expect(result.status).toBe('shipped')
      expect(result.trackingNumber).toBe('1Z999AA10123456784')
      expect(result.carrier).toBe('UPS')
    })

    it('should reject without order ID', async () => {
      await expect(
        orderService.updateOrderStatus('', 'shipped')
      ).rejects.toThrow('Order ID is required')
    })
  })

  describe('submitToGelato', () => {
    it('should submit order to Gelato successfully', async () => {
      const mockOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: null,
        status: 'payment_confirmed',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      // Mock getOrderById
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
      }

      // Mock update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      // Mock Gelato service
      ;(gelatoService.createOrder as jest.Mock).mockResolvedValue({
        orderId: 'gelato-123',
        orderReferenceId: 'MW-TEST-001',
        status: 'pending',
      })

      await orderService.submitToGelato('order-1')

      expect(gelatoService.createOrder).toHaveBeenCalled()
    })

    it('should reject if order not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      await expect(orderService.submitToGelato('nonexistent')).rejects.toThrow(
        'Order not found'
      )
    })

    it('should reject if order status is not payment_confirmed', async () => {
      const mockOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: null,
        gelato_order_id: null,
        status: 'shipped',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      await expect(orderService.submitToGelato('order-1')).rejects.toThrow(
        'Order cannot be submitted to Gelato'
      )
    })
  })
})
