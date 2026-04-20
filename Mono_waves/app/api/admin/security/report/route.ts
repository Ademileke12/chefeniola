import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { auditService } from '@/lib/services/auditService'
import { reportService } from '@/lib/services/reportService'

/**
 * GET /api/admin/security/report
 * 
 * Generate and download a PDF audit report for a specified date range
 * 
 * Query parameters:
 * - startDate: ISO date string (default: 7 days ago)
 * - endDate: ISO date string (default: now)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    try {
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Default to last 7 days if not specified
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Generate audit report
    const auditReport = await auditService.generateAuditReport(startDate, endDate)

    // Generate PDF
    const pdf = reportService.generateAuditReport(auditReport)

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="security-audit-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('[Security Report API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate audit report' },
      { status: 500 }
    )
  }
}
