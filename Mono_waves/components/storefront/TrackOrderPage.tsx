'use client'

import React, { useState } from 'react'
import { Order } from '@/types'
import TrackOrderForm from '@/components/storefront/TrackOrderForm'
import OrderStatus from '@/components/storefront/OrderStatus'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'

export function TrackOrderPage() {
  const [order, setOrder] = useState<Order | null>(null)

  const handleTrackOrder = async (email: string, orderId: string) => {
    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, orderNumber: orderId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to track order')
      }
      
      const orderData = await response.json()
      setOrder(orderData)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Order not found. Please check your email and order number.')
    }
  }

  const handleReset = () => {
    setOrder(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'HOME', href: '/' },
          { label: 'TRACK ORDER', href: '/track' }
        ]}
      />

      {/* Page Header */}
      <div className="mt-8 mb-12 text-center">
        <h1 className="text-3xl font-light tracking-wide mb-4 text-black">
          TRACK YOUR ORDER
        </h1>
        <p className="text-black max-w-2xl mx-auto">
          Enter your email address and order number to track your order status and 
          get real-time updates on your shipment.
        </p>
      </div>

      {!order ? (
        <div className="max-w-md mx-auto">
          {/* Track Order Form */}
          <TrackOrderForm
            onSubmit={handleTrackOrder}
          />

          {/* Help Section */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-medium mb-4 uppercase tracking-wider text-black">
              NEED HELP?
            </h3>
            
            <div className="space-y-4 text-sm text-black">
              <p>
                Your order number can be found in your confirmation email or receipt.
              </p>
              
              <p>
                If you&apos;re having trouble finding your order, please contact our 
                customer service team.
              </p>
              
              <div className="pt-4">
                <a 
                  href="mailto:support@monoverse.com"
                  className="inline-block text-sm font-medium uppercase tracking-wider border-b border-black pb-1 hover:border-gray-400 transition-colors text-black"
                >
                  CONTACT SUPPORT
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Order Status Display */}
          <OrderStatus order={order} />
          
          {/* Track Another Order */}
          <div className="mt-12 text-center">
            <button
              onClick={handleReset}
              className="text-sm font-medium uppercase tracking-wider border-b border-black pb-1 hover:border-gray-400 transition-colors text-black"
            >
              TRACK ANOTHER ORDER
            </button>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-16 bg-gray-50 p-8 rounded">
        <h3 className="text-lg font-medium mb-6 text-center uppercase tracking-wider text-black">
          FREQUENTLY ASKED QUESTIONS
        </h3>
        
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h4 className="font-medium mb-2 text-black">How long does shipping take?</h4>
            <p className="text-sm text-black">
              Orders typically take 5-7 business days for production plus 3-5 days for shipping.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-black">When will I receive tracking information?</h4>
            <p className="text-sm text-black">
              You&apos;ll receive tracking information via email once your order has been shipped.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-black">Can I change my shipping address?</h4>
            <p className="text-sm text-black">
              Contact us immediately if you need to change your shipping address. 
              Changes may not be possible once production has started.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 text-black">What if my order is delayed?</h4>
            <p className="text-sm text-black">
              If your order is delayed beyond the expected delivery date, please contact 
              our customer service team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}