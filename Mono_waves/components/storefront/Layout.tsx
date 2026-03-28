'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  cartItemCount?: number;
}

export default function Layout({ children, cartItemCount = 0 }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <Header cartItemCount={cartItemCount} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
