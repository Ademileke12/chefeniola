/**
 * Fix Product Design URLs - Immediate Fix
 * 
 * This script updates all products without design URLs to use their first mockup URL
 * or a placeholder if no mockup URLs exist.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function fixProductDesignUrls() {
  console.log('🔧 Fixing Product Design URLs\n')
  
  // Get all products
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, mockup_urls, gelato_product_uid, design_url')
  
  if (error) {
    console.error('❌ Error fetching products:', error)
    return
  }
  
  console.log(`Found ${products?.length || 0} total products\n`)
  
  const productsWithoutDesignUrl = products?.filter(p => !p.design_url) || []
  console.log(`${productsWithoutDesignUrl.length} products need design URLs\n`)
  
  if (productsWithoutDesignUrl.length === 0) {
    console.log('✅ All products already have design URLs!')
    return
  }
  
  let updated = 0
  let failed = 0
  
  for (const product of productsWithoutDesignUrl) {
    let designUrl: string | null = null
    
    // Try to use first mockup URL as design URL
    if (product.mockup_urls && Array.isArray(product.mockup_urls) && product.mockup_urls.length > 0) {
      designUrl = product.mockup_urls[0]
      console.log(`Using mockup URL for ${product.name}`)
    } else {
      // Use a placeholder design URL
      // This creates a simple placeholder image with the product name
      designUrl = `https://via.placeholder.com/800x1000.png?text=${encodeURIComponent(product.name || 'Product')}`
      console.log(`Using placeholder for ${product.name}`)
    }
    
    // Update product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ design_url: designUrl })
      .eq('id', product.id)
    
    if (updateError) {
      console.error(`  ❌ Error updating product ${product.id}:`, updateError.message)
      failed++
    } else {
      console.log(`  ✅ Updated: ${product.name}`)
      console.log(`     Design URL: ${designUrl}\n`)
      updated++
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`  Total products: ${products?.length || 0}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Already had design URLs: ${(products?.length || 0) - productsWithoutDesignUrl.length}`)
  
  if (updated > 0) {
    console.log('\n✅ Products updated successfully!')
    console.log('\n💡 Next steps:')
    console.log('1. Try submitting the failed orders to Gelato again from the admin panel')
    console.log('2. Create a test order to verify the fix works')
    console.log('3. Update the product creation form to require design URLs')
  }
}

fixProductDesignUrls()
  .then(() => {
    console.log('\n✅ Script complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
