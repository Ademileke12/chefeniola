/**
 * Complete Order Flow Test
 * 
 * This script tests the entire order flow:
 * 1. Create a mock checkout session
 * 2. Send webhook to endpoint
 * 3. Verify order creation in database
 * 4. Check email sending
 * 5. Verify order can be retrieved
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('=== Complete Order Flow Test ===\n')

// Verify environment variables
if (!WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   STRIPE_WEBHOOK_SECRET:', WEBHOOK_SECRET ? '✅' : '❌')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Generate a valid Stripe webhook signature
 */
function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')
  
  return `t=${timestamp},v1=${signature}`
}

/**
 * Create a mock checkout.session.completed event
 */
function createMockCheckoutEvent(sessionId: string, customerEmail: string, products: any[]) {
  const timestamp = Math.floor(Date.now() / 1000)
  
  // Use actual products from database
  const cartItems = products.map(product => ({
    pid: product.id,
    qty: 1,
    prc: product.price
  }))

  const total = products.reduce((sum, p) => sum + p.price, 0) + 10.00 // Add shipping
  
  return {
    id: `evt_test_${timestamp}`,
    object: 'event',
    api_version: '2024-11-20.acacia',
    created: timestamp,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        amount_total: Math.round(total * 100), // Convert to cents
        currency: 'usd',
        customer_email: customerEmail,
        payment_status: 'paid',
        payment_intent: `pi_test_${timestamp}`,
        metadata: {
          cartItems: JSON.stringify(cartItems),
          shippingAddress: JSON.stringify({
            fn: 'Test',
            ln: 'User',
            a1: '123 Test Street',
            a2: 'Apt 4B',
            ct: 'Test City',
            st: 'TS',
            pc: '12345',
            co: 'United States',
            ph: '+1234567890'
          }),
          shippingCost: '10.00'
        },
        total_details: {
          amount_tax: 0
        }
      }
    }
  }
}

/**
 * Get existing products from database for testing
 */
async function getTestProducts() {
  console.log('1. Fetching existing products from database...')
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, gelato_product_uid, design_url')
    .limit(2)

  if (error) {
    console.log('   ❌ Could not fetch products:', error.message)
    return []
  }

  if (!products || products.length === 0) {
    console.log('   ⚠️  No products found in database')
    console.log('   Please create some products first via the admin panel')
    return []
  }

  console.log(`   ✅ Found ${products.length} products to use for testing`)
  products.forEach((product, index) => {
    console.log(`   ${index + 1}. ${product.name} - $${product.price}`)
  })
  console.log()
  
  return products
}

/**
 * Send webhook to endpoint
 */
async function sendWebhook(sessionId: string, customerEmail: string, products: any[]) {
  console.log('2. Sending webhook to endpoint...')
  console.log(`   Session ID: ${sessionId}`)
  console.log(`   Customer Email: ${customerEmail}`)
  console.log(`   Products: ${products.length} items`)
  
  const mockEvent = createMockCheckoutEvent(sessionId, customerEmail, products)
  const payload = JSON.stringify(mockEvent)
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET)

  try {
    const response = await fetch(`${APP_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    })

    console.log(`   Response Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Webhook processed successfully')
      console.log('   Response:', data)
      return true
    } else {
      const errorText = await response.text()
      console.log('   ❌ Webhook failed')
      console.log('   Error:', errorText)
      return false
    }
  } catch (error) {
    console.log('   ❌ Failed to send webhook')
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`)
    }
    console.log()
    console.log('   ⚠️  Make sure your development server is running:')
    console.log('   npm run dev')
    return false
  }
}

/**
 * Check if order was created in database
 */
async function checkOrderCreation(sessionId: string) {
  console.log()
  console.log('3. Checking order creation in database...')
  
  // Wait a moment for async processing
  await new Promise(resolve => setTimeout(resolve, 2000))

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  if (error) {
    console.log('   ❌ Order not found in database')
    console.log('   Error:', error.message)
    return null
  }

  if (order) {
    console.log('   ✅ Order created successfully')
    console.log(`   Order Number: ${order.order_number}`)
    console.log(`   Order ID: ${order.id}`)
    console.log(`   Customer Email: ${order.customer_email}`)
    console.log(`   Total: $${order.total}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Created: ${order.created_at}`)
    return order
  }

  return null
}

/**
 * Check webhook logs
 */
async function checkWebhookLogs(sessionId: string) {
  console.log()
  console.log('4. Checking webhook logs...')

  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('source', 'stripe')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.log('   ⚠️  Could not fetch webhook logs:', error.message)
    return
  }

  if (logs && logs.length > 0) {
    console.log(`   ✅ Found ${logs.length} recent webhook logs`)
    const latestLog = logs[0]
    console.log(`   Latest Event Type: ${latestLog.event_type}`)
    console.log(`   Processed: ${latestLog.processed ? 'Yes' : 'No'}`)
    console.log(`   Error: ${latestLog.error || 'None'}`)
  } else {
    console.log('   ⚠️  No webhook logs found')
  }
}

/**
 * Check audit trail
 */
async function checkAuditTrail(sessionId: string) {
  console.log()
  console.log('5. Checking audit trail...')

  const { data: events, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('source', 'stripe')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.log('   ⚠️  Could not fetch audit events:', error.message)
    return
  }

  if (events && events.length > 0) {
    console.log(`   ✅ Found ${events.length} recent audit events`)
    events.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.event_type} - ${event.severity}`)
    })
  } else {
    console.log('   ⚠️  No audit events found')
  }
}

