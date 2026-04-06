// Central export for all types
export * from './product'
export * from './order'
export * from './cart'
export * from './gelato'
export * from './database'

// Additional utility types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  error: string
  message: string
  details?: Record<string, any>
}

// Webhook types
export interface WebhookLog {
  id: string
  source: 'stripe' | 'gelato'
  eventType: string
  eventId?: string
  payload: any
  processed: boolean
  error?: string
  createdAt: string
}

export interface CreateWebhookLogData {
  source: 'stripe' | 'gelato'
  eventType: string
  eventId?: string
  payload: any
}

// User types
export interface User {
  id: string
  email: string
  role: 'admin'
  createdAt: string
  updatedAt: string
}

// Dashboard metrics
export interface DashboardMetrics {
  totalSales: number
  totalOrders: number
  totalProducts: number
  totalRevenue: number
}

// Dashboard API response
export interface DashboardResponse {
  metrics: DashboardMetrics
  products: DashboardProduct[]
  orders: DashboardOrder[]
  timestamp: string
  errors?: string[]
  error?: string
}

// Dashboard product (subset of full Product type)
export interface DashboardProduct {
  id: string
  name: string
  price: number
  published: boolean
  gelato_product_uid: string
  created_at: string
  images: string[]
}

// Dashboard order (subset of full Order type)
export interface DashboardOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
  items: any[]
}

// File upload types
export interface FileUploadResult {
  url: string
  path: string
  size: number
}

export interface FileValidationResult {
  valid: boolean
  errors?: string[]
}

// Checkout types
export interface CheckoutData {
  cartItems: CartItem[]
  customerEmail: string
  shippingAddress: ShippingAddress
}

export interface CheckoutSessionData extends CheckoutData {
  successUrl: string
  cancelUrl: string
  automaticTax?: boolean // Enable Stripe automatic tax calculation
}

// Import types from other files for re-export
import type { Order, OrderItem, OrderStatus, ShippingAddress } from './order'
import type { CartItem } from './cart'
