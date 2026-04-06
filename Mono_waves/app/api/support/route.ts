import { NextRequest, NextResponse } from 'next/server'
import { supportService } from '@/lib/services/supportService'
import { securityCheck } from '@/lib/security'
import { containsXSS, containsSQLInjection, sanitizeString } from '@/lib/utils/validation'

/**
 * POST /api/support - Submit a new support ticket (public)
 */
export async function POST(request: NextRequest) {
    try {
        // Apply security checks (CSRF, Rate Limiting)
        const securityError = await securityCheck(request)
        if (securityError) return securityError

        const body = await request.json()
        const { email, name, category, subject, message } = body

        if (!email || !category || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: email, category, subject, or message' },
                { status: 400 }
            )
        }

        // Validate for XSS attacks
        const fieldsToCheck = { email, name, category, subject, message }
        for (const [field, value] of Object.entries(fieldsToCheck)) {
            if (value && typeof value === 'string' && containsXSS(value)) {
                return NextResponse.json(
                    { error: `Invalid ${field}: contains potentially malicious content` },
                    { status: 400 }
                )
            }
        }

        // Validate for SQL injection
        for (const [field, value] of Object.entries(fieldsToCheck)) {
            if (value && typeof value === 'string' && containsSQLInjection(value)) {
                return NextResponse.json(
                    { error: `Invalid ${field}: contains potentially malicious SQL patterns` },
                    { status: 400 }
                )
            }
        }

        // Sanitize inputs
        const sanitizedData = {
            email: sanitizeString(email),
            name: name ? sanitizeString(name) : null,
            category: sanitizeString(category),
            subject: sanitizeString(subject),
            message: sanitizeString(message),
        }

        const ticket = await supportService.createTicket(sanitizedData)

        return NextResponse.json(ticket, { status: 201 })
    } catch (error) {
        console.error('Error submitting support ticket:', error)
        return NextResponse.json(
            { error: 'Failed to submit support ticket' },
            { status: 500 }
        )
    }
}
