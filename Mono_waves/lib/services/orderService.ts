/**
 * Order Service
 * 
 * Handles order management including:
 * - Order creation after payment
 * - Order retrieval and tracking
 * - Order status updates
 * - Gelato order submission
 * 
 * Requirements: 7.4, 8.1, 9.2, 9.3, 12.1
 */

import { supabaseAdmin } from '../supabase/server'
import { gelatoService } from './gelatoService'
import { logger } from '../logger'
import { convertToISO, validateAndConvert } from '../utils/countryCodeConverter'
import type {
  Order,
  OrderItem,
  CreateOrderData,
  OrderFilters,
  OrderStatus,
  TrackingData,
  ShippingAddress,
} from '@/types/order'
import type { DatabaseOrder } from '@/types/database'
import type { GelatoOrderData, GelatoOrderItem } from '@/types/gelato'

/**
 * Convert database order to application order
 */
function toOrder(dbOrder: DatabaseOrder): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    customerEmail: dbOrder.customer_email,
    customerName: dbOrder.customer_name,
    shippingAddress: dbOrder.shipping_address as ShippingAddress,
    items: dbOrder.items as OrderItem[],
    subtotal: Number(dbOrder.subtotal),
    shippingCost: Number(dbOrder.shipping_cost),
    tax: Number(dbOrder.tax),
    total: Number(dbOrder.total),
    stripePaymentId: dbOrder.stripe_payment_id,
    stripeSessionId: dbOrder.stripe_session_id || undefined,
    gelatoOrderId: dbOrder.gelato_order_id || undefined,
    status: dbOrder.status as OrderStatus,
    trackingNumber: dbOrder.tracking_number || undefined,
    carrier: dbOrder.carrier || undefined,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
  }
}

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `MW-${timestamp}-${random}`
}

/**
 * Calculate subtotal from order items
 */
function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Calculate estimated delivery date (7-10 business days from order date)
 * 
 * Requirements: 1.3
 */
export function calculateEstimatedDelivery(orderDate: Date | string): string {
  const date = typeof orderDate === 'string' ? new Date(orderDate) : orderDate
  
  // Add 7-10 business days (we'll use 8 days as the middle estimate)
  let businessDaysToAdd = 8
  let currentDate = new Date(date)
  
  while (businessDaysToAdd > 0) {
    currentDate.setDate(currentDate.getDate() + 1)
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysToAdd--
    }
  }
  
  // Format as readable date string
  return currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Create order after successful payment
 * 
 * Requirements: 7.4
 */
export async function createOrder(data: CreateOrderData): Promise<Order> {
  // Validate required fields
  if (!data.customerEmail || !data.customerEmail.includes('@')) {
    throw new Error('Valid customer email is required')
  }
  if (!data.stripePaymentId) {
    throw new Error('Stripe payment ID is required')
  }
  if (!data.stripeSessionId) {
    throw new Error('Stripe session ID is required')
  }
  if (!data.items || data.items.length === 0) {
    throw new Error('Order must contain at least one item')
  }
  if (!data.shippingAddress) {
    throw new Error('Shipping address is required')
  }

  // Calculate subtotal and validate total
  const subtotal = calculateSubtotal(data.items)
  const shippingCost = 10.00 // Fixed shipping cost for now
  const tax = data.tax || 0
  const calculatedTotal = subtotal + shippingCost + tax

  // Generate order number
  const orderNumber = generateOrderNumber()

  // Extract customer name from shipping address
  const customerName = `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`

  // Create order in database
  const { data: created, error } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_email: data.customerEmail,
      customer_name: customerName,
      shipping_address: data.shippingAddress,
      items: data.items,
      subtotal,
      shipping_cost: shippingCost,
      tax,
      total: data.total,
      stripe_payment_id: data.stripePaymentId,
      stripe_session_id: data.stripeSessionId,
      status: 'payment_confirmed',
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create order', error)
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return toOrder(created)
}

/**
 * Get order by ID
 * 
 * Requirements: 9.3, 12.1
 */
