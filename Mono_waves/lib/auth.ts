import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function requireAdmin(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
    // For API routes, we typically check the Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    // If no token, we might be in a browser session. 
    // In a real project with @supabase/ssr, we'd use cookies().
    // For now, we'll use a simplified check or proceed if supabaseAdmin can verify the session.

    if (!token) {
        // Fallback: If we're' in local dev and have the admin email set, 
        // we might want a different check, but for security WE MUST have a token or session.
        return { isAdmin: false, error: 'No authentication token provided' }
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
        return { isAdmin: false, error: error?.message || 'Invalid or expired session' }
    }

    // Check if user is admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (user.email !== adminEmail) {
        return { isAdmin: false, error: 'Access denied: Admin privileges required' }
    }

    return { isAdmin: true }
}
