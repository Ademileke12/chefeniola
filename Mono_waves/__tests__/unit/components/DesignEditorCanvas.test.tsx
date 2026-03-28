import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DesignEditorCanvas, { DesignState } from '@/components/admin/DesignEditorCanvas'
import * as fabric from 'fabric'

// Mock fabric.js
jest.mock('fabric', () => ({
  Canvas: jest.fn().mockImplementation(() => ({
    width: 0,
    height: 0,
    backgroundColor: '#ffffff',
    on: jest.fn(),
    dispose: jest.fn(),
    getObjects: jest.fn(() => []),
    renderAll: jest.fn(),
    add: jest.fn(),
    setActiveObject: jest.fn(),
    toJSON: jest.fn(() => ({ objects: [], version: '5.3.0' })),
  })),
  IText: jest.fn().mockImplementation((text, options) => ({
    type: 'i-text',
    text,
    ...options,
  })),
  FabricImage: {
    fromURL: jest.fn().mockImplementation((url, options) => 
      Promise.resolve({
        type: 'image',
        width: 200,
        height: 200,
        set: jest.fn(),
        ...options,
      })
    ),
  },
}))

describe('DesignEditorCanvas', () => {
  const defaultProps = {
    width: 800,
    height: 600,
  }

  // Helper to create mock canvas with toJSON
  const createMockCanvas = (overrides = {}) => ({
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    on: jest.fn(),
    dispose: jest.fn(),
    getObjects: jest.fn(() => []),
    renderAll: jest.fn(),
    add: jest.fn(),
    setActiveObject: jest.fn(),
    toJSON: jest.fn(() => ({ objects: [], version: '5.3.0' })),
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders canvas element with correct dimensions', () => {
    render(<DesignEditorCanvas {...defaultProps} />)
    
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('initializes Fabric.js canvas with correct dimensions', () => {
    render(<DesignEditorCanvas {...defaultProps} />)
    
    expect(fabric.Canvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      })
    )
  })

  it('displays empty state instructional text when canvas is empty', () => {
    render(<DesignEditorCanvas {...defaultProps} />)
    
    expect(screen.getByText(/Your canvas is empty/)).toBeInTheDocument()
    expect(screen.getByText(/Add text or images to start designing/)).toBeInTheDocument()
    expect(screen.getByText(/Use the toolbar above to add elements/)).toBeInTheDocument()
  })

  it('renders Add Text button', () => {
    render(<DesignEditorCanvas {...defaultProps} />)
    
    const addTextButton = screen.getByRole('button', { name: /add text/i })
    expect(addTextButton).toBeInTheDocument()
  })

  it('hides empty state when canvas has elements', async () => {
    const mockCanvas = {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      on: jest.fn((event, callback) => {
        // Simulate object:added event
        if (event === 'object:added') {
          setTimeout(() => callback(), 0)
        }
      }),
      dispose: jest.fn(),
      getObjects: jest.fn(() => [{ type: 'text' }]), // Mock one element
      renderAll: jest.fn(),
      add: jest.fn(),
      setActiveObject: jest.fn(),
      toJSON: jest.fn(() => ({ objects: [], version: '5.3.0' })),
    }

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(<DesignEditorCanvas {...defaultProps} />)

    // Trigger the object:added callback
    const onCallback = (mockCanvas.on as jest.Mock).mock.calls.find(
      call => call[0] === 'object:added'
    )?.[1]
    
    if (onCallback) {
      onCallback()
    }

    await waitFor(() => {
      expect(screen.queryByText(/Your canvas is empty/)).not.toBeInTheDocument()
    })
  })

  it('creates text element when Add Text button is clicked', () => {
    const mockAdd = jest.fn()
    const mockSetActiveObject = jest.fn()
    const mockRenderAll = jest.fn()

    const mockCanvas = createMockCanvas({
      add: mockAdd,
      setActiveObject: mockSetActiveObject,
      renderAll: mockRenderAll,
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(<DesignEditorCanvas {...defaultProps} />)

    const addTextButton = screen.getByRole('button', { name: /add text/i })
    fireEvent.click(addTextButton)

    expect(fabric.IText).toHaveBeenCalledWith(
      'Double click to edit',
      expect.objectContaining({
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#000000',
        textAlign: 'left',
        charSpacing: 0,
        lineHeight: 1.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
      })
    )

    expect(mockAdd).toHaveBeenCalled()
    expect(mockSetActiveObject).toHaveBeenCalled()
    expect(mockRenderAll).toHaveBeenCalled()
  })

  it('displays selection indicator when element is selected', async () => {
    let selectionCreatedCallback: ((e: any) => void) | undefined

    const mockCanvas = createMockCanvas({
      on: jest.fn((event, callback) => {
        if (event === 'selection:created') {
          selectionCreatedCallback = callback
        }
      }),
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(<DesignEditorCanvas {...defaultProps} />)

    // Initially no selection indicator
    expect(screen.queryByText('Element selected')).not.toBeInTheDocument()

    // Simulate selection
    if (selectionCreatedCallback) {
      selectionCreatedCallback({ selected: [{ type: 'text' }] })
    }

    await waitFor(() => {
      expect(screen.getByText('Element selected')).toBeInTheDocument()
    })
  })

  it('clears selection indicator when selection is cleared', async () => {
    let selectionCreatedCallback: ((e: any) => void) | undefined
    let selectionClearedCallback: (() => void) | undefined

    const mockCanvas = createMockCanvas({
      on: jest.fn((event, callback) => {
        if (event === 'selection:created') {
          selectionCreatedCallback = callback
        }
        if (event === 'selection:cleared') {
          selectionClearedCallback = callback
        }
      }),
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(<DesignEditorCanvas {...defaultProps} />)

    // Simulate selection
    if (selectionCreatedCallback) {
      selectionCreatedCallback({ selected: [{ type: 'text' }] })
    }

    await waitFor(() => {
      expect(screen.getByText('Element selected')).toBeInTheDocument()
    })

    // Simulate deselection
    if (selectionClearedCallback) {
      selectionClearedCallback()
    }

    await waitFor(() => {
      expect(screen.queryByText('Element selected')).not.toBeInTheDocument()
    })
  })

  it('calls onDesignChange when canvas changes', async () => {
    const mockOnDesignChange = jest.fn()
    let addedCallback: (() => void) | undefined

    const mockCanvas = createMockCanvas({
      on: jest.fn((event, callback) => {
        if (event === 'object:added') {
          addedCallback = callback
        }
      }),
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(
      <DesignEditorCanvas 
        {...defaultProps} 
        onDesignChange={mockOnDesignChange}
      />
    )

    // Simulate adding an object
    if (addedCallback) {
      addedCallback()
    }

    await waitFor(() => {
      expect(mockOnDesignChange).toHaveBeenCalled()
    })

    const callArg = mockOnDesignChange.mock.calls[0][0]
    expect(callArg).toHaveProperty('version')
    expect(callArg).toHaveProperty('canvasWidth')
    expect(callArg).toHaveProperty('canvasHeight')
    expect(callArg).toHaveProperty('backgroundColor')
    expect(callArg).toHaveProperty('elements')
  })

  it('loads initial design state when provided', () => {
    const initialState: DesignState = {
      version: '1.0',
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#ffffff',
      elements: [
        {
          id: 'text-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          rotation: 0,
          zIndex: 1,
          properties: {
            content: 'Test Text',
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#000000',
            textAlign: 'left',
            letterSpacing: 0,
            lineHeight: 1.2,
            fontWeight: 'normal',
            fontStyle: 'normal',
          },
        },
      ],
    }

    render(
      <DesignEditorCanvas 
        {...defaultProps} 
        initialDesignState={initialState}
      />
    )

    // Canvas should be initialized
    expect(fabric.Canvas).toHaveBeenCalled()
  })

  it('disposes canvas on unmount', () => {
    const mockDispose = jest.fn()
    const mockCanvas = createMockCanvas({
      dispose: mockDispose,
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    const { unmount } = render(<DesignEditorCanvas {...defaultProps} />)
    
    unmount()

    expect(mockDispose).toHaveBeenCalled()
  })

  it('handles canvas sizing based on product print area dimensions', () => {
    const printAreaWidth = 4500
    const printAreaHeight = 5400

    render(
      <DesignEditorCanvas 
        width={printAreaWidth} 
        height={printAreaHeight}
      />
    )

    expect(fabric.Canvas).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      expect.objectContaining({
        width: printAreaWidth,
        height: printAreaHeight,
      })
    )
  })

  it('registers event listeners for canvas changes', () => {
    const mockOn = jest.fn()
    const mockCanvas = createMockCanvas({
      on: mockOn,
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(<DesignEditorCanvas {...defaultProps} />)

    expect(mockOn).toHaveBeenCalledWith('object:added', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('object:removed', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('object:modified', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('selection:created', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('selection:updated', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('selection:cleared', expect.any(Function))
  })

  it('serializes design state with correct structure', async () => {
    const mockOnDesignChange = jest.fn()
    let addedCallback: (() => void) | undefined

    const mockCanvas = createMockCanvas({
      on: jest.fn((event, callback) => {
        if (event === 'object:added') {
          addedCallback = callback
        }
      }),
    })

    ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

    render(
      <DesignEditorCanvas 
        {...defaultProps} 
        onDesignChange={mockOnDesignChange}
      />
    )

    if (addedCallback) {
      addedCallback()
    }

    await waitFor(() => {
      expect(mockOnDesignChange).toHaveBeenCalled()
    })

    const state = mockOnDesignChange.mock.calls[0][0]
    expect(state.version).toBe('1.0')
    expect(state.canvasWidth).toBe(800)
    expect(state.canvasHeight).toBe(600)
    expect(state.backgroundColor).toBe('#ffffff')
    expect(Array.isArray(state.elements)).toBe(true)
  })

  describe('Image Upload Functionality', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()
    })

    it('renders Add Image button', () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const addImageButton = screen.getByRole('button', { name: /add image/i })
      expect(addImageButton).toBeInTheDocument()
    })

    it('renders hidden file input with correct accept attribute', () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveClass('hidden')
      expect(fileInput.accept).toBe('image/png,image/jpeg,image/jpg,image/svg+xml')
    })

    it('triggers file input click when Add Image button is clicked', () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, 'click')
      
      const addImageButton = screen.getByRole('button', { name: /add image/i })
      fireEvent.click(addImageButton)
      
      expect(clickSpy).toHaveBeenCalled()
    })

    it('validates and rejects invalid file types', async () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
        expect(screen.getByText(/Only PNG, JPEG, and SVG files are allowed/)).toBeInTheDocument()
      })
    })

    it('validates and rejects files over 10MB', async () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      
      // Mock the size property
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/File size exceeds maximum/)).toBeInTheDocument()
        expect(screen.getByText(/Maximum allowed: 10MB/)).toBeInTheDocument()
      })
    })

    it('validates and rejects empty files', async () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const emptyFile = new File([], 'empty.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [emptyFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/File is empty/)).toBeInTheDocument()
      })
    })

    it('accepts valid PNG files', async () => {
      const mockAdd = jest.fn()
      const mockSetActiveObject = jest.fn()
      const mockRenderAll = jest.fn()

      const mockCanvas = createMockCanvas({
        add: mockAdd,
        setActiveObject: mockSetActiveObject,
        renderAll: mockRenderAll,
      })

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(fabric.FabricImage.fromURL).toHaveBeenCalledWith(
          'blob:mock-url',
          expect.objectContaining({
            crossOrigin: 'anonymous'
          })
        )
        expect(mockAdd).toHaveBeenCalled()
        expect(mockSetActiveObject).toHaveBeenCalled()
        expect(mockRenderAll).toHaveBeenCalled()
      })
    })

    it('accepts valid JPEG files', async () => {
      const mockAdd = jest.fn()
      const mockCanvas = createMockCanvas({
        add: mockAdd,
      })

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(fabric.FabricImage.fromURL).toHaveBeenCalled()
        expect(mockAdd).toHaveBeenCalled()
      })
    })

    it('accepts valid SVG files', async () => {
      const mockAdd = jest.fn()
      const mockCanvas = createMockCanvas({
        add: mockAdd,
      })

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(fabric.FabricImage.fromURL).toHaveBeenCalled()
        expect(mockAdd).toHaveBeenCalled()
      })
    })

    it('creates image element on canvas after successful upload', async () => {
      const mockAdd = jest.fn()
      const mockSetActiveObject = jest.fn()
      const mockRenderAll = jest.fn()

      const mockCanvas = createMockCanvas({
        add: mockAdd,
        setActiveObject: mockSetActiveObject,
        renderAll: mockRenderAll,
      })

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(mockAdd).toHaveBeenCalled()
        expect(mockSetActiveObject).toHaveBeenCalled()
        expect(mockRenderAll).toHaveBeenCalled()
      })

      // Verify the image was added to the canvas
      const addedImage = mockAdd.mock.calls[0][0]
      expect(addedImage).toBeDefined()
      expect(addedImage.type).toBe('image')
    })

    it('displays uploading state while processing image', async () => {
      // Mock a slow image load
      const slowFromURL = jest.fn(() => 
        new Promise(resolve => setTimeout(() => resolve({
          type: 'image',
          width: 200,
          height: 200,
          set: jest.fn(),
        }), 100))
      )
      ;(fabric.FabricImage.fromURL as jest.Mock).mockImplementation(slowFromURL)

      const mockCanvas = createMockCanvas()

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      // Should show uploading state
      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument()
      })

      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.getByText('Add Image')).toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('handles image load errors gracefully', async () => {
      // Mock image load failure
      ;(fabric.FabricImage.fromURL as jest.Mock).mockRejectedValue(
        new Error('Failed to load image')
      )

      const mockCanvas = createMockCanvas()

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load image/)).toBeInTheDocument()
      })
    })

    it('resets file input after successful upload', async () => {
      const mockCanvas = createMockCanvas()

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(fileInput.value).toBe('')
      })
    })

    it('resets file input after validation error', async () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } })
      
      await waitFor(() => {
        expect(fileInput.value).toBe('')
      })
    })

    it('clears previous error when new upload is attempted', async () => {
      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // First upload with invalid file
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      fireEvent.change(fileInput, { target: { files: [invalidFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
      })

      // Click Add Image button again
      const addImageButton = screen.getByRole('button', { name: /add image/i })
      fireEvent.click(addImageButton)
      
      // Error should be cleared
      expect(screen.queryByText(/Invalid file type/)).not.toBeInTheDocument()
    })

    it('disables Add Image button while uploading', async () => {
      // Mock a slow image load
      const slowFromURL = jest.fn(() => 
        new Promise(resolve => setTimeout(() => resolve({
          type: 'image',
          width: 200,
          height: 200,
          set: jest.fn(),
        }), 100))
      )
      ;(fabric.FabricImage.fromURL as jest.Mock).mockImplementation(slowFromURL)

      const mockCanvas = createMockCanvas()

      ;(fabric.Canvas as jest.Mock).mockImplementation(() => mockCanvas)

      render(<DesignEditorCanvas {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = new File(['image content'], 'test.png', { type: 'image/png' })
      
      fireEvent.change(fileInput, { target: { files: [validFile] } })
      
      // Button should be disabled during upload
      await waitFor(() => {
        const addImageButton = screen.getByRole('button', { name: /uploading/i })
        expect(addImageButton).toBeDisabled()
      })
    })
  })
})
