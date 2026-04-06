// Database table types matching the Supabase schema
// These types represent the raw database structure

export interface DatabaseUser {
  id: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

export interface DatabaseProduct {
  id: string
  name: string
  description: string | null
  price: number
  gelato_product_id: string
  gelato_product_uid: string
  variants: any // JSONB - [{ size, color, variantId }]
  design_file_url: string | null
  images: string[]
  sizes: string[] | null // Deprecated
  colors: any | null // JSONB - Deprecated
  design_url: string | null // Deprecated
  design_data: any | null // JSONB - Serialized DesignState for design editor
  mockup_urls: any | null // JSONB - Deprecated
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseOrder {
  id: string
  order_number: string
  customer_email: string
  customer_name: string
  shipping_address: any // JSONB
  items: any // JSONB
  subtotal: number
  shipping_cost: number
  tax: number
  total: number
  stripe_payment_id: string
  stripe_session_id: string | null
  gelato_order_id: string | null
  status: string
  tracking_number: string | null
  carrier: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseCart {
  id: string
  session_id: string
  items: any // JSONB
  created_at: string
  updated_at: string
  expires_at: string
}

export interface DatabaseWebhookLog {
  id: string
  source: string
  event_type: string
  event_id: string | null
  payload: any // JSONB
  processed: boolean
  error: string | null
  created_at: string
}

export interface DatabaseSupportTicket {
  id: string
  email: string
  name: string | null
  category: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseStoreSettings {
  id: string
  key: string
  value: any // JSONB
  created_at: string
  updated_at: string
}

// Type guards for runtime validation
export function isDatabaseProduct(obj: any): obj is DatabaseProduct {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.gelato_product_uid === 'string' &&
    (Array.isArray(obj.variants) || typeof obj.variants === 'object') &&
    typeof obj.published === 'boolean'
  )
}

export function isDatabaseOrder(obj: any): obj is DatabaseOrder {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.order_number === 'string' &&
    typeof obj.customer_email === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.total === 'number'
  )
}

export function isDatabaseCart(obj: any): obj is DatabaseCart {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.session_id === 'string' &&
    typeof obj.items !== undefined
  )
}
