/**
 * Gelato API Service
 * 
 * Handles integration with Gelato print-on-demand API for:
 * - Product catalog retrieval
 * - Product details
 * - Order creation and submission
 * - Order status tracking
 */

import type {
  GelatoOrderData,
  GelatoOrderResponse,
  GelatoOrderStatus,
  GelatoProductDetails,
} from '@/types/gelato'

const GELATO_ORDER_API_BASE_URL = 'https://order.gelatoapis.com'
const GELATO_PRODUCT_API_BASE_URL = 'https://product.gelatoapis.com'

/**
 * Check if TEST_MODE is enabled
 * In TEST_MODE, Gelato API calls are simulated without real API requests
 */
function isTestMode(): boolean {
  return process.env.GELATO_TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
}

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
 * Make authenticated request to Gelato API
 */
async function gelatoFetch<T>(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()

  // Gelato API uses X-API-KEY header with format "apiKey:apiSecret"
  // The entire key (including the colon) is passed as a single header value
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gelato API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    throw new GelatoApiError(
      `Gelato API error: ${response.status} ${response.statusText}`,
      response.status,
      errorText
    )
  }

  return response.json()
}

/**
 * Custom error class for Gelato API errors
 */
export class GelatoApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message)
    this.name = 'GelatoApiError'
  }
}

/**
 * Fetch product catalog from Gelato
 * Filters for clothing categories only: Men's, Women's, Kids & Baby
 * 
 * Requirements: 1.2, 2.1
 */
export async function getProductCatalog(): Promise<GelatoProductDetails[]> {
  try {
    // Gelato has separate catalogs for different product types
    // Fetch from multiple catalogs to get a wide variety of clothing items
    const catalogs = [
      't-shirts',
      'hoodies',
      'sweatshirts',
      'tank-tops',
      'long-sleeve-shirts',
      'polo-shirts',
      'apparel',
      'activewear',
      'kids-clothing',
      'baby-clothing'
    ]
    const allProducts: GelatoProductDetails[] = []
    let successfulCatalogs = 0
    let failedCatalogs = 0

    for (const catalogUid of catalogs) {
      try {
        console.log(`Fetching products from ${catalogUid} catalog...`)

        const productsResponse = await gelatoFetch<{ products: GelatoProductDetails[] }>(
          GELATO_PRODUCT_API_BASE_URL,
          `/v3/catalogs/${catalogUid}/products:search`,
          {
            method: 'POST',
            body: JSON.stringify({ limit: 100 })
          }
        )

        if (productsResponse.products && productsResponse.products.length > 0) {
          console.log(`  ✓ Found ${productsResponse.products.length} products in ${catalogUid}`)
          allProducts.push(...productsResponse.products)
          successfulCatalogs++
        } else {
          console.log(`  ⚠ No products found in ${catalogUid}`)
        }
      } catch (error) {
        console.error(`  ✗ Failed to fetch from ${catalogUid} catalog:`, error instanceof Error ? error.message : error)
        failedCatalogs++
        // Continue with other catalogs even if one fails
      }
    }

    console.log(`\nCatalog fetch summary: ${successfulCatalogs} successful, ${failedCatalogs} failed`)

    // Filter out hats and other accessories we don't want
    const excludeKeywords = [
      'hat', 'cap', 'beanie', 'headwear', 'bucket-hat', 'dad-hat',
      'bag', 'tote', 'backpack',
      'mug', 'cup', 'bottle',
      'poster', 'print', 'canvas',
      'sticker', 'magnet',
      'phone', 'case', 'cover'
    ]

    const clothingProducts = allProducts.filter(product => {
      const productText = `${product.productUid}`.toLowerCase()
      const category = product.attributes?.GarmentCategory?.toLowerCase() || ''
      const subcategory = product.attributes?.GarmentSubcategory?.toLowerCase() || ''

      // Exclude products with unwanted keywords
      const hasExcludeKeyword = excludeKeywords.some(keyword =>
        productText.includes(keyword) || category.includes(keyword) || subcategory.includes(keyword)
      )

      return !hasExcludeKeyword
    })

    console.log(`Filtered ${clothingProducts.length} clothing products from ${allProducts.length} total products`)
    return clothingProducts
  } catch (error) {
    console.error('Failed to fetch Gelato product catalog:', error)
    throw error
  }
}

