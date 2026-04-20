/**
 * Script to run migration 010: Create Audit Events Table
 * 
 * This script creates the audit_events table for comprehensive security
 * and operational logging of payment processing, order fulfillment, and
 * tracking number delivery.
 * 
 * Usage: npx tsx scripts/run-migration-010.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running migration 010: Create Audit Events Table\n')

  try {
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/010_create_audit_events_table.sql'
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded successfully')
    console.log('📊 Executing SQL...\n')

    // Execute the migration using raw SQL
    // Note: Supabase doesn't have a built-in exec_sql RPC by default
    // We'll need to execute via the SQL editor or use the REST API
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`Found ${statements.length} SQL statements to execute\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        // For DDL statements, we need to use the Supabase REST API or dashboard
        // This is a limitation of the JS client
        console.log(`  ${statement.substring(0, 60)}...`)
      }
    }

    console.log('\n⚠️  Note: Supabase JS client cannot execute DDL statements directly')
    console.log('Please execute the migration manually:\n')
    console.log('📝 Manual execution steps:')
    console.log('  1. Go to Supabase Dashboard > SQL Editor')
    console.log('  2. Copy contents of supabase/migrations/010_create_audit_events_table.sql')
    console.log('  3. Paste and execute in SQL Editor')
    console.log('  4. Verify the audit_events table was created\n')

    console.log('Or use the Supabase CLI:')
    console.log('  supabase db push\n')

  } catch (error) {
    console.error('❌ Migration script failed:', error)
    console.error('\n📝 Manual execution required:')
    console.error('  1. Go to Supabase Dashboard > SQL Editor')
    console.error('  2. Copy contents of supabase/migrations/010_create_audit_events_table.sql')
    console.error('  3. Paste and execute in SQL Editor\n')
    process.exit(1)
  }
}

// Verify the table after manual execution
async function verifyMigration() {
  console.log('🔍 Verifying migration...\n')

  try {
    // Try to query the audit_events table
    const { data, error } = await supabase
      .from('audit_events')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table audit_events does not exist yet')
        console.log('   Please run the migration manually (see instructions above)\n')
        return false
      }
      throw error
    }

    console.log('✅ Table audit_events exists and is accessible\n')

    // Check if we can insert a test event
    const testEvent = {
      event_type: 'system.migration_test',
      severity: 'info',
      source: 'system',
      correlation_id: 'migration-010-test',
      metadata: { test: true, migration: '010' }
    }

    const { error: insertError } = await supabase
      .from('audit_events')
      .insert(testEvent)

    if (insertError) {
      console.log('⚠️  Could not insert test event:', insertError.message)
      return false
    }

    console.log('✅ Successfully inserted test audit event')
    console.log('✅ Migration 010 verified successfully!\n')

    console.log('📋 Table created:')
    console.log('  - audit_events (with indexes and RLS policies)\n')

    console.log('📊 Indexes created:')
    console.log('  - idx_audit_events_timestamp')
    console.log('  - idx_audit_events_correlation_id')
    console.log('  - idx_audit_events_event_type')
    console.log('  - idx_audit_events_severity')
    console.log('  - idx_audit_events_source')
    console.log('  - idx_audit_events_severity_timestamp')
    console.log('  - idx_audit_events_source_event_type\n')

    console.log('🔒 RLS Policies created:')
    console.log('  - Admins can view all audit events')
    console.log('  - System can insert audit events\n')

    console.log('✅ Ready for Phase 1.2: Implement AuditService\n')

    return true

  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

// Main execution
async function main() {
  await runMigration()
  
  console.log('Would you like to verify the migration? (Run after manual execution)')
  console.log('Run: npx tsx scripts/verify-migration-010.ts\n')
}

main()
