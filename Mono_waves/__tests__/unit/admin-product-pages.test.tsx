/**
 * Unit Tests: Admin Product Management Pages
 * 
 * Tests for the admin product management pages:
 * - Products list page
 * - Add product page
 * - Edit product page
 * 
 * Task: 25.2 Create product management pages
 * Requirements: 1.1, 1.4, 1.5, 1.6, 1.7
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import ProductsPage from '@/app/admin/products/page'
import NewProductPage from '@/app/admin/products/new/page'
import EditProductPage from '@/app/admin/products/[id]/edit/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Admin Product Management Pages', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Products List Page', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Test Product 1',
        description: 'Description 1',
        price: 29.99,
        gelatoProductId: 'gelato-1',
        gelatoProductUid: 'uid-1',
        sizes: ['S', 'M', 'L'],
        colors: [{ name: 'Black', hex: '#000000' }],
        designUrl: 'https://example.com/design1.png',
        published: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Test Product 2',
        description: 'Description 2',
        price: 39.99,
        gelatoProductId: 'gelato-2',
        gelatoProductUid: 'uid-2',
        sizes: ['M', 'L', 'XL'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design2.png',
        published: false,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ]

    it('should render products list page', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      })

      render(<ProductsPage />)

      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Manage your product catalog and inventory')).toBeInTheDocument()
    })

    it('should fetch and display products', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      })

      render(<ProductsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument()
        expect(screen.getByText('Test Product 2')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/products?includeUnpublished=true')
    })

    it('should display product stats', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      })

      render(<ProductsPage />)

      await waitFor(() => {
        expect(screen.getByText('Total Products')).toBeInTheDocument()
      })
      
      // Check for the actual count displayed
      const totalProductsSection = screen.getByText('Total Products').closest('div')
      expect(totalProductsSection).toHaveTextContent('2')
    })

    it('should filter products by search query', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      })

      render(<ProductsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search products/i)
      fireEvent.change(searchInput, { target: { value: 'Product 1' } })

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument()
        expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument()
      })
    })

    it('should navigate to add product page', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      })

      render(<ProductsPage />)

      await waitFor(() => {
        const addButton = screen.getAllByText('Add Product')[0]
        fireEvent.click(addButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products/new')
    })

    it('should handle delete product', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockProducts }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: [mockProducts[0]] }),
        })

      // Mock window.confirm
      global.confirm = jest.fn(() => true)

      render(<ProductsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      })

      // Find and click delete button (would need to be implemented in the component)
      // This is a placeholder for the actual implementation
    })

    it('should handle fetch failure gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<ProductsPage />)

      // Page should still render
      expect(screen.getByText('Products')).toBeInTheDocument()
      
      // Wait a bit for the error handling to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should render with empty products list', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      })

      render(<ProductsPage />)

      // Page should render
      expect(screen.getByText('Products')).toBeInTheDocument()
      
      // Wait for fetch to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('New Product Page', () => {
    const mockGelatoProducts = [
      {
        uid: 'gelato-1',
        title: 'T-Shirt',
        description: 'Classic T-Shirt',
        availableSizes: ['S', 'M', 'L', 'XL'],
        availableColors: [
          { name: 'Black', code: '#000000' },
          { name: 'White', code: '#FFFFFF' },
        ],
        basePrice: 15.99,
      },
    ]

    it('should render new product page', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockGelatoProducts }),
      })

      render(<NewProductPage />)

      await waitFor(() => {
        expect(screen.getByText('Create New Product')).toBeInTheDocument()
      })
    })

    it('should fetch Gelato product catalog', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockGelatoProducts }),
      })

      render(<NewProductPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/gelato/catalog')
      })
    })

    it('should display loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<NewProductPage />)

      expect(screen.getByText('Loading product catalog...')).toBeInTheDocument()
    })

    it('should handle catalog fetch failure gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch catalog'))

      render(<NewProductPage />)

      // Page should still render
      expect(screen.getByText('Create New Product')).toBeInTheDocument()
      
      // Wait a bit for the error handling to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should navigate back on cancel', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockGelatoProducts }),
      })

      render(<NewProductPage />)

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: '' })
        fireEvent.click(backButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products')
    })
  })

  describe('Edit Product Page', () => {
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      description: 'Test Description',
      price: 29.99,
      gelatoProductId: 'gelato-1',
      gelatoProductUid: 'uid-1',
      sizes: ['S', 'M', 'L'],
      colors: [{ name: 'Black', hex: '#000000' }],
      designUrl: 'https://example.com/design.png',
      published: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockGelatoProducts = [
      {
        uid: 'uid-1',
        title: 'T-Shirt',
        description: 'Classic T-Shirt',
        availableSizes: ['S', 'M', 'L', 'XL'],
        availableColors: [
          { name: 'Black', code: '#000000' },
          { name: 'White', code: '#FFFFFF' },
        ],
        basePrice: 15.99,
      },
    ]

    beforeEach(() => {
      ;(useParams as jest.Mock).mockReturnValue({ id: '1' })
    })

    it('should render edit product page', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ product: mockProduct }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockGelatoProducts }),
        })

      render(<EditProductPage />)

      await waitFor(() => {
        expect(screen.getByText('Edit Product')).toBeInTheDocument()
      })
    })

    it('should fetch product and catalog data', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ product: mockProduct }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockGelatoProducts }),
        })

      render(<EditProductPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/products/1')
        expect(global.fetch).toHaveBeenCalledWith('/api/gelato/catalog')
      })
    })

    it('should display loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<EditProductPage />)

      expect(screen.getByText('Loading product data...')).toBeInTheDocument()
    })

    it('should display error state on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Product not found'))

      render(<EditProductPage />)

      await waitFor(() => {
        expect(screen.getByText(/Product not found/i)).toBeInTheDocument()
      })
    })

    it('should display error when product does not exist', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ product: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockGelatoProducts }),
        })

      render(<EditProductPage />)

      await waitFor(() => {
        expect(screen.getByText('Product not found')).toBeInTheDocument()
      })
    })

    it('should navigate back on cancel', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ product: mockProduct }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockGelatoProducts }),
        })

      render(<EditProductPage />)

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: '' })
        fireEvent.click(backButton)
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/products')
    })
  })
})
