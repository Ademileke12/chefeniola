export interface Order {
  id: string
  orderNumber: string
  customerEmail: string
  customerName: string
  shippingAddress: ShippingAddress
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  stripePaymentId: string
  stripeSessionId?: string
  gelatoOrderId?: string
  status: OrderStatus
  trackingNumber?: string
  carrier?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  productName: string
  size: string
  color: string
  quantity: number
  price: number
  designUrl: string
  gelatoProductUid: string
}

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'submitted_to_gelato'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export interface ShippingAddress {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postCode: string
  country: string
  phone: string
}

export interface CreateOrderData {
  customerEmail: string
  stripePaymentId: string
  stripeSessionId: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  tax: number
  total: number
}

export interface OrderFilters {
  status?: OrderStatus
  search?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface TrackingData {
  trackingNumber: string
  carrier: string
}
