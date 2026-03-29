import { supabase } from '@/lib/supabase/client'

/**
 * Makes an authenticated API request with the current user's session token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No active session')
  }

  // Add Authorization header with Bearer token
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(url, {
    ...options,
    headers,
  })
}
