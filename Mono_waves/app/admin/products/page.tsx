'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import ProductTable from '@/components/admin/ProductTable'
import { Product } from '@/types/product'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/products?includeUnpublished=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }
      
      const data = await response.json()
      // API now returns array directly, not wrapped in { products: [] }
      setProducts(Array.isArray(data) ? data : data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      setError(error instanceof Error ? error.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (productId: string) => {
    router.push(`/admin/products/${productId}/edit`)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      // Refresh products list
      await fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

  const handleTogglePublish = async (productId: string, published: boolean) => {
    try {
      const endpoint = published 
        ? `/api/products/${productId}/publish`
        : `/api/products/${productId}/unpublish`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to ${published ? 'publish' : 'unpublish'} product`)
      }

      // Refresh products list
      await fetchProducts()
    } catch (error) {
      console.error('Error toggling publish status:', error)
      alert(`Failed to ${published ? 'publish' : 'unpublish'} product. Please try again.`)
    }
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.sizes.some(size => size.toLowerCase().includes(query)) ||
      product.colors.some(color => color.name.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6 m-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product catalog and inventory
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/products/catalog')}
            className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            <Search className="w-4 h-4" />
            <span>Browse Catalog</span>
          </button>
          <button
            onClick={() => router.push('/admin/products/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name, description, size, or color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Products Table */}
      <ProductTable
        products={filteredProducts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePublish={handleTogglePublish}
        loading={loading}
      />

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No products found' : 'No products yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchQuery 
              ? 'Try adjusting your search query'
              : 'Get started by creating your first product'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/admin/products/new')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {products.filter(p => p.published).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-gray-600 mt-1">
              {products.filter(p => !p.published).length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
