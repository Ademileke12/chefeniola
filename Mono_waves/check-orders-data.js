const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOrders() {
  console.log('Fetching orders from database...\n')
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${data?.length || 0} orders\n`)
  
  if (data && data.length > 0) {
    data.forEach((order, index) => {
      console.log(`Order ${index + 1}:`)
      console.log(`  ID: ${order.id}`)
      console.log(`  Order Number: ${order.order_number}`)
      console.log(`  Customer Name: ${order.customer_name}`)
      console.log(`  Customer Email: ${order.customer_email}`)
      console.log(`  Total: $${order.total}`)
      console.log(`  Status: ${order.status}`)
      console.log(`  Created At: ${order.created_at}`)
      console.log(`  Items: ${JSON.stringify(order.items).substring(0, 100)}...`)
      console.log('')
    })
  } else {
    console.log('No orders found in database')
  }
}

checkOrders().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
