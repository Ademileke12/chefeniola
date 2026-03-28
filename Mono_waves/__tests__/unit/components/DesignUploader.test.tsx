import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DesignUploader from '@/components/admin/DesignUploader'

// Mock file for testing
const createMockFile = (name: string, type: string, size: number = 1024) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('DesignUploader', () => {
  const mockOnUpload = jest.fn()
  const mockOnDesignChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url')
    global.URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders upload area when no design is uploaded', () => {
    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    expect(screen.getByText('Upload design file')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop or click to browse')).toBeInTheDocument()
    expect(screen.getByText(/Supports JPEG, PNG, SVG, PDF/)).toBeInTheDocument()
  })

  it('shows uploaded design when currentDesignUrl is provided', () => {
    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        currentDesignUrl="https://example.com/design.png"
      />
    )

    expect(screen.getByText('Design uploaded')).toBeInTheDocument()
    expect(screen.getAllByAltText('Design preview')).toHaveLength(2) // Thumbnail and full preview
  })

  it('handles file upload via file input', async () => {
    const user = userEvent.setup()
    mockOnUpload.mockResolvedValue('https://example.com/uploaded-design.png')

    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    const file = createMockFile('test-design.png', 'image/png')
    
    // Click the upload area to trigger file input
    const uploadArea = screen.getByText('Upload design file').closest('div')
    await user.click(uploadArea!)
    
    // Find the hidden file input and upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file)
    })
  })

  it('handles drag and drop upload', async () => {
    mockOnUpload.mockResolvedValue('https://example.com/uploaded-design.png')

    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    const dropZone = screen.getByText('Upload design file').closest('div')
    const file = createMockFile('test-design.png', 'image/png')

    // Simulate drag and drop
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    expect(screen.getByText('Drop your design file here')).toBeInTheDocument()

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file)
    })
  })

  it('validates file type', async () => {
    const user = userEvent.setup()

    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    const file = createMockFile('test.txt', 'text/plain')
    const dropZone = screen.getByText('Upload design file').closest('div')

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/File type not supported/)).toBeInTheDocument()
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('validates file size', async () => {
    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        maxSizeBytes={1024} // 1KB limit
      />
    )

    const file = createMockFile('large-file.png', 'image/png', 2048) // 2KB file
    const dropZone = screen.getByText('Upload design file').closest('div')

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/File size too large/)).toBeInTheDocument()
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('shows upload progress', async () => {
    // Mock a slow upload
    mockOnUpload.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('https://example.com/design.png'), 1000))
    )

    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    const file = createMockFile('test-design.png', 'image/png')
    const dropZone = screen.getByText('Upload design file').closest('div')

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading design...')).toBeInTheDocument()
    })
  })

  it('handles upload errors', async () => {
    mockOnUpload.mockRejectedValue(new Error('Upload failed'))

    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    const file = createMockFile('test-design.png', 'image/png')
    const dropZone = screen.getByText('Upload design file').closest('div')

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('allows removing uploaded design', async () => {
    const user = userEvent.setup()

    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        currentDesignUrl="https://example.com/design.png"
        onDesignChange={mockOnDesignChange}
      />
    )

    const removeButton = screen.getByTitle('Remove design')
    await user.click(removeButton)

    expect(mockOnDesignChange).toHaveBeenCalledWith('')
  })

  it('calls onDesignChange when upload completes', async () => {
    const uploadedUrl = 'https://example.com/uploaded-design.png'
    mockOnUpload.mockResolvedValue(uploadedUrl)

    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        onDesignChange={mockOnDesignChange}
      />
    )

    const file = createMockFile('test-design.png', 'image/png')
    const dropZone = screen.getByText('Upload design file').closest('div')

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file]
      }
    })

    await waitFor(() => {
      expect(mockOnDesignChange).toHaveBeenCalledWith(uploadedUrl)
    })
  })

  it('shows design guidelines', () => {
    render(
      <DesignUploader onUpload={mockOnUpload} />
    )

    expect(screen.getByText('Design Guidelines:')).toBeInTheDocument()
    expect(screen.getByText(/High resolution \(300 DPI minimum recommended\)/)).toBeInTheDocument()
    expect(screen.getByText(/RGB color mode for best print quality/)).toBeInTheDocument()
  })

  it('opens design in new window when clicked', async () => {
    const user = userEvent.setup()
    const mockOpen = jest.fn()
    global.window.open = mockOpen

    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        currentDesignUrl="https://example.com/design.png"
      />
    )

    const previewImage = screen.getAllByAltText('Design preview')[1] // The clickable one
    await user.click(previewImage)

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/design.png', '_blank')
  })

  it('accepts custom file types', () => {
    render(
      <DesignUploader 
        onUpload={mockOnUpload}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    expect(screen.getByText(/Supports JPEG, PNG/)).toBeInTheDocument()
  })
})