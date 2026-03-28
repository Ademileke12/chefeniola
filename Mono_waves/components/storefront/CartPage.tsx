'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CartItem as CartItemType } from '@/types'
import CartItem from '@/components/storefront/CartItem'
import CartSummary from '@/components/storefront/CartSummary'
import EmptyCart from '@/components/storefront/EmptyCart'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'
import Button from '@/components/ui/Button'

// Get or create session ID for cart
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem('cart_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('cart_session_id', sessionId)
  }
  return sessionId
}

import { useCart } from '@/lib/context/CartContext'

export function CartPage() {
  const { cartItems, loading, updateQuantity, removeFromCart } = useCart()

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = subtotal > 100 ? 0 : 10 // Free shipping over $100
  const total = subtotal + shipping

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'HOME', href: '/' },
            { label: 'CART', href: '/cart' }
          ]}
        />
        <EmptyCart />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'HOME', href: '/' },
          { label: 'CART', href: '/cart' }
        ]}
      />

      {/* Page Header */}
      <div className="mt-6 sm:mt-8 mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-light tracking-wide mb-2">
          SHOPPING CART
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4 sm:space-y-6">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={(quantity) => updateQuantity(item.id, quantity)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>

          {/* Continue Shopping */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            <Link href="/products">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                CONTINUE SHOPPING
              </Button>
            </Link>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-8">
            <CartSummary
              subtotal={subtotal}
              shipping={shipping}
              total={total}
            />

            <div className="mt-6">
              <Link href="/checkout">
                <Button fullWidth size="lg" className="h-12 sm:h-14">
                  PROCEED TO CHECKOUT
                </Button>
              </Link>
            </div>

            {/* Shipping Notice */}
            {subtotal < 100 && (
              <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Add <strong>${(100 - subtotal).toFixed(2)}</strong> more for free shipping
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((subtotal / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}