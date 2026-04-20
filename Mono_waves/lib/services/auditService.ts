/**
 * Audit Service
 * 
 * Centralized audit logging and security monitoring service.
 * Provides comprehensive logging of payment, order fulfillment, and security events.
 * 
 * Features:
 * - Async/non-blocking event logging
 * - Event filtering and querying
 * - Security alert detection
 * - Audit report generation
 */

import { supabaseAdmin } from '@/lib/supabase/server'

// ============================================================================
// Types
// ============================================================================

export type AuditEventType =
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.duplicate_prevented'
  | 'order.created'
  | 'order.submitted_to_gelato'
  | 'order.gelato_submission_failed'
  | 'tracking.received'
  | 'tracking.email_sent'
  | 'webhook.received'
  | 'webhook.signature_verified'
  | 'webhook.signature_failed'
  | 'security.rate_limit_exceeded'
  | 'security.suspicious_activity'
  | 'security.payment_amount_mismatch'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

export type AuditSource = 'stripe' | 'gelato' | 'system'

export interface AuditEvent {
  id: string
  timestamp: Date
  eventType: AuditEventType
  severity: AuditSeverity
  source: AuditSource
  correlationId: string
  userId?: string
  metadata: Record<string, any>
  securityFlags?: string[]
  createdAt: Date
}

export interface AuditFilters {
  eventType?: AuditEventType | AuditEventType[]
  severity?: AuditSeverity | AuditSeverity[]
  source?: AuditSource | AuditSource[]
  correlationId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface AuditReport {
  startDate: Date
  endDate: Date
  summary: {
    totalEvents: number
    eventsBySeverity: Record<AuditSeverity, number>
    eventsBySource: Record<AuditSource, number>
    eventsByType: Record<string, number>
  }
  securityAlerts: AuditEvent[]
  criticalEvents: AuditEvent[]
  recommendations: string[]
}

// ============================================================================
// Audit Service Class
// ============================================================================

class AuditService {
  /**
   * Log an audit event to the database
   * 
   * This method is async and non-blocking - errors are caught and logged
   * but do not throw to prevent disrupting the main application flow.
   * 
   * @param event - Event data (without id and timestamp, which are auto-generated)
   */
  async logEvent(
    event: Omit<AuditEvent, 'id' | 'timestamp' | 'createdAt'>
  ): Promise<void> {
    try {
      // Validate required fields
      if (!event.eventType || !event.severity || !event.source || !event.correlationId) {
        console.error('[AuditService] Missing required fields:', event)
        return
      }

      // Insert event into database
      const { error } = await supabaseAdmin
        .from('audit_events')
        .insert({
          event_type: event.eventType,
          severity: event.severity,
          source: event.source,
          correlation_id: event.correlationId,
          user_id: event.userId,
          metadata: event.metadata || {},
          security_flags: event.securityFlags || null,
        })

      if (error) {
        console.error('[AuditService] Failed to log event:', error)
        console.error('[AuditService] Event data:', event)
      }
    } catch (error) {
      // Catch all errors to prevent disrupting main flow
      console.error('[AuditService] Unexpected error logging event:', error)
      console.error('[AuditService] Event data:', event)
    }
  }

  /**
   * Get audit events with optional filtering
   * 
   * @param filters - Filter criteria for querying events
   * @returns Array of audit events matching the filters
   */
  async getEvents(filters: AuditFilters = {}): Promise<AuditEvent[]> {
    try {
      let query = supabaseAdmin
        .from('audit_events')
        .select('*')
        .order('timestamp', { ascending: false })

      // Apply filters
      if (filters.eventType) {
        if (Array.isArray(filters.eventType)) {
          query = query.in('event_type', filters.eventType)
        } else {
          query = query.eq('event_type', filters.eventType)
        }
      }

      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in('severity', filters.severity)
        } else {
          query = query.eq('severity', filters.severity)
        }
      }

      if (filters.source) {
        if (Array.isArray(filters.source)) {
          query = query.in('source', filters.source)
        } else {
          query = query.eq('source', filters.source)
        }
      }

