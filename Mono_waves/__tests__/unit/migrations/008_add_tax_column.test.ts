/**
 * Test for migration 008: Add tax column to orders table
 * 
 * This test verifies that the tax column is properly added to the orders table
 * with the correct constraints and default values.
 * 
 * Requirements: 4.5
 */

import { supabaseAdmin } from '@/lib/supabase/server'

describe('Migration 008: Add tax column to orders table', () => {
  it('should have tax column in orders table', async () => {
    // Query the information schema to check if tax column exists
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    
    // If there are any orders, check that tax field exists
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('tax')
    }
  })

  it('should allow creating order with tax value', async () => {
    // Create a test order with tax
    const testOrder = {
      order_number: `TEST-${Date.now()}`,
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      shipping_address: {
        firstName: 'Test',
        lastName: 'User',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postCode: '12345',
        country: 'US',
        phone: '555-0100',
      },
      items: [
        {
          productId: 'test-product',
          productName: 'Test Product',
          size: 'M',
          color: 'Black',
          quantity: 1,
          price: 29.99,
          designUrl: 'https://example.com/design.png',
          gelatoProductUid: 'test-uid',
        },
      ],
      subtotal: 29.99,
      shipping_cost: 10.00,
      tax: 2.50,
      total: 42.49,
      stripe_payment_id: `test_payment_${Date.now()}`,
      status: 'payment_confirmed',
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(testOrder)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.tax).toBe(2.50)

    // Clean up
    if (data?.id) {
      await supabaseAdmin.from('orders').delete().eq('id', data.id)
    }
  })

  it('should default tax to 0 when not provided', async () => {
    // Create a test order without tax
    const testOrder = {
      order_number: `TEST-${Date.now()}`,
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      shipping_address: {
        firstName: 'Test',
        lastName: 'User',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postCode: '12345',
        country: 'US',
        phone: '555-0100',
      },
      items: [
        {
          productId: 'test-product',
          productName: 'Test Product',
          size: 'M',
          color: 'Black',
          quantity: 1,
          price: 29.99,
          designUrl: 'https://example.com/design.png',
          gelatoProductUid: 'test-uid',
        },
      ],
      subtotal: 29.99,
      shipping_cost: 10.00,
      total: 39.99,
      stripe_payment_id: `test_payment_${Date.now()}`,
      status: 'payment_confirmed',
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(testOrder)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.tax).toBe(0)

    // Clean up
    if (data?.id) {
      await supabaseAdmin.from('orders').delete().eq('id', data.id)
    }
  })

  it('should reject negative tax values', async () => {
    // Attempt to create an order with negative tax
    const testOrder = {
      order_number: `TEST-${Date.now()}`,
      customer_email: 'test@example.com',
      customer_name: 'Test User',
      shipping_address: {
        firstName: 'Test',
        lastName: 'User',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postCode: '12345',
        country: 'US',
        phone: '555-0100',
      },
      items: [
        {
          productId: 'test-product',
          productName: 'Test Product',
          size: 'M',
          color: 'Black',
          quantity: 1,
          price: 29.99,
          designUrl: 'https://example.com/design.png',
          gelatoProductUid: 'test-uid',
        },
      ],
      subtotal: 29.99,
      shipping_cost: 10.00,
      tax: -5.00, // Invalid negative tax
      total: 34.99,
      stripe_payment_id: `test_payment_${Date.now()}`,
      status: 'payment_confirmed',
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(testOrder)
      .select()
      .single()

    // Should fail due to check constraint
    expect(error).not.toBeNull()
    expect(error?.message).toContain('orders_tax_check')

    // Clean up if somehow it was created
    if (data?.id) {
      await supabaseAdmin.from('orders').delete().eq('id', data.id)
    }
  })
})
