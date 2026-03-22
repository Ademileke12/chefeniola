import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import type { DashboardResponse, DashboardMetrics, DashboardProduct, DashboardOrder, OrderStatus } from '@/types'

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

    // Initialize response data with defaults
    let metrics: DashboardMetrics = {
      totalSales: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalRevenue: 0,
    }
    let products: DashboardProduct[] = []
    let orders: DashboardOrder[] = []
    const errors: string[] = []

    // Performance: Fetch only necessary columns for metrics
    const { data: metricsData, error: metricsError } = await supabaseAdmin
      .from('orders')
      .select('total, status')

    if (metricsError) {
      console.error('Metrics query error:', metricsError)
      errors.push(`Failed to fetch dashboard metrics: ${metricsError.message}`)
    } else if (metricsData) {
      metrics.totalOrders = metricsData.length

      // Calculate revenue (all non-failed orders)
      metrics.totalRevenue = Number(metricsData
        .filter((o: { total: number; status: string }) => o.status !== 'failed' && o.status !== 'cancelled')
        .reduce((sum: number, o: { total: number; status: string }) => sum + Number(o.total || 0), 0)
        .toFixed(2))

      // Calculate total sales (completed orders only)
      const completedStatuses: string[] = ['payment_confirmed', 'submitted_to_gelato', 'printing', 'shipped', 'delivered']
      metrics.totalSales = Number(metricsData
        .filter((o: { total: number; status: string }) => completedStatuses.includes(o.status))
        .reduce((sum: number, o: { total: number; status: string }) => sum + Number(o.total || 0), 0)
        .toFixed(2))
    }

    // Fetch 10 most recent orders for display
    const { data: recentOrdersData, error: recentOrdersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total, status, created_at, items')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentOrdersError) {
      console.error('Recent orders query error:', recentOrdersError)
      errors.push(`Failed to fetch recent orders: ${recentOrdersError.message}`)
    } else if (recentOrdersData) {
      orders = recentOrdersData
    }

    // Fetch recent published products
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, published, gelato_product_uid, created_at, images')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (productsError) {
      console.error('Products query error:', productsError)
      errors.push(`Failed to fetch products: ${productsError.message}`)
    } else if (productsData) {
      products = productsData
    }

    // Get total published products count
    const { count: publishedProductsCount, error: productsCountError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)

    if (productsCountError) {
      console.error('Products count query error:', productsCountError)
      errors.push(`Failed to fetch products count: ${productsCountError.message}`)
    } else {
      metrics.totalProducts = publishedProductsCount || 0
    }

    // Prepare response
    const response: DashboardResponse = {
      metrics,
      products,
      orders,
      timestamp: new Date().toISOString(),
    }

    if (errors.length > 0) {
      response.errors = errors
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
