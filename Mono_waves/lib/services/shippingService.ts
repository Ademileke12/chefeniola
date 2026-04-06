/**
 * Shipping Service
 * 
 * Handles shipping cost calculation using Gelato API with:
 * - Real-time shipping quotes from Gelato
 * - 5-minute caching to reduce API calls
 * - $10 fallback for API failures
 * 
 * Requirements: 5.1, 5.2, 5.5
 */

const GELATO_PRODUCT_API_BASE_URL = 'https://product.gelatoapis.com'
const FALLBACK_SHIPPING_COST = 10.00
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Request data for shipping cost calculation
 */
export interface ShippingCostRequest {
  items: Array<{
    productUid: string
    quantity: number
  }>
  shippingAddress: {
    country: string
    state: string
    postCode: string
  }
}

/**
 * Response data from shipping cost calculation
 */
export interface ShippingCostResponse {
  cost: number
  currency: string
  estimatedDays: number
  method: string
}

/**
 * Cached shipping quote
 */
interface CachedQuote {
  response: ShippingCostResponse
  timestamp: number
}

/**
 * In-memory cache for shipping quotes
 * Key format: "productUid1:qty1,productUid2:qty2|country|state|postCode"
 */
const shippingCache = new Map<string, CachedQuote>()

/**
 * Get Gelato API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.GELATO_API_KEY
  if (!apiKey) {
    throw new Error('GELATO_API_KEY is not configured')
  }
  return apiKey
}

/**
 * Generate cache key from request data
 */
function getCacheKey(request: ShippingCostRequest): string {
  const itemsKey = request.items
    .map(item => `${item.productUid}:${item.quantity}`)
    .sort()
    .join(',')
  
  const addressKey = `${request.shippingAddress.country}|${request.shippingAddress.state}|${request.shippingAddress.postCode}`
  
  return `${itemsKey}|${addressKey}`
}

/**
 * Get cached shipping quote if available and not expired
 */
function getCachedQuote(cacheKey: string): ShippingCostResponse | null {
  const cached = shippingCache.get(cacheKey)
  
  if (!cached) {
    return null
  }
  
  const now = Date.now()
  const age = now - cached.timestamp
  
  if (age > CACHE_DURATION_MS) {
    // Cache expired, remove it
    shippingCache.delete(cacheKey)
    return null
  }
  
  return cached.response
}

/**
 * Store shipping quote in cache
 */
function setCachedQuote(cacheKey: string, response: ShippingCostResponse): void {
  shippingCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  })
}

/**
 * Query Gelato API for shipping cost
 * 
 * Requirements: 5.1, 5.2
 */
async function queryGelatoShippingCost(
  request: ShippingCostRequest
): Promise<ShippingCostResponse> {
  const apiKey = getApiKey()
  
  // Gelato shipping quote API endpoint
  const endpoint = '/v4/shipping/quotes'
  
  // Build request payload
  const payload = {
    items: request.items.map(item => ({
      productUid: item.productUid,
      quantity: item.quantity
    })),
    destination: {
      country: request.shippingAddress.country,
      state: request.shippingAddress.state,
      postCode: request.shippingAddress.postCode
    }
  }
  
  const response = await fetch(`${GELATO_PRODUCT_API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gelato shipping API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    throw new Error(`Gelato shipping API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  // Parse Gelato response
  // Gelato returns shipping options, we'll use the first/cheapest one
  if (!data.shippingOptions || data.shippingOptions.length === 0) {
    throw new Error('No shipping options returned from Gelato')
  }
  
  const option = data.shippingOptions[0]
  
  return {
    cost: option.price?.amount || FALLBACK_SHIPPING_COST,
    currency: option.price?.currency || 'USD',
    estimatedDays: option.estimatedDeliveryDays || 10,
    method: option.methodName || 'Standard Shipping'
  }
}

/**
 * Get shipping cost with caching and fallback
 * 
 * This is the main public method that should be used.
 * It implements:
 * - 5-minute caching to reduce API calls
 * - $10 fallback for API failures
 * 
 * Requirements: 5.1, 5.2, 5.5
 */
export async function getShippingCost(
  request: ShippingCostRequest
): Promise<ShippingCostResponse> {
  // Validate request
  if (!request.items || request.items.length === 0) {
    throw new Error('At least one item is required for shipping cost calculation')
  }
  
  if (!request.shippingAddress) {
    throw new Error('Shipping address is required for shipping cost calculation')
  }
  
  // Check cache first
  const cacheKey = getCacheKey(request)
  const cachedQuote = getCachedQuote(cacheKey)
  
  if (cachedQuote) {
    console.log('Returning cached shipping quote')
    return cachedQuote
  }
  
  // Try to get quote from Gelato API
  try {
    console.log('Querying Gelato API for shipping cost')
    const quote = await queryGelatoShippingCost(request)
    
    // Cache the result
    setCachedQuote(cacheKey, quote)
    
    return quote
  } catch (error) {
    // API failed, use fallback
    console.error('Failed to get shipping cost from Gelato, using fallback:', error)
    
    const fallbackQuote: ShippingCostResponse = {
      cost: FALLBACK_SHIPPING_COST,
      currency: 'USD',
      estimatedDays: 10,
      method: 'Standard Shipping (Estimated)'
    }
    
    // Don't cache fallback quotes - we want to retry on next request
    return fallbackQuote
  }
}

/**
 * Clear the shipping cache (for testing purposes)
 */
export function clearShippingCache(): void {
  shippingCache.clear()
}

/**
 * Shipping service object for easier imports
 */
export const shippingService = {
  getShippingCost,
  clearCache: clearShippingCache
}
