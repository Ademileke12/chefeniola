import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { productService } from '@/lib/services/productService'
import { ProductDetailPage } from '@/components/storefront/ProductDetailPage'

interface ProductPageProps {
  params: {
    id: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await productService.getProductById(params.id)

  if (!product || !product.published) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-16 text-center">Loading product...</div>}>
        <ProductDetailPage product={product} />
      </Suspense>
    </div>
  )
}