import { Suspense } from 'react'
import { TrackOrderPage } from '@/components/storefront/TrackOrderPage'

export default function TrackOrder() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="py-16 text-center">Loading...</div>}>
        <TrackOrderPage />
      </Suspense>
    </div>
  )
}