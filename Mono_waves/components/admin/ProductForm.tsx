'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, X } from 'lucide-react'
import { Product, GelatoProduct, ProductColor, CreateProductData, UpdateProductData, ProductVariant } from '@/types/product'
import DesignUploader from './DesignUploader'
import DesignEditorCanvas, { type DesignState } from './DesignEditorCanvas'
import MockupPreview from './MockupPreview'
import { exportAndUpload } from '@/lib/services/designExportService'
import * as fabric from 'fabric'

interface ProductFormProps {
  product?: Product
  gelatoProducts: GelatoProduct[]
  onSubmit: (data: CreateProductData | UpdateProductData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ProductForm({
  product,
  gelatoProducts,
  onSubmit,
  onCancel,
  loading = false
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    gelatoProductUid: product?.gelatoProductUid || '',
    variants: product?.variants || [],
    designFileUrl: product?.designFileUrl || '',
    images: product?.images || [],
    designData: product?.designData || null,
  })

  // Design mode: 'editor' or 'upload' (Requirements 9.1, 9.2)
  const [designMode, setDesignMode] = useState<'editor' | 'upload'>('upload')
  const [currentDesignState, setCurrentDesignState] = useState<DesignState | undefined>(
    product?.designData || undefined
  )
  const canvasRef = useRef<fabric.Canvas | null>(null)

  const [selectedGelatoProduct, setSelectedGelatoProduct] = useState<GelatoProduct | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isValidatingUid, setIsValidatingUid] = useState(false)
  const [uidValidationMessage, setUidValidationMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Find selected Gelato product when UID changes
  useEffect(() => {
    if (formData.gelatoProductUid) {
      const gelatoProduct = gelatoProducts.find(p => p.uid === formData.gelatoProductUid)
      setSelectedGelatoProduct(gelatoProduct || null)

      // Validate product UID when selected
      validateProductUid(formData.gelatoProductUid)

      // Auto-populate variants from Gelato product
      if (gelatoProduct && !product) {
        const variants: ProductVariant[] = gelatoProduct.availableSizes.flatMap(size =>
          gelatoProduct.availableColors.map(color => {
            const variantId = gelatoProduct.variants[`${size}:${color.name}`]
            if (!variantId) return null
            return {
              size,
              color: color.name,
              colorCode: color.code,
              variantId: variantId
            }
          })
        ).filter(v => v !== null) as ProductVariant[]
        setFormData(prev => ({
          ...prev,
          variants
        }))
      }
    }
  }, [formData.gelatoProductUid, gelatoProducts, product])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than zero'
    }

    if (!formData.gelatoProductUid) {
      newErrors.gelatoProductUid = 'Please select a Gelato product'
    }

    // Validate design based on mode (Requirement 9.5)
    if (designMode === 'upload') {
      if (!formData.designFileUrl) {
        newErrors.designFileUrl = 'Design file is required'
      }
    } else if (designMode === 'editor') {
      // For editor mode, require design data (design URL will be generated on export in task 14)
      if (!formData.designData || !currentDesignState || currentDesignState.elements.length === 0) {
        newErrors.designFileUrl = 'Please add at least one element to your design'
      }
    }

