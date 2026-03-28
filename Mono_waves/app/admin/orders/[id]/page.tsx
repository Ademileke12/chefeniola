'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/admin/DashboardLayout'
import { ArrowLeft, Package, User, CreditCard, Truck, Download, Send, XCircle } from 'lucide-react'

interface OrderDetails {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  total: number
  status: string
  createdAt: string
  items: any[]
  trackingNumber?: string | null
  carrier?: string | null
  shippingAddress?: {
    firstName: string
    lastName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postCode: string
    country: string
    phone: string
  }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/orders/${params.id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch order details')
        }

        const data = await response.json()
        setOrder(data.order)

      } catch (error) {
        console.error('Failed to load order:', error)
        setError(error instanceof Error ? error.message : 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadOrder()
    }
  }, [params.id])

  const formatOrderStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'payment_confirmed': 'Processing',
      'submitted_to_gelato': 'Processing',
      'printing': 'Printing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'failed': 'Failed'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string): string => {
    const statusColors: { [key: string]: string } = {
      'Shipped': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-yellow-100 text-yellow-800',
      'Printing': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Pending': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Failed': 'bg-red-100 text-red-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleSubmitToGelato = async () => {
    if (!order) return

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const response = await fetch(`/api/orders/${order.id}/submit-to-gelato`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order')
      }

      setSubmitSuccess(true)
      
      // Reload order to get updated status
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Failed to submit order to Gelato:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return

    setCancelling(true)
    setCancelError(null)

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by admin' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order')
      }

      // Reload to show updated status
      window.location.reload()

    } catch (error) {
      console.error('Failed to cancel order:', error)
      setCancelError(error instanceof Error ? error.message : 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const canSubmitToGelato = order?.status === 'payment_confirmed'
  const canCancelOrder = order?.status === 'payment_confirmed' || order?.status === 'pending'

  if (loading) {
    return (
      <DashboardLayout activeSection="orders">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading order details...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !order) {
    return (
      <DashboardLayout activeSection="orders">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading order</div>
            <div className="text-gray-500 text-sm">{error || 'Order not found'}</div>
            <button
              onClick={() => router.push('/admin/orders')}
              className="mt-4 text-gray-900 hover:underline"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="orders">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/orders')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order {order.orderNumber}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canSubmitToGelato && (
              <button
                onClick={handleSubmitToGelato}
                disabled={submitting}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit to Gelato'}
              </button>
            )}
            {canCancelOrder && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                Cancel Order
              </button>
            )}
            <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
              <Download className="w-4 h-4" />
              Download Invoice
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Order successfully submitted to Gelato!</p>
            <p className="text-sm mt-1">The order will be processed and shipped by Gelato. Page will reload...</p>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Failed to submit order</p>
            <p className="text-sm mt-1">{submitError}</p>
          </div>
        )}

        {cancelError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Failed to cancel order</p>
            <p className="text-sm mt-1">{cancelError}</p>
          </div>
        )}

        {/* Cancel Order Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Cancel Order</h3>
              <p className="text-gray-600 mb-4">
                This will cancel the order and issue a full refund to the customer. This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="e.g., Out of stock, customer request, etc."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelDialog(false)
                    setCancelReason('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={cancelling}
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel & Refund'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Order Status</div>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(formatOrderStatus(order.status))}`}>
                {formatOrderStatus(order.status)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">${Number(order.total).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Shipment Tracking</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Carrier</div>
              <div className="font-medium text-gray-900">{order.carrier || 'Not assigned yet'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Tracking Number</div>
              <div className="font-mono text-gray-900 font-medium">{order.trackingNumber || 'Pending shipment'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium text-gray-900">{order.customerName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium text-gray-900">{order.customerEmail}</div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
            </div>
            {order.shippingAddress ? (
              <div className="text-gray-900">
                <div>{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postCode}
                </div>
                <div>{order.shippingAddress.country}</div>
              </div>
            ) : (
              <div className="text-gray-500">No shipping address provided</div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
          </div>

          <div className="space-y-4">
            {order.items && order.items.length > 0 ? (
              order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.productName || 'Product'}</div>
                      <div className="text-xs text-gray-500 flex flex-col">
                        <span>Size: {item.size || 'N/A'}</span>
                        <span>Color: {item.color || 'N/A'}</span>
                        <span>Gelato UID: <code className="bg-gray-100 px-1 rounded">{item.gelatoProductUid || 'N/A'}</code></span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 font-medium">Quantity: {item.quantity || 1}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-lg">${Number(item.price || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Unit Price</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No items in this order</div>
            )}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-900">Total</div>
              <div className="text-2xl font-bold text-gray-900">${Number(order.total).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
