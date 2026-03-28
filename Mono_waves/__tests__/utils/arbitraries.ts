import * as fc from 'fast-check'
import type { CreateProductData, ProductColor } from '@/types'

/**
 * Arbitrary for generating valid product colors
 */
export function productColorArbitrary(): fc.Arbitrary<ProductColor> {
  return fc.record({
    name: fc.constantFrom('White', 'Black', 'Navy', 'Red', 'Gray', 'Blue'),
    hex: fc.constantFrom('#FFFFFF', '#000000', '#001F3F', '#FF4136', '#AAAAAA', '#0074D9'),
    imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  })
}

/**
 * Arbitrary for generating valid product data
 */
export function createProductDataArbitrary(): fc.Arbitrary<CreateProductData> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ maxLength: 500 }),
    price: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true })
      .map(n => Math.round(n * 100) / 100), // Round to 2 decimal places
    gelatoProductId: fc.uuid(),
    gelatoProductUid: fc.string({ minLength: 10, maxLength: 50 }),
    sizes: fc.array(
      fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
      { minLength: 1, maxLength: 6 }
    ).map(arr => [...new Set(arr)]), // Remove duplicates
    colors: fc.array(productColorArbitrary(), { minLength: 1, maxLength: 5 }),
    designUrl: fc.webUrl(),
    mockupUrls: fc.option(
      fc.dictionary(
        fc.constantFrom('White', 'Black', 'Navy', 'Red', 'Gray', 'Blue'),
        fc.webUrl()
      ),
      { nil: undefined }
    ),
  })
}

/**
 * Arbitrary for generating valid product IDs (UUIDs)
 */
export function productIdArbitrary(): fc.Arbitrary<string> {
  return fc.uuid()
}

/**
 * Arbitrary for generating valid session IDs
 */
export function sessionIdArbitrary(): fc.Arbitrary<string> {
  return fc.uuid()
}

/**
 * Arbitrary for generating valid email addresses
 */
export function emailArbitrary(): fc.Arbitrary<string> {
  return fc.emailAddress()
}

/**
 * Arbitrary for generating valid prices
 */
export function priceArbitrary(): fc.Arbitrary<number> {
  return fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true })
    .map(n => Math.round(n * 100) / 100)
}

/**
 * Arbitrary for generating valid quantities
 */
export function quantityArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 100 })
}

/**
 * Arbitrary for generating valid image file types
 */
export function validImageFileTypeArbitrary(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'application/pdf'
  )
}

/**
 * Arbitrary for generating invalid file types
 */
export function invalidFileTypeArbitrary(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'text/plain',
    'application/json',
    'video/mp4',
    'audio/mpeg',
    'application/zip',
    'text/html'
  )
}

/**
 * Arbitrary for generating valid file sizes (in bytes, under 10MB)
 */
export function validFileSizeArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 10 * 1024 * 1024 }) // 1 byte to 10MB
}

/**
 * Arbitrary for generating invalid file sizes (over 10MB)
 */
export function invalidFileSizeArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 10 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 }) // Over 10MB
}

/**
 * Create a mock File object for testing
 */
export function createMockFile(
  content: string,
  filename: string,
  mimeType: string,
  size?: number
): File {
  const actualSize = size ?? content.length
  const blob = new Blob([content], { type: mimeType })
  
  // Create a File-like object
  const file = new File([blob], filename, { type: mimeType })
  
  // Override size if specified
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size })
  }
  
  // Add arrayBuffer method for Node.js compatibility
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async function() {
        return new Promise<ArrayBuffer>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve(reader.result as ArrayBuffer)
          }
          reader.readAsArrayBuffer(this as Blob)
        })
      }
    })
  }
  
  return file
}

/**
 * Arbitrary for generating valid design files
 */
export function validDesignFileArbitrary(): fc.Arbitrary<File> {
  return fc.tuple(
    validImageFileTypeArbitrary(),
    validFileSizeArbitrary(),
    fc.string({ minLength: 1, maxLength: 50 })
  ).map(([mimeType, size, name]) => {
    const extension = mimeType === 'application/pdf' ? 'pdf' :
                     mimeType === 'image/svg+xml' ? 'svg' :
                     mimeType === 'image/png' ? 'png' : 'jpg'
    const filename = `${name}.${extension}`
    const content = 'x'.repeat(Math.min(size, 1000)) // Create content up to 1000 chars
    return createMockFile(content, filename, mimeType, size)
  })
}

/**
 * Arbitrary for generating invalid design files (wrong type)
 */
export function invalidTypeDesignFileArbitrary(): fc.Arbitrary<File> {
  return fc.tuple(
    invalidFileTypeArbitrary(),
    validFileSizeArbitrary(),
    fc.string({ minLength: 1, maxLength: 50 })
  ).map(([mimeType, size, name]) => {
    const extension = mimeType.split('/')[1] || 'txt'
    const filename = `${name}.${extension}`
    const content = 'x'.repeat(Math.min(size, 1000))
    return createMockFile(content, filename, mimeType, size)
  })
}

/**
 * Arbitrary for generating invalid design files (too large)
 */
