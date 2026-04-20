/**
 * Comprehensive System Audit Script
 * 
 * Enterprise-level debugging and verification of:
 * 1. Payment Security (Stripe)
 * 2. Order Fulfillment (Gelato)
 * 3. Tracking System
 * 4. Email Notifications
 * 5. Database Integrity
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

interface AuditResult {
  category: string
  test: string
  status: 'PASS' | 'FAIL' | 'WARNING' | 'CRITICAL'
  message: string
  details?: any
}

const results: AuditResult[] = []

function logResult(result: AuditResult) {
  results.push(result)
  const icon = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARNING': '⚠️',
    'CRITICAL': '🚨'
  }[result.status]
  
  console.log(`${icon} [${result.category}] ${result.test}`)
  console.log(`   ${result.message}`)
  if (result.details) {
    console.log(`   Details:`, result.details)
  }
  console.log('')
}

async function auditEnvironmentVariables() {
  console.log('\n🔍 AUDITING ENVIRONMENT VARIABLES\n')
  
  // Stripe Configuration
  const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET
  
  logResult({
    category: 'Environment',
    test: 'Stripe Publishable Key',
    status: stripePublishable?.startsWith('pk_') ? 'PASS' : 'CRITICAL',
    message: stripePublishable ? `Configured (${stripePublishable.substring(0, 10)}...)` : 'MISSING',
    details: { isTest: stripePublishable?.includes('test') }
  })
  
  logResult({
    category: 'Environment',
    test: 'Stripe Secret Key',
    status: stripeSecret?.startsWith('sk_') ? 'PASS' : 'CRITICAL',
    message: stripeSecret ? `Configured (${stripeSecret.substring(0, 10)}...)` : 'MISSING',
    details: { isTest: stripeSecret?.includes('test') }
  })
  
  logResult({
    category: 'Environment',
    test: 'Stripe Webhook Secret',
    status: stripeWebhook?.startsWith('whsec_') ? 'PASS' : 'CRITICAL',
    message: stripeWebhook ? `Configured (${stripeWebhook.substring(0, 15)}...)` : 'MISSING'
  })
  
  // Gelato Configuration
  const gelatoApiKey = process.env.GELATO_API_KEY
  const gelatoWebhook = process.env.GELATO_WEBHOOK_SECRET
  const gelatoTestMode = process.env.GELATO_TEST_MODE
  
  logResult({
    category: 'Environment',
    test: 'Gelato API Key',
    status: gelatoApiKey ? 'PASS' : 'CRITICAL',
    message: gelatoApiKey ? `Configured (${gelatoApiKey.substring(0, 20)}...)` : 'MISSING',
    details: { testMode: gelatoTestMode === 'true' }
  })
  
  logResult({
    category: 'Environment',
    test: 'Gelato Webhook Secret',
    status: gelatoWebhook ? 'PASS' : 'WARNING',
    message: gelatoWebhook ? 'Configured' : 'MISSING (webhooks may not work)'
  })
  
  // Email Configuration
  const resendApiKey = process.env.RESEND_API_KEY
  const senderEmail = process.env.SENDER_EMAIL
  const supportEmail = process.env.SUPPORT_EMAIL
  
  logResult({
    category: 'Environment',
    test: 'Resend API Key',
    status: resendApiKey?.startsWith('re_') ? 'PASS' : 'CRITICAL',
    message: resendApiKey ? `Configured (${resendApiKey.substring(0, 10)}...)` : 'MISSING'
  })
  
  logResult({
    category: 'Environment',
    test: 'Email Configuration',
    status: (senderEmail && supportEmail) ? 'PASS' : 'WARNING',
    message: `Sender: ${senderEmail || 'MISSING'}, Support: ${supportEmail || 'MISSING'}`
  })
  
  // Database Configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  logResult({
    category: 'Environment',
    test: 'Supabase Configuration',
    status: (supabaseUrl && supabaseKey) ? 'PASS' : 'CRITICAL',
    message: supabaseUrl ? `URL: ${supabaseUrl}` : 'MISSING'
  })
}

async function auditStripeIntegration() {
  console.log('\n🔍 AUDITING STRIPE PAYMENT SECURITY\n')
  
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia'
    })
    
    // Test API connection
    try {
      const balance = await stripe.balance.retrieve()
      logResult({
        category: 'Stripe',
        test: 'API Connection',
        status: 'PASS',
        message: 'Successfully connected to Stripe API',
        details: { 
          available: balance.available.map(b => `${b.amount/100} ${b.currency}`),
          pending: balance.pending.map(b => `${b.amount/100} ${b.currency}`)
        }
      })
    } catch (error) {
      logResult({
        category: 'Stripe',
        test: 'API Connection',
        status: 'CRITICAL',
        message: 'Failed to connect to Stripe API',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
    
    // Check webhook endpoint configuration
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      const hasWebhook = webhooks.data.some(wh => 
        wh.url.includes('/api/webhooks/stripe') && wh.status === 'enabled'
      )
      
      logResult({
        category: 'Stripe',
        test: 'Webhook Configuration',
        status: hasWebhook ? 'PASS' : 'WARNING',
        message: hasWebhook ? 'Webhook endpoint configured' : 'No active webhook found',
        details: { 
          totalWebhooks: webhooks.data.length,
          webhooks: webhooks.data.map(wh => ({
            url: wh.url,
            status: wh.status,
            events: wh.enabled_events.length
          }))
        }
      })
    } catch (error) {
      logResult({
        category: 'Stripe',
        test: 'Webhook Configuration',
        status: 'WARNING',
        message: 'Could not verify webhook configuration',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
    
    // Verify webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    logResult({
      category: 'Stripe',
      test: 'Webhook Secret Verification',
      status: webhookSecret?.startsWith('whsec_') ? 'PASS' : 'CRITICAL',
      message: webhookSecret ? 'Webhook secret properly formatted' : 'Invalid or missing webhook secret'
    })
    
  } catch (error) {
    logResult({
      category: 'Stripe',
      test: 'Integration',
      status: 'CRITICAL',
      message: 'Failed to initialize Stripe',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

async function auditGelatoIntegration() {
  console.log('\n🔍 AUDITING GELATO FULFILLMENT SYSTEM\n')
  
  const apiKey = process.env.GELATO_API_KEY
  const testMode = process.env.GELATO_TEST_MODE === 'true'
  
  logResult({
    category: 'Gelato',
    test: 'Test Mode Status',
    status: testMode ? 'WARNING' : 'PASS',
    message: testMode ? 'Running in TEST MODE - orders will not be fulfilled' : 'Running in PRODUCTION MODE',
    details: { testMode }
  })
  
  if (!apiKey) {
    logResult({
      category: 'Gelato',
      test: 'API Configuration',
      status: 'CRITICAL',
      message: 'Gelato API key is missing'
    })
    return
  }
  
  // Test Gelato API connection
  try {
    const response = await fetch('https://product.gelatoapis.com/v3/products?limit=1', {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      logResult({
        category: 'Gelato',
        test: 'API Connection',
        status: 'PASS',
        message: 'Successfully connected to Gelato API'
      })
    } else {
      logResult({
        category: 'Gelato',
        test: 'API Connection',
        status: 'CRITICAL',
        message: `Gelato API returned error: ${response.status} ${response.statusText}`,
        details: { status: response.status, statusText: response.statusText }
      })
    }
  } catch (error) {
    logResult({
      category: 'Gelato',
      test: 'API Connection',
      status: 'CRITICAL',
      message: 'Failed to connect to Gelato API',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  // Check webhook configuration
  const webhookSecret = process.env.GELATO_WEBHOOK_SECRET
  logResult({
    category: 'Gelato',
    test: 'Webhook Secret',
    status: webhookSecret ? 'PASS' : 'WARNING',
    message: webhookSecret ? 'Webhook secret configured' : 'Webhook secret missing - tracking updates may not work'
  })
}

async function auditDatabaseSchema() {
  console.log('\n🔍 AUDITING DATABASE SCHEMA\n')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    logResult({
      category: 'Database',
      test: 'Orders Table',
      status: ordersError ? 'CRITICAL' : 'PASS',
      message: ordersError ? `Error: ${ordersError.message}` : 'Orders table accessible',
      details: orders?.[0] ? Object.keys(orders[0]) : []
    })
    
    // Check if tracking fields exist
    if (orders && orders.length > 0) {
      const hasTracking = 'tracking_number' in orders[0] && 'carrier' in orders[0]
      logResult({
        category: 'Database',
        test: 'Tracking Fields',
        status: hasTracking ? 'PASS' : 'CRITICAL',
        message: hasTracking ? 'Tracking fields present' : 'Tracking fields missing in orders table'
      })
      
      const hasGelato = 'gelato_order_id' in orders[0]
      logResult({
        category: 'Database',
        test: 'Gelato Integration Fields',
        status: hasGelato ? 'PASS' : 'CRITICAL',
        message: hasGelato ? 'Gelato order ID field present' : 'Gelato order ID field missing'
      })
      
      const hasTax = 'tax' in orders[0]
      logResult({
        category: 'Database',
        test: 'Tax Column',
        status: hasTax ? 'PASS' : 'WARNING',
        message: hasTax ? 'Tax column present' : 'Tax column missing (migration 008 may not be run)'
      })
    }
    
    // Check products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    logResult({
      category: 'Database',
      test: 'Products Table',
      status: productsError ? 'CRITICAL' : 'PASS',
      message: productsError ? `Error: ${productsError.message}` : 'Products table accessible'
    })
    
    // Check webhook_logs table
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1)
    
    logResult({
      category: 'Database',
      test: 'Webhook Logs Table',
      status: webhookError ? 'WARNING' : 'PASS',
      message: webhookError ? 'Webhook logs table missing or inaccessible' : 'Webhook logs table accessible'
    })
    
  } catch (error) {
    logResult({
      category: 'Database',
      test: 'Connection',
      status: 'CRITICAL',
      message: 'Failed to connect to database',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

async function auditOrderFlow() {
  console.log('\n🔍 AUDITING ORDER FLOW\n')
  
  // Check if order service exists and has required methods
  try {
    const orderServicePath = resolve(process.cwd(), 'lib/services/orderService.ts')
    const fs = await import('fs')
    const orderServiceContent = fs.readFileSync(orderServicePath, 'utf-8')
    
    const requiredMethods = [
      'createOrder',
      'submitToGelato',
      'updateTrackingInfo',
      'getOrderBySessionId'
    ]
    
    const missingMethods = requiredMethods.filter(method => 
      !orderServiceContent.includes(`async ${method}`) && 
      !orderServiceContent.includes(`${method}:`)
    )
    
    logResult({
      category: 'Order Flow',
      test: 'Order Service Methods',
      status: missingMethods.length === 0 ? 'PASS' : 'CRITICAL',
      message: missingMethods.length === 0 
        ? 'All required methods present' 
        : `Missing methods: ${missingMethods.join(', ')}`,
      details: { required: requiredMethods, missing: missingMethods }
    })
    
  } catch (error) {
    logResult({
      category: 'Order Flow',
      test: 'Order Service',
      status: 'CRITICAL',
      message: 'Order service file not found or unreadable',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  // Check webhook handler
  try {
    const webhookPath = resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts')
    const fs = await import('fs')
    const webhookContent = fs.readFileSync(webhookPath, 'utf-8')
    
    const hasOrderCreation = webhookContent.includes('createOrder')
    const hasGelatoSubmission = webhookContent.includes('submitToGelato')
    const hasEmailNotification = webhookContent.includes('sendOrderConfirmation')
    
    logResult({
      category: 'Order Flow',
      test: 'Webhook Handler Completeness',
      status: (hasOrderCreation && hasGelatoSubmission && hasEmailNotification) ? 'PASS' : 'CRITICAL',
      message: 'Webhook handler analysis',
      details: {
        orderCreation: hasOrderCreation ? 'Present' : 'MISSING',
        gelatoSubmission: hasGelatoSubmission ? 'Present' : 'MISSING',
        emailNotification: hasEmailNotification ? 'Present' : 'MISSING'
      }
    })
    
  } catch (error) {
    logResult({
      category: 'Order Flow',
      test: 'Webhook Handler',
      status: 'CRITICAL',
      message: 'Webhook handler file not found',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

async function auditTrackingSystem() {
  console.log('\n🔍 AUDITING TRACKING SYSTEM\n')
  
  // Check tracking page
  try {
    const trackingPagePath = resolve(process.cwd(), 'app/(storefront)/track/page.tsx')
    const fs = await import('fs')
    
    if (fs.existsSync(trackingPagePath)) {
      logResult({
        category: 'Tracking',
        test: 'Tracking Page',
        status: 'PASS',
        message: 'Tracking page exists'
      })
    } else {
      logResult({
        category: 'Tracking',
        test: 'Tracking Page',
        status: 'WARNING',
        message: 'Tracking page not found at expected location'
      })
    }
    
    // Check tracking API
    const trackingApiPath = resolve(process.cwd(), 'app/api/orders/track/route.ts')
    if (fs.existsSync(trackingApiPath)) {
      logResult({
        category: 'Tracking',
        test: 'Tracking API',
        status: 'PASS',
        message: 'Tracking API endpoint exists'
      })
    } else {
      logResult({
        category: 'Tracking',
        test: 'Tracking API',
        status: 'CRITICAL',
        message: 'Tracking API endpoint not found'
      })
    }
    
    // Check Gelato webhook handler for tracking updates
    const gelatoWebhookPath = resolve(process.cwd(), 'app/api/webhooks/gelato/route.ts')
    if (fs.existsSync(gelatoWebhookPath)) {
      const webhookContent = fs.readFileSync(gelatoWebhookPath, 'utf-8')
      const hasTrackingUpdate = webhookContent.includes('tracking') || webhookContent.includes('shipped')
      
      logResult({
        category: 'Tracking',
        test: 'Gelato Webhook Handler',
        status: hasTrackingUpdate ? 'PASS' : 'WARNING',
        message: hasTrackingUpdate 
          ? 'Webhook handles tracking updates' 
          : 'Webhook may not handle tracking updates properly'
      })
    } else {
      logResult({
        category: 'Tracking',
        test: 'Gelato Webhook Handler',
        status: 'WARNING',
        message: 'Gelato webhook handler not found'
      })
    }
    
  } catch (error) {
    logResult({
      category: 'Tracking',
      test: 'System Files',
      status: 'CRITICAL',
      message: 'Error checking tracking system files',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

async function auditEmailSystem() {
  console.log('\n🔍 AUDITING EMAIL NOTIFICATION SYSTEM\n')
  
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    logResult({
      category: 'Email',
      test: 'Configuration',
      status: 'CRITICAL',
      message: 'Resend API key is missing'
    })
    return
  }
  
  // Test Resend API connection
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
    })
    
    // Even if it fails due to invalid email, a 422 means API is working
    if (response.status === 422 || response.ok) {
      logResult({
        category: 'Email',
        test: 'Resend API Connection',
        status: 'PASS',
        message: 'Resend API is accessible and responding'
      })
    } else if (response.status === 401) {
      logResult({
        category: 'Email',
        test: 'Resend API Connection',
        status: 'CRITICAL',
        message: 'Resend API key is invalid',
        details: { status: response.status }
      })
    } else {
      logResult({
        category: 'Email',
        test: 'Resend API Connection',
        status: 'WARNING',
        message: `Unexpected response from Resend API: ${response.status}`,
        details: { status: response.status }
      })
    }
  } catch (error) {
    logResult({
      category: 'Email',
      test: 'Resend API Connection',
      status: 'CRITICAL',
      message: 'Failed to connect to Resend API',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
  
  // Check email templates
  try {
    const fs = await import('fs')
    const templatesPath = resolve(process.cwd(), 'lib/email-templates')
    
    const requiredTemplates = [
      'orderConfirmation.ts',
      'shippingNotification.ts',
      'adminNotification.ts'
    ]
    
    const missingTemplates = requiredTemplates.filter(template => 
      !fs.existsSync(resolve(templatesPath, template))
    )
    
    logResult({
      category: 'Email',
      test: 'Email Templates',
      status: missingTemplates.length === 0 ? 'PASS' : 'WARNING',
      message: missingTemplates.length === 0 
        ? 'All email templates present' 
        : `Missing templates: ${missingTemplates.join(', ')}`
    })
    
  } catch (error) {
    logResult({
      category: 'Email',
      test: 'Email Templates',
      status: 'WARNING',
      message: 'Could not verify email templates',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 COMPREHENSIVE SYSTEM AUDIT REPORT')
  console.log('='.repeat(80) + '\n')
  
  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === 'PASS').length,
    warning: results.filter(r => r.status === 'WARNING').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    critical: results.filter(r => r.status === 'CRITICAL').length
  }
  
  console.log('SUMMARY:')
  console.log(`  Total Tests: ${summary.total}`)
  console.log(`  ✅ Passed: ${summary.pass}`)
  console.log(`  ⚠️  Warnings: ${summary.warning}`)
  console.log(`  ❌ Failed: ${summary.fail}`)
  console.log(`  🚨 Critical: ${summary.critical}`)
  console.log('')
  
  // Critical issues
  const criticalIssues = results.filter(r => r.status === 'CRITICAL')
  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:')
    criticalIssues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.category}] ${issue.test}`)
      console.log(`     ${issue.message}`)
    })
    console.log('')
  }
  
  // Warnings
  const warnings = results.filter(r => r.status === 'WARNING')
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:')
    warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. [${warning.category}] ${warning.test}`)
      console.log(`     ${warning.message}`)
    })
    console.log('')
  }
  
  // Overall system health
  const healthScore = ((summary.pass / summary.total) * 100).toFixed(1)
  console.log(`OVERALL SYSTEM HEALTH: ${healthScore}%`)
  
  if (summary.critical > 0) {
    console.log('STATUS: 🚨 CRITICAL - System has critical issues that must be fixed')
  } else if (summary.warning > 3) {
    console.log('STATUS: ⚠️  WARNING - System has multiple warnings')
  } else if (summary.warning > 0) {
    console.log('STATUS: ✅ GOOD - System is operational with minor warnings')
  } else {
    console.log('STATUS: ✅ EXCELLENT - All systems operational')
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

async function main() {
  console.log('🚀 Starting Comprehensive System Audit...\n')
  console.log('This audit will check:')
  console.log('  • Payment Security (Stripe)')
  console.log('  • Order Fulfillment (Gelato)')
  console.log('  • Tracking System')
  console.log('  • Email Notifications')
  console.log('  • Database Integrity')
  console.log('')
  
  await auditEnvironmentVariables()
  await auditStripeIntegration()
  await auditGelatoIntegration()
  await auditDatabaseSchema()
  await auditOrderFlow()
  await auditTrackingSystem()
  await auditEmailSystem()
  await generateReport()
}

main().catch(console.error)
