'use client'

import React from 'react'
import Button from '@/components/ui/Button'

interface AddToCartSectionProps {
  quantity: number
  onQuantityChange: (quantity: number) => void
  onAddToCart: () => void
  disabled?: boolean
  isAdding?: boolean
}

export function AddToCartSection({
  quantity,
  onQuantityChange,
  onAddToCart,
  disabled = false,
  isAdding = false
}: AddToCartSectionProps) {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta)
    onQuantityChange(newQuantity)
  }

  return (
    <div className="space-y-6">
      {/* Quantity Selector */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em]">
          QUANTITY
        </label>
        <div className="flex items-center space-x-4">
          <div className="flex items-center border border-gray-200 bg-white shadow-sm transition-all hover:border-black">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1 || isAdding}
              className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 disabled:opacity-10 disabled:cursor-not-allowed transition-all font-bold text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-16 h-12 flex items-center justify-center text-center text-sm font-black border-l border-r border-gray-100 bg-[#FBFBFB]">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={isAdding}
              className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-all font-bold text-lg disabled:opacity-10"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="space-y-4">
        <Button
          onClick={onAddToCart}
          disabled={disabled || isAdding}
          fullWidth
          size="lg"
          className="h-14 font-black uppercase tracking-[0.2em] text-[11px] relative overflow-hidden"
        >
          {isAdding ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              ADDING...
            </span>
          ) : (
            'ADD TO CART'
          )}
        </Button>

      </div>

      {/* Size Guide Link */}
      <div className="text-center">
        <button className="text-sm text-gray-500 hover:text-gray-900 uppercase tracking-wider border-b border-transparent hover:border-gray-900 pb-1 transition-colors">
          SIZE GUIDE
        </button>
      </div>
    </div>
  )
}