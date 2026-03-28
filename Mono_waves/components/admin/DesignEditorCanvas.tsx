'use client'

import { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import ElementPropertiesPanel from './ElementPropertiesPanel'
import DesignToolbar from './DesignToolbar'
import { 
  serializeDesignState, 
  deserializeDesignState,
  type DesignState,
  type DesignElement,
  type TextProperties,
  type ImageProperties
} from '@/lib/services/designStateSerializer'

// Re-export types for backward compatibility
export type { DesignState, DesignElement, TextProperties, ImageProperties }

interface DesignEditorCanvasProps {
  width: number
  height: number
  initialDesignState?: DesignState
  onDesignChange?: (state: DesignState) => void
  onExport?: () => Promise<string>
  onCanvasReady?: (canvas: fabric.Canvas) => void
}

export default function DesignEditorCanvas({
  width,
  height,
  initialDesignState,
  onDesignChange,
  onExport,
  onCanvasReady
}: DesignEditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [selectedElement, setSelectedElement] = useState<fabric.Object | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // History management for undo/redo (Requirements 10.4, 10.5)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false) // Flag to prevent history recording during undo/redo

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true, // Ensures layer order is preserved (Requirement 5.2, 5.5)
      // Fabric.js automatically selects top-most element on click (Requirement 5.7)
    })

    // Configure default object controls (Requirements 12.3, 12.4, 12.5, 12.6)
    // Fabric.js provides resize handles at corners and edges, and rotation handle by default
    if (fabric.Object && fabric.Object.prototype) {
      fabric.Object.prototype.set({
        borderColor: '#2563eb',
        cornerColor: '#2563eb',
        cornerStyle: 'circle',
        cornerSize: 10,
        transparentCorners: false,
        borderScaleFactor: 2,
      })
    }

    fabricCanvasRef.current = canvas

    // Notify parent component that canvas is ready
    if (onCanvasReady) {
      onCanvasReady(canvas)
    }

    // Load initial design state if provided
    if (initialDesignState) {
      loadDesignState(canvas, initialDesignState).catch(error => {
        console.error('Failed to load initial design state:', error)
      })
      setIsEmpty(initialDesignState.elements.length === 0)
    }

    // Initialize history with the initial canvas state
    const initialState = JSON.stringify(canvas.toJSON())
    setHistory([initialState])
    setHistoryIndex(0)

    // Listen for canvas changes
    canvas.on('object:added', () => {
      setIsEmpty(canvas.getObjects().length === 0)
      handleCanvasChange(canvas)
    })

    canvas.on('object:removed', () => {
      setIsEmpty(canvas.getObjects().length === 0)
      handleCanvasChange(canvas)
    })

    canvas.on('object:modified', () => {
      handleCanvasChange(canvas)
    })

    // Listen for object moving to enforce canvas boundary constraints (Requirement 12.7)
    canvas.on('object:moving', (e: any) => {
      const obj = e.target
      if (!obj) return

      // Get the bounding rectangle of the object
      const boundingRect = obj.getBoundingRect()
      
      // Constrain to canvas boundaries (Requirement 5.1, 12.7)
      // Left boundary
      if (boundingRect.left < 0) {
        obj.left = Math.max(obj.left - boundingRect.left, obj.left)
      }
      // Right boundary
      if (boundingRect.left + boundingRect.width > canvas.width!) {
        obj.left = Math.min(obj.left - (boundingRect.left + boundingRect.width - canvas.width!), obj.left)
      }
      // Top boundary
      if (boundingRect.top < 0) {
        obj.top = Math.max(obj.top - boundingRect.top, obj.top)
      }
      // Bottom boundary
      if (boundingRect.top + boundingRect.height > canvas.height!) {
        obj.top = Math.min(obj.top - (boundingRect.top + boundingRect.height - canvas.height!), obj.top)
      }
    })

    // Listen for selection changes
    canvas.on('selection:created', (e: any) => {
      setSelectedElement(e.selected?.[0] || null)
    })

    canvas.on('selection:updated', (e: any) => {
      setSelectedElement(e.selected?.[0] || null)
    })

    canvas.on('selection:cleared', () => {
      setSelectedElement(null)
    })

    // Cleanup
    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [width, height])

  const loadDesignState = async (canvas: fabric.Canvas, state: DesignState) => {
    // Deserialize the design state and recreate elements (Requirements 8.3, 8.4)
    await deserializeDesignState(canvas, state)
  }

  const handleCanvasChange = (canvas: fabric.Canvas) => {
    // Skip history recording during undo/redo operations
    if (isUndoRedoRef.current) {
      return
    }

    // Save current state to history (Requirements 10.4, 10.5)
    const currentState = JSON.stringify(canvas.toJSON())
    
    setHistory(prev => {
      // Remove any states after current index (when making changes after undo)
      const newHistory = prev.slice(0, historyIndex + 1)
      // Add new state
      newHistory.push(currentState)
      // Limit to 20 actions (Requirement 10.4)
      if (newHistory.length > 20) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    
    setHistoryIndex(prev => {
      const newHistory = history.slice(0, prev + 1)
      newHistory.push(currentState)
      return Math.min(newHistory.length - 1, 19)
    })

    if (onDesignChange) {
      // Use the serializer to create the design state (Requirement 8.1)
      const state = serializeDesignState(canvas)
      onDesignChange(state)
    }
  }

  // Add text element to canvas
  const addTextElement = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    
    // Create a new text element with default properties
    const text = new fabric.IText('Double click to edit', {
      left: canvas.width ? canvas.width / 2 - 100 : 100,
      top: canvas.height ? canvas.height / 2 - 25 : 100,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
      textAlign: 'left',
      charSpacing: 0,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
    })

    // Add to canvas
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  // Trigger file picker for image upload
  const handleAddImageClick = () => {
    setUploadError(null)
    fileInputRef.current?.click()
  }

  // Validate image file
  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type - only PNG, JPEG, SVG allowed (per requirements 4.1)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Only PNG, JPEG, and SVG files are allowed.`
      }
    }

    // Check file size - 10MB limit (per requirements 4.2)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB.`
      }
    }

    // Check file has content
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty.'
      }
    }

    return { valid: true }
  }

  // Handle image file selection
  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Clear previous error
    setUploadError(null)

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file')
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Upload and add image to canvas
    await addImageElement(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Add image element to canvas
  const addImageElement = async (file: File) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    setIsUploading(true)
    setUploadError(null)

    try {
      // Create a temporary URL for the image to display it immediately
      const imageUrl = URL.createObjectURL(file)

      // Load the image and wait for it to be fully loaded
      const img = await fabric.FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      })

      // Ensure the image has loaded properly
      if (!img.width || !img.height) {
        throw new Error('Image dimensions could not be determined')
      }

      // Store original aspect ratio for preservation (Requirement 4.4)
      const originalAspectRatio = img.width / img.height

      // Get actual image dimensions
      const imgWidth = img.width
      const imgHeight = img.height
      const canvasWidth = canvas.width || 400
      const canvasHeight = canvas.height || 500
      
      // Calculate scale to make image fill entire canvas
      const scaleX = canvasWidth / imgWidth
      const scaleY = canvasHeight / imgHeight
      
      // Position image at top-left corner (0,0) to fill canvas from edge to edge
      const left = 0
      const top = 0

      // Set image properties to fill entire canvas
      img.set({
        left,
        top,
        scaleX: scaleX,
        scaleY: scaleY,
        originX: 'left', // Set origin to left edge
        originY: 'top', // Set origin to top edge
        // Lock image to prevent dragging and resizing to avoid glitches
        lockMovementX: true, // Disable horizontal dragging
        lockMovementY: true, // Disable vertical dragging
        lockScalingX: true, // Disable horizontal resizing
        lockScalingY: true, // Disable vertical resizing
        lockRotation: true, // Disable rotation
        selectable: true, // Keep selectable for properties panel
        evented: true, // Keep evented for selection
        hasControls: false, // Hide resize/rotation handles
        hasBorders: true, // Keep selection border visible
        lockScalingFlip: true, // Prevent flipping during resize
      })

      // Store custom data using a property that Fabric.js v7 supports
      ;(img as any).customData = {
        originalAspectRatio,
        file,
        tempUrl: imageUrl
      }

      // Add to canvas
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()

      setIsUploading(false)
    } catch (error) {
      console.error('Error adding image to canvas:', error)
      setUploadError('Failed to load image. Please try again.')
      setIsUploading(false)
    }
  }

  // Handle property changes from the properties panel
  const handlePropertyChange = (property: string, value: any) => {
    if (!fabricCanvasRef.current || !selectedElement) return

    const canvas = fabricCanvasRef.current
    
    // Update the property on the selected element
    selectedElement.set(property, value)
    
    // For text alignment, we need to handle it specially
    if (property === 'textAlign' && (selectedElement.type === 'i-text' || selectedElement.type === 'text')) {
      selectedElement.set('textAlign', value)
    }
    
    canvas.renderAll()
    handleCanvasChange(canvas)
  }

  // Handle layer order changes (Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7)
  const handleLayerChange = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!fabricCanvasRef.current || !selectedElement) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    const currentIndex = objects.indexOf(selectedElement)
    
    if (currentIndex === -1) return
    
    switch (direction) {
      case 'forward':
        // Move element one layer up (Requirement 5.3)
        if (currentIndex < objects.length - 1) {
          canvas.remove(selectedElement)
          canvas.insertAt(currentIndex + 1, selectedElement)
        }
        break
      case 'backward':
        // Move element one layer down (Requirement 5.3)
        if (currentIndex > 0) {
          canvas.remove(selectedElement)
          canvas.insertAt(currentIndex - 1, selectedElement)
        }
        break
      case 'front':
        // Move element to front-most layer (Requirement 5.4)
        canvas.bringObjectToFront(selectedElement)
        break
      case 'back':
        // Move element to back-most layer (Requirement 5.4)
        canvas.sendObjectToBack(selectedElement)
        break
    }
    
    // Re-select the element to maintain selection state
    canvas.setActiveObject(selectedElement)
    canvas.renderAll()
    handleCanvasChange(canvas)
  }

  // Undo functionality - restore previous state (Requirement 10.4)
  const handleUndo = () => {
    if (!fabricCanvasRef.current || historyIndex <= 0) return

    const canvas = fabricCanvasRef.current
    const newIndex = historyIndex - 1
    
    // Set flag to prevent recording this change
    isUndoRedoRef.current = true
    
    // Load the previous state
    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll()
      setHistoryIndex(newIndex)
      setIsEmpty(canvas.getObjects().length === 0)
      setSelectedElement(null)
      isUndoRedoRef.current = false
    })
  }

  // Redo functionality - reverse undo operation (Requirement 10.5)
  const handleRedo = () => {
    if (!fabricCanvasRef.current || historyIndex >= history.length - 1) return

    const canvas = fabricCanvasRef.current
    const newIndex = historyIndex + 1
    
    // Set flag to prevent recording this change
    isUndoRedoRef.current = true
    
    // Load the next state
    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll()
      setHistoryIndex(newIndex)
      setIsEmpty(canvas.getObjects().length === 0)
      setSelectedElement(null)
      isUndoRedoRef.current = false
    })
  }

  // Check if undo/redo are available
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Delete selected element (Requirement 10.6)
  const handleDelete = () => {
    if (!fabricCanvasRef.current || !selectedElement) return

    const canvas = fabricCanvasRef.current
    canvas.remove(selectedElement)
    canvas.renderAll()
    setSelectedElement(null)
  }

  // Duplicate selected element (Requirement 10.7)
  const handleDuplicate = async () => {
    if (!fabricCanvasRef.current || !selectedElement) return

    const canvas = fabricCanvasRef.current
    
    // Clone the selected element
    const cloned = await selectedElement.clone()
    
    // Offset the cloned element slightly
    cloned.set({
      left: (cloned.left || 0) + 20,
      top: (cloned.top || 0) + 20,
    })
    
    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    canvas.renderAll()
  }

  // Keyboard shortcuts (Requirement 10.7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in text elements
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Delete: Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDelete()
      }
      
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y / Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
      
      // Duplicate: Ctrl+D (or Cmd+D on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        handleDuplicate()
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedElement, historyIndex, history]) // Dependencies for keyboard shortcuts

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="relative">
          {/* Design Toolbar */}
          <div className="mb-4">
            <DesignToolbar
              onAddText={addTextElement}
              onAddImage={handleAddImageClick}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDelete={handleDelete}
              canUndo={canUndo}
              canRedo={canRedo}
              hasSelection={selectedElement !== null}
              isUploading={isUploading}
            />
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleImageFileChange}
            className="hidden"
          />

          {/* Error message display */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {uploadError}
            </div>
          )}

          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 inline-block">
            <canvas ref={canvasRef} />
          </div>
          
          {/* Empty state instructional text */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '60px' }}>
              <div className="bg-white bg-opacity-90 rounded-lg p-6 text-center max-w-md">
                <p className="text-gray-600 text-sm">
                  Your canvas is empty. Add text or images to start designing.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Use the toolbar above to add elements to your design.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <ElementPropertiesPanel
        selectedElement={selectedElement}
        onPropertyChange={handlePropertyChange}
        onLayerChange={handleLayerChange}
      />
    </div>
  )
}
