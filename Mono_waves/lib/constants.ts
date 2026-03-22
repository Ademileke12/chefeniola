/**
 * Application constants
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  SUBMITTED_TO_GELATO: 'submitted_to_gelato',
  PRINTING: 'printing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'application/pdf',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const CART_EXPIRY_DAYS = 7

export const DEFAULT_SHIPPING_COST = 5.99

export const CURRENCY = 'USD'

export const ITEMS_PER_PAGE = 20

export const WEBHOOK_SOURCES = {
  STRIPE: 'stripe',
  GELATO: 'gelato',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
} as const

export const PRODUCT_SORT_OPTIONS = {
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NEWEST: 'newest',
  NAME: 'name',
} as const

export const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

// Validation constants
export const MIN_PRODUCT_PRICE = 0.01
export const MAX_PRODUCT_PRICE = 10000
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 100
export const MIN_PRODUCT_NAME_LENGTH = 1
export const MAX_PRODUCT_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 2000
