/**
 * Diagnose Email Issue
 * 
 * Check why confirmation email wasn't sent for recent order
 */

import { supabaseAdmin } from '../lib/supabase/server'

async function diagnoseEmailIssue() {
  console.log('🔍 Diagnosing Email Issue\n')

  // Get the most recent order
  console.log('1️⃣ Fetching most recent order...')
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (ordersError) {
    console.error('❌ Failed to fetch orders:', ordersError.message)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️  No orders found')
    return
  }

  const order = orders[0]
  console.log('✅ Found order:', order.order_number)
  console.log('   Customer email:', order.customer_email)
  console.log('   Created at:', new Date(order.created_at).toLocaleString())
  console.log('   Status:', order.status)
  console.log()

  // Check webhook logs for this order's session
  console.log('2️⃣ Checking webhook logs...')
  const { data: webhookLogs, error: webhookError } = await supabaseAdmin
    .from('webhook_logs')
    .select('*')
    .eq('event_type', 'checkout.session.completed')
    .order('created_at', { ascending: false })
    .limit(5)

  if (webhookError) {
    console.error('❌ Failed to fetch webhook logs:', webhookError.message)
  } else if (webhookLogs && webhookLogs.length > 0) {
    console.log(`✅ Found ${webhookLogs.length} recent webhook logs:`)
    webhookLogs.forEach((log, index) => {
      console.log(`\n   Webhook ${index + 1}:`)
      console.log('   Event ID:', log.event_id)
      console.log('   Processed:', log.processed)
      console.log('   Error:', log.error || 'None')
      console.log('   Created:', new Date(log.created_at).toLocaleString())
    })
  } else {
    console.log('⚠️  No webhook logs found')
  }
  console.log()

  // Check audit events for email-related events
  console.log('3️⃣ Checking audit events for email activity...')
  const { data: auditEvents, error: auditError } = await supabaseAdmin
    .from('audit_events')
    .select('*')
    .or('event_type.eq.order.created,event_type.eq.payment.completed,event_type.like.%email%')
    .order('created_at', { ascending: false })
    .limit(10)

  if (auditError) {
    console.error('❌ Failed to fetch audit events:', auditError.message)
  } else if (auditEvents && auditEvents.length > 0) {
    console.log(`✅ Found ${auditEvents.length} relevant audit events:`)
    auditEvents.forEach((event, index) => {
      console.log(`\n   Event ${index + 1}:`)
      console.log('   Type:', event.event_type)
      console.log('   Severity:', event.severity)
      console.log('   Source:', event.source)
      console.log('   Created:', new Date(event.created_at).toLocaleString())
      if (event.metadata) {
        console.log('   Metadata:', JSON.stringify(event.metadata, null, 2))
      }
    })
  } else {
    console.log('⚠️  No relevant audit events found')
  }
  console.log()

  // Check environment variables
  console.log('4️⃣ Checking email configuration...')
  const resendApiKey = process.env.RESEND_API_KEY
  const senderEmail = process.env.SENDER_EMAIL
  const supportEmail = process.env.SUPPORT_EMAIL

  console.log('   RESEND_API_KEY:', resendApiKey ? `Set (${resendApiKey.substring(0, 10)}...)` : '❌ NOT SET')
  console.log('   SENDER_EMAIL:', senderEmail || '❌ NOT SET')
  console.log('   SUPPORT_EMAIL:', supportEmail || '❌ NOT SET')
  console.log()

  // Recommendations
  console.log('📋 Recommendations:')
  if (!resendApiKey) {
    console.log('   ❌ RESEND_API_KEY is not set - emails cannot be sent')
  }
  if (!senderEmail) {
    console.log('   ⚠️  SENDER_EMAIL not set - using default: orders@monowaves.com')
  }
  if (!supportEmail) {
    console.log('   ⚠️  SUPPORT_EMAIL not set - using default: support@monowaves.com')
  }

  console.log('\n💡 Next Steps:')
  console.log('   1. Check server logs for email errors during webhook processing')
  console.log('   2. Verify Resend API key is valid')
  console.log('   3. Check if email was caught in spam folder')
  console.log('   4. Test email service manually: npx tsx scripts/test-resend-email.ts')
}

diagnoseEmailIssue().catch(console.error)
