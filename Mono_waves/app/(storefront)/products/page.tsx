import { Suspense } from 'react'
import { ProductListingPage } from '@/components/storefront/ProductListingPage'

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-16 text-center">Loading products...</div>}>
        <ProductListingPage />
      </Suspense>
    </div>
  )
}