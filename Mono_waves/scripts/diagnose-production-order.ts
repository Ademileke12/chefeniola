/**
 * Diagnostic script to check production order lookup issue
 * 
 * This script helps diagnose why orders aren't being found by session ID in production
 */

import { supabaseAdmin } from '../lib/supabase/server'

const SESSION_ID = 'cs_test_b1bVftYs6KjGJBn6ZwL3y99wPOqHCYsC0pMV3HvgOQGZouRkNGuDsgvU9J'

async function diagnoseProductionOrder() {
  console.log('🔍 Diagnosing Production Order Lookup Issue')
  console.log('=' .repeat(60))
  console.log(`Session ID: ${SESSION_ID}`)
  console.log('')

  try {
    // 1. Check if stripe_session_id column exists
    console.log('1️⃣  Checking if stripe_session_id column exists...')
    const { data: columns, error: columnError } = await supabaseAdmin
      .from('orders')
      .select('stripe_session_id')
      .limit(1)

    if (columnError) {
      console.error('❌ Column check failed:', columnError.message)
      console.log('   → Migration 013 might not be applied in production')
      console.log('   → Run: npm run migrate:013')
    } else {
      console.log('✅ stripe_session_id column exists')
    }
    console.log('')

    // 2. Try to find order by session ID
    console.log('2️⃣  Looking for order with session ID...')
    const { data: orderBySession, error: sessionError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('stripe_session_id', SESSION_ID)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        console.log('⚠️  No order found with this session ID')
      } else {
        console.error('❌ Query error:', sessionError.message)
      }
    } else {
      console.log('✅ Order found!')
      console.log('   Order Number:', orderBySession.order_number)
      console.log('   Customer:', orderBySession.customer_email)
      console.log('   Status:', orderBySession.status)
      console.log('   Created:', orderBySession.created_at)
    }
    console.log('')

    // 3. Check all recent orders
    console.log('3️⃣  Checking recent orders (last 10)...')
    const { data: recentOrders, error: recentError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_email, stripe_session_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('❌ Failed to fetch recent orders:', recentError.message)
    } else if (!recentOrders || recentOrders.length === 0) {
      console.log('⚠️  No orders found in database')
      console.log('   → This might be a fresh production database')
      console.log('   → Try creating a test order')
    } else {
      console.log(`✅ Found ${recentOrders.length} recent orders:`)
      recentOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.order_number}`)
        console.log(`      Email: ${order.customer_email}`)
        console.log(`      Session: ${order.stripe_session_id || 'N/A'}`)
        console.log(`      Status: ${order.status}`)
        console.log(`      Created: ${order.created_at}`)
        console.log('')
      })
    }

    // 4. Check webhook logs
    console.log('4️⃣  Checking webhook logs for this session...')
    const { data: webhookLogs, error: webhookError } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .ilike('payload::text', `%${SESSION_ID}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (webhookError) {
      console.error('❌ Failed to fetch webhook logs:', webhookError.message)
    } else if (!webhookLogs || webhookLogs.length === 0) {
      console.log('⚠️  No webhook logs found for this session')
      console.log('   → The webhook might not have been triggered')
      console.log('   → Check Stripe dashboard for webhook delivery status')
    } else {
      console.log(`✅ Found ${webhookLogs.length} webhook log(s):`)
      webhookLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Event: ${log.event_type}`)
        console.log(`      Processed: ${log.processed ? 'Yes' : 'No'}`)
        console.log(`      Error: ${log.error || 'None'}`)
        console.log(`      Created: ${log.created_at}`)
        console.log('')
      })
    }

    console.log('=' .repeat(60))
    console.log('📋 Summary:')
    console.log('')
    console.log('Possible issues:')
    console.log('1. Test session ID (cs_test_*) used in production')
    console.log('   → Use live Stripe keys and real payment in production')
    console.log('')
    console.log('2. Migration 013 not applied')
    console.log('   → Run migration to add stripe_session_id column')
    console.log('')
    console.log('3. Webhook not configured or not firing')
    console.log('   → Check Stripe webhook configuration')
    console.log('   → Verify webhook endpoint URL')
    console.log('')
    console.log('4. Order creation failed')
    console.log('   → Check webhook logs for errors')
    console.log('   → Check application logs in Vercel')

  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
  }
}

// Run diagnostic
diagnoseProductionOrder()
  .then(() => {
    console.log('\n✅ Diagnostic complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic error:', error)
    process.exit(1)
  })
