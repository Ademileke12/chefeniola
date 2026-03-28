import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export function HeroSection() {
  return (
    <section className="min-h-screen bg-white relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side - Text Content */}
        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-16 order-2 lg:order-1">
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-black mb-4">
              WELCOME TO MONO VERSE
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light leading-tight mb-6 text-black">
              The New<br />
              Standard.
            </h1>

            <p className="text-black mb-8 leading-relaxed text-sm sm:text-base">
              A new approach to luxury fashion. Our curated collection represents
              the finest in contemporary design, crafted with precision and attention to detail.
            </p>

            <Link href="/products">
              <Button size="lg" className="uppercase tracking-wider w-full sm:w-auto">
                SHOP NOW
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side - Hero Image */}
        <div className="relative min-h-[50vh] sm:min-h-[60vh] lg:min-h-screen order-1 lg:order-2">
          <Image
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200&q=80"
            alt="Elegant fashion model portrait in monochrome"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  )
}