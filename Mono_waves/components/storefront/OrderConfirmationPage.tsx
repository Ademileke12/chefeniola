'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Order, OrderItem, ShippingAddress } from '@/types'
import { OrderStatusTimeline } from './OrderStatusTimeline'
import Button from '@/components/ui/Button'

// Mock order data - in real app this would come from URL params or API
const mockOrder: Order = {
  id: 'order-123',
  orderNumber: 'MW-2024-001',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main Street',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postCode: '10001',
    country: 'US',
    phone: '+1 (555) 123-4567'
  },
  items: [
    {
      productId: 'prod-1',
      productName: 'Minimalist Tee',
      size: 'M',
      color: 'Black',
      quantity: 2,
      price: 45,
      designUrl: '/product-1.jpg',
      gelatoProductUid: 'gelato-123'
    },
    {
      productId: 'prod-2',
      productName: 'Classic Hoodie',
      size: 'L',
      color: 'White',
      quantity: 1,
      price: 85,
      designUrl: '/product-2.jpg',
      gelatoProductUid: 'gelato-456'
    }
  ],
  subtotal: 175,
  shippingCost: 0,
  total: 175,
  stripePaymentId: 'pi_123456789',
  status: 'payment_confirmed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export function OrderConfirmationPage() {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatAddress = (address: ShippingAddress) => {
    return [
      `${address.firstName} ${address.lastName}`,
      address.addressLine1,
      address.addressLine2,
      `${address.city}, ${address.state} ${address.postCode}`,
      address.country
    ].filter(Boolean).join('\n')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Success Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-light tracking-wide mb-4 text-black">
          THANK YOU FOR YOUR ORDER
        </h1>
        
        <p className="text-lg text-black mb-2">
          Order #{mockOrder.orderNumber}
        </p>
        
        <p className="text-black">
          A confirmation email has been sent to {mockOrder.customerEmail}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Order Status and Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Status Timeline */}
          <div>
            <h2 className="text-xl font-medium mb-6 uppercase tracking-wider text-black">
              ORDER STATUS
            </h2>
            <OrderStatusTimeline status={mockOrder.status} />
            
            {/* Processing Notice */}
            {mockOrder.status === 'payment_confirmed' && (
              <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Order Being Reviewed</p>
                    <p className="text-sm text-blue-800">
                      Your order is being reviewed and will be sent to production within 24 hours. 
                      You'll receive an email when your order enters production.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="text-lg font-medium mb-4 uppercase tracking-wider text-black">
              SHIPPING ADDRESS
            </h3>
            <div className="bg-gray-50 p-6 rounded">
              <pre className="text-sm text-black whitespace-pre-line font-sans">
                {formatAddress(mockOrder.shippingAddress)}
              </pre>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-black">
                  <strong>Phone:</strong> {mockOrder.shippingAddress.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div>
            <h3 className="text-lg font-medium mb-4 uppercase tracking-wider text-black">
              SHIPPING METHOD
            </h3>
            <div className="bg-gray-50 p-6 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-black">Standard Shipping</p>
                  <p className="text-sm text-black">5-7 business days</p>
                </div>
                <p className="font-medium text-black">
                  {mockOrder.shippingCost > 0 ? formatPrice(mockOrder.shippingCost) : 'FREE'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <Link href="/track">
              <Button size="lg" className="min-w-[200px]">
                TRACK ORDER
              </Button>
            </Link>
            
            <Link href="/products">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                CONTINUE SHOPPING
              </Button>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded sticky top-8">
            <h3 className="text-lg font-medium mb-6 uppercase tracking-wider text-black">
              ORDER SUMMARY
            </h3>
            
            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {mockOrder.items.map((item, index) => {
                // Validate image URL
                const isValidUrl = (url: string) => {
                  return url && (url.startsWith('http') || url.startsWith('/')) && !url.includes('pending-export')
                }
                
                return (
                  <div key={index} className="flex space-x-4">
                    <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden">
                      {isValidUrl(item.designUrl) ? (
                        <Image
                          src={item.designUrl}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-black truncate">
                        {item.productName}
                      </h4>
                      <p className="text-sm text-black">
                        {item.color} • {item.size}
                      </p>
                    <p className="text-sm text-black">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  
                  <div className="text-sm font-medium text-black">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              )
              })}
            </div>

            {/* Order Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-black">
                <span>Subtotal</span>
                <span>{formatPrice(mockOrder.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-black">
                <span>Shipping</span>
                <span>
                  {mockOrder.shippingCost > 0 ? formatPrice(mockOrder.shippingCost) : 'FREE'}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-200 text-black">
                <span>Total</span>
                <span>{formatPrice(mockOrder.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Need Assistance Section */}
      <div className="mt-16 text-center bg-gray-50 py-12 rounded">
        <h3 className="text-xl font-medium mb-4 uppercase tracking-wider text-black">
          NEED ASSISTANCE?
        </h3>
        
        <p className="text-black mb-6 max-w-2xl mx-auto">
          Our customer service team is here to help with any questions about your order, 
          shipping, or returns.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="mailto:support@monoverse.com"
            className="text-sm font-medium uppercase tracking-wider border-b border-black pb-1 hover:border-gray-400 transition-colors text-black"
          >
            EMAIL SUPPORT
          </Link>
          
          <Link 
            href="/faq"
            className="text-sm font-medium uppercase tracking-wider border-b border-black pb-1 hover:border-gray-400 transition-colors text-black"
          >
            VIEW FAQ
          </Link>
          
          <Link 
            href="/returns"
            className="text-sm font-medium uppercase tracking-wider border-b border-black pb-1 hover:border-gray-400 transition-colors text-black"
          >
            RETURN POLICY
          </Link>
        </div>
      </div>
    </div>
  )
}