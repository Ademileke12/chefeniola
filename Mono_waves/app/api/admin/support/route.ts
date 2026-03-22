import { NextRequest, NextResponse } from 'next/server'
import { supportService } from '@/lib/services/supportService'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/admin/support - List all support tickets (admin)
 */
export async function GET(request: NextRequest) {
    try {
        const { isAdmin } = await requireAdmin(request)
        if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const tickets = await supportService.getAllTickets()
        return NextResponse.json(tickets)
    } catch (error) {
        console.error('Error fetching support tickets:', error)
        return NextResponse.json(
            { error: 'Failed to fetch support tickets' },
            { status: 500 }
        )
    }
}
