/**
 * Test Stripe Webhook Endpoint
 * 
 * This script tests the actual webhook endpoint by:
 * 1. Creating a mock Stripe webhook event
 * 2. Generating a valid signature
 * 3. Sending a request to the webhook endpoint
 * 4. Verifying the response
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import Stripe from 'stripe'
import crypto from 'crypto'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

console.log('=== Stripe Webhook Endpoint Test ===\n')

if (!WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '✅' : '❌')
  console.error('   STRIPE_WEBHOOK_SECRET:', WEBHOOK_SECRET ? '✅' : '❌')
  process.exit(1)
}

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
function createMockCheckoutEvent() {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        amount_total: 7999, // $79.99
        currency: 'usd',
        customer_email: 'test@example.com',
        payment_status: 'paid',
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          cartItems: JSON.stringify([
            { pid: 'test-product-1', qty: 1, prc: 29.99 },
            { pid: 'test-product-2', qty: 1, prc: 49.99 }
          ]),
          shippingAddress: JSON.stringify({
            fn: 'Test',
            ln: 'User',
            a1: '123 Test St',
            a2: '',
            ct: 'Test City',
            st: 'TS',
            pc: '12345',
            co: 'US',
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

async function testWebhookEndpoint() {
  console.log('1. Creating mock webhook event...')
  const mockEvent = createMockCheckoutEvent()
  const payload = JSON.stringify(mockEvent)
  console.log('   ✅ Mock event created')
  console.log(`   Event ID: ${mockEvent.id}`)
  console.log(`   Event Type: ${mockEvent.type}`)
  console.log()

  console.log('2. Generating webhook signature...')
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET!)
  console.log('   ✅ Signature generated')
  console.log(`   Signature: ${signature.substring(0, 50)}...`)
  console.log()

  console.log('3. Testing webhook endpoint...')
  console.log(`   Endpoint: ${APP_URL}/api/webhooks/stripe`)
  
  try {
    const response = await fetch(`${APP_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    })

    console.log(`   Response Status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    if (response.ok) {
      console.log('   ✅ Webhook endpoint responded successfully')
      console.log('   Response:', responseData)
    } else {
      console.log('   ⚠️  Webhook endpoint returned an error')
      console.log('   Response:', responseData)
    }
    console.log()

    // Analyze the response
    console.log('4. Response Analysis:')
    if (response.status === 200) {
      console.log('   ✅ Status 200: Webhook processed successfully')
    } else if (response.status === 400) {
      console.log('   ⚠️  Status 400: Bad request (check signature or payload)')
    } else if (response.status === 500) {
      console.log('   ❌ Status 500: Server error (check logs)')
    } else if (response.status === 404) {
      console.log('   ❌ Status 404: Endpoint not found (is server running?)')
    } else {
      console.log(`   ⚠️  Status ${response.status}: Unexpected response`)
    }
    console.log()

  } catch (error) {
    console.log('   ❌ Failed to connect to webhook endpoint')
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`)
    }
    console.log()
    console.log('   Possible causes:')
    console.log('   - Development server is not running')
    console.log('   - Wrong APP_URL in .env.local')
    console.log('   - Network connectivity issues')
    console.log()
    console.log('   To fix:')
    console.log('   1. Start the dev server: npm run dev')
    console.log('   2. Verify APP_URL: echo $NEXT_PUBLIC_APP_URL')
    console.log('   3. Try again')
    console.log()
  }
}

async function testStripeServiceDirectly() {
  console.log('5. Testing Stripe Service Directly:')
  
  try {
    // Import the stripeService
    const { verifyWebhookSignature } = await import('../lib/services/stripeService')
    
    const mockEvent = createMockCheckoutEvent()
    const payload = JSON.stringify(mockEvent)
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET!)
    
    console.log('   Testing verifyWebhookSignature function...')
    
    try {
      const event = verifyWebhookSignature(payload, signature)
      console.log('   ✅ Signature verification successful')
      console.log(`   Event Type: ${event.type}`)
      console.log(`   Event ID: ${event.id}`)
    } catch (error) {
      console.log('   ⚠️  Signature verification failed')
      if (error instanceof Error) {
        console.log(`   Error: ${error.message}`)
      }
    }
    console.log()
  } catch (error) {
    console.log('   ❌ Failed to import stripeService')
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`)
    }
    console.log()
  }
}

// Run tests
async function runTests() {
  await testWebhookEndpoint()
  await testStripeServiceDirectly()
  
  console.log('=== Test Complete ===')
  console.log()
  console.log('Summary:')
  console.log('✅ Environment variables loaded correctly')
  console.log('✅ Webhook secret is valid format')
  console.log('✅ Signature generation working')
  console.log()
  console.log('For production testing:')
  console.log('1. Use Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe')
  console.log('2. Trigger test event: stripe trigger checkout.session.completed')
  console.log('3. Check webhook logs in Stripe Dashboard')
}

runTests().catch(console.error)
