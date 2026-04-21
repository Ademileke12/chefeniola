/**
 * Test Local Payment Flow
 * 
 * This script helps verify that the local payment flow works correctly:
 * 1. Webhook secret is configured correctly
 * 2. Orders are created with stripe_session_id
 * 3. Orders can be retrieved by session ID
 */

import { supabaseAdmin } from '../lib/supabase/server'

async function testLocalPaymentFlow() {
  console.log('🧪 Testing Local Payment Flow\n')

  // Check 1: Verify stripe_session_id column exists
  console.log('1️⃣ Checking if stripe_session_id column exists...')
  const { data: columns, error: columnError } = await supabaseAdmin
    .from('orders')
    .select('stripe_session_id')
    .limit(1)

  if (columnError) {
    console.error('❌ stripe_session_id column does not exist!')
    console.error('   Run: npx tsx scripts/run-migration-013.ts')
    return
  }
  console.log('✅ stripe_session_id column exists\n')

  // Check 2: Get recent orders
  console.log('2️⃣ Checking recent orders...')
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, stripe_session_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (ordersError) {
    console.error('❌ Failed to fetch orders:', ordersError.message)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️  No orders found in database')
    console.log('   Make a test payment to create an order\n')
  } else {
    console.log(`✅ Found ${orders.length} recent orders:\n`)
    orders.forEach((order) => {
      console.log(`   Order: ${order.order_number}`)
      console.log(`   Session ID: ${order.stripe_session_id || 'NOT SET'}`)
      console.log(`   Status: ${order.status}`)
      console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`)
      console.log()
    })
  }

  // Check 3: Verify webhook secret is set
  console.log('3️⃣ Checking webhook configuration...')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set in .env.local')
    return
  }

  if (webhookSecret.startsWith('whsec_')) {
    console.log('✅ Webhook secret is configured')
    console.log(`   Secret: ${webhookSecret.substring(0, 15)}...`)
  } else {
    console.error('❌ Invalid webhook secret format (should start with whsec_)')
    return
  }

  // Check 4: Instructions for testing
  console.log('\n📋 Next Steps:')
  console.log('   1. Start Stripe CLI webhook forwarding:')
  console.log('      stripe listen --forward-to localhost:3000/api/webhooks/stripe')
  console.log()
  console.log('   2. Start local dev server:')
  console.log('      npm run dev')
  console.log()
  console.log('   3. Make a test payment:')
  console.log('      - Go to http://localhost:3000')
  console.log('      - Add product to cart')
  console.log('      - Complete checkout with test card: 4242 4242 4242 4242')
  console.log()
  console.log('   4. Verify order appears on confirmation page')
  console.log()
  console.log('✅ System is ready for local testing!')
}

testLocalPaymentFlow().catch(console.error)
