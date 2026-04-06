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
    stripeSessionId: 'cs_test_123',
    items: mockOrderItems,
    shippingAddress: mockShippingAddress,
    tax: 0,
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
        tax: 0,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: 'cs_test_123',
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

    it('should create order with tax amount', async () => {
      const orderDataWithTax: CreateOrderData = {
        ...mockCreateOrderData,
        tax: 5.25,
        total: 75.23,
      }

      const mockDbOrder = {
        id: 'order-2',
        order_number: 'MW-TEST-002',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 5.25,
        total: 75.23,
        stripe_payment_id: 'pi_test_456',
        stripe_session_id: 'cs_test_456',
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

      const result = await orderService.createOrder(orderDataWithTax)

      expect(result).toBeDefined()
      expect(result.tax).toBe(5.25)
      expect(result.total).toBe(75.23)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 5.25,
        })
      )
    })

    it('should create order with zero tax when tax is not provided', async () => {
      const orderDataNoTax: CreateOrderData = {
        ...mockCreateOrderData,
        tax: 0,
      }

      const mockDbOrder = {
        id: 'order-3',
        order_number: 'MW-TEST-003',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 0,
        total: 69.98,
        stripe_payment_id: 'pi_test_789',
        stripe_session_id: 'cs_test_789',
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

      const result = await orderService.createOrder(orderDataNoTax)

      expect(result).toBeDefined()
      expect(result.tax).toBe(0)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 0,
        })
      )
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
        stripeSessionId: 'cs_test_123',
        items: mockOrderItems,
        shippingAddress: mockShippingAddress,
        tax: 0,
        total: 69.98,
      }

      await expect(orderService.createOrder(invalidData)).rejects.toThrow(
        'Stripe payment ID is required'
      )
    })

    it('should reject order without stripe session ID', async () => {
      const invalidData: CreateOrderData = {
        customerEmail: 'john.doe@example.com',
        stripePaymentId: 'pi_test_123',
        stripeSessionId: '',
        items: mockOrderItems,
        shippingAddress: mockShippingAddress,
        tax: 0,
        total: 69.98,
      }

      await expect(orderService.createOrder(invalidData)).rejects.toThrow(
        'Stripe session ID is required'
      )
    })

    it('should reject order without items', async () => {
      const invalidData: CreateOrderData = {
        customerEmail: 'john.doe@example.com',
        stripePaymentId: 'pi_test_123',
        stripeSessionId: 'cs_test_123',
        items: [],
        shippingAddress: mockShippingAddress,
        tax: 0,
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
        tax: 0,
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

  describe('getOrderBySessionId', () => {
    it('should return order when session ID matches', async () => {
      const mockDbOrder = {
        id: 'order-1',
        order_number: 'MW-TEST-001',
        customer_email: 'john.doe@example.com',
        customer_name: 'John Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 0,
        total: 69.98,
        stripe_payment_id: 'pi_test_123',
        stripe_session_id: 'cs_test_123',
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

      const result = await orderService.getOrderBySessionId('cs_test_123')

      expect(result).toBeDefined()
      expect(result?.stripeSessionId).toBe('cs_test_123')
      expect(result?.orderNumber).toBe('MW-TEST-001')
    })

    it('should return order with tax amount when session ID matches', async () => {
      const mockDbOrder = {
        id: 'order-2',
        order_number: 'MW-TEST-002',
        customer_email: 'jane.doe@example.com',
        customer_name: 'Jane Doe',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 5.25,
        total: 75.23,
        stripe_payment_id: 'pi_test_456',
        stripe_session_id: 'cs_test_456',
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

      const result = await orderService.getOrderBySessionId('cs_test_456')

      expect(result).toBeDefined()
      expect(result?.stripeSessionId).toBe('cs_test_456')
      expect(result?.tax).toBe(5.25)
      expect(result?.total).toBe(75.23)
      expect(result?.subtotal).toBe(59.98)
      expect(result?.shippingCost).toBe(10.00)
    })

    it('should return null when session ID not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getOrderBySessionId('nonexistent')

      expect(result).toBeNull()
    })

    it('should reject without session ID', async () => {
      await expect(orderService.getOrderBySessionId('')).rejects.toThrow(
        'Session ID is required'
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
        tax: 0,
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
          tax: 0,
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
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockOrders, error: null, count: 1 }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getAllOrders()

      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].orderNumber).toBe('MW-TEST-001')
      expect(result.total).toBe(1)
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
          tax: 0,
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
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockOrders, error: null, count: 1 }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.getAllOrders({ status: 'shipped' })

      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].status).toBe('shipped')
      expect(result.total).toBe(1)
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
        tax: 0,
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
        tax: 0,
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
        tax: 0,
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
        tax: 0,
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

  describe('Tax Handling', () => {
    it('should store and retrieve tax amount correctly', async () => {
      const orderDataWithTax: CreateOrderData = {
        ...mockCreateOrderData,
        tax: 8.75,
        total: 78.73,
      }

      const mockDbOrder = {
        id: 'order-tax-1',
        order_number: 'MW-TAX-001',
        customer_email: 'tax.test@example.com',
        customer_name: 'Tax Test',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 8.75,
        total: 78.73,
        stripe_payment_id: 'pi_tax_123',
        stripe_session_id: 'cs_tax_123',
        gelato_order_id: null,
        status: 'payment_confirmed',
        tracking_number: null,
        carrier: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbOrder, error: null }),
      }

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockDbOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce(mockInsertQuery)
        .mockReturnValueOnce(mockSelectQuery)

      // Create order with tax
      const createdOrder = await orderService.createOrder(orderDataWithTax)
      expect(createdOrder.tax).toBe(8.75)

      // Retrieve order by session ID and verify tax is preserved
      const retrievedOrder = await orderService.getOrderBySessionId('cs_tax_123')
      expect(retrievedOrder).toBeDefined()
      expect(retrievedOrder?.tax).toBe(8.75)
      expect(retrievedOrder?.total).toBe(78.73)
    })

    it('should handle orders with different tax amounts', async () => {
      const testCases = [
        { tax: 0, total: 69.98, description: 'zero tax' },
        { tax: 3.50, total: 73.48, description: 'low tax' },
        { tax: 10.25, total: 80.23, description: 'high tax' },
        { tax: 0.01, total: 69.99, description: 'minimal tax' },
      ]

      for (const testCase of testCases) {
        const orderData: CreateOrderData = {
          ...mockCreateOrderData,
          tax: testCase.tax,
          total: testCase.total,
        }

        const mockDbOrder = {
          id: `order-${testCase.tax}`,
          order_number: `MW-TEST-${testCase.tax}`,
          customer_email: 'john.doe@example.com',
          customer_name: 'John Doe',
          shipping_address: mockShippingAddress,
          items: mockOrderItems,
          subtotal: 59.98,
          shipping_cost: 10.00,
          tax: testCase.tax,
          total: testCase.total,
          stripe_payment_id: `pi_test_${testCase.tax}`,
          stripe_session_id: `cs_test_${testCase.tax}`,
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

        const result = await orderService.createOrder(orderData)

        expect(result.tax).toBe(testCase.tax)
        expect(result.total).toBe(testCase.total)
      }
    })

    it('should retrieve order with tax by session ID for confirmation page', async () => {
      const mockDbOrder = {
        id: 'order-confirm-1',
        order_number: 'MW-CONFIRM-001',
        customer_email: 'confirm.test@example.com',
        customer_name: 'Confirm Test',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 6.50,
        total: 76.48,
        stripe_payment_id: 'pi_confirm_123',
        stripe_session_id: 'cs_confirm_123',
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

      const result = await orderService.getOrderBySessionId('cs_confirm_123')

      expect(result).toBeDefined()
      expect(result?.tax).toBe(6.50)
      expect(result?.subtotal).toBe(59.98)
      expect(result?.shippingCost).toBe(10.00)
      expect(result?.total).toBe(76.48)
      // Verify tax is included in total calculation (use toBeCloseTo for floating point)
      const calculatedTotal = (result?.subtotal || 0) + (result?.shippingCost || 0) + (result?.tax || 0)
      expect(calculatedTotal).toBeCloseTo(result?.total || 0, 2)
    })

    it('should preserve tax amount through order status updates', async () => {
      const mockOrder = {
        id: 'order-update-1',
        order_number: 'MW-UPDATE-001',
        customer_email: 'update.test@example.com',
        customer_name: 'Update Test',
        shipping_address: mockShippingAddress,
        items: mockOrderItems,
        subtotal: 59.98,
        shipping_cost: 10.00,
        tax: 7.25,
        total: 77.23,
        stripe_payment_id: 'pi_update_123',
        stripe_session_id: 'cs_update_123',
        gelato_order_id: null,
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
        single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
      }

      ;(supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await orderService.updateOrderStatus('order-update-1', 'shipped', {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      })

      expect(result.tax).toBe(7.25)
      expect(result.total).toBe(77.23)
      expect(result.status).toBe('shipped')
    })
  })

  describe('getCarrierTrackingUrl', () => {
    it('should generate USPS tracking URL', () => {
      const trackingNumber = '9400111899562537866033'
      const url = orderService.getCarrierTrackingUrl('USPS', trackingNumber)
      
      expect(url).toBe(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`)
    })

    it('should generate USPS tracking URL with case-insensitive carrier name', () => {
      const trackingNumber = '9400111899562537866033'
      const url = orderService.getCarrierTrackingUrl('usps', trackingNumber)
      
      expect(url).toBe(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`)
    })

    it('should generate UPS tracking URL', () => {
      const trackingNumber = '1Z999AA10123456784'
      const url = orderService.getCarrierTrackingUrl('UPS', trackingNumber)
      
      expect(url).toBe(`https://www.ups.com/track?tracknum=${trackingNumber}`)
    })

    it('should generate UPS tracking URL with case-insensitive carrier name', () => {
      const trackingNumber = '1Z999AA10123456784'
      const url = orderService.getCarrierTrackingUrl('ups', trackingNumber)
      
      expect(url).toBe(`https://www.ups.com/track?tracknum=${trackingNumber}`)
    })

    it('should generate FedEx tracking URL', () => {
      const trackingNumber = '123456789012'
      const url = orderService.getCarrierTrackingUrl('FedEx', trackingNumber)
      
      expect(url).toBe(`https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`)
    })

    it('should generate FedEx tracking URL with case-insensitive carrier name', () => {
      const trackingNumber = '123456789012'
      const url = orderService.getCarrierTrackingUrl('fedex', trackingNumber)
      
      expect(url).toBe(`https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`)
    })

    it('should generate DHL tracking URL', () => {
      const trackingNumber = '1234567890'
      const url = orderService.getCarrierTrackingUrl('DHL', trackingNumber)
      
      expect(url).toBe(`https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`)
    })

    it('should generate DHL tracking URL with case-insensitive carrier name', () => {
      const trackingNumber = '1234567890'
      const url = orderService.getCarrierTrackingUrl('dhl', trackingNumber)
      
      expect(url).toBe(`https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`)
    })

    it('should handle carrier names with extra text (e.g., "USPS Ground")', () => {
      const trackingNumber = '9400111899562537866033'
      const url = orderService.getCarrierTrackingUrl('USPS Ground', trackingNumber)
      
      expect(url).toBe(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`)
    })

    it('should handle carrier names with extra text (e.g., "UPS Next Day Air")', () => {
      const trackingNumber = '1Z999AA10123456784'
      const url = orderService.getCarrierTrackingUrl('UPS Next Day Air', trackingNumber)
      
      expect(url).toBe(`https://www.ups.com/track?tracknum=${trackingNumber}`)
    })

    it('should generate generic search URL for unknown carrier', () => {
      const carrier = 'Unknown Carrier'
      const trackingNumber = 'ABC123XYZ'
      const url = orderService.getCarrierTrackingUrl(carrier, trackingNumber)
      
      expect(url).toBe(`https://www.google.com/search?q=${encodeURIComponent(carrier + ' tracking ' + trackingNumber)}`)
    })

    it('should handle special characters in tracking number for unknown carrier', () => {
      const carrier = 'Custom Carrier'
      const trackingNumber = 'ABC-123-XYZ'
      const url = orderService.getCarrierTrackingUrl(carrier, trackingNumber)
      
      expect(url).toContain('https://www.google.com/search?q=')
      expect(decodeURIComponent(url)).toContain('Custom Carrier tracking ABC-123-XYZ')
    })
  })
})
