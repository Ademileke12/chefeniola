'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Download, ExternalLink, AlertCircle } from 'lucide-react'
import { DesignState } from '@/lib/services/designStateSerializer'

interface MockupPreviewProps {
  productUid?: string
  productType: string
  designUrl: string
  designState?: DesignState
  selectedColor?: string
  colors?: string[]
  onGenerated?: (images: string[]) => void
  onMockupGenerated?: (mockupUrls: Record<string, string>) => void
}

interface MockupData {
  front?: string
  back?: string
  loading: boolean
  error: string | null
}

export default function MockupPreview({
  productUid,
  designUrl,
  designState,
  selectedColor,
  onMockupGenerated
}: MockupPreviewProps) {
  const [mockups, setMockups] = useState<MockupData>({
    loading: false,
    error: null
  })
  const frontCanvasRef = useRef<HTMLCanvasElement>(null)
  const backCanvasRef = useRef<HTMLCanvasElement>(null)

  // Render design overlay on mockup canvas (Requirements 6.2, 6.4)
  const renderDesignOverlay = async (
    canvas: HTMLCanvasElement,
    mockupType: string,
    designState?: DesignState
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    try {
      // Set canvas size
      canvas.width = 400
      canvas.height = 400

      console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height)

      // Draw mockup background
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw mockup label
      ctx.fillStyle = mockupType === 'front' ? '#333333' : '#666666'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = mockupType === 'front' ? 'Front Mockup' : 'Back Mockup'
      if (selectedColor) {
        ctx.fillText(`${label} (${selectedColor})`, canvas.width / 2, canvas.height / 2 - 40)
      } else {
        ctx.fillText(label, canvas.width / 2, canvas.height / 2 - 20)
      }

      // Draw placeholder t-shirt outline
      ctx.strokeStyle = mockupType === 'front' ? '#333333' : '#666666'
      ctx.lineWidth = 2
      ctx.beginPath()
      // Simple t-shirt shape
      ctx.moveTo(100, 150)
      ctx.lineTo(150, 120)
      ctx.lineTo(200, 150)
      ctx.lineTo(300, 150)
      ctx.lineTo(250, 120)
      ctx.lineTo(300, 150)
      ctx.lineTo(300, 350)
      ctx.lineTo(100, 350)
      ctx.lineTo(100, 150)
      ctx.stroke()

      // If no design state or empty design, just show mockup (Requirement 6.5)
      if (!designState || designState.elements.length === 0) {
        console.log('No design state or empty design, showing mockup only')
        return
      }

      console.log('Rendering', designState.elements.length, 'design elements on mockup')

      // Calculate scale factor to fit design on mockup
      // Assuming design should be centered and scaled to fit within mockup
      const designWidth = designState.canvasWidth
      const designHeight = designState.canvasHeight
      const mockupWidth = canvas.width
      const mockupHeight = canvas.height

      // Scale to fit within 40% of mockup dimensions (leaving margin for t-shirt outline)
      const maxDesignWidth = mockupWidth * 0.4
      const maxDesignHeight = mockupHeight * 0.4
      const scale = Math.min(maxDesignWidth / designWidth, maxDesignHeight / designHeight)

      // Center the design on mockup
      const offsetX = (mockupWidth - designWidth * scale) / 2
      const offsetY = (mockupHeight - designHeight * scale) / 2

      // Sort elements by zIndex to maintain layer order
      const sortedElements = [...designState.elements].sort((a, b) => a.zIndex - b.zIndex)

      // Render each design element
      for (const element of sortedElements) {
        ctx.save()

        // Apply transformations
        const x = offsetX + element.position.x * scale
        const y = offsetY + element.position.y * scale
        const width = element.size.width * scale
        const height = element.size.height * scale

        // Move to element position
        ctx.translate(x + width / 2, y + height / 2)

        // Apply rotation
        if (element.rotation) {
          ctx.rotate((element.rotation * Math.PI) / 180)
        }

        if (element.type === 'text') {
          const textProps = element.properties as any

          // Set text properties
          ctx.font = `${textProps.fontStyle} ${textProps.fontWeight} ${textProps.fontSize * scale}px ${textProps.fontFamily}`
          ctx.fillStyle = textProps.color
          ctx.textAlign = textProps.textAlign || 'left'
          ctx.textBaseline = 'top'

          // Apply letter spacing and line height
          const lines = textProps.content.split('\n')
          const lineHeight = textProps.fontSize * scale * textProps.lineHeight

          lines.forEach((line: string, index: number) => {
            const yPos = -height / 2 + index * lineHeight

            // Handle text alignment
            let xPos = -width / 2
            if (textProps.textAlign === 'center') {
              xPos = 0
            } else if (textProps.textAlign === 'right') {
              xPos = width / 2
            }

            ctx.fillText(line, xPos, yPos)
          })
        } else if (element.type === 'image') {
          const imageProps = element.properties as any

          // Load and draw image
          const img = new Image()
          img.crossOrigin = 'anonymous'

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => {
              console.error('Failed to load design image:', imageProps.url)
              resolve(null) // Continue even if image fails
            }
            img.src = imageProps.url
          })

          if (img.complete && img.naturalWidth > 0) {
            ctx.globalAlpha = imageProps.opacity || 1.0
            ctx.drawImage(img, -width / 2, -height / 2, width, height)
            ctx.globalAlpha = 1.0
          }
        }

        ctx.restore()
      }
    } catch (error) {
      console.error('Error rendering design overlay:', error)
    }
  }

  // Update mockup previews when design state changes (Requirement 6.2)
  useEffect(() => {
    if (mockups.front && frontCanvasRef.current) {
      renderDesignOverlay(frontCanvasRef.current, 'front', designState)
    }
  }, [mockups.front, designState, selectedColor])

  useEffect(() => {
    if (mockups.back && backCanvasRef.current) {
      renderDesignOverlay(backCanvasRef.current, 'back', designState)
    }
  }, [mockups.back, designState, selectedColor])

  const generateMockups = async () => {
    if (!productUid) {
      setMockups({ loading: false, error: 'Product is required' })
      return
    }

    // For design editor mode, we can generate mockups even without a real designUrl
    // as long as we have designState
    if (!designUrl && !designState) {
      setMockups({ loading: false, error: 'Design or design state is required' })
      return
    }

    setMockups({ loading: true, error: null })

    try {
      // In a real implementation, this would call the Gelato API to generate mockups
      // For now, we'll create mockups directly on canvas

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate mockup data URLs directly from canvas
      // This avoids external dependencies and CORS issues
      const mockupUrls = {
        front: 'canvas-mockup-front',
        back: 'canvas-mockup-back'
      }

      setMockups({
        front: mockupUrls.front,
        back: mockupUrls.back,
        loading: false,
        error: null
      })

      // Notify parent component
      onMockupGenerated?.(mockupUrls)

    } catch (error) {
      console.error('Error generating mockups:', error)
      setMockups({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate mockups'
      })
    }
  }

  // Auto-generate mockups when product, design, or color changes (Requirement 6.3)
  useEffect(() => {
    if (productUid && (designUrl || designState)) {
      generateMockups()
    }
  }, [productUid, designUrl, selectedColor, designState])

  const handleDownloadMockup = (url: string, type: string) => {
    // Get the appropriate canvas
    const canvas = type === 'front' ? frontCanvasRef.current : backCanvasRef.current

    if (canvas) {
      // Download from canvas
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `mockup-${type}-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      })
    } else {
      // Fallback to URL download
      const link = document.createElement('a')
      link.href = url
      link.download = `mockup-${type}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleOpenMockup = (url: string) => {
    // For canvas-based mockups, open the canvas data URL
    const canvas = url === mockups.front ? frontCanvasRef.current : backCanvasRef.current

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png')
      window.open(dataUrl, '_blank')
    } else {
      window.open(url, '_blank')
    }
  }

  if (!productUid || (!designUrl && !designState)) {
    return (
      <div className="border border-gray-300 rounded-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ExternalLink className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">
          Select a product and create a design to generate mockups
        </p>
      </div>
    )
  }

  if (mockups.loading) {
    return (
      <div className="border border-gray-300 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Generating mockups...</p>
            <p className="text-xs text-gray-500 mt-1">
              This may take a few moments while we apply your design
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gray-900 h-2 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (mockups.error) {
    return (
      <div className="border border-red-300 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Failed to generate mockups</p>
            <p className="text-xs text-red-700 mt-1">{mockups.error}</p>
          </div>
        </div>
        <button
          onClick={generateMockups}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2 inline" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Product Mockups</h4>
        <button
          onClick={generateMockups}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Regenerate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Mockup */}
        {mockups.front && (
          <div className="space-y-3">
            <div className="relative group">
              <canvas
                ref={frontCanvasRef}
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                style={{ display: 'block' }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenMockup(mockups.front!)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    title="View full size"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDownloadMockup(mockups.front!, 'front')}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    title="Download mockup"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Front View</p>
              <p className="text-xs text-gray-500">Primary design placement</p>
            </div>
          </div>
        )}

        {/* Back Mockup */}
        {mockups.back && (
          <div className="space-y-3">
            <div className="relative group">
              <canvas
                ref={backCanvasRef}
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                style={{ display: 'block' }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenMockup(mockups.back!)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    title="View full size"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDownloadMockup(mockups.back!, 'back')}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    title="Download mockup"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Back View</p>
              <p className="text-xs text-gray-500">Secondary design placement</p>
            </div>
          </div>
        )}
      </div>

      {/* Mockup Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Mockup Information</h5>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Mockups are generated using your uploaded design</p>
          <p>• Colors may vary slightly from actual printed products</p>
          <p>• Use these mockups for product listings and marketing</p>
          <p>• High-resolution versions are available for download</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Last generated: {new Date().toLocaleString()}
        </div>
        <div className="flex space-x-2">
          {mockups.front && (
            <button
              onClick={() => handleDownloadMockup(mockups.front!, 'front')}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Download Front
            </button>
          )}
          {mockups.back && (
            <button
              onClick={() => handleDownloadMockup(mockups.back!, 'back')}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Download Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}