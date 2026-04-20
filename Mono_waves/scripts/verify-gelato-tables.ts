/**
 * Script to verify gelato_products and gelato_availability_history tables exist
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyTables() {
  console.log('🔍 Verifying Gelato availability tables...\n')

  try {
    // Try to query gelato_products table
    const { data: products, error: productsError } = await supabase
      .from('gelato_products')
      .select('*')
      .limit(1)

    if (productsError) {
      console.error('❌ gelato_products table not found or not accessible')
      console.error('Error:', productsError.message)
      console.log('\n📝 Please run the migration manually:')
      console.log('  1. Go to Supabase Dashboard > SQL Editor')
      console.log('  2. Copy contents of supabase/migrations/009_create_gelato_availability_tables.sql')
      console.log('  3. Paste and execute in SQL Editor\n')
      return false
    }

    console.log('✅ gelato_products table exists')

    // Try to query gelato_availability_history table
    const { data: history, error: historyError } = await supabase
      .from('gelato_availability_history')
      .select('*')
      .limit(1)

    if (historyError) {
      console.error('❌ gelato_availability_history table not found or not accessible')
      console.error('Error:', historyError.message)
      return false
    }

    console.log('✅ gelato_availability_history table exists')

    // Test insert into gelato_products
    const testProduct = {
      uid: 'test_product_' + Date.now(),
      name: 'Test Product',
      type: 'test',
      status: 'new'
    }

    const { data: insertedProduct, error: insertError } = await supabase
      .from('gelato_products')
      .insert(testProduct)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to insert test product')
      console.error('Error:', insertError.message)
      return false
    }

    console.log('✅ Successfully inserted test product')

    // Test insert into gelato_availability_history
    const testHistory = {
      product_uid: testProduct.uid,
      status: 'new',
      notes: 'Test history entry'
    }

    const { data: insertedHistory, error: historyInsertError } = await supabase
      .from('gelato_availability_history')
      .insert(testHistory)
      .select()
      .single()

    if (historyInsertError) {
      console.error('❌ Failed to insert test history')
      console.error('Error:', historyInsertError.message)
      return false
    }

    console.log('✅ Successfully inserted test history entry')

    // Clean up test data
    await supabase.from('gelato_products').delete().eq('uid', testProduct.uid)
    console.log('✅ Cleaned up test data')

    console.log('\n🎉 All tables verified successfully!')
    console.log('\n📊 Table structure:')
    console.log('  gelato_products:')
    console.log('    - uid (PK)')
    console.log('    - name')
    console.log('    - type')
    console.log('    - status')
    console.log('    - last_seen')
    console.log('    - created_at')
    console.log('    - updated_at')
    console.log('    - metadata')
    console.log('\n  gelato_availability_history:')
    console.log('    - id (PK)')
    console.log('    - product_uid (FK)')
    console.log('    - status')
    console.log('    - changed_at')
    console.log('    - notes')

    return true

  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

verifyTables().then(success => {
  process.exit(success ? 0 : 1)
})