export async function getOrderById(id: string): Promise<Order | null> {
  if (!id) {
    throw new Error('Order ID is required')
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch order: ${error.message}`)
  }

  return data ? toOrder(data) : null
}

/**
 * Get order by Stripe session ID (for confirmation page)
 * 
 * Requirements: 4.5
 */
export async function getOrderBySessionId(sessionId: string): Promise<Order | null> {
  if (!sessionId) {
    throw new Error('Session ID is required')
  }

  console.log('[OrderService] Querying order by session ID:', sessionId)

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn('[OrderService] No order found for session ID:', sessionId)
      return null // Not found
    }
    console.error('[OrderService] Database error:', error)
    throw new Error(`Failed to fetch order by session ID: ${error.message}`)
  }

  if (data) {
    console.log('[OrderService] Order found:', data.order_number)
  }

  return data ? toOrder(data) : null
}

/**
 * Track order by email and order ID (guest tracking)
 * 
 * Requirements: 9.2, 9.3
 */
export async function trackOrder(
  email: string,
  orderId: string
): Promise<Order | null> {
  // Validate inputs
  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required')
  }
  if (!orderId) {
    throw new Error('Order ID is required')
  }

  // Query by order number (which is what users see) and email
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('order_number', orderId)
    .eq('customer_email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found or email doesn't match
    }
    throw new Error(`Failed to track order: ${error.message}`)
  }

  return data ? toOrder(data) : null
}

/**
 * Get all orders with optional filters (admin)
 * 
 * Requirements: 12.1
 */
export async function getAllOrders(filters?: OrderFilters): Promise<{ orders: Order[]; total: number }> {
  let query = supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  // Apply date range filters
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  // Apply search filter (search in order number, customer email, customer name)
  if (filters?.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    )
  }

  // Apply pagination (default: page 1, 50 per page)
  const page = filters?.page || 1
  const pageSize = filters?.pageSize || 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return { orders: (data || []).map(toOrder), total: count || 0 }
}

/**
 * Update order status and tracking information
 * 
 * Requirements: 10.3, 10.4, 10.5
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  trackingData?: TrackingData
): Promise<Order> {
  if (!id) {
    throw new Error('Order ID is required')
  }
  if (!status) {
    throw new Error('Order status is required')
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Add tracking information if provided
  if (trackingData) {
    updateData.tracking_number = trackingData.trackingNumber
    updateData.carrier = trackingData.carrier
  }

  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`)
  }

  return toOrder(updated)
}

/**
 * Validation result for Gelato order submission
 */
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate order before submitting to Gelato
 * Checks all required fields and verifies data integrity
 * 
 * Requirements: 8.1, 8.2
 */
