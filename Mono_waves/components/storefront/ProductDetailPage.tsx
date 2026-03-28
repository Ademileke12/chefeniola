'use client'

import React, { useState } from 'react'
import { Product } from '@/types'
import { useCart } from '@/lib/context/CartContext'
import { ProductGallery } from '@/components/storefront/ProductGallery'
import { ProductOptions } from '@/components/storefront/ProductOptions'
import { ProductGrid } from '@/components/storefront/ProductGrid'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'
import { ProductAccordion } from './ProductAccordion'
import { AddToCartSection } from './AddToCartSection'
import Button from '@/components/ui/Button'

interface ProductDetailPageProps {
  product: Product
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>(product.variants?.[0]?.color || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [sizeGuide, setSizeGuide] = useState<any>(null)
  const [loadingSizeGuide, setLoadingSizeGuide] = useState(false)

  // Fetch size guide
  React.useEffect(() => {
    async function fetchSizeGuide() {
      setLoadingSizeGuide(true)
      try {
        const response = await fetch(`/api/products/${product.id}/size-guide`)
        if (response.ok) {
          const data = await response.json()
          setSizeGuide(data)
        }
      } catch (err) {
        console.error('Failed to fetch size guide:', err)
      } finally {
        setLoadingSizeGuide(false)
      }
    }
    fetchSizeGuide()
  }, [product.id])

  // Get product images (Requirement 11.2)
  const getProductImages = () => {
    // Validate URL helper
    const isValidUrl = (url?: string) => {
      return url &&
        (url.startsWith('http') || url.startsWith('/')) &&
        !url.includes('pending-export') &&
        !url.includes('via.placeholder.com') &&
        !url.includes('canvas-mockup')
    }

    // Use the images array if present, otherwise fall back to designFileUrl
    const images: string[] = []

    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
        if (isValidUrl(img)) images.push(img)
      })
    }

    // Add designFileUrl if not already in the list
    if (isValidUrl(product.designFileUrl) && !images.includes(product.designFileUrl!)) {
      images.push(product.designFileUrl!)
    }

    // Support legacy designUrl field
    if (isValidUrl(product.designUrl) && !images.includes(product.designUrl!)) {
      images.push(product.designUrl!)
    }

    return images.length > 0 ? images : ['/placeholder-product.png']
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price)

  const { addToCart } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddToCart = async () => {
    if (!selectedSize) {
      alert('Please select a size')
      return
    }

    setIsAdding(true)
    try {
      await addToCart({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: quantity,
        size: selectedSize,
        color: selectedColor,
        imageUrl: getProductImages()[0]
      })

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to add to cart:', err)
      alert('Failed to add to cart. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }


  return (
    <div className="max-w-7xl mx-auto px-4 py-2 sm:py-8 font-inter">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6">
        <Breadcrumb
          items={[
            { label: 'HOME', href: '/' },
            { label: 'SHOP ALL', href: '/products' },
            { label: product.name.toUpperCase(), href: `/products/${product.id}` }
          ]}
        />
      </div>

      {/* Product Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Product Gallery */}
        <div className="w-full">
          <ProductGallery
            images={getProductImages()}
            productName={product.name}
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6 sm:space-y-8">
          {/* Basic Info */}
          <div className="space-y-2 sm:space-y-4">
            <h1 className="text-xl sm:text-3xl font-light tracking-wide leading-tight text-gray-900 uppercase">
              {product.name}
            </h1>
            <p className="text-lg sm:text-2xl font-medium text-gray-900">
              {formattedPrice}
            </p>

            {product.description && (
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base font-light">
                {product.description}
              </p>
            )}
          </div>

          {/* Product Options */}
          <ProductOptions
            sizes={Array.from(new Set(product.variants?.map(v => v.size) || []))}
            colors={Array.from(new Set(product.variants?.map(v => v.color) || [])).map(name => ({
              name,
              hex: product.variants?.find(v => v.color === name)?.colorCode || '#000000'
            }))}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            onSizeChange={setSelectedSize}
            onColorChange={setSelectedColor}
          />

          {/* Add to Cart Section */}
          <div className="relative">
            <AddToCartSection
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
              disabled={!selectedSize || isAdding}
              isAdding={isAdding}
            />

            {/* Success Message toast */}
            {showSuccess && (
              <div className="absolute top-0 left-0 w-full -mt-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Added to Cart
                </div>
              </div>
            )}
          </div>

          {/* Product Details Accordions */}
          <div className="space-y-4">
            <ProductAccordion
              title="DETAILS & COMPOSITION"
              content={
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Premium quality cotton blend</p>
                  <p>• Custom printed design</p>
                  <p>• Machine washable</p>
                  <p>• Designed and printed on demand</p>
                  <p>• Sustainable production process</p>
                </div>
              }
            />

            <ProductAccordion
              title="SIZE GUIDE"
              content={
                <div className="text-sm text-gray-600">
                  {loadingSizeGuide ? (
                    <div className="flex items-center gap-2 italic">
                      <div className="w-4 h-4 rounded-full border-b border-gray-400 animate-spin" />
                      Loading dimensions...
                    </div>
                  ) : sizeGuide?.measurements ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-2 font-black uppercase tracking-widest text-[10px]">Dimension</th>
                            <th className="py-2 font-black uppercase tracking-widest text-[10px] text-right">Value (mm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(sizeGuide.measurements).map(([key, dim]: [string, any]) => (
                            <tr key={key} className="border-b border-gray-50 border-dotted">
                              <td className="py-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                              <td className="py-2 text-right font-medium">{dim.value} {dim.measureUnit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : sizeGuide?.attributes ? (
                    <ul className="space-y-1">
                      {Object.entries(sizeGuide.attributes).map(([key, val]: [string, any]) => (
                        <li key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span>{val}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="italic">Standard fit. Please refer to our global size chart.</p>
                  )}
                </div>
              }
            />

            <ProductAccordion
              title="SHIPPING & RETURNS"
              content={
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Shipping:</strong> 5-7 business days for production + 3-5 days for delivery</p>
                  <p><strong>Returns:</strong> 30-day return policy for unworn items</p>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}