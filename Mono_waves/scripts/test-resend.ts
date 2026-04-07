/**
 * Test script for Resend API
 * 
 * This script sends a test email to verify the Resend API is configured correctly.
 */

// Load environment variables from .env.local FIRST
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env vars before anything else
config({ path: resolve(__dirname, '../.env.local') })

// Now import Resend directly to avoid module initialization issues
import { Resend } from 'resend'

async function testResendAPI() {
  // Initialize Resend with the API key
  const resend = new Resend(process.env.RESEND_API_KEY)
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'orders@monowaves.com'
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@monowaves.com'
  console.log('🧪 Testing Resend API...\n')

  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not configured in environment variables')
    process.exit(1)
  }

  console.log('✅ RESEND_API_KEY is configured')
  console.log(`   Key starts with: ${process.env.RESEND_API_KEY.substring(0, 10)}...\n`)

  // Test email data
  const testOrderData = {
    to: process.env.ADMIN_EMAIL || 'test@example.com',
    orderNumber: 'MW-TEST-001',
    customerName: 'Test Customer',
    items: [
      {
        productId: 'test-1',
        productName: 'Test T-Shirt',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.00,
        designUrl: 'https://example.com/design.png',
        gelatoProductUid: 'test-uid',
      },
    ],
    shippingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      addressLine1: '123 Test St',
      addressLine2: 'Apt 4',
      city: 'Test City',
      state: 'CA',
      postCode: '12345',
      country: 'US',
      phone: '+1234567890',
    },
    subtotal: 50.00,
    shippingCost: 10.00,
    tax: 4.50,
    total: 64.50,
    estimatedDelivery: 'Monday, January 15, 2024',
  }

  try {
    console.log('📧 Sending test order confirmation email...')
    console.log(`   To: ${testOrderData.to}`)
    console.log(`   Order: ${testOrderData.orderNumber}\n`)

    // Send a simple test email
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: testOrderData.to,
      replyTo: SUPPORT_EMAIL,
      subject: `Test Order Confirmation - ${testOrderData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Test Order Confirmation</h1>
          <p>Hi ${testOrderData.customerName},</p>
          <p>This is a test email from the Resend API test script.</p>
          <p><strong>Order Number:</strong> ${testOrderData.orderNumber}</p>
          <p><strong>Total:</strong> $${testOrderData.total.toFixed(2)}</p>
          <p>If you received this email, your Resend API is working correctly! 🎉</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is a test email. For support, contact ${SUPPORT_EMAIL}
          </p>
        </div>
      `,
    })

    console.log('✅ Test email sent successfully!')
    console.log('\n📬 Check your inbox at:', testOrderData.to)
    console.log('   (It may take a few seconds to arrive)\n')

    // Test admin notification
    console.log('📧 Sending test admin notification email...')
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: process.env.ADMIN_EMAIL || 'test@example.com',
      subject: '[ADMIN] Test Admin Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #d32f2f;">Admin Notification Test</h1>
          <p>This is a test admin notification from the Resend API test script.</p>
          <p><strong>Order Number:</strong> MW-TEST-001</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, admin notifications are working correctly! ✅</p>
        </div>
      `,
    })

    console.log('✅ Admin notification sent successfully!\n')

    console.log('🎉 All Resend API tests passed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Check your email inbox')
    console.log('   2. Verify the email formatting looks correct')
    console.log('   3. Check spam folder if you don\'t see it\n')

  } catch (error) {
    console.error('\n❌ Failed to send test email')
    
    if (error instanceof Error) {
      console.error('   Error:', error.message)
      
      // Provide helpful debugging info
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('\n💡 Troubleshooting:')
        console.error('   - Check that your RESEND_API_KEY is correct')
        console.error('   - Verify the API key is active in your Resend dashboard')
        console.error('   - Make sure you\'re using the correct API key (not a test key)')
      } else if (error.message.includes('domain')) {
        console.error('\n💡 Troubleshooting:')
        console.error('   - Verify your domain is configured in Resend')
        console.error('   - Check that the sender email domain matches your verified domain')
        console.error('   - Update SENDER_EMAIL in your .env.local file')
      } else if (error.message.includes('rate limit')) {
        console.error('\n💡 Troubleshooting:')
        console.error('   - You\'ve hit the Resend API rate limit')
        console.error('   - Wait a few minutes and try again')
      }
    } else {
      console.error('   Unknown error:', error)
    }
    
    process.exit(1)
  }
}

// Run the test
testResendAPI()
  .then(() => {
    console.log('✨ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })
