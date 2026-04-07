import { NextRequest, NextResponse } from 'next/server'
import { settingsService } from '@/lib/services/settingsService'
import { requireAdmin } from '@/lib/auth'

// Force dynamic rendering - this route requires request headers for auth
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings - Get all store settings (admin)
 */
export async function GET(request: NextRequest) {
    try {
        // Security check
        const { isAdmin } = await requireAdmin(request)
        if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const settings = await settingsService.getAllSettings()
        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/admin/settings - Update store settings (admin)
 */
export async function PUT(request: NextRequest) {
    try {
        // TODO: Add admin authentication check
        // const user = await requireAdmin(request)

        const body = await request.json()
        await settingsService.updateSettings(body)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        )
    }
}
