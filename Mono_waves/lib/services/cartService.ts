import { supabaseAdmin } from '../supabase/server'
import type { Cart, CartItem } from '@/types'
import type { DatabaseCart } from '@/types/database'

/**
 * Convert database cart to application cart
 */
function toCart(dbCart: DatabaseCart): Cart {
  return {
    id: dbCart.id,
    sessionId: dbCart.session_id,
    items: Array.isArray(dbCart.items) ? dbCart.items : [],
    createdAt: dbCart.created_at,
    updatedAt: dbCart.updated_at,
    expiresAt: dbCart.expires_at,
  }
}

/**
 * Cart service for managing shopping cart operations
 */
export const cartService = {
  /**
   * Get cart by session ID
   * Creates a new cart if one doesn't exist for the session
   */
  async getCart(sessionId: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin
      .from('carts')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Cart not found, create new one
        return await this.createCart(sessionId)
      }
      throw new Error(`Failed to fetch cart: ${error.message}`)
    }

    return toCart(data)
  },

  /**
   * Create a new cart for a session
   */
  async createCart(sessionId: string): Promise<Cart> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const { data, error } = await supabaseAdmin
      .from('carts')
      .insert({
        session_id: sessionId,
        items: [],
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create cart: ${error.message}`)
    }

    return toCart(data)
  },

  /**
   * Add item to cart
   * If item with same product, size, and color exists, increment quantity
   */
  async addItem(sessionId: string, item: Omit<CartItem, 'id'>): Promise<Cart> {
    // Validate quantity
    if (item.quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    // Get or create cart
    const cart = await this.getCart(sessionId)

    // Check if item already exists (same product, size, color)
    const existingItemIndex = cart.items.findIndex(
      (i) =>
        i.productId === item.productId &&
        i.size === item.size &&
        i.color === item.color
    )

    let updatedItems: CartItem[]

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      updatedItems = [...cart.items]
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + item.quantity,
      }
    } else {
      // Add new item with generated ID
      const newItem: CartItem = {
        ...item,
        id: `${item.productId}-${item.size}-${item.color}-${Date.now()}`,
      }
      updatedItems = [...cart.items, newItem]
    }

    // Update cart in database
    const { data, error } = await supabaseAdmin
      .from('carts')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add item to cart: ${error.message}`)
    }

    return toCart(data)
  },

  /**
   * Update item quantity in cart
   */
  async updateItemQuantity(
    sessionId: string,
    itemId: string,
    quantity: number
  ): Promise<Cart> {
    // Validate quantity
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    // Get cart
    const cart = await this.getCart(sessionId)

    // Find item
    const itemIndex = cart.items.findIndex((i) => i.id === itemId)
    if (itemIndex === -1) {
      throw new Error('Item not found in cart')
    }

    // Update quantity
    const updatedItems = [...cart.items]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity,
    }

    // Update cart in database
    const { data, error } = await supabaseAdmin
      .from('carts')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update item quantity: ${error.message}`)
    }

    return toCart(data)
  },

  /**
   * Remove item from cart
   */
  async removeItem(sessionId: string, itemId: string): Promise<Cart> {
    // Get cart
    const cart = await this.getCart(sessionId)

    // Filter out the item
    const updatedItems = cart.items.filter((i) => i.id !== itemId)

    // Update cart in database
    const { data, error } = await supabaseAdmin
      .from('carts')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to remove item from cart: ${error.message}`)
    }

    return toCart(data)
  },

  /**
   * Clear all items from cart
   */
  async clearCart(sessionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('carts')
      .update({
        items: [],
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)

    if (error) {
      throw new Error(`Failed to clear cart: ${error.message}`)
    }
  },

  /**
   * Calculate cart total (subtotal)
   */
  calculateTotal(cart: Cart): number {
    return cart.items.reduce((total, item) => {
      return total + item.price * item.quantity
    }, 0)
  },
}
