#!/usr/bin/env tsx

/**
 * Check for duplicate stripe_session_id values in orders table
 * This must be run before migration 013 to ensure the unique index can be created
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate stripe_session_id values...\n')

  try {
    // Get all orders with session IDs
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, stripe_session_id, created_at')
      .not('stripe_session_id', 'is', null)
      .order('stripe_session_id')

    if (error) {
      throw error
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders with session IDs found')
      return
    }

    console.log(`📊 Found ${orders.length} orders with session IDs`)

    // Find duplicates
    const sessionMap = new Map<string, typeof orders>()
    
    for (const order of orders) {
      const sessionId = order.stripe_session_id!
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, [])
      }
      sessionMap.get(sessionId)!.push(order)
    }

    const duplicates = Array.from(sessionMap.entries())
      .filter(([_, orders]) => orders.length > 1)

    if (duplicates.length === 0) {
      console.log('✅ No duplicate session IDs found')
      console.log('✅ Safe to proceed with migration 013')
      return
    }

    console.log(`\n⚠️  Found ${duplicates.length} duplicate session IDs:\n`)

    for (const [sessionId, orders] of duplicates) {
      console.log(`Session ID: ${sessionId}`)
      console.log(`  Orders (${orders.length}):`)
      for (const order of orders) {
        console.log(`    - ${order.order_number} (${order.id}) - ${order.created_at}`)
      }
      console.log()
    }

    console.log('❌ Cannot proceed with migration 013 until duplicates are resolved')
    console.log('\nRecommended actions:')
    console.log('1. Review the duplicate orders above')
    console.log('2. Determine which orders are legitimate')
    console.log('3. Delete or update duplicate orders')
    console.log('4. Re-run this script to verify')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

checkDuplicates()
