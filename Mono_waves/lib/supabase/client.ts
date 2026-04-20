import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, options = {}) => {
      // Increase timeout to 60 seconds for slow connections
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true,
      }).finally(() => clearTimeout(timeoutId))
    },
  },
})
