'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/admin/DashboardLayout'
import { ArrowLeft, Package, User, CreditCard, Truck, Download } from 'lucide-react'

interface OrderDetails {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
  items: any[]
  tracking_number?: string | null
  carrier?: string | null
  shipping_address?: {
    line1: string
    line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
              <h1 className="text-3xl font-bold text-gray-900">Order {order.order_number}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Download Invoice
          </button>
        </div>

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
              <div className="font-mono text-gray-900 font-medium">{order.tracking_number || 'Pending shipment'}</div>
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
                <div className="font-medium text-gray-900">{order.customer_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium text-gray-900">{order.customer_email}</div>
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
            {order.shipping_address ? (
              <div className="text-gray-900">
                <div>{order.shipping_address.line1}</div>
                {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                <div>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </div>
                <div>{order.shipping_address.country}</div>
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
                      {item.preview_url ? (
                        <img src={item.preview_url} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.product_name || 'Product'}</div>
                      <div className="text-xs text-gray-500 flex flex-col">
                        <span>Size: {item.size || 'N/A'}</span>
                        <span>Color: {item.color || 'N/A'}</span>
                        <span>Gelato ID: <code className="bg-gray-100 px-1 rounded">{item.gelato_order_item_id || 'N/A'}</code></span>
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
