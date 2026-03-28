/**
 * Property-Based Tests for Cart Service
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties that should hold
 * for all valid cart operations across the system.
 * 
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll } from '@jest/globals'
import * as fc from 'fast-check'
import { cartService } from '@/lib/services/cartService'
import {
  sessionIdArbitrary,
  cartItemWithoutIdArbitrary,
  quantityArbitrary,
  cartWithItemsArbitrary,
} from '../utils/arbitraries'
import { cleanupTestData, isSupabaseConfigured } from '../utils/testDb'

describe('Cart Service Properties', () => {
  let supabaseConfigured = false

  beforeAll(async () => {
    supabaseConfigured = await isSupabaseConfigured()
    
    if (!supabaseConfigured) {
      console.warn('⚠️  Supabase is not configured. Skipping property tests.')
      console.warn('   To run these tests, configure Supabase environment variables.')
    }
  })

  afterEach(async () => {
    if (supabaseConfigured) {
      await cleanupTestData()
    }
  })

  /**
   * Property 14: Quantity Validation
   * 
   * For any quantity value less than or equal to zero, the system should reject
   * the add-to-cart operation with a validation error.
   * 
   * Validates: Requirements 4.5
   */
  it('Property 14: Quantity Validation', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        cartItemWithoutIdArbitrary(),
        fc.integer({ min: -100, max: 0 }),
        async (sessionId, itemData, invalidQuantity) => {
          // Attempt to add item with invalid quantity
          const invalidItem = { ...itemData, quantity: invalidQuantity }

          // Should throw an error
          await expect(
            cartService.addItem(sessionId, invalidItem)
          ).rejects.toThrow(/quantity must be greater than zero/i)

          // Also test updateItemQuantity with invalid quantity
          // First add a valid item
          const validItem = { ...itemData, quantity: 1 }
          const cart = await cartService.addItem(sessionId, validItem)
          const addedItem = cart.items[0]

          // Then try to update with invalid quantity
          await expect(
            cartService.updateItemQuantity(sessionId, addedItem.id, invalidQuantity)
          ).rejects.toThrow(/quantity must be greater than zero/i)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 15: Cart Item Persistence
   * 
   * For any session ID and cart item, adding the item to the cart then
   * retrieving the cart should include that item with correct product
   * details and quantity.
   * 
   * Validates: Requirements 5.1, 5.2
   */
  it('Property 15: Cart Item Persistence', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        cartItemWithoutIdArbitrary(),
        async (sessionId, itemData) => {
          // Add item to cart
          const cartAfterAdd = await cartService.addItem(sessionId, itemData)

          // Verify item was added
          expect(cartAfterAdd.items.length).toBeGreaterThan(0)

          // Retrieve cart
          const retrievedCart = await cartService.getCart(sessionId)

          // Verify cart contains the item
          expect(retrievedCart.items.length).toBeGreaterThan(0)

          // Find the added item
          const addedItem = retrievedCart.items.find(
            (i) =>
              i.productId === itemData.productId &&
              i.size === itemData.size &&
              i.color === itemData.color
          )

          expect(addedItem).toBeDefined()
          if (addedItem) {
            expect(addedItem.productName).toBe(itemData.productName)
            expect(addedItem.quantity).toBe(itemData.quantity)
            expect(addedItem.price).toBe(itemData.price)
            expect(addedItem.imageUrl).toBe(itemData.imageUrl)
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 16: Cart Subtotal Calculation
   * 
   * For any cart with items, the subtotal should equal the sum of
   * (price × quantity) for all items in the cart.
   * 
   * Validates: Requirements 5.3
   */
  it('Property 16: Cart Subtotal Calculation', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        fc.array(cartItemWithoutIdArbitrary(), { minLength: 1, maxLength: 5 }),
        async (sessionId, itemsData) => {
          // Add all items to cart
          for (const itemData of itemsData) {
            await cartService.addItem(sessionId, itemData)
          }

          // Get cart
          const cart = await cartService.getCart(sessionId)

          // Calculate expected subtotal
          const expectedSubtotal = cart.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          )

          // Calculate subtotal using service
          const calculatedSubtotal = cartService.calculateTotal(cart)

          // Verify they match
          expect(calculatedSubtotal).toBe(expectedSubtotal)

          // Also verify it's a non-negative number
          expect(calculatedSubtotal).toBeGreaterThanOrEqual(0)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 17: Cart Item Removal
   * 
   * For any cart item, removing it from the cart then retrieving the cart
   * should not include that item.
   * 
   * Validates: Requirements 5.4
   */
  it('Property 17: Cart Item Removal', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        fc.array(cartItemWithoutIdArbitrary(), { minLength: 2, maxLength: 5 }),
        async (sessionId, itemsData) => {
          // Add all items to cart
          for (const itemData of itemsData) {
            await cartService.addItem(sessionId, itemData)
          }

          // Get cart
          const cartBefore = await cartService.getCart(sessionId)
          const itemCountBefore = cartBefore.items.length

          // Remove first item
          const itemToRemove = cartBefore.items[0]
          const cartAfterRemoval = await cartService.removeItem(
            sessionId,
            itemToRemove.id
          )

          // Verify item was removed
          expect(cartAfterRemoval.items.length).toBe(itemCountBefore - 1)

          // Verify the specific item is not in cart
          const foundItem = cartAfterRemoval.items.find(
            (i) => i.id === itemToRemove.id
          )
          expect(foundItem).toBeUndefined()

          // Retrieve cart again to verify persistence
          const retrievedCart = await cartService.getCart(sessionId)
          expect(retrievedCart.items.length).toBe(itemCountBefore - 1)

          const foundInRetrieved = retrievedCart.items.find(
            (i) => i.id === itemToRemove.id
          )
          expect(foundInRetrieved).toBeUndefined()
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 18: Cart Session Persistence
   * 
   * For any session ID with cart items, the cart should persist across
   * requests and remain accessible using the same session ID.
   * 
   * Validates: Requirements 5.6
   */
  it('Property 18: Cart Session Persistence', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        fc.array(cartItemWithoutIdArbitrary(), { minLength: 1, maxLength: 3 }),
        async (sessionId, itemsData) => {
          // Add items to cart
          for (const itemData of itemsData) {
            await cartService.addItem(sessionId, itemData)
          }

          // Get cart first time
          const cart1 = await cartService.getCart(sessionId)
          expect(cart1.sessionId).toBe(sessionId)
          expect(cart1.items.length).toBeGreaterThan(0)

          // Get cart second time (simulating new request)
          const cart2 = await cartService.getCart(sessionId)
          expect(cart2.sessionId).toBe(sessionId)
          expect(cart2.items.length).toBe(cart1.items.length)

          // Verify items are the same
          expect(cart2.items).toEqual(cart1.items)

          // Verify cart ID is the same (same cart instance)
          expect(cart2.id).toBe(cart1.id)

          // Add another item
          const newItem = itemsData[0]
          const cart3 = await cartService.addItem(sessionId, {
            ...newItem,
            productId: 'new-product-id',
          })

          // Get cart again
          const cart4 = await cartService.getCart(sessionId)

          // Verify persistence of new item
          expect(cart4.items.length).toBe(cart3.items.length)
          expect(cart4.id).toBe(cart1.id) // Same cart instance
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Cart item quantity accumulation
   * 
   * When adding the same item (same product, size, color) multiple times,
   * the quantity should accumulate rather than creating duplicate items.
   */
  it('should accumulate quantity for duplicate items', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        cartItemWithoutIdArbitrary(),
        quantityArbitrary(),
        quantityArbitrary(),
        async (sessionId, itemData, qty1, qty2) => {
          // Add item first time
          const cart1 = await cartService.addItem(sessionId, {
            ...itemData,
            quantity: qty1,
          })

          expect(cart1.items.length).toBe(1)
          expect(cart1.items[0].quantity).toBe(qty1)

          // Add same item again (same product, size, color)
          const cart2 = await cartService.addItem(sessionId, {
            ...itemData,
            quantity: qty2,
          })

          // Should still have only 1 item
          expect(cart2.items.length).toBe(1)

          // Quantity should be accumulated
          expect(cart2.items[0].quantity).toBe(qty1 + qty2)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Clear cart functionality
   * 
   * Clearing a cart should remove all items.
   */
  it('should clear all items from cart', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        fc.array(cartItemWithoutIdArbitrary(), { minLength: 1, maxLength: 5 }),
        async (sessionId, itemsData) => {
          // Add items to cart
          for (const itemData of itemsData) {
            await cartService.addItem(sessionId, itemData)
          }

          // Verify items were added
          const cartBefore = await cartService.getCart(sessionId)
          expect(cartBefore.items.length).toBeGreaterThan(0)

          // Clear cart
          await cartService.clearCart(sessionId)

          // Verify cart is empty
          const cartAfter = await cartService.getCart(sessionId)
          expect(cartAfter.items.length).toBe(0)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Update item quantity
   * 
   * Updating an item's quantity should persist the new quantity.
   */
  it('should update item quantity correctly', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        sessionIdArbitrary(),
        cartItemWithoutIdArbitrary(),
        quantityArbitrary(),
        quantityArbitrary(),
        async (sessionId, itemData, initialQty, newQty) => {
          // Add item with initial quantity
          const cart1 = await cartService.addItem(sessionId, {
            ...itemData,
            quantity: initialQty,
          })

          const itemId = cart1.items[0].id
          expect(cart1.items[0].quantity).toBe(initialQty)

          // Update quantity
          const cart2 = await cartService.updateItemQuantity(
            sessionId,
            itemId,
            newQty
          )

          // Verify new quantity
          expect(cart2.items[0].quantity).toBe(newQty)

          // Verify persistence
          const cart3 = await cartService.getCart(sessionId)
          expect(cart3.items[0].quantity).toBe(newQty)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)
})
