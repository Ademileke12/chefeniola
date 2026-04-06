import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { requireAdmin } from '@/lib/auth'
import { containsXSS, containsSQLInjection } from '@/lib/utils/validation'
import type { OrderFilters } from '@/types/order'

export async function GET(request: NextRequest) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)

    // Build filters from query parameters
    const filters: OrderFilters = {}

    const status = searchParams.get('status')
    if (status) {
      // Validate status value
      const validStatuses = [
        'pending',
        'payment_confirmed',
        'submitted_to_gelato',
        'printing',
        'shipped',
        'delivered',
        'cancelled',
        'failed'
      ]

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }

      filters.status = status as any
    }

    const search = searchParams.get('search')
    if (search) {
      // Validate for XSS and SQL injection
      if (containsXSS(search)) {
        return NextResponse.json(
          { error: 'Invalid search query: contains potentially malicious content' },
          { status: 400 }
        )
      }
      
      if (containsSQLInjection(search)) {
        return NextResponse.json(
          { error: 'Invalid search query: contains potentially malicious SQL patterns' },
          { status: 400 }
        )
      }
      
      filters.search = search.trim()
    }

    const startDate = searchParams.get('startDate')
    if (startDate) {
      // Validate date format
      const date = new Date(startDate)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO date string.' },
          { status: 400 }
        )
      }
      filters.startDate = startDate
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      // Validate date format
      const date = new Date(endDate)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO date string.' },
          { status: 400 }
        )
      }
      filters.endDate = endDate
    }

    // Parse pagination params
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    filters.page = Math.max(1, page)
    filters.pageSize = Math.min(100, Math.max(1, pageSize))

    // Fetch orders with filters and pagination
    const { orders, total } = await orderService.getAllOrders(filters)

    return NextResponse.json({
      orders,
      count: orders.length,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      filters
    })

  } catch (error) {
    console.error('Error fetching orders:', error)

    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch orders')) {
        return NextResponse.json(
          { error: 'Database error while fetching orders' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}