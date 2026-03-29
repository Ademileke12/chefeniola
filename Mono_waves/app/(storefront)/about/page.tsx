'use client'

import React from 'react'

export default function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-32">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-gray-900 mb-12 uppercase">
                Our <span className="italic font-playfair lowercase">Story</span>
            </h1>

            <div className="space-y-8 text-lg text-gray-600 leading-relaxed font-light">
                <p>
                    Founded at the intersection of archival appreciation and modern textile innovation,
                    <span className="font-semibold text-gray-900 uppercase tracking-widest text-sm mx-1">Mono Verse</span>
                    is a label dedicated to the pursuit of the &ldquo;eternal garment.&rdquo; We believe that what we wear should be as
                    enduring as the memories we create in them.
                </p>

                <p>
                    Each collection is a dialogue between structured silhouettes and the fluid grace of human movement.
                    We source the finest sustainable materials, working with heritage mills to ensure that every stitch
                    tells a story of quality over quantity. Our &ldquo;made-to-order&rdquo; approach ensures that we remain kind to
                    the planet while providing you with something truly unique.
                </p>

                <blockquote className="border-l-2 border-black pl-6 py-2 my-12 italic text-2xl text-gray-900 font-playfair">
                    &ldquo;Luxury isn&apos;t about the price tag; it&apos;s about the time, craft, and soul invested in a single piece.&rdquo;
                </blockquote>

                <p>
                    Thank you for being part of our journey. Welcome to the Verse.
                </p>
            </div>

            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-12 border-t border-gray-100 pt-12">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4">The Craft</h3>
                    <p className="text-sm text-gray-500">Hand-finished details and artisanal construction in every piece.</p>
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4">The Material</h3>
                    <p className="text-sm text-gray-500">Sustainably sourced, high-performance textiles built to last.</p>
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4">The Vision</h3>
                    <p className="text-sm text-gray-500">Timeless aesthetics that transcend seasons and trends.</p>
                </div>
            </div>
        </div>
    )
}
