import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { auditService } from '@/lib/services/auditService'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/admin/security/metrics
 * 
 * Fetch security dashboard metrics including:
 * - Payment security metrics
 * - Gelato fulfillment metrics
 * - Tracking & notification metrics
 * - Security alerts
 * - Recent audit events
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

    // Calculate date ranges
    const now = new Date()
    const date24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const date7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const date30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch audit events for different time periods
    const [events24h, events7d, events30d, recentEvents] = await Promise.all([
      auditService.getEvents({ startDate: date24hAgo, limit: 10000 }),
      auditService.getEvents({ startDate: date7dAgo, limit: 10000 }),
      auditService.getEvents({ startDate: date30dAgo, limit: 10000 }),
      auditService.getEvents({ limit: 100 })
    ])

    // ========================================================================
    // Payment Metrics
    // ========================================================================
    
    const paymentMetrics = {
      successRate24h: calculatePaymentSuccessRate(events24h),
      successRate7d: calculatePaymentSuccessRate(events7d),
      successRate30d: calculatePaymentSuccessRate(events30d),
      failuresByReason: getPaymentFailuresByReason(events7d),
      avgProcessingTime: await getAvgProcessingTime(date7dAgo),
      duplicatesPrevented: countEventType(events7d, 'payment.duplicate_prevented')
    }

    // ========================================================================
    // Gelato Metrics
    // ========================================================================
    
    const gelatoMetrics = {
      successRate: calculateGelatoSuccessRate(events7d),
      avgRetries: await getAvgRetries(),
      maxRetries: await getMaxRetries(),
      validationFailures: getGelatoValidationFailures(events7d),
      avgSubmissionTime: await getAvgGelatoSubmissionTime()
    }

    // ========================================================================
    // Tracking Metrics
    // ========================================================================
    
    const trackingMetrics = {
      receivedRate: await getTrackingReceivedRate(),
      emailSuccessRate: calculateEmailSuccessRate(events7d),
      avgTimeToTracking: await getAvgTimeToTracking(),
      ordersAwaitingTracking: await getOrdersAwaitingTracking()
    }

    // ========================================================================
    // Security Alerts
    // ========================================================================
    
    const securityMetrics = {
      signatureFailures24h: countEventType(events24h, 'webhook.signature_failed'),
      rateLimitViolations24h: countEventType(events24h, 'security.rate_limit_exceeded'),
      amountMismatches7d: countEventType(events7d, 'security.payment_amount_mismatch'),
      suspiciousActivity: countEventType(events7d, 'security.suspicious_activity')
    }

    return NextResponse.json({
      metrics: {
        payment: paymentMetrics,
        gelato: gelatoMetrics,
        tracking: trackingMetrics,
        security: securityMetrics
      },
      auditEvents: recentEvents
    })

  } catch (error) {
    console.error('[Security Metrics API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security metrics' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePaymentSuccessRate(events: any[]): number {
  const completed = countEventType(events, 'payment.completed')
  const failed = countEventType(events, 'payment.failed')
  const total = completed + failed
  
  if (total === 0) return 100
  return (completed / total) * 100
}

function getPaymentFailuresByReason(events: any[]): Record<string, number> {
  const failures = events.filter(e => e.eventType === 'payment.failed')
  const byReason: Record<string, number> = {}
  
  failures.forEach(event => {
    const reason = event.metadata?.error || 'Unknown'
    byReason[reason] = (byReason[reason] || 0) + 1
  })
  
  return byReason
}

async function getAvgProcessingTime(since: Date): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('webhook_logs')
      .select('processing_time_ms')
      .gte('created_at', since.toISOString())
      .not('processing_time_ms', 'is', null)

    if (error || !data || data.length === 0) return 0

    const total = data.reduce((sum: number, log: any) => sum + (log.processing_time_ms || 0), 0)
    return total / data.length
  } catch (error) {
    console.error('[Security Metrics] Error calculating avg processing time:', error)
    return 0
  }
}

function countEventType(events: any[], eventType: string): number {
  return events.filter(e => e.eventType === eventType).length
}

function calculateGelatoSuccessRate(events: any[]): number {
  const submitted = countEventType(events, 'order.submitted_to_gelato')
  const failed = countEventType(events, 'order.gelato_submission_failed')
  const total = submitted + failed
  
  if (total === 0) return 100
  return (submitted / total) * 100
}

async function getAvgRetries(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('retry_count')
      .not('retry_count', 'is', null)
      .gt('retry_count', 0)

    if (error || !data || data.length === 0) return 0

    const total = data.reduce((sum: number, order: any) => sum + (order.retry_count || 0), 0)
    return total / data.length
  } catch (error) {
    console.error('[Security Metrics] Error calculating avg retries:', error)
    return 0
  }
}

async function getMaxRetries(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('retry_count')
      .not('retry_count', 'is', null)
      .order('retry_count', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) return 0

    return data[0].retry_count || 0
  } catch (error) {
    console.error('[Security Metrics] Error getting max retries:', error)
    return 0
  }
}

function getGelatoValidationFailures(events: any[]): Array<{ reason: string; count: number }> {
  const failures = events.filter(e => e.eventType === 'order.gelato_submission_failed')
  const byReason: Record<string, number> = {}
  
  failures.forEach(event => {
    const reason = event.metadata?.error || 'Unknown'
    byReason[reason] = (byReason[reason] || 0) + 1
  })
  
  // Convert to array and sort by count
  return Object.entries(byReason)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5
}

async function getAvgGelatoSubmissionTime(): Promise<number> {
  // This would require tracking submission time in audit events
  // For now, return a placeholder
  return 0
}

async function getTrackingReceivedRate(): Promise<number> {
  try {
    const { data: shippedOrders, error: shippedError } = await supabaseAdmin
      .from('orders')
      .select('id, tracking_number')
      .eq('status', 'shipped')

    if (shippedError || !shippedOrders) return 0

    const withTracking = shippedOrders.filter((o: any) => o.tracking_number).length
    const total = shippedOrders.length
    
    if (total === 0) return 100
    return (withTracking / total) * 100
  } catch (error) {
    console.error('[Security Metrics] Error calculating tracking received rate:', error)
    return 0
  }
}

function calculateEmailSuccessRate(events: any[]): number {
  const sent = countEventType(events, 'tracking.email_sent')
  const received = countEventType(events, 'tracking.received')
  
  if (received === 0) return 100
  return (sent / received) * 100
}

async function getAvgTimeToTracking(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('created_at, updated_at, status')
      .eq('status', 'shipped')
      .limit(100)

    if (error || !data || data.length === 0) return 0

    const times = data.map((order: any) => {
      const created = new Date(order.created_at).getTime()
      const updated = new Date(order.updated_at).getTime()
      return (updated - created) / 1000 // Convert to seconds
    })

    const total = times.reduce((sum: number, time: number) => sum + time, 0)
    return total / times.length
  } catch (error) {
    console.error('[Security Metrics] Error calculating avg time to tracking:', error)
    return 0
  }
}

async function getOrdersAwaitingTracking(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted_to_gelato', 'printing'])

    if (error) return 0
    return count || 0
  } catch (error) {
    console.error('[Security Metrics] Error getting orders awaiting tracking:', error)
    return 0
  }
}
