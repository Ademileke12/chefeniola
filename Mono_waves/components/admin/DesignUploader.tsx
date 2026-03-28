'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileImage, AlertCircle, Check } from 'lucide-react'

interface DesignUploaderProps {
  onUpload: (file: File) => Promise<string>
  currentDesignUrl?: string
  onDesignChange?: (url: string) => void
  maxSizeBytes?: number
  acceptedTypes?: string[]
}

export default function DesignUploader({ 
  onUpload, 
  currentDesignUrl,
  onDesignChange,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf']
}: DesignUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentDesignUrl || null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Please upload: ${acceptedTypes.map(type => {
        switch (type) {
          case 'image/jpeg': return 'JPEG'
          case 'image/png': return 'PNG'
          case 'image/svg+xml': return 'SVG'
          case 'application/pdf': return 'PDF'
          default: return type
        }
      }).join(', ')}`
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
      return `File size too large. Maximum size is ${maxSizeMB}MB.`
    }

    return null
  }

  const handleFileUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const url = await onUpload(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        setUploadedUrl(url)
        onDesignChange?.(url)
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [onUpload, onDesignChange, maxSizeBytes, acceptedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleRemoveDesign = () => {
    setUploadedUrl(null)
    onDesignChange?.('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Show uploaded design
  if (uploadedUrl && !isUploading) {
    return (
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {uploadedUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileImage className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <img
                  src={uploadedUrl}
                  alt="Design preview"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Design uploaded</p>
              <p className="text-xs text-gray-500">Click to view full size</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <button
              type="button"
              onClick={handleRemoveDesign}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Remove design"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Full size preview on click */}
        <button
          type="button"
          onClick={() => window.open(uploadedUrl, '_blank')}
          className="mt-3 w-full"
        >
          <img
            src={uploadedUrl}
            alt="Design preview"
            className="w-full h-32 rounded-lg object-cover border border-gray-200 hover:border-gray-300 transition-colors"
          />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging 
            ? 'border-gray-900 bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none' : 'cursor-pointer'}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Uploading design...</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragging ? 'Drop your design file here' : 'Upload design file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports JPEG, PNG, SVG, PDF up to {formatFileSize(maxSizeBytes)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Design Guidelines:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>High resolution (300 DPI minimum recommended)</li>
          <li>RGB color mode for best print quality</li>
          <li>Transparent background (PNG) for best results</li>
          <li>Vector formats (SVG) scale perfectly at any size</li>
        </ul>
      </div>
    </div>
  )
}