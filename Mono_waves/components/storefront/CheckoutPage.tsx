'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CartItem } from '@/types'
import CheckoutForm from '@/components/storefront/CheckoutForm'
import OrderSummary from '@/components/storefront/OrderSummary'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'

// Get session ID for cart
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('cart_session_id') || ''
}

export function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load cart data from API
  useEffect(() => {
    async function fetchCart() {
      try {
        const sessionId = getSessionId()
        if (!sessionId) {
          throw new Error('No cart session found')
        }

        const response = await fetch(`/api/cart?sessionId=${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch cart')
        }
        
        const cart = await response.json()
        setCartItems(cart.items || [])
      } catch (err) {
        console.error('Error fetching cart:', err)
        setError(err instanceof Error ? err.message : 'Failed to load cart')
      } finally {
        setLoading(false)
      }
    }

    fetchCart()
  }, [])

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = subtotal > 100 ? 0 : 10
  const total = subtotal + shipping

  const handleCheckoutSubmit = async (data: any) => {
    setIsProcessing(true)
    
    try {
      const sessionId = getSessionId()
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, sessionId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Checkout failed')
      }
      
      const { url } = await response.json()
      
      // Redirect to Stripe checkout
      window.location.href = url
    } catch (error) {
      console.error('Checkout failed:', error)
      alert(error instanceof Error ? error.message : 'Checkout failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'HOME', href: '/' },
            { label: 'CART', href: '/cart' },
            { label: 'CHECKOUT', href: '/checkout' }
          ]}
        />
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-light mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
          <Link href="/products" className="text-black underline hover:no-underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'HOME', href: '/' },
          { label: 'CART', href: '/cart' },
          { label: 'CHECKOUT', href: '/checkout' }
        ]}
      />

      {/* Page Header */}
      <div className="mt-6 sm:mt-8 mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-2 text-black">
          CHECKOUT
        </h1>
        <p className="text-black text-sm sm:text-base">
          Complete your order details below
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Checkout Form */}
        <div>
          <CheckoutForm
            cartItems={cartItems}
            onSubmit={handleCheckoutSubmit}
            isProcessing={isProcessing}
          />
        </div>

        {/* Order Summary */}
        <div>
          <div className="lg:sticky lg:top-8">
            <OrderSummary
              items={cartItems}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
            />

            {/* Security Notice */}
            <div className="mt-6 p-3 sm:p-4 bg-white rounded border">
              <div className="flex items-center space-x-2 text-sm text-black">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Your payment information is secure and encrypted</span>
              </div>
              
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-xs text-black">Accepted payments:</div>
                <div className="flex space-x-2">
                  <div className="w-8 h-5 bg-gray-200 rounded text-xs flex items-center justify-center text-black">
                    VISA
                  </div>
                  <div className="w-8 h-5 bg-gray-200 rounded text-xs flex items-center justify-center text-black">
                    MC
                  </div>
                  <div className="w-8 h-5 bg-gray-200 rounded text-xs flex items-center justify-center text-black">
                    AMEX
                  </div>
                </div>
              </div>
            </div>

            {/* Return Policy */}
            <div className="mt-4 text-xs text-black text-center">
              <Link href="/returns" className="hover:text-gray-600 underline">
                Return Policy
              </Link>
              {' • '}
              <Link href="/privacy" className="hover:text-gray-600 underline">
                Privacy Policy
              </Link>
              {' • '}
              <Link href="/terms" className="hover:text-gray-600 underline">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}