export function invalidSizeDesignFileArbitrary(): fc.Arbitrary<File> {
  return fc.tuple(
    validImageFileTypeArbitrary(),
    invalidFileSizeArbitrary(),
    fc.string({ minLength: 1, maxLength: 50 })
  ).map(([mimeType, size, name]) => {
    const extension = mimeType === 'application/pdf' ? 'pdf' :
                     mimeType === 'image/svg+xml' ? 'svg' :
                     mimeType === 'image/png' ? 'png' : 'jpg'
    const filename = `${name}.${extension}`
    const content = 'x'.repeat(1000) // Just a sample, size is overridden
    return createMockFile(content, filename, mimeType, size)
  })
}

/**
 * Arbitrary for generating Gelato shipping addresses
 */
export function gelatoShippingAddressArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    addressLine1: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
    addressLine2: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
    state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'),
    postCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.constantFrom('US', 'CA', 'GB', 'DE', 'FR', 'AU'),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
  })
}

/**
 * Arbitrary for generating Gelato order items
 */
export function gelatoOrderItemArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    itemReferenceId: fc.uuid(),
    productUid: fc.string({ minLength: 10, maxLength: 50 }),
    files: fc.array(
      fc.record({
        type: fc.constantFrom('default' as const, 'back' as const),
        url: fc.webUrl(),
      }),
      { minLength: 1, maxLength: 2 }
    ),
    quantity: quantityArbitrary(),
  })
}

/**
 * Arbitrary for generating Gelato order data
 */
export function gelatoOrderDataArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    orderReferenceId: fc.uuid(),
    customerReferenceId: fc.uuid(),
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD', 'AUD'),
    items: fc.array(gelatoOrderItemArbitrary(), { minLength: 1, maxLength: 5 }),
    shipmentMethodUid: fc.string({ minLength: 10, maxLength: 30 }),
    shippingAddress: gelatoShippingAddressArbitrary(),
  })
}

/**
 * Arbitrary for generating cart items
 */
export function cartItemArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    id: fc.uuid(),
    productId: fc.uuid(),
    productName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    size: fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
    color: fc.constantFrom('White', 'Black', 'Navy', 'Red', 'Gray', 'Blue'),
    quantity: quantityArbitrary(),
    price: priceArbitrary(),
    imageUrl: fc.webUrl(),
  })
}

/**
 * Arbitrary for generating cart item without ID (for adding to cart)
 */
export function cartItemWithoutIdArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    productId: fc.uuid(),
    productName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    size: fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
    color: fc.constantFrom('White', 'Black', 'Navy', 'Red', 'Gray', 'Blue'),
    quantity: quantityArbitrary(),
    price: priceArbitrary(),
    imageUrl: fc.webUrl(),
  })
}

/**
 * Arbitrary for generating carts with items
 */
export function cartWithItemsArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    id: fc.uuid(),
    sessionId: sessionIdArbitrary(),
    items: fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 10 }),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
    expiresAt: fc.date({ min: new Date() }).map(d => d.toISOString()),
  })
}

/**
 * Arbitrary for generating shipping addresses
 */
export function shippingAddressArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    addressLine1: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
    addressLine2: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
    state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'),
    postCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.constantFrom('US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
  })
}

/**
 * Arbitrary for generating checkout session data
 */
export function checkoutSessionDataArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    cartItems: fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 5 }),
    customerEmail: emailArbitrary(),
    shippingAddress: shippingAddressArbitrary(),
    successUrl: fc.webUrl(),
    cancelUrl: fc.webUrl(),
  })
}

/**
 * Arbitrary for generating order items
 */
export function orderItemArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    productId: fc.uuid(),
    productName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    size: fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
    color: fc.constantFrom('White', 'Black', 'Navy', 'Red', 'Gray', 'Blue'),
    quantity: quantityArbitrary(),
    price: priceArbitrary(),
    designUrl: fc.webUrl(),
    gelatoProductUid: fc.string({ minLength: 10, maxLength: 50 }),
  })
}

/**
 * Arbitrary for generating create order data
 */
export function createOrderDataArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    customerEmail: emailArbitrary(),
    stripePaymentId: fc.uuid().map(uuid => `pi_${uuid.replace(/-/g, '')}`),
    items: fc.array(orderItemArbitrary(), { minLength: 1, maxLength: 5 }),
    shippingAddress: shippingAddressArbitrary(),
    total: priceArbitrary().map(p => p * 10), // Higher total for orders
  })
}

/**
 * Arbitrary for generating order statuses
 */
export function orderStatusArbitrary(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'pending',
    'payment_confirmed',
    'submitted_to_gelato',
    'printing',
    'shipped',
    'delivered',
    'cancelled',
    'failed'
  )
}

/**
 * Arbitrary for generating tracking data
 */
export function trackingDataArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    trackingNumber: fc.string({ minLength: 10, maxLength: 30 }),
    carrier: fc.constantFrom('UPS', 'FedEx', 'USPS', 'DHL', 'Royal Mail'),
  })
}

/**
 * Arbitrary for generating order numbers
 */
export function orderNumberArbitrary(): fc.Arbitrary<string> {
  return fc.string({ minLength: 10, maxLength: 20 }).map(s => `MW-${s.toUpperCase()}`)
}
