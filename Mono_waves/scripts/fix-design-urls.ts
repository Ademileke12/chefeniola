/**
 * Migration Script: Fix Design URLs
 * 
 * This script identifies products with null or invalid design URLs
 * and attempts to fix them by:
 * 1. Checking if design exists in storage
 * 2. Generating public URL if found
 * 3. Logging products that need manual intervention
 * 
 * Usage: npx tsx scripts/fix-design-urls.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'
import { fileService } from '../lib/services/fileService'

interface Product {
  id: string
  name: string
  design_url: string | null
  design_file_url: string | null
  design_data: any
}

async function fixDesignUrls() {
  console.log('🔍 Finding products with missing design URLs...\n')

  // Find products with null or invalid design URLs
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, design_url, design_file_url, design_data')
    .or('design_url.is.null,design_file_url.is.null,design_url.eq.pending-export,design_file_url.eq.pending-export')

  if (error) {
    console.error('❌ Error fetching products:', error)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('✅ No products found with missing design URLs')
    return
  }

  console.log(`Found ${products.length} product(s) with missing design URLs:\n`)

  const fixed: string[] = []
  const needsManualFix: Product[] = []

  for (const product of products) {
    console.log(`📦 Product: ${product.name} (${product.id})`)
    console.log(`   Current design_url: ${product.design_url || 'null'}`)
    console.log(`   Current design_file_url: ${product.design_file_url || 'null'}`)

    // Check if product has design data (from design editor)
    if (product.design_data && 
        product.design_data.elements && 
        product.design_data.elements.length > 0) {
      console.log('   ℹ️  Has design data - needs export from design editor')
      needsManualFix.push(product)
      continue
    }

    // Try to find design file in storage
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('designs')
        .list(`designs/${product.id}`, {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (listError) {
        console.log(`   ⚠️  Error listing files: ${listError.message}`)
        needsManualFix.push(product)
        continue
      }

      if (!files || files.length === 0) {
        console.log('   ⚠️  No design files found in storage')
        needsManualFix.push(product)
        continue
      }

      // Get the most recent file
      const latestFile = files[0]
      const filePath = `designs/${product.id}/${latestFile.name}`
      const publicUrl = fileService.getPublicUrl(filePath)

      // Verify URL is accessible
      const isAccessible = await fileService.verifyUrlAccessible(publicUrl)
      if (!isAccessible) {
        console.log(`   ⚠️  Found file but URL not accessible: ${publicUrl}`)
        needsManualFix.push(product)
        continue
      }

      // Update product with the URL
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          design_url: publicUrl,
          design_file_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (updateError) {
        console.log(`   ❌ Error updating product: ${updateError.message}`)
        needsManualFix.push(product)
        continue
      }

      console.log(`   ✅ Fixed! Updated with URL: ${publicUrl}`)
      fixed.push(product.id)

    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error instanceof Error ? error.message : error}`)
      needsManualFix.push(product)
    }

    console.log('')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Fixed: ${fixed.length} product(s)`)
  console.log(`⚠️  Needs manual fix: ${needsManualFix.length} product(s)`)

  if (needsManualFix.length > 0) {
    console.log('\n📋 Products needing manual intervention:')
    for (const product of needsManualFix) {
      console.log(`   - ${product.name} (${product.id})`)
      if (product.design_data?.elements?.length > 0) {
        console.log(`     → Has design data, needs export from design editor`)
      } else {
        console.log(`     → No design file found, needs upload`)
      }
    }
  }

  console.log('\n✨ Migration complete!')
}

// Run the migration
fixDesignUrls().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
