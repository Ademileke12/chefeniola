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
 * Filters for clothing categories only: Me n's, Women's, Kids & Baby
 * 
 * Requirements: 1.2, 2.1
 */
export async function getProductCatalog(): Promise<GelatoProductDetails[]> {
  // TEST_MODE: Return mock product catalog
  if (isTestMode()) {
    console.log('🧪 TEST_MODE: Returning mock product catalog')
    
    const mockProducts: GelatoProductDetails[] = [
      {
        productUid: 'test-tshirt-001',
        attributes: {
          GarmentCategory: 'T-Shirts',
          GarmentSubcategory: 'Crew Neck',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-hoodie-001',
        attributes: {
          GarmentCategory: 'Hoodies',
          GarmentSubcategory: 'Pullover',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-sweatshirt-001',
        attributes: {
          GarmentCategory: 'Sweatshirts',
          GarmentSubcategory: 'Crew Neck',
          Brand: 'Test Brand',
        },
      },
    ]
    
    console.log(`✅ TEST_MODE: Returning ${mockProducts.length} mock products`)
    return mockProducts
  }

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

    // Filter out only truly irrelevant products (not entire product categories)
    const excludeKeywords = [
      'gift card', 'voucher',
      'sample pack', 'test product',
      'discontinued', 'legacy'
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

  // TEST_MODE: Return mock product details
  if (isTestMode()) {
    console.log(`🧪 TEST_MODE: Returning mock product details for ${productUid}`)
    
    const mockProduct: GelatoProductDetails = {
      productUid: productUid,
      attributes: {
        GarmentCategory: 'T-Shirts',
        GarmentSubcategory: 'Crew Neck',
        Brand: 'Test Brand',
        Material: '100% Cotton',
      },
      weight: {
        value: 150,
        measureUnit: 'g',
      },
      dimensions: [
        { name: 'length', nameFormatted: 'Length', value: '70', valueFormatted: '70 cm' },
        { name: 'width', nameFormatted: 'Width', value: '50', valueFormatted: '50 cm' },
      ],
      supportedCountries: ['US', 'GB', 'CA', 'AU'],
    }
    
    console.log('✅ TEST_MODE: Mock product details returned')
    return mockProduct
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
 * Fetch expanded product catalog from Gelato with minimal filtering
 * Returns 50+ unique product types including hats, bags, mugs, posters, stickers, phone cases
 * 
 * Requirements: 1.1, 1.4, 1.5, 7.1, 7.2
 */
export async function getExpandedProductCatalog(): Promise<GelatoProductDetails[]> {
  // TEST_MODE: Return expanded mock product catalog
  if (isTestMode()) {
    console.log('🧪 TEST_MODE: Returning expanded mock product catalog')
    
    const mockProducts: GelatoProductDetails[] = [
      {
        productUid: 'test-tshirt-001',
        attributes: {
          GarmentCategory: 'T-Shirts',
          GarmentSubcategory: 'Crew Neck',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-hoodie-001',
        attributes: {
          GarmentCategory: 'Hoodies',
          GarmentSubcategory: 'Pullover',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-sweatshirt-001',
        attributes: {
          GarmentCategory: 'Sweatshirts',
          GarmentSubcategory: 'Crew Neck',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-hat-001',
        attributes: {
          GarmentCategory: 'Hats',
          GarmentSubcategory: 'Baseball Cap',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-bag-001',
        attributes: {
          GarmentCategory: 'Bags',
          GarmentSubcategory: 'Tote Bag',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-mug-001',
        attributes: {
          GarmentCategory: 'Mugs',
          GarmentSubcategory: 'Ceramic Mug',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-poster-001',
        attributes: {
          GarmentCategory: 'Posters',
          GarmentSubcategory: 'Art Print',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-sticker-001',
        attributes: {
          GarmentCategory: 'Stickers',
          GarmentSubcategory: 'Die Cut',
          Brand: 'Test Brand',
        },
      },
      {
        productUid: 'test-phonecase-001',
        attributes: {
          GarmentCategory: 'Phone Cases',
          GarmentSubcategory: 'iPhone Case',
          Brand: 'Test Brand',
        },
      },
    ]
    
    console.log(`✅ TEST_MODE: Returning ${mockProducts.length} mock products`)
    return mockProducts
  }

  try {
    // Fetch all products from Gelato using the correct endpoint
    console.log('Fetching all products from Gelato API...')
    
    const allProducts: GelatoProductDetails[] = []
    
    // Use the correct GET endpoint for fetching products with higher limit
    // Gelato API supports limit parameter (max 500)
    const productsResponse = await gelatoFetch<{ products: GelatoProductDetails[] }>(
      GELATO_PRODUCT_API_BASE_URL,
      '/v3/products?limit=500',
      {
        method: 'GET'
      }
    )

    if (productsResponse.products && productsResponse.products.length > 0) {
      console.log(`✓ Found ${productsResponse.products.length} products from Gelato API`)
      allProducts.push(...productsResponse.products)
    }

    if (allProducts.length === 0) {
      console.warn('⚠ No products fetched from Gelato API')
      return []
    }

    // Apply minimal filtering - only exclude truly irrelevant products
    const excludeKeywords = [
      'gift card', 'voucher',
      'sample pack', 'test product',
      'discontinued', 'legacy'
    ]

    const filteredProducts = allProducts.filter(product => {
      const productText = `${product.productUid}`.toLowerCase()
      const productType = product.productTypeUid?.toLowerCase() || ''
      const productName = product.productNameUid?.toLowerCase() || ''

      // Exclude products with unwanted keywords
      const hasExcludeKeyword = excludeKeywords.some(keyword =>
        productText.includes(keyword) || productType.includes(keyword) || productName.includes(keyword)
      )

      return !hasExcludeKeyword
    })

    // Deduplicate products by UID
    const uniqueProducts = Array.from(
      new Map(filteredProducts.map(product => [product.productUid, product])).values()
    )

    console.log(`✓ Filtered ${uniqueProducts.length} unique products from ${allProducts.length} total products`)

    return uniqueProducts
  } catch (error) {
    console.error('Failed to fetch expanded Gelato product catalog:', error)
    throw error
  }
}

/**
 * Submit order to Gelato (alias for createOrder for test compatibility)
 */
export async function submitOrder(orderData: GelatoOrderData): Promise<GelatoOrderResponse> {
  return createOrder(orderData)
}

/**
 * Gelato service object for easier imports
 */
export const gelatoService = {
  getProductCatalog,
  getProductDetails,
  createOrder,
  submitOrder,
  getOrderStatus,
  getExpandedProductCatalog,
}
