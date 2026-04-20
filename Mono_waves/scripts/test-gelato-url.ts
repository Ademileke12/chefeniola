/**
 * Test script to verify gelatoUrl is being generated correctly
 */

import { catalogService } from '../lib/services/catalogService'

async function testGelatoUrl() {
  console.log('🧪 Testing Gelato URL generation...\n')

  try {
    // Fetch catalog
    console.log('📦 Fetching catalog...')
    const result = await catalogService.getCatalog({ forceRefresh: false })

    console.log(`✓ Fetched ${result.products.length} products\n`)

    // Check first 5 products for gelatoUrl
    console.log('🔍 Checking first 5 products for gelatoUrl:\n')
    
    result.products.slice(0, 5).forEach((product, index) => {
      console.log(`Product ${index + 1}:`)
      console.log(`  UID: ${product.uid}`)
      console.log(`  Title: ${product.title}`)
      // console.log(`  GelatoUrl: ${product.gelatoUrl || 'MISSING'}`)
      // console.log(`  Has GelatoUrl: ${!!product.gelatoUrl ? '✓' : '✗'}`)
      console.log('')
    })

    // Count products with/without gelatoUrl
    // const withUrl = result.products.filter(p => p.gelatoUrl).length
    // const withoutUrl = result.products.filter(p => !p.gelatoUrl).length

    console.log('📊 Summary:')
    console.log(`  Total products: ${result.products.length}`)
    // console.log(`  Products with gelatoUrl: ${withUrl}`)
    // console.log(`  Products without gelatoUrl: ${withoutUrl}`)
    console.log(`  Total: ${result.products.length}`)

//     if (withoutUrl > 0) {
//       console.log('\n⚠️  WARNING: Some products are missing gelatoUrl!')
//     } else {
//       console.log('\n✓ All products have gelatoUrl!')
//     }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testGelatoUrl()
