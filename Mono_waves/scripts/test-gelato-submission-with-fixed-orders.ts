/**
 * Test Gelato Submission with Fixed Orders
 * 
 * This script attempts to submit the fixed orders to Gelato
 * to verify the design URL fix works
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { orderService } from '../lib/services/orderService'
import { supabaseAdmin } from '../lib/supabase/server'

async function testGelatoSubmission() {
  console.log('🧪 Testing Gelato Submission with Fixed Orders\n')
  
  // Get orders that need Gelato submission
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status, items')
    .in('status', ['payment_confirmed', 'failed'])
    .is('gelato_order_id', null)
  
  if (error) {
    console.error('❌ Error fetching orders:', error)
    return
  }
  
  if (!orders || orders.length === 0) {
    console.log('✅ No orders need Gelato submission')
    return
  }
  
  console.log(`Found ${orders.length} orders to submit:\n`)
  
  for (const order of orders) {
    console.log(`\n📦 Order: ${order.order_number}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Items: ${order.items?.length || 0}`)
    
    // Check if items have design URLs
    const items = order.items as any[]
    const missingDesignUrls = items.filter(item => !item.designUrl)
    
    if (missingDesignUrls.length > 0) {
      console.log(`   ⚠️  ${missingDesignUrls.length} items missing design URLs`)
      console.log(`   ⏭️  Skipping this order`)
      continue
    }
    
    console.log(`   ✅ All items have design URLs`)
    
    // Check if design URLs are accessible
    let allAccessible = true
    for (const item of items) {
      try {
        const response = await fetch(item.designUrl, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000) 
        })
        if (!response.ok) {
          console.log(`   ⚠️  Design URL not accessible: ${item.designUrl}`)
          allAccessible = false
        }
      } catch (error) {
        console.log(`   ⚠️  Design URL not accessible: ${item.designUrl}`)
        allAccessible = false
      }
    }
    
    if (!allAccessible) {
      console.log(`   ⚠️  Some design URLs are not accessible`)
      console.log(`   💡 This will cause Gelato submission to fail`)
      console.log(`   💡 Replace placeholder URLs with real design files`)
      console.log(`   ⏭️  Skipping submission for now`)
      continue
    }
    
    // Attempt Gelato submission
    console.log(`   🚀 Attempting Gelato submission...`)
    
    try {
      await orderService.submitToGelato(order.id)
      console.log(`   ✅ Successfully submitted to Gelato!`)
    } catch (error) {
      console.error(`   ❌ Gelato submission failed:`)
      console.error(`      ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Log validation errors if available
      if (error instanceof Error && error.message.includes('validation')) {
        console.log(`\n   📋 Validation Details:`)
        console.log(`      ${error.message}`)
      }
    }
  }
  
  console.log('\n\n📊 Summary:')
  console.log('If submissions failed due to inaccessible design URLs:')
  console.log('1. Upload real design files to Supabase Storage or a CDN')
  console.log('2. Update products with real design URLs')
  console.log('3. Run fix-existing-orders-design-urls.ts again')
  console.log('4. Run this test script again')
  console.log('\nIf submissions succeeded:')
  console.log('✅ The fix is working! Orders are being submitted to Gelato.')
}

testGelatoSubmission()
  .then(() => {
    console.log('\n✅ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
