'use client'

import React, { useState, useEffect } from 'react'
import { Product, ProductFilters } from '@/types'
import { ProductGrid } from '@/components/storefront/ProductGrid'
import { ProductFiltersPanel } from '@/components/storefront/ProductFiltersPanel'
import { ProductSort } from '@/components/storefront/ProductSort'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'
import { Pagination } from '@/components/storefront/Pagination'

const PRODUCTS_PER_PAGE = 12

export function ProductListingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<ProductFilters>({})
  const [sortBy, setSortBy] = useState<string>('newest')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Load products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/products')

        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const data = await response.json()
        // Extract products array from response
        const productsArray = Array.isArray(data) ? data : (data.products || [])
        setProducts(productsArray)
        setFilteredProducts(productsArray)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    // Ensure products is an array
    if (!Array.isArray(products)) {
      setFilteredProducts([])
      return
    }

    let filtered = [...products]

    // Apply filters
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(product =>
        filters.colors!.some(color =>
          product.colors?.some(c => c.name.toLowerCase() === color.toLowerCase())
        )
      )
    }

    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(product =>
        filters.sizes!.some(size => product.sizes?.includes(size))
      )
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(product => product.price >= filters.minPrice!)
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(product => product.price <= filters.maxPrice!)
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [products, filters, sortBy])

  // Pagination
  const totalPages = Math.ceil((filteredProducts?.length || 0) / PRODUCTS_PER_PAGE)
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
  const endIndex = startIndex + PRODUCTS_PER_PAGE
  const currentProducts = Array.isArray(filteredProducts) ? filteredProducts.slice(startIndex, endIndex) : []

  const handleFilterChange = (newFilters: ProductFilters) => {
    setFilters(newFilters)
  }

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 overflow-hidden">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'HOME', href: '/' },
          { label: 'SHOP ALL', href: '/products' }
        ]}
      />

      {/* Page Header - Desktop */}
      <div className="hidden lg:flex items-center justify-between mb-10 mt-6">
        <div>
          <h1 className="text-3xl font-light tracking-wide mb-2 text-black uppercase">Collection 01</h1>
          <p className="text-black text-sm">
            {loading ? 'Loading...' : error ? 'Error loading products' : `${filteredProducts.length} products`}
          </p>
        </div>
        <ProductSort value={sortBy} onChange={handleSortChange} />
      </div>

      {/* Mobile Header & Filter Toggle */}
      <div className="lg:hidden mt-6 mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-light tracking-wide mb-1 text-black uppercase">Collection 01</h1>
          <p className="text-black text-[10px] font-bold uppercase tracking-widest opacity-40">
            {loading ? 'Loading...' : error ? 'Error loading products' : `${filteredProducts.length} products`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 border border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all active:scale-95"
          >
            {mobileFiltersOpen ? 'Close Filters' : 'Filter & Sort'}
            <svg className={`w-3 h-3 transition-transform duration-300 ${mobileFiltersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!mobileFiltersOpen && (
            <div className="flex-1 [&_select]:border-black [&_select]:py-3.5 [&_select]:text-[10px] [&_select]:font-black [&_select]:uppercase [&_select]:tracking-widest [&_select]:h-[46px]">
              <ProductSort value={sortBy} onChange={handleSortChange} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
        {/* Filters Sidebar - Mobile: Collapsible, Desktop: Always visible */}
        <div className={`lg:w-64 flex-shrink-0 ${mobileFiltersOpen ? 'block animate-in fade-in slide-in-from-top-4 duration-300' : 'hidden lg:block'}`}>
          <div className="lg:sticky lg:top-24">
            <ProductFiltersPanel
              products={products}
              filters={filters}
              onFilterChange={(newFilters) => {
                handleFilterChange(newFilters)
              }}
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <ProductGrid products={[]} loading={true} />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-6 text-sm font-bold uppercase tracking-widest">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-black font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <ProductGrid products={currentProducts} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 pt-12 border-t border-gray-100">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}