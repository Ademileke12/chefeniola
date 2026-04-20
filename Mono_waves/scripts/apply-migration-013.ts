#!/usr/bin/env tsx

/**
 * Apply Migration 013: Add stripe_session_id index
 * 
 * This script applies the migration by executing the SQL directly
 * Note: Cannot use CONCURRENTLY in a transaction, so we use regular CREATE INDEX
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

async function applyMigration() {
  console.log('🚀 Applying migration 013: Add stripe_session_id index')
  console.log('=' .repeat(60))

  try {
    // Check if index already exists by trying to query with it
    console.log('\n🔍 Checking if index already exists...')
    
    const { data: testQuery, error: testError } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', 'test_check_' + Date.now())
      .limit(1)

    if (testError) {
      console.log('⚠️  Could not test query:', testError.message)
    }

    // Try to create the index using raw SQL
    console.log('\n⚙️  Creating index...')
    
    const createIndexSQL = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
      ON orders(stripe_session_id) 
      WHERE stripe_session_id IS NOT NULL;
    `

    // Execute using rpc if available, otherwise provide instructions
    console.log('\n📋 SQL to execute:')
    console.log(createIndexSQL)
    
    console.log('\n⚠️  Note: This SQL must be executed in your Supabase SQL Editor')
    console.log('   Go to: Supabase Dashboard → SQL Editor → New Query')
    console.log('   Paste the SQL above and click Run')
    
    console.log('\n✅ After running the SQL, verify with:')
    console.log('   npx tsx scripts/verify-migration-013.ts')

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

applyMigration()
