'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/admin/DashboardLayout'
import DataTable from '@/components/admin/DataTable'
import { Eye, Edit, Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Design {
  id: string
  product_id: string
  design_data: any
  created_at: string
  updated_at: string
}

export default function DesignsPage() {
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDesigns = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // For now, we'll show a placeholder since designs are embedded in products
        // In a real implementation, you might want to create a separate designs endpoint
        setDesigns([])
        
      } catch (error) {
        console.error('Failed to load designs:', error)
        setError(error instanceof Error ? error.message : 'Failed to load designs')
        setDesigns([])
      } finally {
        setLoading(false)
      }
    }

    loadDesigns()
  }, [])

  const designData = designs.map(design => ({
    id: design.id,
    productId: design.product_id,
    elements: design.design_data?.elements?.length || 0,
    created: new Date(design.created_at).toLocaleDateString(),
    updated: new Date(design.updated_at).toLocaleDateString(),
  }))

  const designColumns = [
    { key: 'id', label: 'Design ID' },
    { key: 'productId', label: 'Product ID' },
    { key: 'elements', label: 'Elements' },
    { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Last Updated' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => router.push(`/admin/designs/${row.id}`)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="View design"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => router.push(`/admin/designs/${row.id}/edit`)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Edit design"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete design"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <DashboardLayout activeSection="designs">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading designs...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeSection="designs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Designs</h1>
          <button
            onClick={() => router.push('/admin/products/new')}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Design
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 font-medium">Error loading designs</div>
            <div className="text-red-500 text-sm mt-1">{error}</div>
          </div>
        ) : designs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No designs yet</h3>
              <p className="text-gray-500 mb-6">
                Designs are created when you add products. Create a new product to get started with the design editor.
              </p>
              <button
                onClick={() => router.push('/admin/products/new')}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Your First Product
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            title="All Designs"
            columns={designColumns}
            data={designData}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// Import Palette icon
import { Palette } from 'lucide-react'
