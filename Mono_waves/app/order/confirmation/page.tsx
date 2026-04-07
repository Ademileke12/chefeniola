'use client'

/**
 * Order Confirmation Page
 * 
 * Displays order details immediately after successful payment.
 * Customers are redirected here from Stripe checkout with a session_id.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Suspense } from 'react'
import OrderConfirmationContent from './OrderConfirmationContent'

// Force dynamic rendering - this page requires query params
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mt-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-black">Loading...</p>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  )
}
