'use client'

import React, { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    
    // Simulate newsletter signup (replace with actual implementation)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitted(true)
    setIsSubmitting(false)
    setEmail('')
    
    // Reset success message after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        {/* Section Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-light mb-4 text-black">
            Join the Atelier.
          </h2>
          <p className="text-black leading-relaxed">
            Be the first to know about new collections, exclusive pieces, and special events. 
            Join our community of discerning individuals who appreciate exceptional design.
          </p>
        </div>
        
        {/* Newsletter Form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 border-gray-300 focus:border-black"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={isSubmitting || !email}
              className="h-12 px-8 uppercase tracking-wider"
            >
              {isSubmitting ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
            </Button>
          </div>
          
          {isSubmitted && (
            <p className="mt-4 text-green-600 text-sm">
              Thank you for subscribing! Welcome to the Mono Verse community.
            </p>
          )}
        </form>
        
        {/* Privacy Notice */}
        <p className="mt-6 text-xs text-gray-500">
          By subscribing, you agree to our privacy policy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  )
}