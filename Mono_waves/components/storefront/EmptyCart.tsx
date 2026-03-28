'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="w-24 h-24 mb-6 flex items-center justify-center">
        <svg
          className="w-full h-full text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>

      {/* Message */}
      <h2 className="text-2xl font-semibold text-gray-900 uppercase tracking-wider mb-2">
        Your Cart is Empty
      </h2>
      <p className="text-gray-600 text-center mb-8 max-w-md">
        Looks like you haven&apos;t added anything to your cart yet. Start shopping to find your perfect items.
      </p>

      {/* CTA Button */}
      <Link href="/products">
        <Button size="lg">
          Continue Shopping
        </Button>
      </Link>
    </div>
  );
}
