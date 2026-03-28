import { useState } from 'react'
import Image from 'next/image'
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { Product } from '@/types/product'
import DataTable from './DataTable'

interface ProductTableProps {
  products: Product[]
  onEdit: (productId: string) => void
  onDelete: (productId: string) => void
  onTogglePublish?: (productId: string, published: boolean) => void
  loading?: boolean
}

export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onTogglePublish,
  loading = false
}: ProductTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedProducts.length === products.length && products.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
      ),
      render: (value: any, row: Product) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(row.id)}
          onChange={(e) => handleSelectProduct(row.id, e.target.checked)}
          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
      )
    },
    {
      key: 'name',
      label: 'Product',
      render: (value: string, row: Product) => (
        <div className="flex items-center space-x-3">
          {(row.images && row.images.length > 0) ? (
            <div className="relative w-10 h-10 overflow-hidden rounded-lg">
              <Image
                src={row.images[0]}
                alt={row.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L8 12L12 16M12 8L16 12M6 4H14C15.1046 4 16 4.89543 16 6V14C16 15.1046 15.1046 16 14 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4Z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">
              {row.variants.length} variants
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      render: (value: number) => (
        <span className="font-medium">{formatPrice(value)}</span>
      )
    },
    {
      key: 'published',
      label: 'Status',
      render: (value: boolean, row: Product) => (
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
            }`}>
            {value ? 'Published' : 'Draft'}
          </span>
          {onTogglePublish && (
            <button
              onClick={() => onTogglePublish(row.id, !value)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={value ? 'Unpublish' : 'Publish'}
            >
              {value ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => (
        <span className="text-sm text-gray-500">{formatDate(value)}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Product) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(row.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit product"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(row.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selectedProducts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Bulk Edit
              </button>
              <button className="text-sm text-red-600 hover:text-red-900 transition-colors">
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        title="Products"
        columns={columns}
        data={products}
      />
    </div>
  )
}