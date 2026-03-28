'use client';

import React from 'react';
import Image from 'next/image';
import { CartItem as CartItemType } from '@/types/cart';
import Button from '@/components/ui/Button';

export interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (newQuantity > 0 && !isNaN(newQuantity)) {
      onUpdateQuantity(newQuantity);
    }
  };

  const incrementQuantity = () => {
    onUpdateQuantity(item.quantity + 1);
  };

  const decrementQuantity = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.quantity - 1);
    }
  };

  const itemTotal = item.price * item.quantity;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.price);

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(itemTotal);

  return (
    <div className="flex gap-4 sm:gap-6 py-6 border-b border-gray-100 last:border-0 group">
      {/* Product Image */}
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 bg-[#F9F9F9] rounded-xl overflow-hidden border border-gray-100">
        <Image
          src={item.imageUrl}
          alt={item.productName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 80px, 112px"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">
              {item.productName}
            </h3>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <span>Size: {item.size}</span>
              <span>Color: {item.color}</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {formattedTotal}
            </p>
          </div>
        </div>

        {/* Quantity Controls and Remove Button */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
            <button
              onClick={decrementQuantity}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white rounded-md transition-all font-bold"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-xs font-bold text-gray-900">
              {item.quantity}
            </span>
            <button
              onClick={incrementQuantity}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-white rounded-md transition-all font-bold"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            onClick={onRemove}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
