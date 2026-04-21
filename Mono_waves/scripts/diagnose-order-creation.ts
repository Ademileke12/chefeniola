/**
 * Diagnose Order Creation Issues
 * 
 * Checks if orders are being created properly after payment
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function diagnoseOrderCreation() {
  console.log('🔍 Diagnosing Order Creation Issues\n')

  try {
    // Check recent orders
    console.log('1. Checking recent orders...')
    const { data: recentOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError)
    } else {
      console.log(`✅ Found ${recentOrders?.length || 0} recent orders`)
      recentOrders?.forEach((order) => {
        console.log(`   - Order ${order.order_number}:`)
        console.log(`     Session ID: ${order.stripe_session_id || 'MISSING'}`)
        console.log(`     Status: ${order.status}`)
        console.log(`     Created: ${order.created_at}`)
      })
    }

    // Check webhook logs
    console.log('\n2. Checking recent webhook logs...')
    const { data: webhookLogs, error: webhookError } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .eq('source', 'stripe')
      .order('created_at', { ascending: false })
      .limit(10)

    if (webhookError) {
      console.error('❌ Error fetching webhook logs:', webhookError)
    } else {
      console.log(`✅ Found ${webhookLogs?.length || 0} recent webhook logs`)
      webhookLogs?.forEach((log) => {
        console.log(`   - Event: ${log.event_type}`)
        console.log(`     Event ID: ${log.event_id}`)
        console.log(`     Processed: ${log.processed}`)
        console.log(`     Error: ${log.error || 'None'}`)
        console.log(`     Created: ${log.created_at}`)
      })
    }

    // Check for orders without session IDs
    console.log('\n3. Checking for orders without session IDs...')
    const { data: ordersWithoutSession, error: noSessionError } = await supabaseAdmin
      .from('orders')
      .select('order_number, created_at')
      .is('stripe_session_id', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (noSessionError) {
      console.error('❌ Error checking orders:', noSessionError)
    } else {
      if (ordersWithoutSession && ordersWithoutSession.length > 0) {
        console.log(`⚠️  Found ${ordersWithoutSession.length} orders without session IDs:`)
        ordersWithoutSession.forEach((order) => {
          console.log(`   - ${order.order_number} (${order.created_at})`)
        })
      } else {
        console.log('✅ All orders have session IDs')
      }
    }

    // Check audit events
    console.log('\n4. Checking recent audit events...')
    const { data: auditEvents, error: auditError } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .in('event_type', ['payment.completed', 'order.created', 'payment.duplicate_prevented'])
      .order('timestamp', { ascending: false })
      .limit(10)

    if (auditError) {
      console.error('❌ Error fetching audit events:', auditError)
    } else {
      console.log(`✅ Found ${auditEvents?.length || 0} recent audit events`)
      auditEvents?.forEach((event) => {
        console.log(`   - ${event.event_type}`)
        console.log(`     Correlation ID: ${event.correlation_id}`)
        console.log(`     Severity: ${event.severity}`)
        console.log(`     Metadata:`, JSON.stringify(event.metadata, null, 2))
      })
    }

    console.log('\n✅ Diagnosis complete!')
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  }
}

diagnoseOrderCreation()
