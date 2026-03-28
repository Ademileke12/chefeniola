'use client'

import React from 'react'

interface ProductSortProps {
  value: string
  onChange: (value: string) => void
}

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export function ProductSort({ value, onChange }: ProductSortProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      <label htmlFor="sort" className="hidden sm:block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
        Sort By:
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 px-4 py-2 text-[10px] font-bold text-gray-900 focus:border-black focus:outline-none focus:ring-0 transition-all uppercase tracking-widest cursor-pointer appearance-none text-center sm:text-left"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value} className="font-bold">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}