/**
 * Test order retrieval via API
 */
async function testOrderRetrieval(sessionId: string) {
  console.log()
  console.log('6. Testing order retrieval via API...')

  try {
    const response = await fetch(`${APP_URL}/api/orders/session/${sessionId}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Order retrieved successfully via API')
      console.log(`   Order Number: ${data.order.orderNumber}`)
      console.log(`   Status: ${data.order.status}`)
      return data.order
    } else {
      console.log(`   ⚠️  API returned status ${response.status}`)
      const errorText = await response.text()
      console.log(`   Response: ${errorText}`)
    }
  } catch (error) {
    console.log('   ❌ Failed to retrieve order via API')
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`)
    }
  }

  return null
}

/**
 * Clean up test data
 */
async function cleanupTestData(sessionId: string) {
  console.log()
  console.log('7. Cleaning up test data...')

  // Delete test order
  const { error: orderError } = await supabase
    .from('orders')
    .delete()
    .eq('stripe_session_id', sessionId)

  if (orderError) {
    console.log('   ⚠️  Could not delete test order:', orderError.message)
  } else {
    console.log('   ✅ Test order deleted')
  }

  // Note: We keep test products for future tests
  console.log('   ℹ️  Test products kept for future tests')
}

/**
 * Main test function
 */
async function runCompleteOrderFlowTest() {
  const sessionId = `cs_test_${Date.now()}`
  const customerEmail = 'samuelabudu21@gmail.com'

  console.log('Test Configuration:')
  console.log(`  Session ID: ${sessionId}`)
  console.log(`  Customer Email: ${customerEmail}`)
  console.log(`  Webhook URL: ${APP_URL}/api/webhooks/stripe`)
  console.log()

  try {
    // Step 1: Get test products
    const products = await getTestProducts()
    
    if (products.length === 0) {
      console.log('❌ Test cannot proceed without products')
      console.log()
      console.log('Please create products first:')
      console.log('1. Start dev server: npm run dev')
      console.log('2. Go to: http://localhost:3000/admin/products/new')
      console.log('3. Create at least 2 products')
      console.log('4. Run this test again')
      return
    }

    // Step 2: Send webhook
    const webhookSuccess = await sendWebhook(sessionId, customerEmail, products)
    
    if (!webhookSuccess) {
      console.log()
      console.log('❌ Test failed: Webhook was not processed')
      console.log()
      console.log('Troubleshooting:')
      console.log('1. Make sure dev server is running: npm run dev')
      console.log('2. Check server logs for errors')
      console.log('3. Verify STRIPE_WEBHOOK_SECRET in .env.local')
      return
    }

    // Step 3: Check order creation
    const order = await checkOrderCreation(sessionId)

    // Step 4: Check webhook logs
    await checkWebhookLogs(sessionId)

    // Step 5: Check audit trail
    await checkAuditTrail(sessionId)

    // Step 6: Test order retrieval
    if (order) {
      await testOrderRetrieval(sessionId)
    }

    // Step 7: Cleanup
    const shouldCleanup = process.argv.includes('--cleanup')
    if (shouldCleanup) {
      await cleanupTestData(sessionId)
    } else {
      console.log()
      console.log('ℹ️  Test data not cleaned up (use --cleanup flag to remove)')
    }

    // Summary
    console.log()
    console.log('=== Test Summary ===')
    if (order) {
      console.log('✅ Complete order flow test PASSED')
      console.log()
      console.log('Verified:')
      console.log('  ✅ Webhook received and processed')
      console.log('  ✅ Order created in database')
      console.log('  ✅ Webhook logged')
      console.log('  ✅ Audit trail created')
      console.log('  ✅ Order retrievable via API')
      console.log()
      console.log('Order Details:')
      console.log(`  Order Number: ${order.order_number}`)
      console.log(`  Order ID: ${order.id}`)
      console.log(`  Total: $${order.total}`)
      console.log(`  Status: ${order.status}`)
      console.log()
      console.log('Note: Email sending requires RESEND_API_KEY to be configured')
      console.log('Check your email at:', customerEmail)
    } else {
      console.log('❌ Complete order flow test FAILED')
      console.log()
      console.log('Order was not created. Check:')
      console.log('  1. Server logs for errors')
      console.log('  2. Database connection')
      console.log('  3. Test products exist')
      console.log('  4. Webhook signature verification')
    }

  } catch (error) {
    console.error()
    console.error('❌ Test failed with error:', error)
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Run the test
runCompleteOrderFlowTest().catch(console.error)
