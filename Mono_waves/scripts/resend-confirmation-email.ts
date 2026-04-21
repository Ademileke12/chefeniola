/**
 * Resend Confirmation Email
 * 
 * Manually send confirmation email for a specific order
 */

import { supabaseAdmin } from '../lib/supabase/server'
import { emailService } from '../lib/services/emailService'
import { calculateEstimatedDelivery } from '../lib/services/orderService'

async function resendConfirmationEmail(orderNumber?: string) {
  console.log('📧 Resending Confirmation Email\n')

  // Get order (either by order number or most recent)
  let order
  if (orderNumber) {
    console.log(`Fetching order: ${orderNumber}`)
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (error || !data) {
      console.error('❌ Order not found:', orderNumber)
      return
    }
    order = data
  } else {
    console.log('Fetching most recent order...')
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      console.error('❌ No orders found')
      return
    }
    order = data[0]
  }

  console.log('✅ Found order:', order.order_number)
  console.log('   Customer:', order.customer_email)
  console.log('   Total:', `$${order.total}`)
  console.log()

  // Send confirmation email
  try {
    console.log('📤 Sending confirmation email...')
    
    const estimatedDelivery = calculateEstimatedDelivery(order.created_at)
    
    await emailService.sendOrderConfirmation({
      to: order.customer_email,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      items: order.items,
      shippingAddress: order.shipping_address,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shipping_cost),
      tax: Number(order.tax),
      total: Number(order.total),
      estimatedDelivery,
    })

    console.log('✅ Confirmation email sent successfully!')
    console.log(`   To: ${order.customer_email}`)
    console.log(`   Order: ${order.order_number}`)
    console.log()
    console.log('💡 Check your inbox (and spam folder) for the email')
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

// Get order number from command line args
const orderNumber = process.argv[2]

resendConfirmationEmail(orderNumber).catch(console.error)
