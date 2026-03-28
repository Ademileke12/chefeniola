'use client'

import React, { useState } from 'react'

interface ProductAccordionProps {
  title: string
  content: React.ReactNode
  defaultOpen?: boolean
}

export function ProductAccordion({ title, content, defaultOpen = false }: ProductAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium uppercase tracking-wider">
          {title}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="pb-4">
          {content}
        </div>
      )}
    </div>
  )
}