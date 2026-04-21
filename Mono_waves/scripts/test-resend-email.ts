/**
 * Test Resend Email Service
 * 
 * This script tests the Resend API by sending a test email
 * to verify the email service is working correctly.
 */

// Load environment variables FIRST
require('dotenv').config({ path: '.env.local' })

import { Resend } from 'resend'
import type { OrderItem, ShippingAddress } from '@/types'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev'
const TEST_EMAIL = 'samuelabudu21@gmail.com'

async function testResendConnection() {
  console.log('='.repeat(60))
  console.log('RESEND EMAIL SERVICE TEST')
  console.log('='.repeat(60))
  console.log()

  // Check API key
  console.log('1. Checking Resend API Key...')
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in environment variables')
    return
  }
  console.log(`✅ API Key found: ${RESEND_API_KEY.substring(0, 10)}...`)
  console.log(`   Sender Email: ${SENDER_EMAIL}`)
  console.log()

  // Test 1: Simple email with Resend SDK directly
  console.log('2. Testing direct Resend SDK...')
  try {
    const resend = new Resend(RESEND_API_KEY)
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: TEST_EMAIL,
      subject: 'Test Email from MonoWaves - Direct SDK',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Test Email - Direct SDK</h1>
          <p>This is a test email sent directly using the Resend SDK.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, the Resend API is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This is a test email from MonoWaves E-commerce Platform
          </p>
        </div>
      `,
    })
    console.log('✅ Direct SDK test successful!')
    console.log('   Email ID:', result.data?.id)
    console.log()
  } catch (error) {
    console.error('❌ Direct SDK test failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
    }
    console.log()
  }

  // Test 2: Order confirmation email using emailService
  console.log('3. Testing Order Confirmation Email...')
  try {
    // Import emailService after env vars are loaded
    const { emailService } = await import('@/lib/services/emailService')
    
    const mockOrderItems: OrderItem[] = [
      {
        productId: 'test-product-1',
        productName: 'Test T-Shirt',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.00,
        designUrl: 'https://example.com/design.png',
        gelatoProductUid: 'test-uid-123',
      },
      {
        productId: 'test-product-2',
        productName: 'Test Hoodie',
        size: 'L',
        color: 'Navy',
        quantity: 1,
        price: 45.00,
        designUrl: 'https://example.com/design2.png',
        gelatoProductUid: 'test-uid-456',
      },
    ]

    const mockShippingAddress: ShippingAddress = {
      firstName: 'Samuel',
      lastName: 'Abudu',
      addressLine1: '123 Test Street',
      addressLine2: 'Apt 4B',
      city: 'Lagos',
      state: 'Lagos',
      postCode: '100001',
      country: 'NG',
      phone: '+234-123-456-7890',
    }

    await emailService.sendOrderConfirmation({
      to: TEST_EMAIL,
      orderNumber: 'MW-TEST-' + Date.now().toString(36).toUpperCase(),
      customerName: 'Samuel Abudu',
      items: mockOrderItems,
      shippingAddress: mockShippingAddress,
      subtotal: 95.00,
      shippingCost: 10.00,
      tax: 7.60,
      total: 112.60,
      estimatedDelivery: 'Monday, January 15, 2024',
    })

    console.log('✅ Order confirmation email sent successfully!')
    console.log()
  } catch (error) {
    console.error('❌ Order confirmation email failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
    }
    console.log()
  }

  // Test 3: Shipping notification email
  console.log('4. Testing Shipping Notification Email...')
  try {
    // Import emailService after env vars are loaded
    const { emailService } = await import('@/lib/services/emailService')
    
    await emailService.sendShippingNotification({
      to: TEST_EMAIL,
      orderNumber: 'MW-TEST-' + Date.now().toString(36).toUpperCase(),
      customerName: 'Samuel Abudu',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS',
      carrierTrackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
      estimatedDelivery: 'Monday, January 15, 2024',
    })

    console.log('✅ Shipping notification email sent successfully!')
    console.log()
  } catch (error) {
    console.error('❌ Shipping notification email failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
    }
    console.log()
  }

  // Summary
  console.log('='.repeat(60))
  console.log('TEST COMPLETE')
  console.log('='.repeat(60))
  console.log()
  console.log(`Check your inbox at: ${TEST_EMAIL}`)
  console.log('You should receive 3 test emails:')
  console.log('  1. Direct SDK test email')
  console.log('  2. Order confirmation email')
  console.log('  3. Shipping notification email')
  console.log()
  console.log('Note: Emails may take a few minutes to arrive.')
  console.log('Check your spam folder if you don\'t see them.')
  console.log()
}

// Run the test
testResendConnection()
  .then(() => {
    console.log('✅ All tests completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error)
    process.exit(1)
  })
