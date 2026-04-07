/**
 * Diagnostic script for Resend API
 * 
 * This script checks the Resend API configuration and provides detailed diagnostics
 */

// Load environment variables from .env.local FIRST
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env vars before anything else
config({ path: resolve(__dirname, '../.env.local') })

// Now import Resend directly
import { Resend } from 'resend'

async function diagnoseResend() {
  console.log('🔍 Diagnosing Resend API Configuration...\n')

  // Check API key
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not configured')
    process.exit(1)
  }

  console.log('✅ RESEND_API_KEY is configured')
  console.log(`   Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...\n`)

  // Check sender email
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'orders@monowaves.com'
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
  
  console.log('📧 Email Configuration:')
  console.log(`   Sender: ${SENDER_EMAIL}`)
  console.log(`   Admin: ${ADMIN_EMAIL}\n`)

  // Check if using Gmail (not recommended)
  if (SENDER_EMAIL.includes('@gmail.com')) {
    console.warn('⚠️  WARNING: You are using a Gmail address as sender')
    console.warn('   Resend requires a verified domain for production use')
    console.warn('   Gmail addresses only work in development mode\n')
  }

  // Initialize Resend
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    console.log('🧪 Testing Resend API with a simple email...\n')

    // Send test email
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: ADMIN_EMAIL,
      subject: 'Resend API Diagnostic Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Resend API Test</h1>
          <p>This is a diagnostic test email from your Mono Waves application.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Sender:</strong> ${SENDER_EMAIL}</p>
          <p><strong>Recipient:</strong> ${ADMIN_EMAIL}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            If you received this email, your Resend API is working correctly!
          </p>
        </div>
      `,
    })

    console.log('✅ Email sent successfully!')
    console.log('\n📊 Response from Resend:')
    console.log(JSON.stringify(result, null, 2))
    console.log('\n📬 Check your inbox at:', ADMIN_EMAIL)
    console.log('   Email ID:', result.data?.id || 'N/A')
    console.log('\n💡 Tips:')
    console.log('   - Check your spam/junk folder')
    console.log('   - It may take a few seconds to arrive')
    console.log('   - Check Resend dashboard for delivery status')
    console.log('   - Visit: https://resend.com/emails\n')

  } catch (error: any) {
    console.error('\n❌ Failed to send test email\n')
    
    if (error.message) {
      console.error('Error message:', error.message)
    }
    
    if (error.statusCode) {
      console.error('Status code:', error.statusCode)
    }

    if (error.name) {
      console.error('Error type:', error.name)
    }

    // Provide specific troubleshooting based on error
    console.error('\n💡 Troubleshooting:')
    
    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      console.error('   ❌ API key is invalid or doesn\'t have permission')
      console.error('   → Check your API key in Resend dashboard')
      console.error('   → Make sure you\'re using the correct API key')
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.error('   ❌ Authentication failed')
      console.error('   → Verify your RESEND_API_KEY is correct')
      console.error('   → Check if the API key is active')
    } else if (error.message?.includes('domain') || error.message?.includes('Domain')) {
      console.error('   ❌ Domain verification issue')
      console.error('   → Your sender domain needs to be verified in Resend')
      console.error('   → Visit: https://resend.com/domains')
      console.error('   → Add and verify your domain')
      console.error('   → Or use onboarding@resend.dev for testing')
    } else if (error.message?.includes('rate limit')) {
      console.error('   ❌ Rate limit exceeded')
      console.error('   → Wait a few minutes and try again')
    } else {
      console.error('   → Check Resend dashboard for more details')
      console.error('   → Visit: https://resend.com/overview')
    }

    console.error('\n📚 Documentation:')
    console.error('   → https://resend.com/docs/send-with-nodejs')
    console.error('   → https://resend.com/docs/dashboard/domains/introduction\n')

    process.exit(1)
  }
}

// Run the diagnostic
diagnoseResend()
  .then(() => {
    console.log('✨ Diagnostic completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Diagnostic failed:', error)
    process.exit(1)
  })
