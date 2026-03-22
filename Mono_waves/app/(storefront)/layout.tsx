'use client'

import React from 'react'
import Header from '@/components/storefront/Header'
import Footer from '@/components/storefront/Footer'
import { CartProvider } from '@/lib/context/CartContext'

export default function StorefrontLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <CartProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow">
                    {children}
                </main>
                <Footer />
            </div>
        </CartProvider>
    )
}
