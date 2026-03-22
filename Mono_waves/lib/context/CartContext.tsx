'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem } from '@/types'

interface CartContextType {
    cartItems: CartItem[]
    cartCount: number
    loading: boolean
    addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>
    removeFromCart: (itemId: string) => Promise<void>
    updateQuantity: (itemId: string, quantity: number) => Promise<void>
    refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Get or create session ID for cart
function getSessionId(): string {
    if (typeof window === 'undefined') return ''

    let sessionId = localStorage.getItem('cart_session_id')
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        localStorage.setItem('cart_session_id', sessionId)
    }
    return sessionId
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)

    const refreshCart = async () => {
        try {
            const sessionId = getSessionId()
            const response = await fetch(`/api/cart?sessionId=${sessionId}`)
            if (response.ok) {
                const data = await response.json()
                setCartItems(data.items || [])
            }
        } catch (error) {
            console.error('Error refreshing cart:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refreshCart()
    }, [])

    const addToCart = async (item: Omit<CartItem, 'id'>) => {
        try {
            const sessionId = getSessionId()
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, sessionId })
            })
            if (response.ok) {
                await refreshCart()
            }
        } catch (error) {
            console.error('Error adding to cart:', error)
        }
    }

    const removeFromCart = async (itemId: string) => {
        try {
            const sessionId = getSessionId()
            const response = await fetch(`/api/cart`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, itemId })
            })
            if (response.ok) {
                await refreshCart()
            }
        } catch (error) {
            console.error('Error removing from cart:', error)
        }
    }

    const updateQuantity = async (itemId: string, quantity: number) => {
        try {
            const sessionId = getSessionId()
            const response = await fetch('/api/cart', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, itemId, quantity })
            })
            if (response.ok) {
                await refreshCart()
            }
        } catch (error) {
            console.error('Error updating quantity:', error)
        }
    }

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <CartContext.Provider value={{
            cartItems,
            cartCount,
            loading,
            addToCart,
            removeFromCart,
            updateQuantity,
            refreshCart
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
