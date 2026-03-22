import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params

    // Validate order ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid order ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    // Fetch order by ID
    const order = await orderService.getOrderById(id)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Error fetching order:', error)

    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Order ID is required')) {
        return NextResponse.json(
          { error: 'Order ID is required' },
          { status: 400 }
        )
      }

      if (error.message.includes('Failed to fetch order')) {
        return NextResponse.json(
          { error: 'Database error while fetching order' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}