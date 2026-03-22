import { Suspense } from 'react'
import { HeroSection } from '@/components/storefront/HeroSection'
import { CuratedSelection } from '@/components/storefront/CuratedSelection'
import { BestSellers } from '@/components/storefront/BestSellers'
import { NewsletterSection } from '@/components/storefront/NewsletterSection'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Curated Selection */}
      <Suspense fallback={<div className="py-16 text-center">Loading...</div>}>
        <CuratedSelection />
      </Suspense>
      
      {/* Best Sellers */}
      <Suspense fallback={<div className="py-16 text-center">Loading...</div>}>
        <BestSellers />
      </Suspense>
      
      {/* Newsletter Section */}
      <NewsletterSection />
    </main>
  )
}
