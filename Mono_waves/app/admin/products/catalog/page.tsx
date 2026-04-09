'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/admin/DashboardLayout'
import { authenticatedFetch } from '@/lib/utils/apiClient'
import { Search, Filter, Plus, Check } from 'lucide-react'

interface GelatoProduct {
  uid: string
  title: string
  description: string
  availableSizes: string[]
  availableColors: Array<{ name: string; code: string }>
  basePrice: number
  category?: string
  brand?: string
  imageUrl?: string
}

const CLOTHING_CATEGORIES = [
  { id: 'mens', label: "Men's Clothing", keywords: ['men', 'male'] },
  { id: 'womens', label: "Women's Clothing", keywords: ['women', 'female', 'ladies'] },
  { id: 'kids', label: "Kids & Baby", keywords: ['kids', 'baby', 'children', 'youth', 'toddler'] },
  { id: 'unisex', label: "Unisex", keywords: ['unisex'] },
]

export default function ProductCatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<GelatoProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<GelatoProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadCatalog()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, selectedCategory])

  const loadCatalog = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/gelato/catalog')
      
      if (!response.ok) {
        throw new Error('Failed to fetch product catalog')
      }
      
      const data = await response.json()
      
      // Products are already properly categorized by the API
      setProducts(data.products || [])
      
    } catch (error) {
      console.error('Failed to load catalog:', error)
      setError(error instanceof Error ? error.message : 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => {
        const category = p.category?.toLowerCase() || ''
        
        // Match the category from the API response
        if (selectedCategory === 'mens') {
          return category.includes("men's") || category.includes('men')
        } else if (selectedCategory === 'womens') {
          return category.includes("women's") || category.includes('women') || category.includes('ladies')
        } else if (selectedCategory === 'kids') {
          return category.includes('kids') || category.includes('baby')
        } else if (selectedCategory === 'unisex') {
          return category.includes('unisex')
        }
        return false
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.uid.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }

  const toggleProductSelection = (uid: string) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(uid)) {
      newSelection.delete(uid)
    } else {
      newSelection.add(uid)
    }
    setSelectedProducts(newSelection)
  }

  const handleImportSelected = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product to import')
      return
    }

    setImporting(true)

    try {
      const productsToImport = products.filter(p => selectedProducts.has(p.uid))
      
      // Validate all product UIDs first
      const validationErrors: string[] = []
      for (const product of productsToImport) {
        try {
          const validationResponse = await authenticatedFetch('/api/gelato/validate-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productUid: product.uid })
          })

          if (!validationResponse.ok) {
            validationErrors.push(`${product.title}: Validation request failed`)
            continue
          }

          const validationResult = await validationResponse.json()
          if (!validationResult.valid) {
            validationErrors.push(`${product.title}: ${validationResult.error || 'Invalid product UID'}`)
          }
        } catch (error) {
          validationErrors.push(`${product.title}: Validation error`)
        }
      }

      // If any validation errors, show them and abort
      if (validationErrors.length > 0) {
        alert(`Product validation failed:\n\n${validationErrors.join('\n')}\n\nPlease contact support if this issue persists.`)
        setImporting(false)
        return
      }
      
      // Import each product
      for (const product of productsToImport) {
        const productData = {
          name: product.title,
          description: product.description,
          price: product.basePrice * 2, // Default 100% markup
          gelatoProductUid: product.uid,
          published: false, // Start as draft
          designData: {
            elements: [],
            canvas: {
              width: 800,
              height: 1000,
              backgroundColor: '#ffffff'
            }
          }
        }

        const response = await authenticatedFetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        })

        if (!response.ok) {
          throw new Error(`Failed to import ${product.title}`)
        }
      }

      alert(`Successfully imported ${selectedProducts.size} product(s)!`)
      router.push('/admin/products')
      
    } catch (error) {
      console.error('Failed to import products:', error)
      alert(error instanceof Error ? error.message : 'Failed to import products')
    } finally {
      setImporting(false)
    }
  }

  const handleQuickImport = async (product: GelatoProduct) => {
    // Navigate to a quick import page with pre-filled data
    const params = new URLSearchParams({
      uid: product.uid,
      title: product.title,
      description: product.description,
      basePrice: product.basePrice.toString()
    })
    router.push(`/admin/products/import?${params.toString()}`)
  }

  if (loading) {
    return (
      <DashboardLayout activeSection="products">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading product catalog...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeSection="products">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading catalog</div>
            <div className="text-gray-500 text-sm">{error}</div>
            <button
              onClick={loadCatalog}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="products">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-gray-500 mt-1">Browse and import products from Gelato</p>
          </div>
          {selectedProducts.size > 0 && (
            <button
              onClick={handleImportSelected}
              disabled={importing}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {importing ? 'Importing...' : `Import ${selectedProducts.size} Selected`}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {CLOTHING_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-500">
          Showing {filteredProducts.length} of {products.length} products
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No products found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.uid}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer ${
                  selectedProducts.has(product.uid)
                    ? 'border-gray-900 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleProductSelection(product.uid)}
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-center p-4">
                      <div className="text-sm font-medium">{product.title}</div>
                    </div>
                  )}
                  {selectedProducts.has(product.uid) && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                    {product.uid}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Base Price</div>
                      <div className="font-semibold text-gray-900">
                        ${product.basePrice.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuickImport(product)
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Quick Import
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
