/**
 * Fix Order Size and Color
 * 
 * This script updates existing orders that have empty size/color fields
 * by fetching the available variants from the products table.
 * 
 * Since we don't know which specific variant the customer selected,
 * we'll use the first available variant as a reasonable default.
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

async function fixOrderSizeColor() {
  console.log('🔧 Fixing Order Size and Color Fields\n')

  // Fetch all orders with empty size/color
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

    // Check if any items have empty size/color
    const needsUpdate = items.some(item => !item.size || !item.color)
    
    if (!needsUpdate) {
      console.log(`✅ Order ${order.order_number} - already has size/color`)
      continue
    }

    console.log(`\n🔍 Processing order ${order.order_number}:`)

    // Update each item with missing size/color
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.size && item.color) {
          console.log(`  ✅ Item ${item.productName} - already has size/color`)
          return item
        }

        console.log(`  🔧 Item ${item.productName} - fetching variants...`)

        // Fetch product variants
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('variants')
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

        // Use the first variant as default
        const defaultVariant = variants[0]
        
        console.log(`  ✅ Using variant: ${defaultVariant.size} / ${defaultVariant.color}`)

        return {
          ...item,
          size: defaultVariant.size,
          color: defaultVariant.color,
        }
      })
    )

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

  console.log(`\n✅ Fixed ${updatedCount} orders`)
}

fixOrderSizeColor().catch(console.error)
