'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/admin/DashboardLayout'
import { ArrowLeft, Save, Eye } from 'lucide-react'

function ImportProductForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState({
    name: searchParams.get('title') || '',
    description: searchParams.get('description') || '',
    gelato_product_uid: searchParams.get('uid') || '',
    basePrice: parseFloat(searchParams.get('basePrice') || '25'),
    price: parseFloat(searchParams.get('basePrice') || '25') * 2, // Default 100% markup
    published: false
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markup = ((formData.price - formData.basePrice) / formData.basePrice * 100).toFixed(0)
  const profit = (formData.price - formData.basePrice).toFixed(2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        gelatoProductUid: formData.gelato_product_uid,
        published: formData.published,
        designData: {
          elements: [],
          canvas: {
            width: 800,
            height: 1000,
            backgroundColor: '#ffffff'
          }
        }
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import product')
      }

      const result = await response.json()
      
      if (formData.published) {
        alert('Product imported and published successfully!')
        router.push('/admin/products')
      } else {
        alert('Product imported as draft successfully!')
        router.push(`/admin/products/${result.product.id}/edit`)
      }
      
    } catch (error) {
      console.error('Failed to import product:', error)
      setError(error instanceof Error ? error.message : 'Failed to import product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout activeSection="products">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Product</h1>
            <p className="text-gray-500 mt-1">Customize pricing and publish to your store</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 font-medium">Error</div>
            <div className="text-red-500 text-sm mt-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter product description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gelato Product ID
                </label>
                <input
                  type="text"
                  value={formData.gelato_product_uid}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the Gelato product identifier and cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Pricing</h2>
            
            <div className="space-y-6">
              {/* Base Price (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Cost (from Gelato)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    ${formData.basePrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">per unit</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This is the cost you pay to Gelato for production and fulfillment
                </p>
              </div>

              {/* Selling Price (Editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Selling Price *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min={formData.basePrice}
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 text-2xl font-semibold border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Set your selling price to include your desired profit margin
                </p>
              </div>

              {/* Profit Calculation */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Base Cost:</span>
                  <span className="font-medium text-gray-900">${formData.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Your Price:</span>
                  <span className="font-medium text-gray-900">${formData.price.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Your Profit:</span>
                  <div className="text-right">
                    <div className="font-bold text-green-600 text-lg">${profit}</div>
                    <div className="text-xs text-gray-500">{markup}% markup</div>
                  </div>
                </div>
              </div>

              {/* Quick Markup Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Markup
                </label>
                <div className="flex gap-2">
                  {[50, 100, 150, 200].map(percent => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        price: formData.basePrice * (1 + percent / 100) 
                      })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      +{percent}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Publishing</h2>
            
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
              <div>
                <div className="font-medium text-gray-900">Publish immediately</div>
                <div className="text-sm text-gray-500">
                  Make this product visible on your storefront right away
                </div>
              </div>
            </label>
            
            {!formData.published && (
              <p className="text-sm text-gray-500 mt-4">
                Product will be saved as a draft. You can customize the design and publish it later.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formData.price < formData.basePrice}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? (
                'Importing...'
              ) : formData.published ? (
                <>
                  <Eye className="w-5 h-5" />
                  Import & Publish
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Import as Draft
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

export default function ImportProductPage() {
  return (
    <Suspense fallback={
      <DashboardLayout activeSection="products">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    }>
      <ImportProductForm />
    </Suspense>
  )
}
