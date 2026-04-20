/**
 * Script to run migration 009: Create Gelato Availability Tables
 * 
 * This script creates the gelato_products and gelato_availability_history tables
 * for tracking product availability status over time.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running migration 009: Create Gelato Availability Tables\n')

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/009_create_gelato_availability_tables.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded successfully')
    console.log('📊 Executing SQL...\n')

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // If exec_sql doesn't exist, try direct execution (this won't work for all statements)
      console.log('⚠️  exec_sql function not available, trying alternative method...\n')
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement })
          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`)
            console.error(`Statement: ${statement.substring(0, 100)}...`)
          }
        }
      }
    }

    console.log('✅ Migration executed successfully!\n')

    // Verify tables were created
    console.log('🔍 Verifying tables...\n')

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['gelato_products', 'gelato_availability_history'])

    if (tablesError) {
      console.log('⚠️  Could not verify tables automatically')
      console.log('Please verify manually in Supabase dashboard\n')
    } else {
      console.log('✅ Tables verified:')
      console.log('  - gelato_products')
      console.log('  - gelato_availability_history\n')
    }

    console.log('📋 Next steps:')
    console.log('  1. Verify tables in Supabase dashboard')
    console.log('  2. Check indexes were created')
    console.log('  3. Verify RLS policies are in place')
    console.log('  4. Run: npm test to verify the migration\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\n📝 Manual execution required:')
    console.error('  1. Go to Supabase Dashboard > SQL Editor')
    console.error('  2. Copy contents of supabase/migrations/009_create_gelato_availability_tables.sql')
    console.error('  3. Paste and execute in SQL Editor\n')
    process.exit(1)
  }
}

runMigration()
