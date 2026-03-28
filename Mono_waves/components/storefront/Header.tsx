'use client';

import Link from 'next/link';
import { ShoppingCart, Menu } from 'lucide-react';
import { useState } from 'react';

import { useCart } from '@/lib/context/CartContext';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:opacity-70 transition-opacity"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-900" strokeWidth={1.5} />
          </button>

          {/* Logo - MONO VERSE branding */}
          <Link href="/" className="flex items-center">
            <div className="relative">
              <span className="text-xl sm:text-2xl font-light tracking-[0.15em] text-gray-900 relative">
                <span className="font-extralight italic font-playfair">
                  Mono
                </span>
                <span className="ml-2 font-thin tracking-[0.3em] font-inter">
                  VERSE
                </span>
              </span>
              {/* Subtle underline accent */}
              <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-gray-900 via-gray-400 to-transparent opacity-30"></div>
            </div>
          </Link>

          {/* Center Navigation - Desktop Only */}
          <nav className="hidden md:flex items-center space-x-8 lg:space-x-10">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors uppercase tracking-wider"
            >
              Shop
            </Link>
            <Link
              href="/track"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors uppercase tracking-wider"
            >
              Track Order
            </Link>
          </nav>

          {/* Right Icons - Search, User, Cart */}
          <div className="flex items-center space-x-4 sm:space-x-6">

            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-1 hover:opacity-70 transition-opacity"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5 text-gray-900" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-in zoom-in duration-300">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-100 py-4 animate-slide-down">
            <div className="flex flex-col space-y-4">
              <Link
                href="/products"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors uppercase tracking-wider px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                href="/track"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors uppercase tracking-wider px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Track Order
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
