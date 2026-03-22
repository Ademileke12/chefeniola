import { Suspense } from 'react'
import { CartPage } from '@/components/storefront/CartPage'

export default function Cart() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-16 text-center">Loading cart...</div>}>
        <CartPage />
      </Suspense>
    </div>
  )
}