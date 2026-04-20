'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Order } from '@/types/order'
import { Breadcrumb } from '@/components/storefront/Breadcrumb'
import Button from '@/components/ui/Button'

export default function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    let attempts = 0
    const maxAttempts = 10
    // Exponential backoff delays: 500ms, 1s, 2s, 4s, then capped at 8s
    const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000]

    // Recursive polling function with exponential backoff
    const fetchOrder = async (): Promise<boolean> => {
      attempts++
      const delay = delays[attempts - 1] || 8000
      
      console.log(`[Confirmation] Attempt ${attempts}/${maxAttempts}, session: ${sessionId}, delay: ${delay}ms`)
      
      try {
        const res = await fetch(`/api/orders/session/${sessionId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('[Confirmation] Order found:', data.order.orderNumber)
          setOrder(data.order)
          setLoading(false)
          return true // Stop polling
        }
        
        // Log failure with session ID and retry count
        console.log(`[Confirmation] Order not found yet, session: ${sessionId}, attempt: ${attempts}/${maxAttempts}`)
        
        if (attempts >= maxAttempts) {
          console.error(`[Confirmation] Max polling attempts reached, session: ${sessionId}, attempts: ${attempts}`)
          setError('Order not found. Your payment was successful, but we\'re still processing your order. Please check your email for confirmation or contact support at support@monowaves.com.')
          setLoading(false)
          return true // Stop polling
        }
        
        return false // Continue polling
      } catch (err) {
        console.error(`[Confirmation] Error fetching order, session: ${sessionId}, attempt: ${attempts}:`, err)
        
        if (attempts >= maxAttempts) {
          setError('Failed to load order. Please check your email for confirmation or contact support at support@monowaves.com.')
          setLoading(false)
          return true // Stop polling
        }
        
        return false // Continue polling
      }
    }

    // Polling function with exponential backoff
    const poll = async () => {
      const shouldStop = await fetchOrder()
      if (!shouldStop && attempts < maxAttempts) {
        const nextDelay = delays[attempts] || 8000
        setTimeout(poll, nextDelay)
      }
    }

    // Start polling
    poll()

    // Cleanup (no interval to clear with recursive approach)
    return () => {
      // Cleanup handled by shouldStop flag
    }
  }, [sessionId])

  // Calculate estimated delivery (7-10 business days)
  const calculateEstimatedDelivery = (orderDate: string): string => {
    const date = new Date(orderDate)
    // Add 8 business days (middle of 7-10 range)
    let daysAdded = 0
    while (daysAdded < 8) {
      date.setDate(date.getDate() + 1)
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        daysAdded++
      }
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'HOME', href: '/' },
            { label: 'ORDER CONFIRMATION', href: '/confirmation' }
          ]}
        />
        <div className="mt-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-black">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'HOME', href: '/' },
            { label: 'ORDER CONFIRMATION', href: '/confirmation' }
          ]}
        />
        <div className="mt-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-4">
            <svg
              className="w-8 h-8 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-light tracking-wide uppercase mb-4 text-black">
            Order Not Found
          </h1>
          <p className="text-black mb-8">
            {error || 'We couldn\'t find your order. Please check your email for the confirmation.'}
          </p>
          <Link href="/">
            <Button variant="primary" size="lg">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const estimatedDelivery = calculateEstimatedDelivery(order.createdAt)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'HOME', href: '/' },
          { label: 'ORDER CONFIRMATION', href: '/confirmation' }
        ]}
      />

      {/* Success Header */}
      <div className="mt-8 mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 mb-6">
          <svg
            className="w-8 h-8 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-wide uppercase mb-4 text-black">
          Order Confirmed
        </h1>
        <p className="text-black">
          Thank you for your order. We&apos;ve sent a confirmation email to{' '}
          <span className="font-medium">{order.customerEmail}</span>
        </p>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* Order Details Card */}
        <div className="bg-white border border-gray-200 mb-6">
          {/* Order Number */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-black uppercase tracking-wider">Order Number</p>
                <p className="text-lg font-medium text-black">
                  {order.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-black uppercase tracking-wider">Order Date</p>
                <p className="text-lg font-medium text-black">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium uppercase tracking-wider text-black mb-4">
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-black">
                      {item.productName}
                    </p>
                    <p className="text-sm text-black">
                      Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-black">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium uppercase tracking-wider text-black mb-2">
              Shipping Address
            </h2>
            <div className="text-black">
              <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p>{order.shippingAddress.addressLine2}</p>
              )}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="px-6 py-4">
            <h2 className="text-lg font-medium uppercase tracking-wider text-black mb-3">
              Order Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-black">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-black">
                <span>Shipping</span>
                <span>${order.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-black">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-medium text-black pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white border border-gray-200 mb-6">
          <div className="px-6 py-4">
            <h2 className="text-lg font-medium uppercase tracking-wider text-black mb-3">
              Delivery Information
            </h2>
            
            {/* Estimated Delivery */}
            <div className="mb-4">
              <p className="text-sm text-black uppercase tracking-wider mb-1">Estimated Delivery</p>
              <p className="text-lg font-medium text-black">
                {estimatedDelivery}
              </p>
              <p className="text-sm text-black mt-1">
                (7-10 business days from order date)
              </p>
            </div>

            {/* Tracking Number */}
            {order.trackingNumber && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-black uppercase tracking-wider mb-1">
                  Tracking Number
                </p>
                <p className="text-lg font-medium text-black">
                  {order.trackingNumber}
                </p>
                {order.carrier && (
                  <p className="text-sm text-black mt-1">
                    Carrier: {order.carrier}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/track" className="flex-1">
            <Button variant="primary" size="lg" fullWidth>
              Track Order
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" size="lg" fullWidth>
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-black">
          <p>
            Questions about your order? Contact us at{' '}
            <a
              href="mailto:support@monowaves.com"
              className="border-b border-black hover:border-gray-400 transition-colors"
            >
              support@monowaves.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
