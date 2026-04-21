/**
 * Fix Order Variant UIDs
 * 
 * This script updates existing orders to use variant-specific Gelato product UIDs
 * instead of base product UIDs. This is required for successful Gelato submissions.
 * 
 * Example:
 * - Base UID: t_shirt_triblend_unisex_crewneck_t_shirt
 * - Variant UID: apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_triblend_gsi_l_gco_triblend-athletic-gray_gpr_4-4
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixOrderVariantUids() {
  console.log('🔧 Fixing Order Variant UIDs\n')

  // Fetch all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError)
    return
  }

  console.log(`Found ${orders.length} orders to check\n`)

  let updatedCount = 0

  for (const order of orders) {
    const items = order.items as any[]
    
    if (!items || items.length === 0) {
      console.log(`⏭️  Skipping order ${order.order_number} - no items`)
      continue
    }

    console.log(`\n🔍 Processing order ${order.order_number}:`)

    // Update each item with the correct variant UID
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        console.log(`  📦 Item: ${item.productName}`)
        console.log(`     Current UID: ${item.gelatoProductUid}`)
        console.log(`     Size: ${item.size}, Color: ${item.color}`)

        // Fetch product with variants
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('variants, gelato_product_uid')
          .eq('id', item.productId)
          .single()

        if (productError || !product) {
          console.log(`  ❌ Could not fetch product ${item.productId}`)
          return item
        }

        const variants = product.variants as any[]
        
        if (!variants || variants.length === 0) {
          console.log(`  ⚠️  No variants found for product ${item.productId}`)
          return item
        }

        // Find the matching variant based on size and color
        const matchingVariant = variants.find(
          v => v.size === item.size && v.color === item.color
        )

        if (!matchingVariant) {
          console.log(`  ⚠️  No matching variant found for size "${item.size}" and color "${item.color}"`)
          console.log(`     Available variants:`)
          variants.forEach(v => {
            console.log(`       - ${v.size} / ${v.color}`)
          })
          // Use the first variant as fallback
          const fallbackVariant = variants[0]
          console.log(`  ⚠️  Using fallback variant: ${fallbackVariant.size} / ${fallbackVariant.color}`)
          
          return {
            ...item,
            gelatoProductUid: fallbackVariant.variantId,
            size: fallbackVariant.size,
            color: fallbackVariant.color,
          }
        }

        if (matchingVariant.variantId === item.gelatoProductUid) {
          console.log(`  ✅ Already using correct variant UID`)
          return item
        }

        console.log(`     New UID: ${matchingVariant.variantId}`)
        console.log(`  ✅ Updated to variant-specific UID`)

        return {
          ...item,
          gelatoProductUid: matchingVariant.variantId,
        }
      })
    )

    // Check if any items were updated
    const hasChanges = updatedItems.some((item, index) => 
      item.gelatoProductUid !== items[index].gelatoProductUid
    )

    if (!hasChanges) {
      console.log(`  ℹ️  No changes needed for order ${order.order_number}`)
      continue
    }

    // Update the order with new items
    const { error: updateError } = await supabase
      .from('orders')
      .update({ items: updatedItems })
      .eq('id', order.id)

    if (updateError) {
      console.log(`  ❌ Error updating order ${order.order_number}:`, updateError)
    } else {
      console.log(`  ✅ Order ${order.order_number} updated successfully`)
      updatedCount++
    }
  }

  console.log(`\n✅ Fixed ${updatedCount} orders with variant-specific UIDs`)
}

fixOrderVariantUids().catch(console.error)
