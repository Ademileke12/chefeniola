import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Admin authentication check utility
 * 
 * Verifies that the request is from an authenticated admin user.
 * Returns the user object if authenticated, throws an error otherwise.
 * 
 * Usage in API routes:
 * ```typescript
 * const user = await requireAdmin(request)
 * ```
 * 
 * Requirements: 13.1
 */
export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      throw new AuthenticationError('Invalid or expired token')
    }

    // Check if user has admin role
    // Note: In a production app, you would check user metadata or a roles table
    // For now, we'll check if the user email matches the admin email from env
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@monowaves.com'
    
    if (user.email !== adminEmail) {
      throw new AuthorizationError('User does not have admin privileges')
    }

    return user
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new AuthenticationError('Failed to verify authentication')
  }
}

/**
 * Check if a user is authenticated (without requiring admin role)
 * Useful for client-side authentication checks
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    return null
  }
}

// Custom error classes for better error handling
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}
