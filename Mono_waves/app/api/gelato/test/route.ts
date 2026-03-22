import { NextResponse } from 'next/server'

/**
 * Test endpoint to verify Gelato API configuration
 */
export async function GET() {
  const apiKey = process.env.GELATO_API_KEY
  
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      error: 'GELATO_API_KEY environment variable is not set'
    })
  }

  try {
    // Gelato API uses X-API-KEY header with the full key (apiKey:apiSecret format)
    // Test the catalogs endpoint first
    const response = await fetch('https://product.gelatoapis.com/v3/catalogs', {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    })
    
    const data = await response.json()
    
    return NextResponse.json({
      configured: true,
      apiKeyPresent: true,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 12) + '...',
      method: 'X-API-KEY header',
      baseUrl: 'https://product.gelatoapis.com',
      endpoint: '/v3/catalogs',
      responseStatus: response.status,
      responseOk: response.ok,
      responseData: data,
    })
    
  } catch (error) {
    return NextResponse.json({
      configured: true,
      apiKeyPresent: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    })
  }
}
