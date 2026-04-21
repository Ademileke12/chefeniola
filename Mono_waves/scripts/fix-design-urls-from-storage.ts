/**
 * Fix Design URLs from Supabase Storage
 * 
 * This script updates the design_url column with the actual design_file_url
 * from Supabase Storage for all products
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function fixDesignUrlsFromStorage() {
  console.log('🔧 Fixing Design URLs from Supabase Storage\n')
  
  // Get all products
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, design_url, design_file_url')
  
  if (error) {
    console.error('❌ Error fetching products:', error)
    return
  }
  
  console.log(`Found ${products?.length || 0} total products\n`)
  
  let updated = 0
  let skipped = 0
  let noDesignFile = 0
  
  for (const product of products || []) {
    // Check if product has a design_file_url
    if (!product.design_file_url) {
      console.log(`⚠️  ${product.name}: No design_file_url found`)
      noDesignFile++
      continue
    }
    
    // Check if design_url already matches design_file_url
    if (product.design_url === product.design_file_url) {
      console.log(`✓ ${product.name}: Already using storage URL`)
      skipped++
      continue
    }
    
    // Update design_url with design_file_url
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ design_url: product.design_file_url })
      .eq('id', product.id)
    
    if (updateError) {
      console.error(`❌ Error updating ${product.name}:`, updateError.message)
    } else {
      console.log(`✅ Updated ${product.name}`)
      console.log(`   From: ${product.design_url}`)
      console.log(`   To:   ${product.design_file_url}\n`)
      updated++
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`  Total products: ${products?.length || 0}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Already correct: ${skipped}`)
  console.log(`  No design file: ${noDesignFile}`)
  
  if (updated > 0) {
    console.log('\n✅ Products updated with real Supabase Storage URLs!')
    console.log('\n💡 Next steps:')
    console.log('1. Run: npx tsx scripts/fix-existing-orders-design-urls.ts')
    console.log('   This will update existing orders with the new design URLs')
    console.log('2. Try submitting orders to Gelato from the admin panel')
    console.log('3. The design URLs should now be accessible and valid')
  }
}

fixDesignUrlsFromStorage()
  .then(() => {
    console.log('\n✅ Script complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
