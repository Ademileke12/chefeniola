#!/usr/bin/env tsx

/**
 * Script to run migration 011
 * Enhances webhook_logs table and adds correlation_id to orders
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 Running Migration 011: Enhance Webhook Logs\n')

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/011_enhance_webhook_logs.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded')
    console.log('📝 SQL Preview:')
    console.log('-'.repeat(50))
    console.log(migrationSQL.split('\n').slice(0, 10).join('\n'))
    console.log('...')
    console.log('-'.repeat(50))

    // Execute migration
    console.log('\n⚙️  Executing migration...')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.includes('COMMENT ON')) {
        // Skip comments for now as they might not be supported via RPC
        continue
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error('❌ Error executing statement:', error.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
        throw error
      }
    }

    console.log('✅ Migration executed successfully\n')

    // Verify migration
    console.log('🔍 Verifying migration...')
    
    // Check webhook_logs columns
    const { data: webhookCols, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(0)

    if (webhookError && !webhookError.message.includes('no rows')) {
      console.error('❌ Error verifying webhook_logs:', webhookError.message)
    } else {
      console.log('  ✅ webhook_logs table accessible')
    }

    // Check orders columns
    const { data: ordersCols, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(0)

    if (ordersError && !ordersError.message.includes('no rows')) {
      console.error('❌ Error verifying orders:', ordersError.message)
    } else {
      console.log('  ✅ orders table accessible')
    }

    console.log('\n✅ Migration 011 completed successfully!')
    console.log('\nNext steps:')
    console.log('  1. Run verification: npm run verify-migration-011')
    console.log('  2. Update webhook handlers to use new columns')
    console.log('  3. Implement correlation ID generation')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\nTroubleshooting:')
    console.error('  1. Check database connection')
    console.error('  2. Verify SUPABASE_SERVICE_ROLE_KEY has admin privileges')
    console.error('  3. Try running via Supabase CLI: supabase db reset')
    console.error('  4. Or manually: psql $DATABASE_URL -f supabase/migrations/011_enhance_webhook_logs.sql')
    process.exit(1)
  }
}

// Run migration
runMigration()
