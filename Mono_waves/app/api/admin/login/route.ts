/**
 * Admin Login API with Rate Limiting
 * 
 * Provides rate-limited admin authentication
 * Prevents brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { 
  checkRateLimit, 
  recordAttempt, 
  resetRateLimit,
  ADMIN_LOGIN_RATE_LIMIT 
} from '@/lib/utils/rateLimiter'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    // Use email as primary identifier, IP as fallback
    const identifier = `admin-login:${email}:${clientIp}`

    // Check rate limit
    const rateLimit = checkRateLimit(identifier, ADMIN_LOGIN_RATE_LIMIT)

    if (rateLimit.isLimited) {
      const minutesUntilReset = Math.ceil(
        ((rateLimit.lockedUntil || rateLimit.resetTime) - Date.now()) / 60000
      )

      return NextResponse.json(
        { 
          error: `Too many login attempts. Please try again in ${minutesUntilReset} minutes.`,
          lockedUntil: rateLimit.lockedUntil,
          resetTime: rateLimit.resetTime,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rateLimit.lockedUntil || rateLimit.resetTime) - Date.now()) / 1000)),
          }
        }
      )
    }

    // Attempt login with Supabase
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.user) {
      // Record failed attempt
      recordAttempt(identifier, ADMIN_LOGIN_RATE_LIMIT)

      // Get updated rate limit info
      const updatedLimit = checkRateLimit(identifier, ADMIN_LOGIN_RATE_LIMIT)

      return NextResponse.json(
        { 
          error: 'Invalid email or password',
          remaining: updatedLimit.remaining,
        },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@monowaves.com'
    
    if (data.user.email !== adminEmail) {
      // Sign out non-admin user
      await supabase.auth.signOut()
      
      // Record failed attempt
      recordAttempt(identifier, ADMIN_LOGIN_RATE_LIMIT)

      return NextResponse.json(
        { error: 'You do not have admin privileges' },
        { status: 403 }
      )
    }

    // Successful login - reset rate limit
    resetRateLimit(identifier)

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    })

  } catch (error) {
    console.error('Admin login error:', error)
    
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
