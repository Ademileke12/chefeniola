#!/usr/bin/env tsx

/**
 * Script to verify migrations 010 and 011 are applied correctly
 * 
 * Usage: npx tsx scripts/verify-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    return !error || !error.message.includes('does not exist')
  } catch (error) {
    return false
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0)
    
    return !error
  } catch (error) {
    return false
  }
}

async function verifyMigration010() {
  console.log('\n🔍 Verifying Migration 010: Audit Events Table')
  console.log('='.repeat(60))
  
  let allPassed = true
  
  // Check table exists
  const tableExists = await checkTableExists('audit_events')
  if (tableExists) {
    console.log('✅ audit_events table exists')
  } else {
    console.log('❌ audit_events table does NOT exist')
    allPassed = false
    return allPassed
  }
  
  // Check required columns
  const columns = [
    'id',
    'timestamp',
    'event_type',
    'severity',
    'source',
    'correlation_id',
    'user_id',
    'metadata',
    'security_flags',
    'created_at'
  ]
  
  for (const column of columns) {
    const exists = await checkColumnExists('audit_events', column)
    if (exists) {
      console.log(`✅ Column: ${column}`)
    } else {
      console.log(`❌ Column: ${column} - MISSING`)
      allPassed = false
    }
  }
  
  // Try to insert a test event
  try {
    const { data, error } = await supabase
      .from('audit_events')
      .insert({
        event_type: 'system.verification_test',
        severity: 'info',
        source: 'system',
        correlation_id: `verify-${Date.now()}`,
        metadata: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
    
    if (error) {
      console.log('⚠️  Insert test failed:', error.message)
      allPassed = false
    } else {
      console.log('✅ Successfully inserted test audit event')
      
      // Clean up test event
      if (data && data[0]) {
        await supabase
          .from('audit_events')
          .delete()
          .eq('id', data[0].id)
      }
    }
  } catch (error) {
    console.log('❌ Insert test error:', error)
    allPassed = false
  }
  
  return allPassed
}

async function verifyMigration011() {
  console.log('\n🔍 Verifying Migration 011: Enhanced Webhook Logs')
  console.log('='.repeat(60))
  
  let allPassed = true
  
  // Check webhook_logs columns
  const webhookColumns = [
    'correlation_id',
    'processing_time_ms',
    'retry_count',
    'signature_verified'
  ]
  
  console.log('\n📋 Checking webhook_logs table:')
  for (const column of webhookColumns) {
    const exists = await checkColumnExists('webhook_logs', column)
    if (exists) {
      console.log(`✅ Column: ${column}`)
    } else {
      console.log(`❌ Column: ${column} - MISSING`)
      allPassed = false
    }
  }
  
  // Check orders correlation_id column
  console.log('\n📋 Checking orders table:')
  const ordersHasCorrelationId = await checkColumnExists('orders', 'correlation_id')
  if (ordersHasCorrelationId) {
    console.log('✅ Column: correlation_id')
  } else {
    console.log('❌ Column: correlation_id - MISSING')
    allPassed = false
  }
  
  return allPassed
}

async function main() {
  console.log('🎯 Migration Verification Tool')
  console.log('Checking migrations 010 and 011\n')
  
  const migration010Passed = await verifyMigration010()
  const migration011Passed = await verifyMigration011()
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Verification Summary')
  console.log('='.repeat(60))
  
  console.log(`${migration010Passed ? '✅' : '❌'} Migration 010: Audit Events Table`)
  console.log(`${migration011Passed ? '✅' : '❌'} Migration 011: Enhanced Webhook Logs`)
  
  if (migration010Passed && migration011Passed) {
    console.log('\n✅ All migrations verified successfully!')
    console.log('\n📋 Database is ready for:')
    console.log('  - AuditService implementation')
    console.log('  - Correlation ID tracking')
    console.log('  - Enhanced webhook logging')
    process.exit(0)
  } else {
    console.log('\n❌ Some migrations are not applied correctly')
    console.log('\n📝 To apply migrations:')
    console.log('  Option 1: Run npx tsx scripts/apply-migrations-010-011.ts')
    console.log('  Option 2: Manual execution via Supabase Dashboard:')
    console.log('    1. Go to Supabase Dashboard > SQL Editor')
    console.log('    2. Execute supabase/migrations/010_create_audit_events_table.sql')
    console.log('    3. Execute supabase/migrations/011_enhance_webhook_logs.sql')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
