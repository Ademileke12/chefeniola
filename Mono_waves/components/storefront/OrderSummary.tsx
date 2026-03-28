'use client';

import React from 'react';
import Image from 'next/image';
import { CartItem } from '@/types/cart';

export interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export default function OrderSummary({
  items,
  subtotal,
  shipping,
  total,
}: OrderSummaryProps) {
  const formattedSubtotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(subtotal);

  const formattedShipping = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(shipping);

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wider mb-6">
        Order Summary
      </h2>

      {/* Order Items */}
      <div className="space-y-4 mb-6">
        {items.map((item) => {
          const itemTotal = item.price * item.quantity;
          const formattedItemTotal = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(itemTotal);

          return (
            <div key={item.id} className="flex gap-3">
              {/* Product Image */}
              <div className="relative w-16 h-20 flex-shrink-0 bg-gray-100">
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-900 uppercase tracking-wide truncate">
                  {item.productName}
                </h3>
                <div className="mt-1 text-xs text-gray-600">
                  <p>Size: {item.size}</p>
                  <p>Color: {item.color}</p>
                  <p>Qty: {item.quantity}</p>
                </div>
              </div>

              {/* Price */}
              <div className="text-sm font-medium text-gray-900">
                {formattedItemTotal}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing Summary */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">{formattedSubtotal}</span>
        </div>

        {/* Shipping */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-gray-900 font-medium">{formattedShipping}</span>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between">
            <span className="text-base font-semibold text-gray-900 uppercase tracking-wide">
              Total
            </span>
            <span className="text-base font-semibold text-gray-900">
              {formattedTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Taxes calculated at checkout
      </div>
    </div>
  );
}
