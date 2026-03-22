import { Suspense } from 'react'
import { OrderConfirmationPage } from '@/components/storefront/OrderConfirmationPage'

export default function OrderSuccess() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-16 text-center">Loading order confirmation...</div>}>
        <OrderConfirmationPage />
      </Suspense>
    </div>
  )
}