/**
 * Test Product UID Validation
 * 
 * Tests the product UID validation against real Gelato API
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { validateProductUid } from '../lib/utils/productUidValidator'
import { gelatoService } from '../lib/services/gelatoService'

async function testValidation() {
  console.log('🧪 Testing Product UID Validation\n')

  // First, get a real product UID from the catalog
  console.log('1️⃣ Fetching product catalog...')
  const catalog = await gelatoService.getProductCatalog()
  console.log(`   ✅ Found ${catalog.length} products\n`)

  if (catalog.length === 0) {
    console.log('❌ No products in catalog')
    return
  }

  // Test with a valid UID
  const validUid = catalog[0].productUid
  console.log(`2️⃣ Testing VALID UID: ${validUid}`)
  const validResult = await validateProductUid(validUid)
  console.log(`   Result: ${validResult.isValid ? '✅ VALID' : '❌ INVALID'}`)
  if (validResult.productDetails) {
    console.log(`   Product UID: ${validResult.productDetails.productUid}`)
    console.log(`   Attributes:`, Object.keys(validResult.productDetails.attributes).slice(0, 3).join(', '))
  }
  console.log('')

  // Test with an invalid UID
  const invalidUid = 'invalid-product-uid-12345'
  console.log(`3️⃣ Testing INVALID UID: ${invalidUid}`)
  const invalidResult = await validateProductUid(invalidUid)
  console.log(`   Result: ${invalidResult.isValid ? '✅ VALID' : '❌ INVALID'}`)
  if (invalidResult.error) {
    console.log(`   Error: ${invalidResult.error}`)
  }
  console.log('')

  // Test with empty UID
  console.log(`4️⃣ Testing EMPTY UID`)
  const emptyResult = await validateProductUid('')
  console.log(`   Result: ${emptyResult.isValid ? '✅ VALID' : '❌ INVALID'}`)
  if (emptyResult.error) {
    console.log(`   Error: ${emptyResult.error}`)
  }
  console.log('')

  console.log('✨ Validation tests complete!')
}

testValidation().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
