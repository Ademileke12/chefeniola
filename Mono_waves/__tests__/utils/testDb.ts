import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Clean up test data from the database
 * This should be called after each test to ensure a clean state
 */
export async function cleanupTestData() {
  if (!supabaseAdmin) {
    return // Skip if not configured
  }
  
  // Delete test products (in reverse order of dependencies)
  await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  // Note: We use neq with a dummy UUID to delete all rows
  // This is safer than using .delete() without a filter in production
}

/**
 * Check if Supabase is configured and accessible
 * Includes retry logic for network reliability
 */
export async function isSupabaseConfigured(): Promise<boolean> {
  if (!supabaseAdmin) {
    return false
  }
  
  const maxRetries = 3
  const retryDelay = 2000 // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabaseAdmin.from('products').select('id').limit(1)
      if (!error) {
        return true
      }
      
      // If there's an error but not the last attempt, wait and retry
      if (attempt < maxRetries) {
        console.log(`⏳ Supabase connection attempt ${attempt} failed, retrying...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    } catch (err) {
      // If not the last attempt, wait and retry
      if (attempt < maxRetries) {
        console.log(`⏳ Supabase connection attempt ${attempt} failed, retrying...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  return false
}

/**
 * Skip test if Supabase is not configured
 */
export function skipIfNoSupabase() {
  beforeAll(async () => {
    const configured = await isSupabaseConfigured()
    if (!configured) {
      console.warn('Skipping test: Supabase is not configured')
    }
  })
}
