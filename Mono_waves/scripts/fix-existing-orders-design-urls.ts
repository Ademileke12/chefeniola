/**
 * Fix Existing Orders Design URLs
 * 
 * This script updates existing orders that have null design URLs
 * by fetching the design URLs from the products table
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function fixExistingOrdersDesignUrls() {
  console.log('🔧 Fixing Existing Orders Design URLs\n')
  
  // Get all orders with payment_confirmed or failed status
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, items, status')
    .in('status', ['payment_confirmed', 'failed'])
  
  if (error) {
    console.error('❌ Error fetching orders:', error)
    return
  }
  
  console.log(`Found ${orders?.length || 0} orders to check\n`)
  
  let updated = 0
  let skipped = 0
  let failed = 0
  
  for (const order of orders || []) {
    const items = order.items as any[]
    
    // Check if any items have placeholder URLs or missing design URLs
    const needsUpdate = items.some(item => 
      !item.designUrl || 
      item.designUrl === null || 
      item.designUrl.includes('via.placeholder.com')
    )
    
    if (!needsUpdate) {
      console.log(`✓ ${order.order_number}: All items have real design URLs`)
      skipped++
      continue
    }
    
    console.log(`\n🔄 Processing ${order.order_number}...`)
    
    // Update each item with design URL from products table
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        // Always fetch the latest design URL from products table
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('design_url, gelato_product_uid')
          .eq('id', item.productId)
          .single()
        
        if (productError || !product) {
          console.error(`  ❌ Product not found: ${item.productId}`)
          return item
        }
        
        // Check if we're updating from placeholder
        if (item.designUrl && item.designUrl.includes('via.placeholder.com')) {
          console.log(`  ✅ Updated ${item.productName || 'Product'} from placeholder to real URL`)
        } else if (!item.designUrl) {
          console.log(`  ✅ Added design URL to ${item.productName || 'Product'}`)
        } else {
          console.log(`  ✅ Updated ${item.productName || 'Product'} with latest design URL`)
        }
        
        return {
          ...item,
          designUrl: product.design_url,
          gelatoProductUid: item.gelatoProductUid || product.gelato_product_uid,
        }
      })
    )
    
    // Update order with new items
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ items: updatedItems })
      .eq('id', order.id)
    
    if (updateError) {
      console.error(`  ❌ Error updating order ${order.order_number}:`, updateError.message)
      failed++
    } else {
      console.log(`  ✅ Order ${order.order_number} updated successfully`)
      updated++
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`  Total orders checked: ${orders?.length || 0}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped (already had design URLs): ${skipped}`)
  console.log(`  Failed: ${failed}`)
  
  if (updated > 0) {
    console.log('\n✅ Orders updated successfully!')
    console.log('\n💡 Next steps:')
    console.log('1. Go to admin panel → Orders')
    console.log('2. Find the orders that were updated')
    console.log('3. Click "Submit to Gelato" or "Retry Gelato Submission"')
    console.log('4. Verify the submission succeeds')
  }
}

fixExistingOrdersDesignUrls()
  .then(() => {
    console.log('\n✅ Script complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
