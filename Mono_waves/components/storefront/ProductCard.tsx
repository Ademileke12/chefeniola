import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Product } from '@/types/product'
import { ArrowUpRight } from 'lucide-react'

export interface ProductCardProps {
  product: Product
  onQuickView?: () => void
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  // Use color image if available, otherwise use designUrl if it's a valid URL
  const isValidUrl = (url: string) => {
    return url && url.startsWith('http') && !url.includes('pending-export')
  }

  const primaryImage = (product.images && product.images.length > 0) ? product.images[0] :
    (isValidUrl(product.designFileUrl) ? product.designFileUrl :
      (isValidUrl(product.designUrl) ? product.designUrl : null))

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price)

  // Extract unique colors for swatches
  const uniqueColors = Array.from(new Set(product.variants?.map(v => v.colorCode) || []))
    .filter(Boolean)
    .slice(0, 5) // Limit to 5 swatches

  return (
    <div className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-[#F9F9F9]">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-gray-300 text-xs font-medium uppercase tracking-widest">No Image</span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 flex items-center justify-center">
            <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
              <span className="bg-white text-black text-[10px] font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 tracking-widest uppercase">
                View Details <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* NEW badge if needed */}
          {product.publishedAt && isNewProduct(product.publishedAt) && (
            <div className="absolute top-4 left-4 bg-black text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md">
              NEW
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-black transition-colors">
              {product.name}
            </h3>
            <span className="text-sm font-bold text-gray-900">
              {formattedPrice}
            </span>
          </div>

          {/* Color Swatches */}
          {uniqueColors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {uniqueColors.map((color, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-full border border-black/10 ring-1 ring-transparent group-hover:ring-black/5 transition-all"
                  style={{ backgroundColor: color }}
                  title="Available color"
                />
              ))}
              {product.variants && product.variants.length > 5 && (
                <span className="text-[10px] text-gray-400 font-medium">+{product.variants.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

// Helper function to check if product is new (within last 30 days)
function isNewProduct(publishedAt: string): boolean {
  const publishedDate = new Date(publishedAt)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return publishedDate > thirtyDaysAgo
}
