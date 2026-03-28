import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockupPreview from '@/components/admin/MockupPreview'
import { DesignState } from '@/lib/services/designStateSerializer'

describe('MockupPreview', () => {
  const mockOnMockupGenerated = jest.fn()

  // Sample design state for testing
  const sampleDesignState: DesignState = {
    version: '1.0',
    canvasWidth: 400,
    canvasHeight: 400,
    backgroundColor: '#ffffff',
    elements: [
      {
        id: 'text-1',
        type: 'text',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
        rotation: 0,
        zIndex: 0,
        properties: {
          content: 'Test Text',
          fontFamily: 'Arial',
          fontSize: 24,
          color: '#000000',
          textAlign: 'center',
          letterSpacing: 0,
          lineHeight: 1.2,
          fontWeight: 'normal',
          fontStyle: 'normal'
        }
      }
    ]
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Mock document methods for download functionality
    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: jest.fn(),
          style: {}
        }
      }
      return {}
    })
    document.body.appendChild = jest.fn()
    document.body.removeChild = jest.fn()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('shows placeholder when no product or design provided', () => {
    render(
      <MockupPreview 
        productUid=""
        designUrl=""
      />
    )

    expect(screen.getByText('Select a product and upload a design to generate mockups')).toBeInTheDocument()
  })

  it('shows loading state during mockup generation', () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    expect(screen.getByText('Generating mockups...')).toBeInTheDocument()
    expect(screen.getByText('This may take a few moments while we apply your design')).toBeInTheDocument()
  })

  it('generates mockups when product and design are provided', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    // Fast-forward through the simulated API delay
    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Product Mockups')).toBeInTheDocument()
    })

    expect(mockOnMockupGenerated).toHaveBeenCalledWith({
      front: expect.stringContaining('Front+Mockup'),
      back: expect.stringContaining('Back+Mockup')
    })
  })

  it('displays front and back mockups when generated', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      // Check for canvas elements (now using canvas instead of img)
      const canvases = document.querySelectorAll('canvas')
      expect(canvases.length).toBeGreaterThanOrEqual(2)
    })

    expect(screen.getByText('Front View')).toBeInTheDocument()
    expect(screen.getByText('Back View')).toBeInTheDocument()
  })

  it('handles regenerate mockups', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    // Wait for initial generation
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText('Product Mockups')).toBeInTheDocument()
    })

    // Click regenerate
    const regenerateButton = screen.getByText('Regenerate')
    await user.click(regenerateButton)

    expect(screen.getByText('Generating mockups...')).toBeInTheDocument()
  })

  it('handles download mockup functionality', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const mockClick = jest.fn()
    const mockToBlob = jest.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/png' }))
    })
    
    // Mock canvas toBlob
    HTMLCanvasElement.prototype.toBlob = mockToBlob

    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    // Wait for mockups to generate
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText('Product Mockups')).toBeInTheDocument()
    })

    // Find and click download button
    const downloadButtons = screen.getAllByText('Download Front')
    await user.click(downloadButtons[0])

    expect(mockToBlob).toHaveBeenCalled()
  })

  it('handles view full size functionality', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const mockOpen = jest.fn()
    global.window.open = mockOpen

    // Mock canvas toDataURL
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test')

    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    // Wait for mockups to generate
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText('Product Mockups')).toBeInTheDocument()
    })

    // Find and click view full size button
    const canvases = document.querySelectorAll('canvas')
    const frontCanvas = canvases[0]
    fireEvent.mouseEnter(frontCanvas.parentElement!)

    const viewButtons = screen.getAllByTitle('View full size')
    await user.click(viewButtons[0])

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('data:image/png'),
      '_blank'
    )
  })

  it('shows download buttons in footer', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    // Wait for mockups to generate
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText('Download Front')).toBeInTheDocument()
      expect(screen.getByText('Download Back')).toBeInTheDocument()
    })
  })

  it('displays mockup information', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    // Wait for mockups to generate
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText('Mockup Information')).toBeInTheDocument()
    })

    expect(screen.getByText('• Mockups are generated using your uploaded design')).toBeInTheDocument()
    expect(screen.getByText('• Colors may vary slightly from actual printed products')).toBeInTheDocument()
  })

  it('shows last generated timestamp', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    // Wait for mockups to generate
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(screen.getByText(/Last generated:/)).toBeInTheDocument()
    })
  })

  it('regenerates mockups when product or design changes', async () => {
    const { rerender } = render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    // Wait for initial generation
    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(mockOnMockupGenerated).toHaveBeenCalledTimes(1)
    })

    // Change the design URL
    rerender(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/new-design.png"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    // Should trigger regeneration
    expect(screen.getByText('Generating mockups...')).toBeInTheDocument()
  })

  it('handles missing product or design gracefully', () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl=""
      />
    )

    expect(screen.getByText('Select a product and upload a design to generate mockups')).toBeInTheDocument()
  })

  // Requirement 6.2: Test that both front and back views are displayed
  it('displays both front and back mockup views', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
      />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      // Check for canvas elements (now using canvas instead of img)
      const canvases = document.querySelectorAll('canvas')
      expect(canvases.length).toBeGreaterThanOrEqual(2) // At least front and back
    })

    // Check for view labels
    expect(screen.getByText('Front View')).toBeInTheDocument()
    expect(screen.getByText('Back View')).toBeInTheDocument()
    expect(screen.getByText('Primary design placement')).toBeInTheDocument()
    expect(screen.getByText('Secondary design placement')).toBeInTheDocument()
  })

  // Test design state overlay rendering
  it('renders design overlay when design state is provided', async () => {
    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        designState={sampleDesignState}
      />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      const canvases = document.querySelectorAll('canvas')
      expect(canvases.length).toBeGreaterThanOrEqual(2)
    })
  })

  // Test empty design state shows mockup without overlay (Requirement 6.5)
  it('shows mockup without overlay when design state is empty', async () => {
    const emptyDesignState: DesignState = {
      version: '1.0',
      canvasWidth: 400,
      canvasHeight: 400,
      backgroundColor: '#ffffff',
      elements: []
    }

    render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        designState={emptyDesignState}
      />
    )

    jest.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(screen.getByText('Product Mockups')).toBeInTheDocument()
    })

    // Mockups should still be displayed
    expect(screen.getByText('Front View')).toBeInTheDocument()
    expect(screen.getByText('Back View')).toBeInTheDocument()
  })

  // Test color-specific mockup updates (Requirement 6.3)
  it('updates mockups when selected color changes', async () => {
    const { rerender } = render(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        selectedColor="red"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    jest.advanceTimersByTime(2000)
    await waitFor(() => {
      expect(mockOnMockupGenerated).toHaveBeenCalledTimes(1)
    })

    // Change color
    rerender(
      <MockupPreview 
        productUid="test-product-uid"
        designUrl="https://example.com/design.png"
        selectedColor="blue"
        onMockupGenerated={mockOnMockupGenerated}
      />
    )

    // Should trigger regeneration
    expect(screen.getByText('Generating mockups...')).toBeInTheDocument()
  })
})
