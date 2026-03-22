import { Suspense } from 'react'
import { CheckoutPage } from '@/components/storefront/CheckoutPage'

export default function Checkout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="py-16 text-center">Loading checkout...</div>}>
        <CheckoutPage />
      </Suspense>
    </div>
  )
}