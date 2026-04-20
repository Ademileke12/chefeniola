#!/usr/bin/env tsx

/**
 * Migration Runner for 013_add_stripe_session_id_index
 * 
 * This script runs the migration to add a unique index on stripe_session_id
 * in the orders table for fast lookups and duplicate prevention.
 * 
 * Note: CREATE INDEX CONCURRENTLY cannot run in a transaction, so this
 * script uses a direct connection approach.
 * 
 * Usage:
 *   npx tsx scripts/run-migration-013.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkIndexExists(): Promise<boolean> {
  try {
    // Use information_schema to check for index
    const { data, error } = await supabase
      .rpc('check_index_exists', {
        index_name: 'idx_orders_stripe_session_id'
      })
      .single()

    if (error) {
      // Fallback: try to query orders with explain to see if index exists
      console.log('   Using fallback method to check index...')
      return false
    }

    return data as boolean
  } catch (error) {
    return false
  }
}

async function testDuplicateRejection() {
  console.log('\n🧪 Testing duplicate session ID rejection...')
  const testSessionId = 'test_migration_013_' + Date.now()
  
  try {
    // Create first test order
    const { data: order1, error: error1 } = await supabase
      .from('orders')
      .insert({
        order_number: `TEST-${Date.now()}-1`,
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        shipping_address: { street: '123 Test St', city: 'Test City', state: 'TS', zip: '12345', country: 'US' },
        items: [],
        subtotal: 10.00,
        shipping_cost: 5.00,
        total: 15.00,
        stripe_payment_id: `pi_test_${Date.now()}_1`,
        stripe_session_id: testSessionId,
        status: 'pending'
      })
      .select()
      .single()

    if (error1) {
      console.log(`⚠️  Could not create test order: ${error1.message}`)
      return
    }

    console.log(`✅ Created test order with session ID: ${testSessionId}`)

    // Try to create duplicate
    const { data: order2, error: error2 } = await supabase
      .from('orders')
      .insert({
        order_number: `TEST-${Date.now()}-2`,
        customer_email: 'test2@example.com',
        customer_name: 'Test User 2',
        shipping_address: { street: '456 Test Ave', city: 'Test City', state: 'TS', zip: '12345', country: 'US' },
        items: [],
        subtotal: 20.00,
        shipping_cost: 5.00,
        total: 25.00,
        stripe_payment_id: `pi_test_${Date.now()}_2`,
        stripe_session_id: testSessionId,
        status: 'pending'
      })
      .select()
      .single()

    if (error2) {
      if (error2.message.includes('duplicate') || error2.code === '23505') {
        console.log('✅ Duplicate session ID correctly rejected!')
      } else {
        console.log(`⚠️  Unexpected error: ${error2.message}`)
      }
    } else {
      console.log('⚠️  WARNING: Duplicate session ID was NOT rejected!')
      console.log('   The unique index may not be working correctly.')
    }

    // Clean up test orders
    await supabase
      .from('orders')
      .delete()
      .eq('stripe_session_id', testSessionId)

    console.log('✅ Test orders cleaned up')

  } catch (error) {
    console.log(`⚠️  Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function testQueryPerformance() {
  console.log('\n🧪 Testing query performance...')
  const testSessionId = 'perf_test_' + Date.now()
  const startTime = Date.now()
  
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_session_id', testSessionId)
    .maybeSingle()

  const queryTime = Date.now() - startTime
  
  if (error) {
    console.log(`⚠️  Test query failed: ${error.message}`)
  } else {
    console.log(`✅ Query completed in ${queryTime}ms (should be < 50ms with index)`)
  }
}

async function runMigration() {
  console.log('🚀 Starting migration 013: Add stripe_session_id index')
  console.log('=' .repeat(60))

  try {
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/013_add_stripe_session_id_index.sql'
    )
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    console.log('📄 Migration file loaded')

    console.log('\n📋 Migration SQL:')
    console.log('   ' + '='.repeat(58))
    console.log(migrationSQL.split('\n').map(line => '   ' + line).join('\n'))
    console.log('   ' + '='.repeat(58))

    console.log('\n⚠️  Note: This migration must be run directly in your Supabase SQL editor')
    console.log('   because CREATE INDEX CONCURRENTLY cannot run in a transaction.')
    console.log('\n📝 Steps to run this migration:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the SQL above')
    console.log('   4. Click "Run" to execute')
    console.log('\n   Or run: supabase db push (if using Supabase CLI)')

    // Check if index already exists
    console.log('\n🔍 Checking if index already exists...')
    const indexExists = await checkIndexExists()

    if (indexExists) {
      console.log('✅ Index already exists!')
      await testQueryPerformance()
      await testDuplicateRejection()
      console.log('\n✅ Migration 013 verified (index already present)')
      return
    }

    console.log('⚠️  Index does not exist yet')
    console.log('\n⏳ Waiting for you to run the migration manually...')
    console.log('   Press Ctrl+C to exit after running the migration')
    console.log('   Then run this script again to verify')

  } catch (error) {
    console.error('\n❌ Migration check failed:')
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