async function validateOrderForGelato(order: Order): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check order has items
  if (!order.items || order.items.length === 0) {
    errors.push('Order has no items')
    return { isValid: false, errors, warnings }
  }

  // Check each item
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i]
    const itemLabel = `Item ${i + 1} (${item.productName})`

    // Check product UID
    if (!item.gelatoProductUid) {
      errors.push(`${itemLabel}: Missing Gelato product UID`)
    }

    // Check design URL
    if (!item.designUrl) {
      errors.push(`${itemLabel}: Missing design URL`)
    } else if (item.designUrl === 'pending-export' || item.designUrl === 'design-editor-pending-export') {
      errors.push(`${itemLabel}: Design not exported yet`)
    } else {
      // Verify URL is accessible
      try {
        const response = await fetch(item.designUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (!response.ok) {
          errors.push(`${itemLabel}: Design URL not accessible (HTTP ${response.status})`)
        }
      } catch (error) {
        errors.push(`${itemLabel}: Design URL not accessible (${error instanceof Error ? error.message : 'Network error'})`)
      }
    }

    // Check quantity
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`${itemLabel}: Invalid quantity`)
    }
  }

  // Check shipping address
  if (!order.shippingAddress) {
    errors.push('Missing shipping address')
    return { isValid: false, errors, warnings }
  }

  const addr = order.shippingAddress
  if (!addr.firstName) errors.push('Shipping address: Missing first name')
  if (!addr.lastName) errors.push('Shipping address: Missing last name')
  if (!addr.addressLine1) errors.push('Shipping address: Missing address line 1')
  if (!addr.city) errors.push('Shipping address: Missing city')
  if (!addr.state) errors.push('Shipping address: Missing state')
  if (!addr.postCode) errors.push('Shipping address: Missing postal code')
  if (!addr.country) {
    errors.push('Shipping address: Missing country')
  } else {
    // Validate country code
    const countryValidation = validateAndConvert(addr.country)
    if (!countryValidation.isValid) {
      errors.push(`Shipping address: Invalid country code "${addr.country}"`)
    } else if (countryValidation.wasConverted) {
      warnings.push(`Country will be converted from "${addr.country}" to "${countryValidation.code}"`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Submit order to Gelato for fulfillment
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export async function submitToGelato(orderId: string): Promise<void> {
  if (!orderId) {
    throw new Error('Order ID is required')
  }

  // Fetch the order
  const order = await getOrderById(orderId)
  if (!order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  // Validate order status
  if (order.status !== 'payment_confirmed') {
    throw new Error(
      `Order cannot be submitted to Gelato. Current status: ${order.status}`
    )
  }

  // Validate order data before submission
  const validation = await validateOrderForGelato(order)
  
  // Log warnings
  if (validation.warnings.length > 0) {
    logger.info('Order validation warnings:', { orderId, warnings: validation.warnings })
  }

  // Check for errors
  if (!validation.isValid) {
    const errorMessage = `Order validation failed:\n${validation.errors.join('\n')}`
    logger.error('Order validation failed', { orderId, errors: validation.errors })
    throw new Error(errorMessage)
  }

  // Validate and convert country code
  const countryValidation = validateAndConvert(order.shippingAddress.country)
  if (!countryValidation.isValid) {
    throw new Error(
      `Invalid country code: ${order.shippingAddress.country}. Could not convert to ISO format.`
    )
  }

  if (countryValidation.wasConverted) {
    logger.info(`Converted country from "${order.shippingAddress.country}" to "${countryValidation.code}"`)
  }

  // Prepare Gelato order data
  const gelatoItems: GelatoOrderItem[] = order.items.map((item, index) => ({
    itemReferenceId: `${order.orderNumber}-${index + 1}`,
    productUid: item.gelatoProductUid,
    files: [
      {
        type: 'default' as const,
        url: item.designUrl,
      },
    ],
    quantity: item.quantity,
  }))

  const gelatoOrderData: GelatoOrderData = {
    orderReferenceId: order.orderNumber,
    customerReferenceId: order.customerEmail,
    currency: 'USD',
    items: gelatoItems,
    shipmentMethodUid: 'standard', // Default shipping method
    shippingAddress: {
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      addressLine1: order.shippingAddress.addressLine1,
      addressLine2: order.shippingAddress.addressLine2,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postCode: order.shippingAddress.postCode,
      country: countryValidation.code, // Use converted ISO code
      phone: order.shippingAddress.phone,
    },
  }

  try {
    // Submit order to Gelato
    logger.info('Submitting order to Gelato', { orderId, orderNumber: order.orderNumber })
    const gelatoResponse = await gelatoService.createOrder(gelatoOrderData)
    logger.info('Order submitted to Gelato successfully', { 
      orderId, 
      gelatoOrderId: gelatoResponse.orderId 
    })

    // Update order with Gelato order ID and status
    await supabaseAdmin
      .from('orders')
      .update({
        gelato_order_id: gelatoResponse.orderId,
        status: 'submitted_to_gelato',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
  } catch (error) {
    logger.error('Failed to submit order to Gelato', { 
      orderId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })

    // Update order status to failed
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    throw new Error(
      `Failed to submit order to Gelato: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate carrier tracking URL
 * 
 * Requirements: 6.4
 */
export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const normalizedCarrier = carrier.toLowerCase()
  
  if (normalizedCarrier.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  } else if (normalizedCarrier.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`
  } else if (normalizedCarrier.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  } else if (normalizedCarrier.includes('dhl')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
  }
  
  // Default: return a generic search URL
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + ' tracking ' + trackingNumber)}`
}

/**
 * Order service object for easier imports
 */
export const orderService = {
  createOrder,
  getOrderById,
  getOrderBySessionId,
  trackOrder,
  getAllOrders,
  updateOrderStatus,
  submitToGelato,
  getCarrierTrackingUrl,
}
