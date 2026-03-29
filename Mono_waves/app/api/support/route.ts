import { NextRequest, NextResponse } from 'next/server'
import { supportService } from '@/lib/services/supportService'
import { securityCheck } from '@/lib/security'

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

        const ticket = await supportService.createTicket({
            email,
            name: name || null,
            category,
            subject,
            message,
        })

        return NextResponse.json(ticket, { status: 201 })
    } catch (error) {
        console.error('Error submitting support ticket:', error)
        return NextResponse.json(
            { error: 'Failed to submit support ticket' },
            { status: 500 }
        )
    }
}
