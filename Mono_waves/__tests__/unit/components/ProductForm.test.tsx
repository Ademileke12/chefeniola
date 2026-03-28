import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductForm from '@/components/admin/ProductForm'
import { GelatoProduct } from '@/types/product'

// Mock child components
jest.mock('@/components/admin/DesignUploader', () => {
  return function MockDesignUploader() {
    return <div data-testid="design-uploader">Design Uploader</div>
  }
})

jest.mock('@/components/admin/DesignEditorCanvas', () => {
  return function MockDesignEditorCanvas() {
    return <div data-testid="design-editor-canvas">Design Editor Canvas</div>
  }
})

jest.mock('@/components/admin/MockupPreview', () => {
  return function MockMockupPreview() {
    return <div data-testid="mockup-preview">Mockup Preview</div>
  }
})

describe('ProductForm - Mode Selection', () => {
  const mockGelatoProducts: GelatoProduct[] = [
    {
      uid: 'gelato-1',
      title: 'T-Shirt',
      description: 'Basic T-Shirt',
      availableSizes: ['S', 'M', 'L'],
      availableColors: [
        { name: 'White', code: '#FFFFFF' },
        { name: 'Black', code: '#000000' }
      ],
      basePrice: 15.99
    }
  ]

  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Test that both modes are selectable (Requirement 9.2)
  it('should allow selecting Design Editor mode', async () => {
    const user = userEvent.setup()

    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Find and click the Design Editor button
    const editorButton = screen.getByRole('button', { name: /Design Editor/i })
    await user.click(editorButton)

    // Verify the button is now active (has the active styling class)
    expect(editorButton).toHaveClass('bg-gray-900', 'text-white')
  })

  it('should allow selecting Upload File mode', async () => {
    const user = userEvent.setup()

    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Upload mode should be selected by default
    const uploadButton = screen.getByRole('button', { name: /Upload File/i })
    expect(uploadButton).toHaveClass('bg-gray-900', 'text-white')
  })

  it('should switch between modes when buttons are clicked', async () => {
    const user = userEvent.setup()

    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const editorButton = screen.getByRole('button', { name: /Design Editor/i })
    const uploadButton = screen.getByRole('button', { name: /Upload File/i })

    // Initially, upload mode should be active
    expect(uploadButton).toHaveClass('bg-gray-900', 'text-white')
    expect(editorButton).not.toHaveClass('bg-gray-900', 'text-white')

    // Click Design Editor button
    await user.click(editorButton)

    // Now editor mode should be active
    expect(editorButton).toHaveClass('bg-gray-900', 'text-white')
    expect(uploadButton).not.toHaveClass('bg-gray-900', 'text-white')

    // Click Upload File button
    await user.click(uploadButton)

    // Now upload mode should be active again
    expect(uploadButton).toHaveClass('bg-gray-900', 'text-white')
    expect(editorButton).not.toHaveClass('bg-gray-900', 'text-white')
  })

  it('should render DesignUploader when Upload File mode is selected', () => {
    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Upload mode is default, so DesignUploader should be rendered
    expect(screen.getByTestId('design-uploader')).toBeInTheDocument()
    expect(screen.queryByTestId('design-editor-canvas')).not.toBeInTheDocument()
  })

  it('should render DesignEditorCanvas when Design Editor mode is selected and product is chosen', async () => {
    const user = userEvent.setup()

    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Select a Gelato product first
    const productSelect = screen.getByLabelText(/Gelato Product/i)
    await user.selectOptions(productSelect, 'gelato-1')

    // Switch to Design Editor mode
    const editorButton = screen.getByRole('button', { name: /Design Editor/i })
    await user.click(editorButton)

    // Now DesignEditorCanvas should be rendered
    expect(screen.getByTestId('design-editor-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('design-uploader')).not.toBeInTheDocument()
  })

  it('should show message when Design Editor mode is selected but no product is chosen', async () => {
    const user = userEvent.setup()

    render(
      <ProductForm
        gelatoProducts={mockGelatoProducts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Switch to Design Editor mode without selecting a product
    const editorButton = screen.getByRole('button', { name: /Design Editor/i })
    await user.click(editorButton)

    // Should show instructional message
    expect(screen.getByText(/Please select a Gelato product first/i)).toBeInTheDocument()
    expect(screen.queryByTestId('design-editor-canvas')).not.toBeInTheDocument()
  })
})
