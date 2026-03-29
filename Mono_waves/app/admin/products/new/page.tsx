'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ProductBuilderWizard from '@/components/admin/ProductBuilderWizard'
import { authenticatedFetch } from '@/lib/utils/apiClient'
import { GelatoProduct, CreateProductData } from '@/types/product'

export default function NewProductPage() {
  const router = useRouter()
  const [gelatoProducts, setGelatoProducts] = useState<GelatoProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGelatoProducts()
  }, [])

  const fetchGelatoProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/gelato/catalog')

      if (!response.ok) {
        throw new Error('Failed to fetch Gelato product catalog')
      }

      const data = await response.json()
      setGelatoProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching Gelato products:', error)
      setError(error instanceof Error ? error.message : 'Failed to load product catalog')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: CreateProductData) => {
    try {
      const response = await authenticatedFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      router.push('/admin/products')
    } catch (error) {
      console.error('Error creating product:', error)
      alert(error instanceof Error ? error.message : 'Failed to create product. Please try again.')
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/admin/products')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading Gelato Catalog...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-red-900 mb-2">Catalog Sync Failed</h3>
        <p className="text-red-700 mb-6">{error}</p>
        <button
          onClick={fetchGelatoProducts}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex items-center space-x-4 max-w-5xl mx-auto">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create New Product</h1>
          <p className="text-gray-500 font-medium">Refactor: 4-Step Professional Workflow</p>
        </div>
      </div>

      <ProductBuilderWizard
        gelatoProducts={gelatoProducts}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}