      if (filters.correlationId) {
        query = query.eq('correlation_id', filters.correlationId)
      }

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString())
      }

      // Apply pagination
      const limit = filters.limit || 100
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        console.error('[AuditService] Failed to fetch events:', error)
        return []
      }

      // Map database fields to camelCase
      return (data || []).map(this.mapDbEventToAuditEvent)
    } catch (error) {
      console.error('[AuditService] Unexpected error fetching events:', error)
      return []
    }
  }

  /**
   * Get security alerts (events with critical or error severity)
   * 
   * @param limit - Maximum number of alerts to return (default: 50)
   * @returns Array of security alert events
   */
  async getSecurityAlerts(limit: number = 50): Promise<AuditEvent[]> {
    return this.getEvents({
      severity: ['critical', 'error'],
      limit,
    })
  }

  /**
   * Generate a comprehensive audit report for a date range
   * 
   * @param startDate - Start date for the report
   * @param endDate - End date for the report
   * @returns Audit report with summary statistics and recommendations
   */
  async generateAuditReport(
    startDate: Date,
    endDate: Date
  ): Promise<AuditReport> {
    try {
      // Fetch all events in the date range
      const events = await this.getEvents({
        startDate,
        endDate,
        limit: 10000, // High limit to get all events
      })

      // Calculate summary statistics
      const eventsBySeverity: Record<AuditSeverity, number> = {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      }

      const eventsBySource: Record<AuditSource, number> = {
        stripe: 0,
        gelato: 0,
        system: 0,
      }

      const eventsByType: Record<string, number> = {}

      events.forEach((event) => {
        eventsBySeverity[event.severity]++
        eventsBySource[event.source]++
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1
      })

      // Get security alerts and critical events
      const securityAlerts = events.filter(
        (e) => e.severity === 'critical' || e.severity === 'error'
      )

      const criticalEvents = events.filter((e) => e.severity === 'critical')

      // Generate recommendations based on the data
      const recommendations = this.generateRecommendations(
        events,
        eventsBySeverity,
        eventsByType
      )

      return {
        startDate,
        endDate,
        summary: {
          totalEvents: events.length,
          eventsBySeverity,
          eventsBySource,
          eventsByType,
        },
        securityAlerts,
        criticalEvents,
        recommendations,
      }
    } catch (error) {
      console.error('[AuditService] Failed to generate audit report:', error)
      throw error
    }
  }

  /**
   * Generate recommendations based on audit data
   * 
   * @private
   */
  private generateRecommendations(
    events: AuditEvent[],
    eventsBySeverity: Record<AuditSeverity, number>,
    eventsByType: Record<string, number>
  ): string[] {
    const recommendations: string[] = []

    // Check for high error rate
    const errorRate = (eventsBySeverity.error + eventsBySeverity.critical) / events.length
    if (errorRate > 0.05) {
      recommendations.push(
        `High error rate detected (${(errorRate * 100).toFixed(1)}%). Review error logs and investigate root causes.`
      )
    }

    // Check for webhook signature failures
    const signatureFailures = eventsByType['webhook.signature_failed'] || 0
    if (signatureFailures > 0) {
      recommendations.push(
        `${signatureFailures} webhook signature verification failures detected. Verify webhook secrets are correctly configured.`
      )
    }

    // Check for payment amount mismatches
    const amountMismatches = eventsByType['security.payment_amount_mismatch'] || 0
    if (amountMismatches > 0) {
      recommendations.push(
        `${amountMismatches} payment amount mismatches detected. This may indicate attempted fraud or calculation errors.`
      )
    }

    // Check for rate limit violations
    const rateLimitViolations = eventsByType['security.rate_limit_exceeded'] || 0
    if (rateLimitViolations > 10) {
      recommendations.push(
        `${rateLimitViolations} rate limit violations detected. Consider adjusting rate limits or investigating potential abuse.`
      )
    }

    // Check for Gelato submission failures
    const gelatoFailures = eventsByType['order.gelato_submission_failed'] || 0
    const gelatoSubmissions = eventsByType['order.submitted_to_gelato'] || 0
    if (gelatoFailures > 0 && gelatoSubmissions > 0) {
      const failureRate = gelatoFailures / (gelatoFailures + gelatoSubmissions)
      if (failureRate > 0.05) {
        recommendations.push(
          `Gelato submission failure rate is ${(failureRate * 100).toFixed(1)}%. Review Gelato API integration and validation logic.`
        )
      }
    }

    // Check for payment failures
    const paymentFailures = eventsByType['payment.failed'] || 0
    const paymentCompletions = eventsByType['payment.completed'] || 0
    if (paymentFailures > 0 && paymentCompletions > 0) {
      const failureRate = paymentFailures / (paymentFailures + paymentCompletions)
      if (failureRate > 0.1) {
        recommendations.push(
          `Payment failure rate is ${(failureRate * 100).toFixed(1)}%. Review payment processing flow and error handling.`
        )
      }
    }

    // If no issues found
    if (recommendations.length === 0) {
      recommendations.push('No significant issues detected. System is operating normally.')
    }

    return recommendations
  }

  /**
   * Map database event to AuditEvent interface
   * 
   * @private
   */
  private mapDbEventToAuditEvent(dbEvent: any): AuditEvent {
    return {
      id: dbEvent.id,
      timestamp: new Date(dbEvent.timestamp),
      eventType: dbEvent.event_type,
      severity: dbEvent.severity,
      source: dbEvent.source,
      correlationId: dbEvent.correlation_id,
      userId: dbEvent.user_id,
      metadata: dbEvent.metadata || {},
      securityFlags: dbEvent.security_flags || [],
      createdAt: new Date(dbEvent.created_at),
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const auditService = new AuditService()
