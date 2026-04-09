const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOrderStatus() {
  console.log('Checking order status and Gelato submission...\n')
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  orders.forEach((order, index) => {
    console.log(`\n=== Order ${index + 1} ===`)
    console.log(`Order Number: ${order.order_number}`)
    console.log(`Status: ${order.status}`)
    console.log(`Gelato Order ID: ${order.gelato_order_id || 'NOT SUBMITTED'}`)
    console.log(`Stripe Payment ID: ${order.stripe_payment_id}`)
    console.log(`Stripe Session ID: ${order.stripe_session_id || 'N/A'}`)
    console.log(`Created: ${order.created_at}`)
    console.log(`Updated: ${order.updated_at}`)
  })
  
  console.log('\n\n=== Analysis ===')
  const failedOrders = orders.filter(o => o.status === 'failed')
  const withoutGelato = orders.filter(o => !o.gelato_order_id)
  
  console.log(`Total orders checked: ${orders.length}`)
  console.log(`Failed orders: ${failedOrders.length}`)
  console.log(`Orders without Gelato ID: ${withoutGelato.length}`)
  
  if (withoutGelato.length > 0) {
    console.log('\n⚠️  Orders are NOT being submitted to Gelato!')
    console.log('This is likely because:')
    console.log('1. Gelato API key is not configured')
    console.log('2. Webhook is not triggering order submission')
    console.log('3. Order submission is failing silently')
  }
}

checkOrderStatus().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
