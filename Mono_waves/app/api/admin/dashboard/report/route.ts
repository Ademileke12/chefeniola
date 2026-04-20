/**
 * Dashboard Report API
 * 
 * Generates and downloads PDF reports for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { dashboardService } from '@/lib/services/dashboardService'
import { reportService } from '@/lib/services/reportService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard/report - Generate PDF report (admin)
 * 
 * Generates a comprehensive PDF report of dashboard metrics
 * Requires admin authentication
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

    // Fetch dashboard data
    const dashboardData = await dashboardService.getDashboardData()

    // Generate PDF report
    const pdf = reportService.generateDashboardReport({
      metrics: dashboardData.metrics,
      products: dashboardData.products,
      orders: dashboardData.orders
    })

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `mono-waves-dashboard-report-${timestamp}.pdf`

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating dashboard report:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
