import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, jest } from '@jest/globals'
import InventoryForm from '@/components/admin/InventoryForm'

describe('InventoryForm Component', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('should render form title and icon', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Inventory Entry')).toBeInTheDocument()
    // Package icon should be present (mocked in test setup)
  })

  it('should render all form fields', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText('Product Name')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument()
    expect(screen.getByLabelText('Price')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByRole('button', { name: 'ADD PRODUCT' })).toBeInTheDocument()
  })

  it('should have correct input types and attributes', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    const productNameInput = screen.getByLabelText('Product Name')
    expect(productNameInput).toHaveAttribute('type', 'text')
    expect(productNameInput).toHaveAttribute('placeholder', 'Enter product name')
    
    const skuInput = screen.getByLabelText('SKU')
    expect(skuInput).toHaveAttribute('type', 'text')
    expect(skuInput).toHaveAttribute('placeholder', 'Enter SKU')
    
    const quantityInput = screen.getByLabelText('Quantity')
    expect(quantityInput).toHaveAttribute('type', 'number')
    expect(quantityInput).toHaveAttribute('placeholder', '0')
    
    const priceInput = screen.getByLabelText('Price')
    expect(priceInput).toHaveAttribute('type', 'number')
    expect(priceInput).toHaveAttribute('step', '0.01')
    expect(priceInput).toHaveAttribute('placeholder', '0.00')
  })

  it('should render category options', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    const categorySelect = screen.getByLabelText('Category')
    expect(categorySelect).toBeInTheDocument()
    
    // Check default option
    expect(screen.getByText('Select category')).toBeInTheDocument()
    
    // Check category options
    expect(screen.getByText('T-Shirts')).toBeInTheDocument()
    expect(screen.getByText('Hoodies')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
  })

  it('should update form fields when user types', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    const productNameInput = screen.getByLabelText('Product Name')
    const skuInput = screen.getByLabelText('SKU')
    const quantityInput = screen.getByLabelText('Quantity')
    const priceInput = screen.getByLabelText('Price')
    
    await user.type(productNameInput, 'Test T-Shirt')
    await user.type(skuInput, 'TST-001')
    await user.type(quantityInput, '100')
    await user.type(priceInput, '29.99')
    
    expect(productNameInput).toHaveValue('Test T-Shirt')
    expect(skuInput).toHaveValue('TST-001')
    expect(quantityInput).toHaveValue(100)
    expect(priceInput).toHaveValue(29.99)
  })

  it('should update category when selected', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    const categorySelect = screen.getByLabelText('Category')
    
    await user.selectOptions(categorySelect, 't-shirts')
    
    expect(categorySelect).toHaveValue('t-shirts')
  })

  it('should call onSubmit with form data when submitted', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    // Fill out form
    await user.type(screen.getByLabelText('Product Name'), 'Test Product')
    await user.type(screen.getByLabelText('SKU'), 'TEST-001')
    await user.type(screen.getByLabelText('Quantity'), '50')
    await user.type(screen.getByLabelText('Price'), '19.99')
    await user.selectOptions(screen.getByLabelText('Category'), 't-shirts')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Test Product',
        sku: 'TEST-001',
        quantity: '50',
        price: '19.99',
        category: 't-shirts'
      })
    })
  })

  it('should handle form submission without onSubmit prop', async () => {
    const user = userEvent.setup()
    render(<InventoryForm />)
    
    // Should not throw error when onSubmit is not provided
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    // No assertions needed, just ensuring no error is thrown
  })

  it('should apply custom className', () => {
    render(<InventoryForm onSubmit={mockOnSubmit} className="custom-form-class" />)
    
    // Find the root container div
    const container = screen.getByText('Inventory Entry').closest('div')?.parentElement
    expect(container).toHaveClass('custom-form-class')
  })

  it('should handle empty form submission', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: '',
        sku: '',
        quantity: '',
        price: '',
        category: ''
      })
    })
  })

  it('should handle partial form data', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    // Fill only some fields
    await user.type(screen.getByLabelText('Product Name'), 'Partial Product')
    await user.type(screen.getByLabelText('Price'), '15.5')
    
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Partial Product',
        sku: '',
        quantity: '',
        price: '15.5', // Note: number input returns string without trailing zero
        category: ''
      })
    })
  })

  it('should handle special characters in input fields', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText('Product Name'), 'Special & Product "Name"')
    await user.type(screen.getByLabelText('SKU'), 'SKU-123/ABC')
    
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: 'Special & Product "Name"',
        sku: 'SKU-123/ABC',
        quantity: '',
        price: '',
        category: ''
      })
    })
  })

  it('should handle numeric edge cases', async () => {
    const user = userEvent.setup()
    render(<InventoryForm onSubmit={mockOnSubmit} />)
    
    // Test decimal prices and large quantities
    await user.type(screen.getByLabelText('Quantity'), '999999')
    await user.type(screen.getByLabelText('Price'), '0.01')
    
    await user.click(screen.getByRole('button', { name: 'ADD PRODUCT' }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        productName: '',
        sku: '',
        quantity: '999999',
        price: '0.01',
        category: ''
      })
    })
  })
})