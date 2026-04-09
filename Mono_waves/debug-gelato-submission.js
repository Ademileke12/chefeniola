const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugGelatoSubmission() {
  console.log('=== Gelato Submission Debug ===\n')
  
  // Get the most recent failed order
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'failed')
    .is('gelato_order_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (error || !orders || orders.length === 0) {
    console.log('No failed orders found')
    return
  }
  
  const order = orders[0]
  console.log('Order Details:')
  console.log(`  Order Number: ${order.order_number}`)
  console.log(`  Customer: ${order.customer_name} (${order.customer_email})`)
  console.log(`  Status: ${order.status}`)
  console.log(`  Items: ${JSON.stringify(order.items, null, 2)}`)
  console.log(`  Shipping Address: ${JSON.stringify(order.shipping_address, null, 2)}`)
  
  // Check what would be sent to Gelato
  console.log('\n=== Gelato Order Data (what would be sent) ===')
  
  const gelatoItems = order.items.map((item, index) => ({
    itemReferenceId: `${order.order_number}-${index + 1}`,
    productUid: item.gelatoProductUid,
    files: [
      {
        type: 'default',
        url: item.designUrl,
      },
    ],
    quantity: item.quantity,
  }))
  
  const gelatoOrderData = {
    orderReferenceId: order.order_number,
    customerReferenceId: order.customer_email,
    currency: 'USD',
    items: gelatoItems,
    shipmentMethodUid: 'standard',
    shippingAddress: order.shipping_address,
  }
  
  console.log(JSON.stringify(gelatoOrderData, null, 2))
  
  // Check for potential issues
  console.log('\n=== Potential Issues ===')
  
  const issues = []
  
  // Check if items have required fields
  order.items.forEach((item, index) => {
    if (!item.gelatoProductUid) {
      issues.push(`Item ${index + 1}: Missing gelatoProductUid`)
    }
    if (!item.designUrl) {
      issues.push(`Item ${index + 1}: Missing designUrl`)
    }
    if (!item.quantity || item.quantity < 1) {
      issues.push(`Item ${index + 1}: Invalid quantity (${item.quantity})`)
    }
  })
  
  // Check shipping address
  const addr = order.shipping_address
  if (!addr.firstName) issues.push('Shipping: Missing firstName')
  if (!addr.lastName) issues.push('Shipping: Missing lastName')
  if (!addr.addressLine1) issues.push('Shipping: Missing addressLine1')
  if (!addr.city) issues.push('Shipping: Missing city')
  if (!addr.state) issues.push('Shipping: Missing state')
  if (!addr.postCode) issues.push('Shipping: Missing postCode')
  if (!addr.country) issues.push('Shipping: Missing country')
  
  if (issues.length > 0) {
    console.log('❌ Found issues:')
    issues.forEach(issue => console.log(`  - ${issue}`))
  } else {
    console.log('✅ No obvious issues found')
    console.log('\nThe 400 error might be due to:')
    console.log('  1. Invalid productUid format')
    console.log('  2. Design URL not accessible by Gelato')
    console.log('  3. Shipment method not valid')
    console.log('  4. Country code format issue')
  }
  
  // Try to make actual API call to see exact error
  console.log('\n=== Attempting Real API Call ===')
  try {
    const response = await fetch('https://order.gelatoapis.com/v4/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.GELATO_API_KEY,
      },
      body: JSON.stringify(gelatoOrderData),
    })
    
    const responseText = await response.text()
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Response: ${responseText}`)
    
    if (!response.ok) {
      try {
        const errorJson = JSON.parse(responseText)
        console.log('\nParsed Error:')
        console.log(JSON.stringify(errorJson, null, 2))
      } catch (e) {
        // Response is not JSON
      }
    }
  } catch (error) {
    console.error('API call failed:', error.message)
  }
}

debugGelatoSubmission().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
