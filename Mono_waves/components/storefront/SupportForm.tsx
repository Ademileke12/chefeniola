'use client'

import { useState } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'

export default function SupportForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        category: 'general',
        subject: 'General Inquiry',
        message: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error('Failed to submit support request')
            }

            setSubmitted(true)
            setFormData({
                name: '',
                email: '',
                category: 'general',
                subject: 'General Inquiry',
                message: '',
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent</h3>
                <p className="text-sm text-gray-600">
                    Thank you for contacting us. Our team will get back to you shortly.
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-sm font-medium text-gray-900 border-b border-gray-900 hover:text-gray-600 hover:border-gray-600 transition-colors"
                >
                    Send another message
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white/30 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 uppercase tracking-widest text-center">
                Direct Support
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    <input
                        type="text"
                        placeholder="Your Name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-sm transition-all"
                    />
                    <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-sm transition-all"
                    />
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-sm transition-all appearance-none"
                    >
                        <option value="general">General Inquiry</option>
                        <option value="order">Order Issue</option>
                        <option value="design">Design Query</option>
                        <option value="other">Other</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-sm transition-all"
                    />
                    <textarea
                        placeholder="Describe your issue in detail..."
                        required
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-sm transition-all resize-none"
                    />
                </div>

                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-all font-medium text-sm disabled:opacity-50 group"
                >
                    {submitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Send Complaint</span>
                            <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
