/**
 * Diagnose Gelato Submission Error
 * 
 * This script investigates why orders are failing Gelato submission
 * with "Missing design URL" errors
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function diagnoseGelatoSubmissionError() {
  console.log('🔍 Diagnosing Gelato Submission Error\n')

  // Get the specific order mentioned in the error
  const orderId = 'fb068eb4-6bd4-494f-b7df-7620815dd629'

  console.log(`Fetching order: ${orderId}`)
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error) {
    console.error('❌ Error fetching order:', error)
    return
  }

  if (!order) {
    console.error('❌ Order not found')
    return
  }

  console.log('\n📦 Order Details:')
  console.log('Order Number:', order.order_number)
  console.log('Status:', order.status)
  console.log('Customer:', order.customer_email)
  console.log('Created:', order.created_at)
  console.log('\n📋 Order Items:')
  console.log(JSON.stringify(order.items, null, 2))

  // Check each item for design URL
  console.log('\n🔍 Checking Design URLs:')
  const items = order.items as any[]
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log(`\nItem ${i + 1}:`)
    console.log('  Product Name:', item.productName || item.name)
    console.log('  Product UID:', item.gelatoProductUid || 'MISSING')
    console.log('  Design URL:', item.designUrl || 'MISSING')
    console.log('  Quantity:', item.quantity)
    console.log('  Price:', item.price)
    
    // Check if design URL exists and is valid
    if (!item.designUrl) {
      console.log('  ❌ Design URL is missing!')
    } else if (item.designUrl === 'pending-export' || item.designUrl === 'design-editor-pending-export') {
      console.log('  ⚠️  Design URL is pending export')
    } else {
      console.log('  ✅ Design URL exists')
      
      // Try to fetch the URL to verify it's accessible
      try {
        const response = await fetch(item.designUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        if (response.ok) {
          console.log('  ✅ Design URL is accessible')
        } else {
          console.log(`  ❌ Design URL returned HTTP ${response.status}`)
        }
      } catch (error) {
        console.log(`  ❌ Design URL is not accessible: ${error instanceof Error ? error.message : 'Network error'}`)
      }
    }
  }

  // Check recent orders to see if this is a pattern
  console.log('\n\n📊 Checking Recent Orders:')
  const { data: recentOrders, error: recentError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status, items, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentError) {
    console.error('❌ Error fetching recent orders:', recentError)
    return
  }

  console.log(`\nFound ${recentOrders?.length || 0} recent orders:\n`)
  
  for (const order of recentOrders || []) {
    const items = order.items as any[]
    const missingDesignUrls = items.filter(item => !item.designUrl || item.designUrl === 'pending-export' || item.designUrl === 'design-editor-pending-export')
    
    console.log(`${order.order_number} (${order.status}):`)
    console.log(`  Items: ${items.length}`)
    console.log(`  Missing/Pending Design URLs: ${missingDesignUrls.length}`)
    
    if (missingDesignUrls.length > 0) {
      console.log('  ⚠️  Has missing design URLs')
    } else {
      console.log('  ✅ All design URLs present')
    }
  }

  // Check products table to see if products have design URLs
  console.log('\n\n🏷️  Checking Products Table:')
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, design_url, mockup_url')
    .limit(10)

  if (productsError) {
    console.error('❌ Error fetching products:', productsError)
    return
  }

  console.log(`\nFound ${products?.length || 0} products:\n`)
  
  for (const product of products || []) {
    console.log(`${product.name}:`)
    console.log(`  Design URL: ${product.design_url || 'MISSING'}`)
    console.log(`  Mockup URL: ${product.mockup_url || 'MISSING'}`)
  }

  console.log('\n\n💡 Recommendations:')
  console.log('1. Check if products are being created with design URLs')
  console.log('2. Verify the Stripe webhook is correctly extracting design URLs from cart items')
  console.log('3. Check if the design export process is completing before order creation')
  console.log('4. Review the order creation flow in the Stripe webhook handler')
}

diagnoseGelatoSubmissionError()
  .then(() => {
    console.log('\n✅ Diagnosis complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnosis failed:', error)
    process.exit(1)
  })
