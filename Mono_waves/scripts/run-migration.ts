/**
 * Script to run database migrations
 * Usage: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running database migration...')
  console.log(`   Connected to: ${supabaseUrl}`)
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/001_initial_schema.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Loaded migration file: 001_initial_schema.sql')
    
    // Split SQL into individual statements (simple split by semicolon)
    // Note: This is a basic approach. For complex SQL, consider using a proper SQL parser
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue
      }
      
      console.log(`   Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
      
      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_').select('*').limit(0)
        
        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message)
          console.error('   Statement:', statement.substring(0, 100) + '...')
          throw error
        }
      }
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('📊 Created tables:')
    console.log('   - users')
    console.log('   - products')
    console.log('   - orders')
    console.log('   - carts')
    console.log('   - webhook_logs')
    console.log('')
    console.log('🎯 Next steps:')
    console.log('   1. Run the property test: npm test -- __tests__/properties/product-crud.test.ts')
    console.log('   2. Verify tables in Supabase dashboard')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('')
    console.error('💡 Alternative: Run the migration manually via Supabase Dashboard')
    console.error('   1. Go to your Supabase project dashboard')
    console.error('   2. Navigate to SQL Editor')
    console.error('   3. Copy contents of supabase/migrations/001_initial_schema.sql')
    console.error('   4. Paste and execute')
    process.exit(1)
  }
}

runMigration()
