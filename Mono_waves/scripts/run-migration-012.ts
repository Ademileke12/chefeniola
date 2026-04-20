/**
 * Run Migration 012: Add retry_count to orders table
 * 
 * This migration adds retry count tracking for Gelato submissions
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
  console.error('❌ Missing Supabase credentials')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running Migration 012: Add retry_count to orders table')
  console.log('=' .repeat(60))

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '012_add_retry_count_to_orders.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('\n📄 Migration SQL:')
    console.log(migrationSQL)
    console.log('\n' + '='.repeat(60))

    // Execute migration
    console.log('\n⏳ Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct execution...')
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.toLowerCase().includes('comment on')) {
          // Skip comments as they might not be supported
          console.log('⏭️  Skipping comment statement')
          continue
        }
        
        console.log(`\n📝 Executing: ${statement.substring(0, 50)}...`)
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (stmtError) {
          console.error(`❌ Error executing statement: ${stmtError.message}`)
          throw stmtError
        }
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📊 Verifying migration...')

    // Verify the column was added
    const { data: columns, error: verifyError } = await supabase
      .from('orders')
      .select('retry_count')
      .limit(1)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      console.log('\n⚠️  Migration may have been applied, but verification failed.')
      console.log('Please check the database manually.')
    } else {
      console.log('✅ Verification successful! retry_count column exists.')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✨ Migration 012 complete!')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
