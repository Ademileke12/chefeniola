/**
 * Test Stripe Connection
 * 
 * This script tests the Stripe API connection and configuration
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testStripeConnection() {
  console.log('Testing Stripe Connection...\n')

  // Check environment variables
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  console.log('Environment Variables:')
  console.log('- STRIPE_SECRET_KEY:', secretKey ? `${secretKey.substring(0, 20)}...` : 'NOT SET')
  console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', publishableKey ? `${publishableKey.substring(0, 20)}...` : 'NOT SET')
  console.log('- STRIPE_WEBHOOK_SECRET:', webhookSecret ? `${webhookSecret.substring(0, 20)}...` : 'NOT SET')
  console.log()

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set')
    process.exit(1)
  }

  // Initialize Stripe
  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  })

  try {
    // Test 1: Retrieve account information
    console.log('Test 1: Retrieving Stripe account information...')
    const account = await stripe.account.retrieve()
    console.log('✅ Successfully connected to Stripe')
    console.log('   Account ID:', account.id)
    console.log('   Email:', account.email || 'N/A')
    console.log('   Country:', account.country)
    console.log('   Charges enabled:', account.charges_enabled)
    console.log('   Payouts enabled:', account.payouts_enabled)
    console.log()

    // Test 2: Create a test checkout session
    console.log('Test 2: Creating a test checkout session...')
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
              description: 'This is a test product',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      customer_email: 'test@example.com',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        test: 'true',
      },
      automatic_tax: {
        enabled: true,
      },
    })

    console.log('✅ Successfully created test checkout session')
    console.log('   Session ID:', session.id)
    console.log('   URL:', session.url)
    console.log('   Payment status:', session.payment_status)
    console.log()

    // Test 3: List recent checkout sessions
    console.log('Test 3: Listing recent checkout sessions...')
    const sessions = await stripe.checkout.sessions.list({ limit: 3 })
    console.log(`✅ Found ${sessions.data.length} recent sessions`)
    sessions.data.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.id} - ${s.payment_status} - ${s.customer_email || 'no email'}`)
    })
    console.log()

    console.log('✅ All Stripe tests passed!')
    console.log('\nStripe is configured correctly and working.')

  } catch (error) {
    console.error('❌ Stripe test failed:')
    if (error instanceof Stripe.errors.StripeError) {
      console.error('   Type:', error.type)
      console.error('   Code:', error.code)
      console.error('   Message:', error.message)
      console.error('   Status Code:', error.statusCode)
      if (error.raw) {
        console.error('   Raw error:', JSON.stringify(error.raw, null, 2))
      }
    } else if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    } else {
      console.error('   Unknown error:', error)
    }
    process.exit(1)
  }
}

testStripeConnection()
