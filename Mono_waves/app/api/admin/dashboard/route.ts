import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { dashboardService } from '@/lib/services/dashboardService'
import type { DashboardResponse } from '@/types'

/**
 * GET /api/admin/dashboard - Get dashboard metrics (admin)
 * 
 * Retrieves key business metrics for the admin dashboard.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Only allow admin access
    const { isAdmin, error: authError } = await requireAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required', details: authError },
        { status: 401 }
      )
    }

    // Fetch dashboard data using service layer
    const dashboardData = await dashboardService.getDashboardData()

    // Prepare response
    const response: DashboardResponse = {
      ...dashboardData,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Critical error in dashboard API:', error)
    return NextResponse.json({
      error: 'Critical server error occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
