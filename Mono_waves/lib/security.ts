import { NextRequest, NextResponse } from 'next/server'

/**
 * Basic in-memory rate limiter
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10 // 10 requests per minute

export function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now }

    if (now - record.lastReset > WINDOW_MS) {
        record.count = 1
        record.lastReset = now
    } else {
        record.count++
    }

    rateLimitMap.set(ip, record)
    return record.count <= MAX_REQUESTS
}

/**
 * Simple CSRF check for API routes
 * Validates the Origin or Referer header against the app URL
 */
export function validateCSRF(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')
    
    // Get app URL and normalize it
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const appHostname = new URL(appUrl).hostname

    // For POST/PUT/DELETE requests, validate origin
    const method = request.method
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Check if origin matches
        if (origin) {
            try {
                const originUrl = new URL(origin)
                // Allow if origin hostname matches app hostname or request host
                if (originUrl.hostname === appHostname || originUrl.hostname === host) {
                    return true
                }
            } catch (e) {
                // Invalid origin URL
                return false
            }
        }
        
        // Check if referer matches
        if (referer) {
            try {
                const refererUrl = new URL(referer)
                // Allow if referer hostname matches app hostname or request host
                if (refererUrl.hostname === appHostname || refererUrl.hostname === host) {
                    return true
                }
            } catch (e) {
                // Invalid referer URL
                return false
            }
        }

        // If neither origin nor referer is present or valid, reject
        return false
    }

    return true
}

/**
 * Security middleware-like function for public API routes
 */
export async function securityCheck(request: NextRequest) {
    // CSRF check
    if (!validateCSRF(request)) {
        return NextResponse.json({ error: 'Forbidden: CSRF validation failed' }, { status: 403 })
    }

    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }

    return null
}
