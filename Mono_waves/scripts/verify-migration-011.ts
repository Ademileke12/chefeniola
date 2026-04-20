#!/usr/bin/env tsx

/**
 * Verification script for migration 011
 * Checks that webhook_logs and orders tables have been enhanced correctly
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ColumnInfo {
  column_name: string
  data_type: string
  column_default: string | null
}

interface IndexInfo {
  indexname: string
  indexdef: string
}

async function verifyMigration() {
  console.log('🔍 Verifying Migration 011: Enhance Webhook Logs\n')

  let allChecksPass = true

  // Check webhook_logs columns
  console.log('📋 Checking webhook_logs table columns...')
  const { data: webhookColumns, error: webhookError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, column_default')
    .eq('table_name', 'webhook_logs')
    .in('column_name', ['correlation_id', 'processing_time_ms', 'retry_count', 'signature_verified'])

  if (webhookError) {
    console.error('❌ Error querying webhook_logs columns:', webhookError.message)
    allChecksPass = false
  } else {
    const expectedColumns = [
      { name: 'correlation_id', type: 'text' },
      { name: 'processing_time_ms', type: 'integer' },
      { name: 'retry_count', type: 'integer' },
      { name: 'signature_verified', type: 'boolean' }
    ]

    for (const expected of expectedColumns) {
      const found = (webhookColumns as ColumnInfo[])?.find(
        col => col.column_name === expected.name
      )
      if (found) {
        console.log(`  ✅ ${expected.name} (${found.data_type})`)
      } else {
        console.log(`  ❌ ${expected.name} - NOT FOUND`)
        allChecksPass = false
      }
    }
  }

  // Check orders correlation_id column
  console.log('\n📋 Checking orders table columns...')
  const { data: ordersColumns, error: ordersError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'orders')
    .eq('column_name', 'correlation_id')

  if (ordersError) {
    console.error('❌ Error querying orders columns:', ordersError.message)
    allChecksPass = false
  } else if (ordersColumns && ordersColumns.length > 0) {
    const col = ordersColumns[0] as ColumnInfo
    console.log(`  ✅ correlation_id (${col.data_type})`)
  } else {
    console.log('  ❌ correlation_id - NOT FOUND')
    allChecksPass = false
  }

  // Check indexes
  console.log('\n📋 Checking indexes...')
  const { data: indexes, error: indexError } = await supabase.rpc('get_indexes', {
    table_names: ['webhook_logs', 'orders']
  })

  if (indexError) {
    // Fallback: try direct query
    console.log('  ℹ️  Using fallback index check method')
    
    // Check webhook_logs index
    const { data: webhookIndex } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'webhook_logs')
      .eq('indexname', 'idx_webhook_logs_correlation_id')

    if (webhookIndex && webhookIndex.length > 0) {
      console.log('  ✅ idx_webhook_logs_correlation_id')
    } else {
      console.log('  ❌ idx_webhook_logs_correlation_id - NOT FOUND')
      allChecksPass = false
    }

    // Check orders index
    const { data: ordersIndex } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'orders')
      .eq('indexname', 'idx_orders_correlation_id')

    if (ordersIndex && ordersIndex.length > 0) {
      console.log('  ✅ idx_orders_correlation_id')
    } else {
      console.log('  ❌ idx_orders_correlation_id - NOT FOUND')
      allChecksPass = false
    }
  } else {
    const indexList = indexes as IndexInfo[]
    const webhookIndexFound = indexList.some(
      idx => idx.indexname === 'idx_webhook_logs_correlation_id'
    )
    const ordersIndexFound = indexList.some(
      idx => idx.indexname === 'idx_orders_correlation_id'
    )

    if (webhookIndexFound) {
      console.log('  ✅ idx_webhook_logs_correlation_id')
    } else {
      console.log('  ❌ idx_webhook_logs_correlation_id - NOT FOUND')
      allChecksPass = false
    }

    if (ordersIndexFound) {
      console.log('  ✅ idx_orders_correlation_id')
    } else {
      console.log('  ❌ idx_orders_correlation_id - NOT FOUND')
      allChecksPass = false
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  if (allChecksPass) {
    console.log('✅ Migration 011 verification PASSED')
    console.log('\nAll required columns and indexes are present.')
    console.log('\nNext steps:')
    console.log('  1. Update webhook handlers to populate correlation_id')
    console.log('  2. Update order creation to generate correlation_id')
    console.log('  3. Implement audit logging using new fields')
  } else {
    console.log('❌ Migration 011 verification FAILED')
    console.log('\nSome checks did not pass. Please review the migration.')
    console.log('Run the migration with:')
    console.log('  supabase db reset')
    console.log('  OR')
    console.log('  psql $DATABASE_URL -f supabase/migrations/011_enhance_webhook_logs.sql')
    process.exit(1)
  }
}

// Run verification
verifyMigration().catch(error => {
  console.error('❌ Verification failed with error:', error)
  process.exit(1)
})
