import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Allow tests to run without Supabase configured
// Tests will skip if Supabase is not available
const isConfigured = supabaseUrl && supabaseServiceRoleKey

// Only throw error in production/development, not in tests
if (!isConfigured && process.env.NODE_ENV !== 'test') {
  console.error('Missing Supabase environment variables')
  console.error('URL:', supabaseUrl ? 'set' : 'missing')
  console.error('Key:', supabaseServiceRoleKey ? 'set' : 'missing')
  throw new Error('Missing Supabase server environment variables')
}

// Server-side client with service role key for admin operations
export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Increase timeout and add keepalive
            signal: options.signal || AbortSignal.timeout(30000),
            keepalive: true,
          })
        },
      },
    })
  : (null as any) // Allow null in test environment when not configured
