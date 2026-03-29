'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/admin/DashboardLayout'
import MetricCard from '@/components/admin/MetricCard'
import DataTable from '@/components/admin/DataTable'
import InventoryForm from '@/components/admin/InventoryForm'
import { authenticatedFetch } from '@/lib/utils/apiClient'
import { 
  DashboardMetrics, 
  DashboardResponse, 
  DashboardProduct, 
  DashboardOrder 
} from '@/types'
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react'

// Type guard for API response validation
function isDashboardResponse(data: any): data is DashboardResponse {
  return (
    data &&
    typeof data === 'object' &&
    data.metrics &&
    typeof data.metrics.totalSales === 'number' &&
    typeof data.metrics.totalOrders === 'number' &&
    typeof data.metrics.totalProducts === 'number' &&
    typeof data.metrics.totalRevenue === 'number' &&
    Array.isArray(data.products) &&
    Array.isArray(data.orders)
  )
}

// Type guard for product validation
function isDashboardProduct(product: any): product is DashboardProduct {
  return (
    product &&
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    typeof product.published === 'boolean' &&
    typeof product.gelato_product_uid === 'string' &&
    typeof product.created_at === 'string'
  )
}

// Type guard for order validation
function isDashboardOrder(order: any): order is DashboardOrder {
  return (
    order &&
    typeof order.id === 'string' &&
    typeof order.order_number === 'string' &&
    typeof order.customer_name === 'string' &&
    typeof order.customer_email === 'string' &&
    typeof order.total === 'number' &&
    typeof order.status === 'string' &&
    typeof order.created_at === 'string' &&
    Array.isArray(order.items)
  )
}

// Transformed data types for table display
interface CatalogueTableRow {
  id: string
  name: string
  sku: string
  price: string
  stock: string
  status: string
}

interface OrderTableRow {
  id: string
  customer: string
  items: number
  total: string
  status: string
  date: string
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [products, setProducts] = useState<DashboardProduct[]>([])
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  // Transform products data for table display
  const catalogueData = products.map(product => ({
    id: product.id,
    name: product.name,
    sku: product.gelato_product_uid,
    price: `$${Number(product.price).toFixed(2)}`,
    stock: 'N/A', // Placeholder - stock info not in current schema
    status: product.published ? 'Active' : 'Inactive'
  }))

  // Transform orders data for table display
  const orderData = orders.map(order => ({
    id: order.order_number,
    customer: order.customer_name,
    items: Array.isArray(order.items) ? order.items.length : 1,
    total: `$${Number(order.total).toFixed(2)}`,
    status: formatOrderStatus(order.status),
    date: new Date(order.created_at).toLocaleDateString()
  }))

  // Helper function to format order status for display
  function formatOrderStatus(status: string): string {
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

  const catalogueColumns = [
    { key: 'name', label: 'Product Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-1 text-gray-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const orderColumns = [
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
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
    { key: 'date', label: 'Date' }
  ]

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await authenticatedFetch('/api/admin/dashboard')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Set metrics data
        setMetrics(data.metrics)
        
        // Set products and orders data
        setProducts(data.products || [])
        setOrders(data.orders || [])
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
        
        // Keep metrics as null on error - no fallback to mock data
        setMetrics(null)
        setProducts([])
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const handleDownloadReport = () => {
    // TODO: Implement report download functionality
    console.log('Download report clicked')
  }

  const handleInventorySubmit = (data: any) => {
    // TODO: Implement inventory entry submission
    console.log('Inventory entry:', data)
  }

  if (loading) {
    return (
      <DashboardLayout activeSection="dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeSection="dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading dashboard</div>
            <div className="text-gray-500 text-sm">{error}</div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="dashboard">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleDownloadReport}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm sm:text-base shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">DOWNLOAD REPORT</span>
            <span className="sm:hidden">REPORT</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Overview - Black card as specified in mockup */}
          <MetricCard
            title="Revenue Overview"
            value={`$${metrics?.totalRevenue.toLocaleString() || '0'}`}
            icon={<DollarSign className="w-8 h-8" />}
            variant="dark"
            className="md:col-span-1"
          />
          
          {/* Active Orders */}
          <MetricCard
            title="Active Orders"
            value={metrics?.totalOrders.toLocaleString() || '0'}
            icon={<ShoppingCart className="w-8 h-8" />}
            trend={{ value: 2, direction: 'up' }}
          />
          
          {/* New Products */}
          <MetricCard
            title="New Products"
            value={metrics?.totalProducts || 0}
            icon={<Package className="w-8 h-8" />}
            trend={{ value: 14, direction: 'up' }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Inventory Entry */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <InventoryForm onSubmit={handleInventorySubmit} />
          </div>

          {/* Right Column - Tables */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-1 lg:order-2">
            {/* Active Catalogue */}
            <DataTable
              title="Active Catalogue"
              columns={catalogueColumns}
              data={catalogueData}
            />

            {/* Order Manifest */}
            <DataTable
              title="Order Manifest"
              columns={orderColumns}
              data={orderData}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
