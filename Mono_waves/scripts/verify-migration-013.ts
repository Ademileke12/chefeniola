#!/usr/bin/env tsx

/**
 * Verify Migration 013: Check if stripe_session_id index exists and works
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

async function verifyMigration() {
  console.log('🔍 Verifying migration 013: stripe_session_id index')
  console.log('=' .repeat(60))

  let allPassed = true

  try {
    // Test 1: Query performance
    console.log('\n📊 Test 1: Query Performance')
    const testSessionId = 'verify_test_' + Date.now()
    const startTime = Date.now()
    
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', testSessionId)
      .maybeSingle()

    const queryTime = Date.now() - startTime
    
    if (error) {
      console.log(`   ⚠️  Query failed: ${error.message}`)
      allPassed = false
    } else {
      console.log(`   ✅ Query completed in ${queryTime}ms`)
      if (queryTime > 100) {
        console.log(`   ⚠️  Query seems slow (> 100ms), index may not be active`)
        allPassed = false
      }
    }

    // Test 2: Duplicate rejection
    console.log('\n📊 Test 2: Duplicate Session ID Rejection')
    const uniqueSessionId = 'test_unique_' + Date.now()
    const uniquePaymentId1 = 'pi_test_' + Date.now() + '_1'
    const uniquePaymentId2 = 'pi_test_' + Date.now() + '_2'
    
    // Create first order
    const { data: order1, error: error1 } = await supabase
      .from('orders')
      .insert({
        order_number: `TEST-${Date.now()}-1`,
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        shipping_address: { street: '123 Test St', city: 'Test', state: 'TS', zip: '12345', country: 'US' },
        items: [],
        subtotal: 10.00,
        shipping_cost: 5.00,
        total: 15.00,
        stripe_payment_id: uniquePaymentId1,
        stripe_session_id: uniqueSessionId,
        status: 'pending'
      })
      .select()
      .single()

    if (error1) {
      console.log(`   ⚠️  Could not create test order: ${error1.message}`)
      allPassed = false
    } else {
      console.log(`   ✅ Created test order with session ID`)

      // Try to create duplicate
      const { data: order2, error: error2 } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-${Date.now()}-2`,
          customer_email: 'test2@example.com',
          customer_name: 'Test User 2',
          shipping_address: { street: '456 Test Ave', city: 'Test', state: 'TS', zip: '12345', country: 'US' },
          items: [],
          subtotal: 20.00,
          shipping_cost: 5.00,
          total: 25.00,
          stripe_payment_id: uniquePaymentId2,
          stripe_session_id: uniqueSessionId,
          status: 'pending'
        })
        .select()
        .single()

      if (error2) {
        if (error2.message.includes('duplicate') || error2.code === '23505') {
          console.log('   ✅ Duplicate session ID correctly rejected')
        } else {
          console.log(`   ⚠️  Unexpected error: ${error2.message}`)
          allPassed = false
        }
      } else {
        console.log('   ❌ WARNING: Duplicate session ID was NOT rejected!')
        console.log('   The unique index may not be working correctly')
        allPassed = false
        
        // Clean up the duplicate
        await supabase
          .from('orders')
          .delete()
          .eq('id', order2.id)
      }

      // Clean up test order
      await supabase
        .from('orders')
        .delete()
        .eq('stripe_session_id', uniqueSessionId)
      
      console.log('   ✅ Test orders cleaned up')
    }

    // Test 3: NULL values allowed
    console.log('\n📊 Test 3: NULL Session IDs Allowed')
    const nullTestPaymentId = 'pi_test_null_' + Date.now()
    
    const { data: nullOrder, error: nullError } = await supabase
      .from('orders')
      .insert({
        order_number: `TEST-NULL-${Date.now()}`,
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        shipping_address: { street: '123 Test St', city: 'Test', state: 'TS', zip: '12345', country: 'US' },
        items: [],
        subtotal: 10.00,
        shipping_cost: 5.00,
        total: 15.00,
        stripe_payment_id: nullTestPaymentId,
        stripe_session_id: null,
        status: 'pending'
      })
      .select()
      .single()

    if (nullError) {
      console.log(`   ⚠️  Could not create order with NULL session ID: ${nullError.message}`)
      allPassed = false
    } else {
      console.log('   ✅ NULL session IDs are allowed')
      
      // Clean up
      await supabase
        .from('orders')
        .delete()
        .eq('id', nullOrder.id)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    if (allPassed) {
      console.log('✅ All verification tests passed!')
      console.log('\nMigration 013 is working correctly:')
      console.log('  ✓ Index improves query performance')
      console.log('  ✓ Duplicate session IDs are rejected')
      console.log('  ✓ NULL session IDs are allowed')
      console.log('\n✅ Safe to proceed with code changes')
    } else {
      console.log('❌ Some verification tests failed')
      console.log('\nPlease review the errors above and:')
      console.log('  1. Ensure the migration SQL was executed')
      console.log('  2. Check the Supabase logs for errors')
      console.log('  3. Verify the index exists in your database')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

verifyMigration()
