'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/admin/DashboardLayout'
import MetricCard from '@/components/admin/MetricCard'
import DataTable from '@/components/admin/DataTable'
import { authenticatedFetch } from '@/lib/utils/apiClient'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Clock,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface SecurityMetrics {
  payment: {
    successRate24h: number
    successRate7d: number
    successRate30d: number
    failuresByReason: Record<string, number>
    avgProcessingTime: number
    duplicatesPrevented: number
  }
  gelato: {
    successRate: number
    avgRetries: number
    maxRetries: number
    validationFailures: Array<{ reason: string; count: number }>
    avgSubmissionTime: number
  }
  tracking: {
    receivedRate: number
    emailSuccessRate: number
    avgTimeToTracking: number
    ordersAwaitingTracking: number
  }
  security: {
    signatureFailures24h: number
    rateLimitViolations24h: number
    amountMismatches7d: number
    suspiciousActivity: number
  }
}

interface AuditEvent {
  id: string
  timestamp: string
  eventType: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: 'stripe' | 'gelato' | 'system'
  correlationId: string
  metadata: Record<string, any>
}

// ============================================================================
// Component
// ============================================================================

export default function SecurityDashboardPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Date range for audit report
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')

  // Load dashboard data
  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authenticatedFetch('/api/admin/security/metrics')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch security metrics: ${response.statusText}`)
      }
      
      const data = await response.json()
      setMetrics(data.metrics)
      setAuditEvents(data.auditEvents || [])
      
    } catch (error) {
      console.error('Failed to load security data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load security data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSecurityData()
    setRefreshing(false)
  }

  const handleExportCSV = () => {
    // Filter events based on current filters
    const filteredEvents = filterAuditEvents()
    
    // Create CSV content
    const headers = ['Timestamp', 'Event Type', 'Severity', 'Source', 'Correlation ID']
    const rows = filteredEvents.map(event => [
      new Date(event.timestamp).toISOString(),
      event.eventType,
      event.severity,
      event.source,
      event.correlationId
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadAuditReport = async () => {
    try {
      setDownloadingReport(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (reportStartDate) params.append('startDate', reportStartDate)
      if (reportEndDate) params.append('endDate', reportEndDate)
      
      // Fetch the PDF report
      const response = await authenticatedFetch(`/api/admin/security/report?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate audit report')
      }
      
      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with date range
      const start = reportStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end = reportEndDate || new Date().toISOString().split('T')[0]
      link.download = `security-audit-report-${start}-to-${end}.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to download audit report:', error)
      alert('Failed to download audit report. Please try again.')
    } finally {
      setDownloadingReport(false)
    }
  }

  const filterAuditEvents = () => {
    return auditEvents.filter(event => {
      if (severityFilter !== 'all' && event.severity !== severityFilter) return false
      if (sourceFilter !== 'all' && event.source !== sourceFilter) return false
      if (searchTerm && !event.correlationId.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }

  // Transform audit events for table display
  const auditEventColumns = [
    { 
      key: 'timestamp', 
      label: 'Timestamp',
      render: (value: string) => new Date(value).toLocaleString()
    },
    { key: 'eventType', label: 'Event Type' },
    { 
      key: 'severity', 
      label: 'Severity',
      render: (value: string) => {
        const colors = {
          info: 'bg-blue-100 text-blue-800',
          warning: 'bg-yellow-100 text-yellow-800',
          error: 'bg-orange-100 text-orange-800',
          critical: 'bg-red-100 text-red-800'
        }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[value as keyof typeof colors]}`}>
            {value.toUpperCase()}
          </span>
        )
      }
    },
    { 
      key: 'source', 
      label: 'Source',
      render: (value: string) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          {value.toUpperCase()}
        </span>
      )
    },
    { key: 'correlationId', label: 'Correlation ID' }
  ]

  const filteredEvents = filterAuditEvents()
  const auditEventData = filteredEvents.map(event => ({
    timestamp: event.timestamp,
    eventType: event.eventType,
    severity: event.severity,
    source: event.source,
    correlationId: event.correlationId
  }))

  if (loading) {
    return (
      <DashboardLayout activeSection="security">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading security dashboard...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeSection="security">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading security dashboard</div>
            <div className="text-gray-500 text-sm">{error}</div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="security">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor payment security and fulfillment metrics</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-lg active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>
        </div>

        {/* Payment Metrics */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Success Rate (24h)"
              value={`${metrics?.payment.successRate24h?.toFixed(1) || '0.0'}%`}
              icon={<CheckCircle className="w-6 h-6" />}
              trend={metrics?.payment.successRate24h && metrics.payment.successRate24h >= 99 ? { value: 0, direction: 'up' } : undefined}
            />
            <MetricCard
              title="Success Rate (7d)"
              value={`${metrics?.payment.successRate7d.toFixed(1)}%`}
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <MetricCard
              title="Avg Processing Time"
              value={`${metrics?.payment.avgProcessingTime.toFixed(0)}ms`}
              icon={<Clock className="w-6 h-6" />}
            />
            <MetricCard
              title="Duplicates Prevented"
              value={metrics?.payment.duplicatesPrevented || 0}
              icon={<Shield className="w-6 h-6" />}
            />
          </div>
        </div>

        {/* Gelato Metrics */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Gelato Fulfillment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Submission Success Rate"
              value={`${metrics?.gelato.successRate?.toFixed(1) || '0.0'}%`}
              icon={<CheckCircle className="w-6 h-6" />}
              variant={metrics?.gelato.successRate && metrics.gelato.successRate >= 95 ? 'default' : 'warning'}
            />
            <MetricCard
              title="Avg Retries"
              value={metrics?.gelato.avgRetries.toFixed(1) || '0'}
              icon={<RefreshCw className="w-6 h-6" />}
            />
            <MetricCard
              title="Max Retries"
              value={metrics?.gelato.maxRetries || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
            />
            <MetricCard
              title="Avg Submission Time"
              value={`${metrics?.gelato.avgSubmissionTime.toFixed(0)}ms`}
              icon={<Clock className="w-6 h-6" />}
            />
          </div>
        </div>

        {/* Tracking Metrics */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tracking & Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Tracking Received Rate"
              value={`${metrics?.tracking.receivedRate.toFixed(1)}%`}
              icon={<CheckCircle className="w-6 h-6" />}
            />
            <MetricCard
              title="Email Success Rate"
              value={`${metrics?.tracking.emailSuccessRate.toFixed(1)}%`}
              icon={<CheckCircle className="w-6 h-6" />}
            />
            <MetricCard
              title="Avg Time to Tracking"
              value={`${((metrics?.tracking.avgTimeToTracking || 0) / 3600).toFixed(1)}h`}
              icon={<Clock className="w-6 h-6" />}
            />
            <MetricCard
              title="Awaiting Tracking"
              value={metrics?.tracking.ordersAwaitingTracking || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
            />
          </div>
        </div>

        {/* Security Alerts */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Signature Failures (24h)"
              value={metrics?.security.signatureFailures24h || 0}
              icon={<XCircle className="w-6 h-6" />}
              variant={(metrics?.security.signatureFailures24h || 0) > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Rate Limit Violations (24h)"
              value={metrics?.security.rateLimitViolations24h || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
              variant={(metrics?.security.rateLimitViolations24h || 0) > 10 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Amount Mismatches (7d)"
              value={metrics?.security.amountMismatches7d || 0}
              icon={<XCircle className="w-6 h-6" />}
              variant={(metrics?.security.amountMismatches7d || 0) > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Suspicious Activity"
              value={metrics?.security.suspiciousActivity || 0}
              icon={<Shield className="w-6 h-6" />}
              variant={(metrics?.security.suspiciousActivity || 0) > 0 ? 'warning' : 'default'}
            />
          </div>
        </div>

        {/* Audit Event Log */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Audit Event Log</h2>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT CSV</span>
            </button>
          </div>

          {/* Audit Report Generator */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Generate Audit Report (PDF)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleDownloadAuditReport}
                  disabled={downloadingReport}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloadingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>GENERATING...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>DOWNLOAD REPORT</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave dates empty to generate a report for the last 7 days
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="stripe">Stripe</option>
                  <option value="gelato">Gelato</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correlation ID</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by correlation ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Audit Events Table */}
          <DataTable
            title=""
            columns={auditEventColumns}
            data={auditEventData}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
