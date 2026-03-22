'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/admin/DashboardLayout'
import {
    Mail,
    MessageSquare,
    CheckCircle2,
    Trash2,
    Clock,
    ExternalLink,
    ChevronRight,
    User,
    AlertCircle
} from 'lucide-react'
import { DatabaseSupportTicket } from '@/types/database'

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<DatabaseSupportTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedTicket, setSelectedTicket] = useState<DatabaseSupportTicket | null>(null)
    const [adminReply, setAdminReply] = useState('')
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fetchTickets()
    }, [])

    const fetchTickets = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/support')
            if (!response.ok) throw new Error('Failed to fetch tickets')
            const data = await response.json()
            setTickets(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tickets')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (id: string, status: 'open' | 'fixed') => {
        try {
            setUpdating(true)
            const response = await fetch(`/api/admin/support/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (!response.ok) throw new Error('Failed to update status')

            const updated = await response.json()
            setTickets(prev => prev.map(t => t.id === id ? updated : t))
            if (selectedTicket?.id === id) setSelectedTicket(updated)
        } catch (err) {
            alert('Error updating status')
        } finally {
            setUpdating(false)
        }
    }

    const handleReply = async () => {
        if (!selectedTicket || !adminReply.trim()) return

        try {
            setUpdating(true)
            const response = await fetch(`/api/admin/support/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_reply: adminReply,
                    status: 'fixed' // Automatically mark as fixed when replying if desired, or keep open
                })
            })
            if (!response.ok) throw new Error('Failed to send reply')

            const updated = await response.json()
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
            setSelectedTicket(updated)
            setAdminReply('')
            alert('Reply saved! (In a real system, this would trigger an email)')
        } catch (err) {
            alert('Error sending reply')
        } finally {
            setUpdating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this complaint?')) return

        try {
            const response = await fetch(`/api/admin/support/${id}`, { method: 'DELETE' })
            if (!response.ok) throw new Error('Failed to delete')

            setTickets(prev => prev.filter(t => t.id !== id))
            if (selectedTicket?.id === id) setSelectedTicket(null)
        } catch (err) {
            alert('Error deleting ticket')
        }
    }

    return (
        <DashboardLayout activeSection="support">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
                        <p className="text-gray-500 mt-1">Manage customer complaints and inquiries</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-gray-700">
                                {tickets.filter(t => t.status === 'open').length} Open
                            </span>
                        </div>
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-700">
                                {tickets.filter(t => t.status === 'fixed').length} Resolved
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                    {/* Ticket List */}
                    <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-semibold text-gray-900">Complaints List</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">Loading...</div>
                            ) : tickets.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 italic">No complaints found</div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {tickets.map(ticket => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`w-full p-4 text-left transition-colors hover:bg-gray-50 flex flex-col gap-1 ${selectedTicket?.id === ticket.id ? 'bg-gray-100/50 ring-1 ring-inset ring-gray-900/5' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider italic font-mono">
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </span>
                                                <div className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
                                            </div>
                                            <h3 className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-1">{ticket.customer_email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Detail */}
                    <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm overflow-hidden">
                        {selectedTicket ? (
                            <>
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                                            <p className="text-sm text-gray-500 font-medium">{selectedTicket.customer_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedTicket.id, selectedTicket.status === 'open' ? 'fixed' : 'open')}
                                            disabled={updating}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedTicket.status === 'open'
                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            {selectedTicket.status === 'open' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {selectedTicket.status === 'open' ? 'Mark Fixed' : 'Reopen'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedTicket.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete Ticket"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                    {/* Customer Message */}
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl rounded-tl-none p-6 flex-1 border border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-gray-900">{selectedTicket.customer_name || 'Customer'}</span>
                                                <span className="text-xs text-gray-400">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                                        </div>
                                    </div>

                                    {/* Admin Reply History */}
                                    {selectedTicket.admin_reply && (
                                        <div className="flex gap-4 flex-row-reverse">
                                            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                                                <div className="text-[10px] text-white font-bold">ADM</div>
                                            </div>
                                            <div className="bg-gray-900 text-white rounded-2xl rounded-tr-none p-6 flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold italic">MonoVerse Admin</span>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Reply Editor */}
                                    {!selectedTicket.admin_reply && (
                                        <div className="mt-8 border-t border-gray-100 pt-8">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Internal Reply / Email Simulation</h3>
                                            </div>
                                            <textarea
                                                value={adminReply}
                                                onChange={(e) => setAdminReply(e.target.value)}
                                                placeholder="Write your response to the customer..."
                                                rows={5}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none mb-4 shadow-inner bg-gray-50/30"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleReply}
                                                    disabled={updating || !adminReply.trim()}
                                                    className="bg-gray-900 text-white px-8 py-2.5 rounded-xl hover:bg-gray-800 transition-all font-semibold shadow-lg shadow-gray-200 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Send Reply
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <MessageSquare className="w-10 h-10 text-gray-200" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a complaint</h3>
                                <p className="max-w-xs">Choose a message from the list to view details and communicate with the customer.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

function Send({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    )
}
