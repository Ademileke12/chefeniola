/**
 * Diagnostic Script: Order Not Found Issue
 * 
 * This script helps diagnose why orders are not being found by session ID
 * in production. It checks:
 * 1. If the order exists in the database
 * 2. If the session ID is stored correctly
 * 3. If there are any webhook logs for this session
 * 4. Recent orders to see the pattern
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseOrderIssue(sessionId: string) {
  console.log('='.repeat(80))
  console.log('ORDER DIAGNOSTIC REPORT')
  console.log('='.repeat(80))
  console.log(`Session ID: ${sessionId}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(80))
  console.log()

  // 1. Check if order exists with this session ID
  console.log('1. CHECKING FOR ORDER WITH SESSION ID...')
  const { data: orderBySession, error: sessionError } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  if (sessionError) {
    if (sessionError.code === 'PGRST116') {
      console.log('   ❌ NO ORDER FOUND with this session ID')
    } else {
      console.log('   ❌ ERROR:', sessionError.message)
    }
  } else {
    console.log('   ✅ ORDER FOUND!')
    console.log('   Order Number:', orderBySession.order_number)
    console.log('   Order ID:', orderBySession.id)
    console.log('   Customer Email:', orderBySession.customer_email)
    console.log('   Status:', orderBySession.status)
    console.log('   Created At:', orderBySession.created_at)
    console.log('   Stripe Session ID:', orderBySession.stripe_session_id)
  }
  console.log()

  // 2. Check webhook logs for this session
  console.log('2. CHECKING WEBHOOK LOGS...')
  const { data: webhookLogs, error: webhookError } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('source', 'stripe')
    .order('created_at', { ascending: false })
    .limit(20)

  if (webhookError) {
    console.log('   ❌ ERROR fetching webhook logs:', webhookError.message)
  } else {
    console.log(`   Found ${webhookLogs.length} recent Stripe webhooks`)
    
    // Look for webhooks related to this session
    const relatedWebhooks = webhookLogs.filter(log => {
      const payload = log.payload as any
      return payload?.id === sessionId || 
             payload?.checkout_session === sessionId ||
             JSON.stringify(payload).includes(sessionId)
    })

    if (relatedWebhooks.length > 0) {
      console.log(`   ✅ Found ${relatedWebhooks.length} webhook(s) related to this session:`)
      relatedWebhooks.forEach(log => {
        console.log(`      - Event: ${log.event_type}`)
        console.log(`        Event ID: ${log.event_id}`)
        console.log(`        Processed: ${log.processed}`)
        console.log(`        Created: ${log.created_at}`)
        if (log.error) {
          console.log(`        Error: ${log.error}`)
        }
      })
    } else {
      console.log('   ⚠️  NO webhooks found related to this session')
      console.log('   Recent webhook events:')
      webhookLogs.slice(0, 5).forEach(log => {
        console.log(`      - ${log.event_type} (${log.created_at})`)
      })
    }
  }
  console.log()

  // 3. Check recent orders
  console.log('3. CHECKING RECENT ORDERS...')
  const { data: recentOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, customer_email, stripe_session_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (ordersError) {
    console.log('   ❌ ERROR fetching recent orders:', ordersError.message)
  } else {
    console.log(`   Found ${recentOrders.length} recent orders:`)
    recentOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.order_number}`)
      console.log(`      Email: ${order.customer_email}`)
      console.log(`      Session ID: ${order.stripe_session_id || 'NULL'}`)
      console.log(`      Status: ${order.status}`)
      console.log(`      Created: ${order.created_at}`)
    })
  }
  console.log()

  // 4. Check if there are any orders without session IDs
  console.log('4. CHECKING FOR ORDERS WITHOUT SESSION IDs...')
  const { data: ordersWithoutSession, error: noSessionError } = await supabase
    .from('orders')
    .select('id, order_number, created_at')
    .is('stripe_session_id', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (noSessionError) {
    console.log('   ❌ ERROR:', noSessionError.message)
  } else {
    if (ordersWithoutSession.length > 0) {
      console.log(`   ⚠️  Found ${ordersWithoutSession.length} orders without session IDs:`)
      ordersWithoutSession.forEach(order => {
        console.log(`      - ${order.order_number} (${order.created_at})`)
      })
    } else {
      console.log('   ✅ All recent orders have session IDs')
    }
  }
  console.log()

  // 5. Summary and recommendations
  console.log('='.repeat(80))
  console.log('DIAGNOSIS SUMMARY')
  console.log('='.repeat(80))
  
  if (orderBySession) {
    console.log('✅ Order exists in database')
    console.log('   The issue may be with the API endpoint or frontend code.')
  } else {
    console.log('❌ Order NOT found in database')
    console.log()
    console.log('POSSIBLE CAUSES:')
    console.log('1. Webhook not received from Stripe')
    console.log('2. Webhook received but failed to process')
    console.log('3. Order creation failed during webhook processing')
    console.log('4. Session ID mismatch or incorrect format')
    console.log()
    console.log('RECOMMENDED ACTIONS:')
    console.log('1. Check Stripe dashboard for webhook delivery status')
    console.log('2. Check application logs for webhook processing errors')
    console.log('3. Verify webhook endpoint is accessible from Stripe')
    console.log('4. Check if webhook secret is configured correctly')
  }
  console.log('='.repeat(80))
}

// Get session ID from command line or use default
const sessionId = process.argv[2] || 'cs_test_a1PDvC4s3Y6pIr1aBHpnAQprmCpJK8oFk7j1MSGaHs4wdD1hkdpvWMmSfK'

diagnoseOrderIssue(sessionId)
  .then(() => {
    console.log('\nDiagnostic complete.')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Diagnostic failed:', error)
    process.exit(1)
  })
