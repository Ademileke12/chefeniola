import { NextRequest, NextResponse } from 'next/server'
import { supportService } from '@/lib/services/supportService'
import { requireAdmin } from '@/lib/auth'

// Force dynamic rendering - this route requires request headers for auth
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/support/[id] - Update support ticket (admin)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { isAdmin } = await requireAdmin(request)
        if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const ticket = await supportService.updateTicket(params.id, body)

        return NextResponse.json(ticket)
    } catch (error) {
        console.error('Error updating support ticket:', error)
        return NextResponse.json(
            { error: 'Failed to update support ticket' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/support/[id] - Delete support ticket (admin)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { isAdmin } = await requireAdmin(request)
        if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        await supportService.deleteTicket(params.id)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting support ticket:', error)
        return NextResponse.json(
            { error: 'Failed to delete support ticket' },
            { status: 500 }
        )
    }
}