/**
 * Get detailed information about a specific Gelato product
 * 
 * Requirements: 1.2, 2.1
 */
export async function getProductDetails(
  productUid: string
): Promise<GelatoProductDetails> {
  if (!productUid || productUid.trim() === '') {
    throw new Error('Product UID is required')
  }

  try {
    return await gelatoFetch<GelatoProductDetails>(
      GELATO_PRODUCT_API_BASE_URL,
      `/v3/products/${encodeURIComponent(productUid)}`,
      {
        method: 'GET'
      }
    )
  } catch (error) {
    console.error(`Failed to fetch Gelato product details for ${productUid}:`, error)
    throw error
  }
}

/**
 * Create an order with Gelato for fulfillment
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export async function createOrder(
  orderData: GelatoOrderData
): Promise<GelatoOrderResponse> {
  // Validate required fields
  if (!orderData.orderReferenceId) {
    throw new Error('Order reference ID is required')
  }
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must contain at least one item')
  }
  if (!orderData.shippingAddress) {
    throw new Error('Shipping address is required')
  }

  // TEST_MODE: Simulate successful order creation
  if (isTestMode()) {
    console.log('🧪 TEST_MODE: Simulating Gelato order creation')
    console.log('Order data:', JSON.stringify(orderData, null, 2))
    
    const mockOrderId = `TEST-GELATO-${Date.now()}`
    const mockResponse: GelatoOrderResponse = {
      orderId: mockOrderId,
      orderReferenceId: orderData.orderReferenceId,
      status: 'created',
    }
    
    console.log('✅ TEST_MODE: Mock order created:', mockOrderId)
    return mockResponse
  }

  try {
    const response = await gelatoFetch<GelatoOrderResponse>(
      GELATO_ORDER_API_BASE_URL,
      '/v4/orders',
      {
        method: 'POST',
        body: JSON.stringify(orderData),
      }
    )
    return response
  } catch (error) {
    console.error('Failed to create Gelato order:', error)
    throw error
  }
}

/**
 * Get the current status of a Gelato order
 * 
 * Requirements: 8.1, 8.2
 */
export async function getOrderStatus(
  gelatoOrderId: string
): Promise<GelatoOrderStatus> {
  if (!gelatoOrderId || gelatoOrderId.trim() === '') {
    throw new Error('Gelato order ID is required')
  }

  // TEST_MODE: Simulate order status
  if (isTestMode()) {
    console.log('🧪 TEST_MODE: Simulating Gelato order status check')
    
    const mockStatus: GelatoOrderStatus = {
      orderId: gelatoOrderId,
      status: 'shipped',
      trackingNumber: 'TEST-TRACK-123456789',
      carrier: 'USPS',
      items: [
        {
          itemReferenceId: 'test-item-1',
          status: 'shipped'
        }
      ]
    }
    
    console.log('✅ TEST_MODE: Mock status returned')
    return mockStatus
  }

  try {
    const response = await gelatoFetch<GelatoOrderStatus>(
      GELATO_ORDER_API_BASE_URL,
      `/v4/orders/${encodeURIComponent(gelatoOrderId)}`
    )
    return response
  } catch (error) {
    console.error(`Failed to fetch Gelato order status for ${gelatoOrderId}:`, error)
    throw error
  }
}

/**
 * Gelato service object for easier imports
 */
export const gelatoService = {
  getProductCatalog,
  getProductDetails,
  createOrder,
  getOrderStatus,
}
