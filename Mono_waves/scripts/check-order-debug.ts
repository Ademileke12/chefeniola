/**
 * Debug script to check webhook logs and orders
 */

import { supabaseAdmin } from '../lib/supabase/server'

async function checkOrderDebug() {
  const sessionId = 'cs_test_b1CTYbGE5bN8BjF1BbUWAOKqZna1gtNHrHIq5pyoiPyVfX7OSWt9EstiHQ'
  
  console.log('\n=== Checking for Session ID:', sessionId, '===\n')

  // Check webhook logs
  const { data: webhooks, error: webhookError } = await supabaseAdmin
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log('=== Recent Webhook Logs ===')
  if (webhookError) {
    console.error('Error fetching webhooks:', webhookError)
  } else if (!webhooks || webhooks.length === 0) {
    console.log('❌ No webhook logs found in database')
  } else {
    console.log(`Found ${webhooks.length} webhook logs:\n`)
    webhooks.forEach((w: any, i: number) => {
      console.log(`${i + 1}. Event: ${w.event_type}`)
      console.log(`   Event ID: ${w.event_id}`)
      console.log(`   Processed: ${w.processed}`)
      console.log(`   Error: ${w.error || 'None'}`)
      console.log(`   Created: ${w.created_at}`)
      
      // Check if this webhook contains our session ID
      const payloadStr = JSON.stringify(w.payload)
      if (payloadStr.includes(sessionId)) {
        console.log(`   ✅ CONTAINS OUR SESSION ID!`)
      }
      console.log('')
    })
  }

  // Check orders with our session ID
  const { data: orderBySession, error: sessionError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  console.log('\n=== Order with Session ID ===')
  if (sessionError) {
    if (sessionError.code === 'PGRST116') {
      console.log('❌ No order found with this session ID')
    } else {
      console.error('Error:', sessionError)
    }
  } else if (orderBySession) {
    console.log('✅ Order found!')
    console.log(`   Order Number: ${orderBySession.order_number}`)
    console.log(`   Email: ${orderBySession.customer_email}`)
    console.log(`   Status: ${orderBySession.status}`)
    console.log(`   Created: ${orderBySession.created_at}`)
  }

  // Check all recent orders
  const { data: orders, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('\n=== Recent Orders (Last 10) ===')
  if (orderError) {
    console.error('Error fetching orders:', orderError)
  } else if (!orders || orders.length === 0) {
    console.log('❌ No orders found in database')
  } else {
    console.log(`Found ${orders.length} orders:\n`)
    orders.forEach((o: any, i: number) => {
      console.log(`${i + 1}. Order: ${o.order_number}`)
      console.log(`   Email: ${o.customer_email}`)
      console.log(`   Status: ${o.status}`)
      console.log(`   Stripe Session: ${o.stripe_session_id || 'None'}`)
      console.log(`   Created: ${o.created_at}`)
      console.log('')
    })
  }
}

checkOrderDebug()
  .then(() => {
    console.log('\n✅ Debug check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Debug check failed:', error)
    process.exit(1)
  })
