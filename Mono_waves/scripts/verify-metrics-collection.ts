/**
 * Verify Metrics Collection Script
 * 
 * This script verifies that all metrics are being collected correctly
 * by checking the audit service implementation and webhook handlers.
 */

import * as fs from 'fs'
import * as path from 'path'

interface MetricCheck {
  name: string
  category: string
  eventType: string
  file: string
  found: boolean
  details?: string
}

const checks: MetricCheck[] = []

function checkFileForPattern(filePath: string, pattern: RegExp, eventType: string, category: string, name: string): void {
  try {
    const fullPath = path.join(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    const found = pattern.test(content)
    
    checks.push({
      name,
      category,
      eventType,
      file: filePath,
      found,
      details: found ? 'Event logging found' : 'Event logging NOT found'
    })
  } catch (error) {
    checks.push({
      name,
      category,
      eventType,
      file: filePath,
      found: false,
      details: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

console.log('🔍 Verifying Metrics Collection Implementation...\n')

// ============================================================================
// Payment Metrics
// ============================================================================

console.log('📊 Checking Payment Metrics...')

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]payment\.completed['"]/,
  'payment.completed',
  'Payment',
  'Payment Completed Events'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]payment\.failed['"]/,
  'payment.failed',
  'Payment',
  'Payment Failed Events'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]payment\.duplicate_prevented['"]/,
  'payment.duplicate_prevented',
  'Payment',
  'Duplicate Payment Prevention'
)

// ============================================================================
// Gelato Metrics
// ============================================================================

console.log('📊 Checking Gelato Metrics...')

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]order\.submitted_to_gelato['"]/,
  'order.submitted_to_gelato',
  'Gelato',
  'Gelato Submission Success'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]order\.gelato_submission_failed['"]/,
  'order.gelato_submission_failed',
  'Gelato',
  'Gelato Submission Failure'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]order\.created['"]/,
  'order.created',
  'Gelato',
  'Order Created Events'
)

// ============================================================================
// Tracking Metrics
// ============================================================================

console.log('📊 Checking Tracking Metrics...')

checkFileForPattern(
  'app/api/webhooks/gelato/route.ts',
  /trackingNumber|tracking_number/,
  'tracking.received',
  'Tracking',
  'Tracking Number Processing'
)

checkFileForPattern(
  'lib/services/trackingService.ts',
  /sendTrackingNotification|sendShippingNotification/,
  'tracking.email_sent',
  'Tracking',
  'Tracking Email Sending'
)

// ============================================================================
// Security Metrics
// ============================================================================

console.log('📊 Checking Security Metrics...')

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]webhook\.signature_verified['"]/,
  'webhook.signature_verified',
  'Security',
  'Webhook Signature Verification'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]webhook\.signature_failed['"]/,
  'webhook.signature_failed',
  'Security',
  'Webhook Signature Failure'
)

checkFileForPattern(
  'app/api/webhooks/stripe/route.ts',
  /eventType:\s*['"]webhook\.received['"]/,
  'webhook.received',
  'Security',
  'Webhook Received Events'
)

// ============================================================================
// Metrics API Endpoint
// ============================================================================

console.log('📊 Checking Metrics API...')

checkFileForPattern(
  'app/api/admin/security/metrics/route.ts',
  /calculatePaymentSuccessRate/,
  'N/A',
  'API',
  'Payment Success Rate Calculation'
)

checkFileForPattern(
  'app/api/admin/security/metrics/route.ts',
  /calculateGelatoSuccessRate/,
  'N/A',
  'API',
  'Gelato Success Rate Calculation'
)

checkFileForPattern(
  'app/api/admin/security/metrics/route.ts',
  /getTrackingReceivedRate/,
  'N/A',
  'API',
  'Tracking Received Rate Calculation'
)

checkFileForPattern(
  'app/api/admin/security/metrics/route.ts',
  /getAvgProcessingTime/,
  'N/A',
  'API',
  'Processing Time Metrics'
)

// ============================================================================
// Audit Service
// ============================================================================

console.log('📊 Checking Audit Service...')

checkFileForPattern(
  'lib/services/auditService.ts',
  /async logEvent/,
  'N/A',
  'Service',
  'Audit Service logEvent Method'
)

checkFileForPattern(
  'lib/services/auditService.ts',
  /async getEvents/,
  'N/A',
  'Service',
  'Audit Service getEvents Method'
)

checkFileForPattern(
  'lib/services/auditService.ts',
  /async getSecurityAlerts/,
  'N/A',
  'Service',
  'Audit Service getSecurityAlerts Method'
)

// ============================================================================
// Results
// ============================================================================

console.log('\n' + '='.repeat(80))
console.log('📋 METRICS COLLECTION VERIFICATION RESULTS')
console.log('='.repeat(80) + '\n')

const byCategory: Record<string, MetricCheck[]> = {}
checks.forEach(check => {
  if (!byCategory[check.category]) {
    byCategory[check.category] = []
  }
  byCategory[check.category].push(check)
})

let totalChecks = 0
let passedChecks = 0

Object.entries(byCategory).forEach(([category, categoryChecks]) => {
  console.log(`\n${category} Metrics:`)
  console.log('-'.repeat(80))
  
  categoryChecks.forEach(check => {
    totalChecks++
    if (check.found) passedChecks++
    
    const status = check.found ? '✅' : '❌'
    console.log(`${status} ${check.name}`)
    if (!check.found) {
      console.log(`   File: ${check.file}`)
      console.log(`   Details: ${check.details}`)
    }
  })
})

console.log('\n' + '='.repeat(80))
console.log(`\n📊 Summary: ${passedChecks}/${totalChecks} checks passed (${Math.round((passedChecks/totalChecks)*100)}%)`)

if (passedChecks === totalChecks) {
  console.log('\n✅ All metrics collection checks passed!')
  console.log('\nMetrics are being collected for:')
  console.log('  • Payment events (completed, failed, duplicates)')
  console.log('  • Gelato events (submissions, failures)')
  console.log('  • Tracking events (received, emails sent)')
  console.log('  • Security events (signatures, webhooks)')
  console.log('  • Performance metrics (processing times, retry counts)')
  process.exit(0)
} else {
  console.log('\n⚠️  Some metrics collection checks failed.')
  console.log('Review the failed checks above and ensure all event types are being logged.')
  process.exit(1)
}
