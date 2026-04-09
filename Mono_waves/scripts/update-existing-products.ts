/**
 * Update Existing Products Script
 * 
 * Updates the 4 existing products to copy design_file_url to design_url
 * 
 * Usage: npx tsx scripts/update-existing-products.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function updateExistingProducts() {
  console.log('🔄 Updating existing products...\n')

  // Get products with null design_url but valid design_file_url
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, design_url, design_file_url')
    .is('design_url', null)
    .not('design_file_url', 'is', null)

  if (error) {
    console.error('❌ Error fetching products:', error)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('✅ No products need updating')
    return
  }

  console.log(`Found ${products.length} product(s) to update:\n`)

  let updated = 0
  let failed = 0

  for (const product of products) {
    console.log(`📦 ${product.name}`)
    console.log(`   ID: ${product.id}`)
    console.log(`   Current design_url: ${product.design_url || 'null'}`)
    console.log(`   Current design_file_url: ${product.design_file_url}`)

    // Update design_url to match design_file_url
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        design_url: product.design_file_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)

    if (updateError) {
      console.log(`   ❌ Failed to update: ${updateError.message}`)
      failed++
    } else {
      console.log(`   ✅ Updated design_url`)
      updated++
    }
    console.log('')
  }

  console.log('='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Updated: ${updated} product(s)`)
  console.log(`❌ Failed: ${failed} product(s)`)
  console.log('\n✨ Update complete!')
}

// Run the update
updateExistingProducts().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
