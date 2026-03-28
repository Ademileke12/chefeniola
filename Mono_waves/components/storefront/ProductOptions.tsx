'use client'

import React from 'react'
import { ProductColor } from '@/types/product'

export interface ProductOptionsProps {
  sizes: string[]
  colors: ProductColor[]
  selectedSize: string
  selectedColor: string
  onSizeChange: (size: string) => void
  onColorChange: (color: string) => void
}

export function ProductOptions({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  onSizeChange,
  onColorChange,
}: ProductOptionsProps) {
  return (
    <div className="space-y-8">
      {/* Color Selector */}
      {colors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-900 uppercase tracking-wider">
              COLOR
            </label>
            {selectedColor && (
              <span className="text-sm text-gray-600">
                {selectedColor}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => onColorChange(color.name)}
                className={`
                  relative group
                `}
                title={color.name}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 transition-all duration-200
                    ${selectedColor === color.name
                      ? 'border-black ring-2 ring-black ring-offset-2'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={{ backgroundColor: color.hex }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Selector */}
      {sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-900 uppercase tracking-wider">
              SELECT SIZE
            </label>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                className={`
                  py-3 px-4 text-sm font-medium border transition-all duration-200
                  ${selectedSize === size
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
