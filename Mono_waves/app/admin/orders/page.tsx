'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/admin/DashboardLayout'
import DataTable from '@/components/admin/DataTable'
import { authenticatedFetch } from '@/lib/utils/apiClient'
import { Eye, Download } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
  items: any[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await authenticatedFetch('/api/orders')
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }
        
        const data = await response.json()
        setOrders(data.orders || [])
        
      } catch (error) {
        console.error('Failed to load orders:', error)
        setError(error instanceof Error ? error.message : 'Failed to load orders')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const handleClearAllOrders = async () => {
    if (!confirm('Are you sure you want to delete ALL orders? This action cannot be undone!')) {
      return
    }

    if (!confirm('This will permanently delete all order data. Are you absolutely sure?')) {
      return
    }

    try {
      setDeleting(true)
      
      // Delete each order
      const deletePromises = orders.map(order => 
        authenticatedFetch(`/api/orders/${order.id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      
      // Reload orders
      setOrders([])
      alert('All orders have been deleted successfully')
      
    } catch (error) {
      console.error('Failed to delete orders:', error)
      alert('Failed to delete some orders. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const formatOrderStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'payment_confirmed': 'Processing',
      'submitted_to_gelato': 'Processing',
      'printing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'failed': 'Failed'
    }
    return statusMap[status] || status
  }

  const orderData = orders.map(order => ({
    id: order.order_number,
    customer: order.customer_name,
    email: order.customer_email,
    items: Array.isArray(order.items) ? order.items.length : 1,
    total: `$${Number(order.total).toFixed(2)}`,
    status: formatOrderStatus(order.status),
    date: new Date(order.created_at).toLocaleDateString(),
    rawId: order.id
  }))

  const orderColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'email', label: 'Email' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => {
        const statusColors = {
          'Shipped': 'bg-blue-100 text-blue-800',
          'Processing': 'bg-yellow-100 text-yellow-800',
          'Delivered': 'bg-green-100 text-green-800',
          'Pending': 'bg-gray-100 text-gray-800',
          'Cancelled': 'bg-red-100 text-red-800',
          'Failed': 'bg-red-100 text-red-800'
        }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        )
      }
    },
    { key: 'date', label: 'Date' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.href = `/admin/orders/${row.rawId}`}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="View order details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Download invoice"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <DashboardLayout activeSection="orders">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeSection="orders">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading orders</div>
            <div className="text-gray-500 text-sm">{error}</div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="orders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Total: {orders.length} orders
            </div>
            {orders.length > 0 && (
              <button
                onClick={handleClearAllOrders}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Clear All Orders'}
              </button>
            )}
          </div>
        </div>

        <DataTable
          title="All Orders"
          columns={orderColumns}
          data={orderData}
        />
      </div>
    </DashboardLayout>
  )
}
