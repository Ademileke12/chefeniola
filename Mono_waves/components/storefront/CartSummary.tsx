'use client';

import React from 'react';
import Button from '@/components/ui/Button';

export interface CartSummaryProps {
  subtotal: number;
  shipping: number;
  total: number;
  onCheckout?: () => void;
  loading?: boolean;
}

export default function CartSummary({
  subtotal,
  shipping,
  total,
  onCheckout,
  loading = false,
}: CartSummaryProps) {
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
    <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
      <h2 className="text-xs font-bold text-gray-900 uppercase tracking-[0.2em] mb-8">
        Order Summary
      </h2>

      <div className="space-y-5">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">Subtotal</span>
          <span className="text-gray-900 font-bold">{formattedSubtotal}</span>
        </div>

        {/* Shipping */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 font-medium">Shipping</span>
          <span className="text-gray-900 font-bold">
            {shipping === 0 ? (
              <span className="text-green-600">FREE</span>
            ) : formattedShipping}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">
              Total
            </span>
            <span className="text-xl font-black text-gray-900">
              {formattedTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      {onCheckout && (
        <div className="mt-8">
          <Button
            onClick={onCheckout}
            fullWidth
            size="lg"
            className="h-14 font-bold tracking-widest uppercase text-xs"
            loading={loading}
            disabled={loading}
          >
            Secure Checkout
          </Button>
        </div>
      )}

      {/* Additional Info */}
      <div className="mt-6 text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest">
        Taxes at checkout • Secure Payment
      </div>
    </div>
  );
}
