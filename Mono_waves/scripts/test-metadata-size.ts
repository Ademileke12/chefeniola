/**
 * Test script to verify Stripe metadata size with real cart data
 * 
 * This script tests the metadata shortening logic with the actual cart items
 * that caused the 504 character error.
 */

// Simulate the cart items from the error
const testCartItems = [
  {
    id: "716cc35b-7072-4585-a651-1cbf3619125c-M-Light Pink-1776614588545",
    productId: "716cc35b-7072-4585-a651-1cbf3619125c",
    productName: "Classic Unisex Crewneck Sweatshirt Gildan 18000",
    size: "M",
    color: "Light Pink",
    price: 29.99,
    quantity: 1
  },
  {
    id: "527d85ce-40d2-4458-9e30-daa71e2dcbce-L-Triblend Athletic Gray-1776685901932",
    productId: "527d85ce-40d2-4458-9e30-daa71e2dcbce",
    productName: "Triblend Unisex Crewneck T Shirt",
    size: "L",
    color: "Triblend Athletic Gray",
    price: 49.99,
    quantity: 1
  }
]

const testShippingAddress = {
  firstName: "samuel",
  lastName: "abudu",
  addressLine1: "2455 jeri ave",
  city: "Coloumbus",
  state: "Ohio",
  postCode: "43219",
  country: "United States",
  phone: "+234 8118994701"
}

console.log('=== Testing Stripe Metadata Size ===\n')

// Test original format (what caused the error)
const originalCartItems = JSON.stringify(testCartItems)
console.log('Original cart items format:')
console.log(`Length: ${originalCartItems.length} characters`)
console.log(`Status: ${originalCartItems.length > 500 ? '❌ EXCEEDS LIMIT' : '✅ OK'}`)
console.log()

// Test shortened format (our fix)
const shortenedCartItems = testCartItems.map(item => ({
  pid: item.productId,
  qty: item.quantity,
  prc: item.price,
}))
const shortenedCartItemsJson = JSON.stringify(shortenedCartItems)
console.log('Shortened cart items format:')
console.log(`Length: ${shortenedCartItemsJson.length} characters`)
console.log(`Status: ${shortenedCartItemsJson.length > 500 ? '❌ EXCEEDS LIMIT' : '✅ OK'}`)
console.log(`Data: ${shortenedCartItemsJson}`)
console.log()

// Test original shipping format
const originalShipping = JSON.stringify(testShippingAddress)
console.log('Original shipping format:')
console.log(`Length: ${originalShipping.length} characters`)
console.log(`Status: ${originalShipping.length > 500 ? '❌ EXCEEDS LIMIT' : '✅ OK'}`)
console.log()

// Test shortened shipping format
const shortenedShipping = {
  fn: testShippingAddress.firstName,
  ln: testShippingAddress.lastName,
  a1: testShippingAddress.addressLine1,
  a2: '',
  ct: testShippingAddress.city,
  st: testShippingAddress.state,
  pc: testShippingAddress.postCode,
  co: testShippingAddress.country,
  ph: testShippingAddress.phone,
}
const shortenedShippingJson = JSON.stringify(shortenedShipping)
console.log('Shortened shipping format:')
console.log(`Length: ${shortenedShippingJson.length} characters`)
console.log(`Status: ${shortenedShippingJson.length > 500 ? '❌ EXCEEDS LIMIT' : '✅ OK'}`)
console.log(`Data: ${shortenedShippingJson}`)
console.log()

// Test fallback format (if still too large)
const fallbackCart = {
  count: testCartItems.length,
  total: testCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}
const fallbackCartJson = JSON.stringify(fallbackCart)
console.log('Fallback cart format (if needed):')
console.log(`Length: ${fallbackCartJson.length} characters`)
console.log(`Status: ${fallbackCartJson.length > 500 ? '❌ EXCEEDS LIMIT' : '✅ OK'}`)
console.log(`Data: ${fallbackCartJson}`)
console.log()

console.log('=== Summary ===')
console.log(`Original format would fail: ${originalCartItems.length > 500}`)
console.log(`Shortened format will work: ${shortenedCartItemsJson.length <= 500}`)
console.log(`Savings: ${originalCartItems.length - shortenedCartItemsJson.length} characters`)
