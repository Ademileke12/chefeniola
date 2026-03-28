'use client'

import React, { useState } from 'react'
import Image from 'next/image'

export interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter out invalid URLs
  const validImages = images.filter(image => {
    return image && 
      (image.startsWith('http') || image.startsWith('/')) && 
      !image.includes('pending-export') &&
      !image.includes('via.placeholder.com') && // Filter out placeholder URLs
      !image.includes('canvas-mockup') // Filter out canvas mockup placeholders
  })

  if (validImages.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    )
  }

  // Ensure selectedIndex is within bounds
  const safeSelectedIndex = Math.min(selectedIndex, validImages.length - 1)

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 rounded-lg">
        <Image
          src={validImages[safeSelectedIndex]}
          alt={`${productName} - View ${safeSelectedIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnail Navigation */}
      {validImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {validImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`
                relative aspect-square overflow-hidden bg-gray-100 rounded-md
                transition-all duration-200
                ${
                  safeSelectedIndex === index
                    ? 'ring-2 ring-black ring-offset-2'
                    : 'hover:opacity-75'
                }
              `}
            >
              <Image
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 12vw"
              />
            </button>
          ))}
        </div>
      )}

      {/* Navigation Arrows for Mobile */}
      {validImages.length > 1 && (
        <div className="flex justify-center gap-2 md:hidden">
          <button
            onClick={() =>
              setSelectedIndex((prev) =>
                prev === 0 ? validImages.length - 1 : prev - 1
              )
            }
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-all duration-200"
            aria-label="Previous image"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="flex items-center text-sm text-gray-600">
            {safeSelectedIndex + 1} / {validImages.length}
          </span>
          <button
            onClick={() =>
              setSelectedIndex((prev) =>
                prev === validImages.length - 1 ? 0 : prev + 1
              )
            }
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-all duration-200"
            aria-label="Next image"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
