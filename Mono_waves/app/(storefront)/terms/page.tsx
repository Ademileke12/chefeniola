'use client'

import React from 'react'

export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-20">
            <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-12 uppercase">
                Terms of <span className="italic font-playfair lowercase">Service</span>
            </h1>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-8 font-light leading-relaxed">
                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">1. Acceptance of Terms</h2>
                    <p>By accessing and using Mono Verse, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">2. Made-to-Order Policy</h2>
                    <p>Many of our items are produced upon order to minimize waste. Please allow 7-14 business days for production before shipping. We will notify you once your unique piece is ready.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">3. Custom AI Mockups</h2>
                    <p>The AI-generated previews provided on our site are for visualization purposes. While we strive for absolute accuracy, slight variations in color and texture may occur in the final physical garment.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">4. Intellectual Property</h2>
                    <p>All designs, imagery, and software logic on this platform are the exclusive property of Mono Verse. Unauthorized reproduction is strictly prohibited.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">5. Limitation of Liability</h2>
                    <p>Mono Verse shall not be liable for any indirect, incidental, or consequential damages arising from the use of our platform or products.</p>
                </section>
            </div>
        </div>
    )
}