    if (formData.variants.length === 0) {
      newErrors.variants = 'At least one variant must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // If using design editor mode and no design URL exists, export first
    if (designMode === 'editor' && !formData.designFileUrl && canvasRef.current) {
      try {
        setIsExporting(true)
        await handleDesignExport()
        setIsExporting(false)
      } catch (error) {
        console.error('Failed to export design:', error)
        setErrors(prev => ({ ...prev, designFileUrl: 'Failed to export design. Please try again.' }))
        setIsExporting(false)
        return
      }
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare submit data with design_url and design_data (Requirements 9.4, 9.5, 9.6)
      const submitData = {
        ...formData,
        gelatoProductId: formData.gelatoProductUid,
        designFileUrl: formData.designFileUrl || (designMode === 'editor' ? 'design-editor-pending-export' : ''),
        designData: formData.designData,
        images: (formData.images && formData.images.length > 0) ? formData.images : [formData.designFileUrl].filter(Boolean),
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateProductUid = async (uid: string) => {
    if (!uid) {
      setUidValidationMessage(null)
      return
    }

    setIsValidatingUid(true)
    setUidValidationMessage(null)

    try {
      const response = await fetch('/api/gelato/validate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUid: uid })
      })

      if (!response.ok) {
        setUidValidationMessage({
          type: 'error',
          message: 'Failed to validate product UID'
        })
        return
      }

      const result = await response.json()
      
      if (result.valid) {
        setUidValidationMessage({
          type: 'success',
          message: 'Product UID validated successfully'
        })
      } else {
        setUidValidationMessage({
          type: 'error',
          message: result.error || 'Invalid product UID'
        })
        setErrors(prev => ({ ...prev, gelatoProductUid: result.error || 'Invalid product UID' }))
      }
    } catch (error) {
      console.error('UID validation error:', error)
      setUidValidationMessage({
        type: 'error',
        message: 'Validation request failed'
      })
    } finally {
      setIsValidatingUid(false)
    }
  }

  const handleVariantToggle = (variant: ProductVariant) => {
    const existingIndex = formData.variants.findIndex(v => v.variantId === variant.variantId)
    const newVariants = existingIndex >= 0
      ? formData.variants.filter((_, i) => i !== existingIndex)
      : [...formData.variants, variant]
    handleInputChange('variants', newVariants)
  }

  const handleDesignUpload = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    const result = await response.json()
    return result.url
  }

  // Handle design state changes from editor (Requirement 9.4, 9.5)
  const handleDesignChange = (state: DesignState) => {
    setCurrentDesignState(state)
    handleInputChange('designData', state)
  }

  // Handle canvas ready callback
  const handleCanvasReady = (canvas: fabric.Canvas) => {
    canvasRef.current = canvas
  }

  // Handle mockup generation callback
  const handleMockupGenerated = (images: string[]) => {
    handleInputChange('images', images)
  }

  // Handle design export from editor (Requirement 9.4, 7.2, 7.3, 7.4, 7.6, 7.7)
  // This populates the design_url field when design is exported
  const handleDesignExport = async (): Promise<string> => {
    if (!canvasRef.current) {
      throw new Error('Canvas not initialized')
    }

    setIsExporting(true)
    try {
      // Export canvas to high-res PNG and upload to storage
      const url = await exportAndUpload(
        canvasRef.current,
        300, // 300 DPI for print quality
        `design-${Date.now()}.png`
      )

      // Update form data with the exported URL
      handleInputChange('designUrl', url)

      return url
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 m-[10px]">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {product ? 'Edit Product' : 'Create New Product'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Price (USD) *
            </label>
            <input
              type="number"
              id="price"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="0.00"
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="Enter product description"
          />
        </div>

        {/* Gelato Product Selection */}
        <div>
          <label htmlFor="gelatoProduct" className="block text-sm font-medium text-gray-700 mb-2">
            Gelato Product *
          </label>
          <select
            id="gelatoProduct"
            value={formData.gelatoProductUid}
            onChange={(e) => handleInputChange('gelatoProductUid', e.target.value)}
            disabled={isValidatingUid}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.gelatoProductUid ? 'border-red-300' : 'border-gray-300'
              } ${isValidatingUid ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select a Gelato product</option>
            {gelatoProducts.map((product) => (
              <option key={product.uid} value={product.uid}>
                {product.title} - ${product.basePrice}
              </option>
            ))}
          </select>
          {isValidatingUid && (
            <p className="mt-1 text-sm text-blue-600">Validating product UID...</p>
          )}
          {uidValidationMessage && (
            <p className={`mt-1 text-sm ${uidValidationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {uidValidationMessage.message}
            </p>
          )}
          {errors.gelatoProductUid && <p className="mt-1 text-sm text-red-600">{errors.gelatoProductUid}</p>}
        </div>

        {/* Design Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Design Creation Method *
          </label>

          {/* Design Mode Selector (Requirements 9.1, 9.2) */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDesignMode('editor')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${designMode === 'editor'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              Design Editor
            </button>
            <button
              type="button"
              onClick={() => setDesignMode('upload')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${designMode === 'upload'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              Upload File
            </button>
          </div>

          {/* Conditionally render DesignEditorCanvas or DesignUploader (Requirements 9.2, 9.3) */}
          {designMode === 'editor' ? (
            selectedGelatoProduct ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <DesignEditorCanvas
                  width={selectedGelatoProduct.availableSizes.length > 0 ? 400 : 400}
                  height={selectedGelatoProduct.availableSizes.length > 0 ? 500 : 500}
                  initialDesignState={currentDesignState}
                  onDesignChange={handleDesignChange}
                  onExport={handleDesignExport}
                  onCanvasReady={handleCanvasReady}
                />
                {isExporting && (
                  <div className="mt-2 text-sm text-blue-600">
                    Exporting design...
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-8 bg-gray-50 text-center">
                <p className="text-gray-600 text-sm">
                  Please select a Gelato product first to enable the design editor.
                </p>
              </div>
            )
          ) : (
            <DesignUploader
              onUpload={handleDesignUpload}
              currentDesignUrl={formData.designFileUrl}
              onDesignChange={(url) => handleInputChange('designFileUrl', url)}
            />
          )}
          {errors.designFileUrl && <p className="mt-1 text-sm text-red-600">{errors.designFileUrl}</p>}
        </div>

        {/* Mockup Preview */}
        {((formData.designFileUrl &&
          formData.designFileUrl !== 'design-editor-pending-export' &&
          formData.designFileUrl !== 'pending-export') ||
          (designMode === 'editor' && currentDesignState && currentDesignState.elements.length > 0)) &&
          formData.gelatoProductUid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mockup Preview
              </label>
              <MockupPreview
                productType={selectedGelatoProduct?.title || ''}
                designUrl={formData.designFileUrl || 'design-editor-preview'}
                designState={currentDesignState}
                colors={formData.variants.map(v => v.color)}
                onGenerated={handleMockupGenerated}
              />
            </div>
          )}

        {/* Variants Selection */}
        {selectedGelatoProduct && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Variants *
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedGelatoProduct.availableSizes.flatMap(size =>
                selectedGelatoProduct.availableColors.map(color => {
                  const variantId = selectedGelatoProduct.variants[`${size}:${color.name}`]
                  if (!variantId) return null

                  const variant: ProductVariant = {
                    size,
                    color: color.name,
                    colorCode: color.code,
                    variantId: variantId
                  }
                  const isSelected = formData.variants.some(v => v.variantId === variant.variantId)

                  return (
                    <button
                      key={variant.variantId}
                      type="button"
                      onClick={() => handleVariantToggle(variant)}
                      className={`flex items-center justify-between p-2 text-xs rounded-md border transition-all ${isSelected
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <span>{size} / {color.name}</span>
                    </button>
                  )
                })
              ).filter(Boolean)}
            </div>
            {errors.variants && <p className="mt-1 text-sm text-red-600">{errors.variants}</p>}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2 inline" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isExporting || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            {isExporting ? 'Exporting...' : isSubmitting ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
          </button>
        </div>
      </form>
    </div>
  )
}