'use client'

import React, { useState, useMemo } from 'react'
import { Product, ProductFilters } from '@/types'

interface ProductFiltersPanelProps {
  products: Product[]
  filters: ProductFilters
  onFilterChange: (filters: ProductFilters) => void
}

export function ProductFiltersPanel({ products, filters, onFilterChange }: ProductFiltersPanelProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || 200
  ])

  // Extract unique colors and sizes from products
  const availableOptions = useMemo(() => {
    const colors = new Set<string>()
    const sizes = new Set<string>()
    let minPrice = Infinity
    let maxPrice = 0

    products.forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.color) colors.add(variant.color)
          if (variant.size) sizes.add(variant.size)
        })
      }
      minPrice = Math.min(minPrice, product.price)
      maxPrice = Math.max(maxPrice, product.price)
    })

    return {
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      minPrice: minPrice === Infinity ? 0 : Math.floor(minPrice),
      maxPrice: Math.ceil(maxPrice)
    }
  }, [products])

  const handleColorChange = (color: string, checked: boolean) => {
    const currentColors = filters.colors || []
    const newColors = checked
      ? [...currentColors, color]
      : currentColors.filter(c => c !== color)

    onFilterChange({
      ...filters,
      colors: newColors.length > 0 ? newColors : undefined
    })
  }

  const handleSizeChange = (size: string, checked: boolean) => {
    const currentSizes = filters.sizes || []
    const newSizes = checked
      ? [...currentSizes, size]
      : currentSizes.filter(s => s !== size)

    onFilterChange({
      ...filters,
      sizes: newSizes.length > 0 ? newSizes : undefined
    })
  }

  const handlePriceRangeChange = (min: number, max: number) => {
    setPriceRange([min, max])
    onFilterChange({
      ...filters,
      minPrice: min > availableOptions.minPrice ? min : undefined,
      maxPrice: max < availableOptions.maxPrice ? max : undefined
    })
  }

  const clearAllFilters = () => {
    setPriceRange([availableOptions.minPrice, availableOptions.maxPrice])
    onFilterChange({})
  }

  const hasActiveFilters = !!(filters.colors?.length || filters.sizes?.length || filters.minPrice || filters.maxPrice)

  return (
    <div className="space-y-10">
      {/* Filter Header */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Color Filter */}
      <div>
        <h4 className="text-[10px] font-black text-gray-900 mb-5 uppercase tracking-[0.15em] flex items-center gap-2">
          Color
          <span className="h-px flex-1 bg-gray-100" />
        </h4>
        <div className="space-y-4">
          {availableOptions.colors.map((color) => (
            <label key={color} className="flex items-center group cursor-pointer">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={filters.colors?.includes(color) || false}
                  onChange={(e) => handleColorChange(color, e.target.checked)}
                  className="h-4 w-4 appearance-none border-2 border-gray-200 rounded-md checked:bg-black checked:border-black transition-all cursor-pointer"
                />
                <svg className="absolute w-2.5 h-2.5 text-white left-0.5 pointer-events-none opacity-0 checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="ml-3 text-[11px] font-bold text-gray-500 group-hover:text-black uppercase tracking-wider transition-colors">
                {color}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <h4 className="text-[10px] font-black text-gray-900 mb-5 uppercase tracking-[0.15em] flex items-center gap-2">
          Size
          <span className="h-px flex-1 bg-gray-100" />
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {availableOptions.sizes.map((size) => (
            <label key={size} className="relative group cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sizes?.includes(size) || false}
                onChange={(e) => handleSizeChange(size, e.target.checked)}
                className="peer sr-only"
              />
              <div className="flex items-center justify-center py-2 border-2 border-gray-100 rounded-lg text-[10px] font-bold text-gray-400 peer-checked:border-black peer-checked:text-black hover:border-gray-300 transition-all uppercase tracking-widest">
                {size}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="text-[10px] font-black text-gray-900 mb-5 uppercase tracking-[0.15em] flex items-center gap-2">
          Price Range
          <span className="h-px flex-1 bg-gray-100" />
        </h4>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Min</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">$</span>
                <input
                  type="number"
                  min={availableOptions.minPrice}
                  max={availableOptions.maxPrice}
                  value={priceRange[0]}
                  onChange={(e) => handlePriceRangeChange(Number(e.target.value), priceRange[1])}
                  className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-black text-gray-900 focus:border-black focus:outline-none focus:ring-0 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Max</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">$</span>
                <input
                  type="number"
                  min={availableOptions.minPrice}
                  max={availableOptions.maxPrice}
                  value={priceRange[1]}
                  onChange={(e) => handlePriceRangeChange(priceRange[0], Number(e.target.value))}
                  className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-black text-gray-900 focus:border-black focus:outline-none focus:ring-0 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="relative pt-2">
            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-black"
                style={{
                  left: `${((priceRange[0] - availableOptions.minPrice) / (availableOptions.maxPrice - availableOptions.minPrice)) * 100}%`,
                  right: `${100 - ((priceRange[1] - availableOptions.minPrice) / (availableOptions.maxPrice - availableOptions.minPrice)) * 100}%`
                }}
              />
            </div>
            <input
              type="range"
              min={availableOptions.minPrice}
              max={availableOptions.maxPrice}
              value={priceRange[0]}
              onChange={(e) => {
                const newMin = Number(e.target.value)
                if (newMin <= priceRange[1]) {
                  handlePriceRangeChange(newMin, priceRange[1])
                }
              }}
              className="absolute w-full h-1.5 top-2 appearance-none bg-transparent cursor-pointer pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg"
              style={{ zIndex: priceRange[0] > availableOptions.maxPrice - (availableOptions.maxPrice - availableOptions.minPrice) / 2 ? 5 : 3 }}
            />
            <input
              type="range"
              min={availableOptions.minPrice}
              max={availableOptions.maxPrice}
              value={priceRange[1]}
              onChange={(e) => {
                const newMax = Number(e.target.value)
                if (newMax >= priceRange[0]) {
                  handlePriceRangeChange(priceRange[0], newMax)
                }
              }}
              className="absolute w-full h-1.5 top-2 appearance-none bg-transparent cursor-pointer pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg"
              style={{ zIndex: 4 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}