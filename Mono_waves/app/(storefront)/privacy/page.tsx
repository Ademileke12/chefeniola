'use client'

import React from 'react'

export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-20">
            <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-12 uppercase">
                Privacy <span className="italic font-playfair lowercase">Policy</span>
            </h1>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-8 font-light leading-relaxed">
                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">1. Data Collection</h2>
                    <p>We collect only the information necessary to process your orders and provide a personalized experience, including name, email, shipping address, and payment details via secure encrypted gateways.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">2. Session Management</h2>
                    <p>We use local storage and cookies to manage your shopping cart session IDs. This ensures your items remain in your cart as you navigate our Verse.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">3. Third-Party Services</h2>
                    <p>We partner with Supabase for secure data management and Stripe for payment processing. Your data is never sold to third parties for marketing purposes.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">4. AI Image Privacy</h2>
                    <p>Images uploaded for AI mockup generation are processed securely and deleted from our active cache after the session expires, unless you choose to save the product to your account.</p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-4">5. Your Rights</h2>
                    <p>You have the right to access, correct, or delete your personal data at any time by contacting our support team.</p>
                </section>
            </div>
        </div>
    )
}
