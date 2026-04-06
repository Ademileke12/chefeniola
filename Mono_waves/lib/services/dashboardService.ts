/**
 * Dashboard Service
 * 
 * Handles dashboard metrics and data aggregation.
 * Decouples business logic from API routes for better testability.
 */

import { supabaseAdmin } from '../supabase/server'
import type { DashboardMetrics, DashboardProduct, DashboardOrder } from '@/types'

export interface DashboardData {
  metrics: DashboardMetrics
  products: DashboardProduct[]
  orders: DashboardOrder[]
  errors?: string[]
}

/**
 * Fetch dashboard metrics
 */
async function fetchMetrics(): Promise<{ metrics: DashboardMetrics; errors: string[] }> {
  const metrics: DashboardMetrics = {
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
  }
  const errors: string[] = []

  try {
    // Fetch orders for metrics calculation
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('total, status')

    if (ordersError) {
      errors.push(`Failed to fetch order metrics: ${ordersError.message}`)
    } else if (ordersData) {
      metrics.totalOrders = ordersData.length

      // Calculate revenue (all non-failed orders)
      metrics.totalRevenue = Number(ordersData
        .filter((o) => o.status !== 'failed' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total || 0), 0)
        .toFixed(2))

      // Calculate total sales (completed orders only)
      const completedStatuses = ['payment_confirmed', 'submitted_to_gelato', 'printing', 'shipped', 'delivered']
      metrics.totalSales = Number(ordersData
        .filter((o) => completedStatuses.includes(o.status))
        .reduce((sum, o) => sum + Number(o.total || 0), 0)
        .toFixed(2))
    }

    // Get total published products count
    const { count: publishedProductsCount, error: productsCountError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)

    if (productsCountError) {
      errors.push(`Failed to fetch products count: ${productsCountError.message}`)
    } else {
      metrics.totalProducts = publishedProductsCount || 0
    }
  } catch (error) {
    errors.push(`Critical error fetching metrics: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { metrics, errors }
}

/**
 * Fetch recent orders
 */
async function fetchRecentOrders(limit: number = 10): Promise<{ orders: DashboardOrder[]; errors: string[] }> {
  const errors: string[] = []
  let orders: DashboardOrder[] = []

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total, status, created_at, items')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      errors.push(`Failed to fetch recent orders: ${error.message}`)
    } else if (data) {
      orders = data
    }
  } catch (error) {
    errors.push(`Critical error fetching orders: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { orders, errors }
}

/**
 * Fetch recent products
 */
async function fetchRecentProducts(limit: number = 10): Promise<{ products: DashboardProduct[]; errors: string[] }> {
  const errors: string[] = []
  let products: DashboardProduct[] = []

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name, price, published, gelato_product_uid, created_at, images')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      errors.push(`Failed to fetch products: ${error.message}`)
    } else if (data) {
      products = data
    }
  } catch (error) {
    errors.push(`Critical error fetching products: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { products, errors }
}

/**
 * Get complete dashboard data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const allErrors: string[] = []

  // Fetch all data in parallel for better performance
  const [metricsResult, ordersResult, productsResult] = await Promise.all([
    fetchMetrics(),
    fetchRecentOrders(10),
    fetchRecentProducts(10),
  ])

  // Combine errors
  allErrors.push(...metricsResult.errors, ...ordersResult.errors, ...productsResult.errors)

  const dashboardData: DashboardData = {
    metrics: metricsResult.metrics,
    orders: ordersResult.orders,
    products: productsResult.products,
  }

  if (allErrors.length > 0) {
    dashboardData.errors = allErrors
  }

  return dashboardData
}

/**
 * Dashboard service object for easier imports
 */
export const dashboardService = {
  getDashboardData,
  fetchMetrics,
  fetchRecentOrders,
  fetchRecentProducts,
}
