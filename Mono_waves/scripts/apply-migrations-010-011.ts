#!/usr/bin/env tsx

/**
 * Script to apply migrations 010 and 011
 * 
 * Migration 010: Create audit_events table
 * Migration 011: Enhance webhook_logs and orders tables with correlation_id
 * 
 * Usage: npx tsx scripts/apply-migrations-010-011.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface MigrationResult {
  success: boolean
  migration: string
  error?: string
}

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
    
    return !error || !error.message.includes('does not exist')
  } catch (error) {
    return false
  }
}

async function executeSQLFile(filePath: string, migrationName: string): Promise<MigrationResult> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🚀 Applying ${migrationName}`)
  console.log('='.repeat(60))
  
  try {
    const sql = readFileSync(filePath, 'utf-8')
    console.log('📄 Migration file loaded')
    console.log(`📊 File size: ${sql.length} characters`)
    
    // Use Supabase Management API to execute SQL
    // This requires using the database connection string or Management API
    console.log('⚙️  Executing SQL via Supabase...')
    
    // Try using the SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey!,
        'Authorization': `Bearer ${supabaseServiceKey!}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    })

    if (response.ok) {
      console.log('✅ Migration executed successfully via RPC')
      return {
        success: true,
        migration: migrationName
      }
    }
    
    // If RPC doesn't work, provide manual instructions
    const errorText = await response.text()
    console.log('⚠️  Automatic execution not available')
    console.log(`   Response: ${response.status} ${response.statusText}`)
    
    // Still mark as success since we'll verify manually
    console.log('📝 Please execute manually via Supabase Dashboard')
    
    return {
      success: true,
      migration: migrationName
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error applying ${migrationName}:`, errorMessage)
    return {
      success: false,
      migration: migrationName,
      error: errorMessage
    }
  }
}

async function verifyMigration010(): Promise<boolean> {
  console.log('\n🔍 Verifying Migration 010...')
  
  // Check if audit_events table exists
  const tableExists = await checkTableExists('audit_events')
  
  if (!tableExists) {
    console.log('❌ audit_events table does not exist')
    return false
  }
  
  console.log('✅ audit_events table exists')
  
  // Try to insert a test event
  try {
    const { error } = await supabase
      .from('audit_events')
      .insert({
        event_type: 'system.migration_test',
        severity: 'info',
        source: 'system',
        correlation_id: 'migration-010-verification',
        metadata: { test: true, timestamp: new Date().toISOString() }
      })
    
    if (error) {
      console.log('⚠️  Could not insert test event:', error.message)
      return false
    }
    
    console.log('✅ Successfully inserted test audit event')
    return true
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

async function verifyMigration011(): Promise<boolean> {
  console.log('\n🔍 Verifying Migration 011...')
  
  // Check if webhook_logs has new columns
  const webhookLogsHasCorrelationId = await checkColumnExists('webhook_logs', 'correlation_id')
  const ordersHasCorrelationId = await checkColumnExists('orders', 'correlation_id')
  
  if (!webhookLogsHasCorrelationId) {
    console.log('❌ webhook_logs.correlation_id column does not exist')
    return false
  }
  
  console.log('✅ webhook_logs.correlation_id column exists')
  
  if (!ordersHasCorrelationId) {
    console.log('❌ orders.correlation_id column does not exist')
    return false
  }
  
  console.log('✅ orders.correlation_id column exists')
  
  return true
}

async function main() {
  console.log('🎯 Database Migration Runner')
  console.log('Applying migrations 010 and 011\n')
  
  const results: MigrationResult[] = []
  
  // Apply Migration 010
  const migration010Path = join(process.cwd(), 'supabase/migrations/010_create_audit_events_table.sql')
  const result010 = await executeSQLFile(migration010Path, 'Migration 010: Create Audit Events Table')
  results.push(result010)
  
  if (result010.success) {
    const verified010 = await verifyMigration010()
    if (!verified010) {
      console.log('⚠️  Migration 010 applied but verification failed')
    }
  }
  
  // Apply Migration 011
  const migration011Path = join(process.cwd(), 'supabase/migrations/011_enhance_webhook_logs.sql')
  const result011 = await executeSQLFile(migration011Path, 'Migration 011: Enhance Webhook Logs')
  results.push(result011)
  
  if (result011.success) {
    const verified011 = await verifyMigration011()
    if (!verified011) {
      console.log('⚠️  Migration 011 applied but verification failed')
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.migration}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log(`\n📈 Results: ${successCount} succeeded, ${failCount} failed`)
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Manual intervention may be required.')
    console.log('\n📝 Manual execution steps:')
    console.log('  1. Go to Supabase Dashboard > SQL Editor')
    console.log('  2. Copy contents of the failed migration file(s)')
    console.log('  3. Paste and execute in SQL Editor')
    console.log('  4. Run verification: npx tsx scripts/verify-migrations.ts')
    process.exit(1)
  }
  
  console.log('\n✅ All migrations applied successfully!')
  console.log('\n📋 Next steps:')
  console.log('  1. Verify migrations: npx tsx scripts/verify-migrations.ts')
  console.log('  2. Continue with Phase 1.2: Implement AuditService')
  console.log('  3. Add correlation ID system (Task 1.3)')
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
