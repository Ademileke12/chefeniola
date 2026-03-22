'use client'

import React from 'react'

export default function ContactPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-32 text-center">
            <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-8 uppercase">
                Contact <span className="italic font-playfair lowercase">Us</span>
            </h1>

            <p className="text-lg text-gray-600 font-light mb-12 max-w-2xl mx-auto">
                We're here to assist you with your orders, inquiries, or just to chat about the future of fashion.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Email</h3>
                    <p className="text-gray-600">concierge@monoverse.studio</p>
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Inquiries</h3>
                    <p className="text-gray-600">Average response time: 24 hours</p>
                </div>
            </div>

            <div className="mt-20 p-12 bg-[#F9F9F9] border border-gray-100 italic font-playfair text-xl text-gray-700">
                "The best dialogue is one that starts with quality."
            </div>
        </div>
    )
}
