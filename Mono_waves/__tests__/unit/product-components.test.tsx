import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProductCard } from '@/components/storefront/ProductCard'
import { ProductGrid } from '@/components/storefront/ProductGrid'
import { ProductGallery } from '@/components/storefront/ProductGallery'
import { ProductOptions } from '@/components/storefront/ProductOptions'
import { Product, ProductColor } from '@/types/product'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Test T-Shirt',
    description: 'A comfortable test t-shirt',
    price: 29.99,
    gelatoProductId: 'test-id',
    gelatoProductUid: 'test-uid',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'White', hex: '#FFFFFF', imageUrl: '/white.jpg' },
      { name: 'Black', hex: '#000000', imageUrl: '/black.jpg' },
    ],
    designUrl: '/design.jpg',
    published: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  it('should render product information correctly', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('$30')).toBeInTheDocument()
  })

  it('should display color swatches when multiple colors available', () => {
    render(<ProductCard product={mockProduct} />)

    // ProductCard no longer displays color swatches, just the product image
    // This test is no longer applicable
    expect(screen.getByText('Test T-Shirt')).toBeInTheDocument()
  })

  it('should not show +N indicator for colors (removed from design)', () => {
    const productWithManyColors: Product = {
      ...mockProduct,
      colors: [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Black', hex: '#000000' },
        { name: 'Red', hex: '#FF0000' },
        { name: 'Blue', hex: '#0000FF' },
        { name: 'Green', hex: '#00FF00' },
        { name: 'Yellow', hex: '#FFFF00' },
      ],
    }

    render(<ProductCard product={productWithManyColors} />)
    // ProductCard no longer shows color indicators
    expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument()
  })

  it('should not show quick view button (removed from design)', () => {
    const onQuickView = jest.fn()
    render(<ProductCard product={mockProduct} onQuickView={onQuickView} />)

    const quickViewButton = screen.queryByText('Quick View')
    expect(quickViewButton).not.toBeInTheDocument()
  })

  it('should link to product detail page', () => {
    render(<ProductCard product={mockProduct} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/products/1')
  })
})

describe('ProductGrid', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      description: 'Description 1',
      price: 29.99,
      gelatoProductId: 'test-id-1',
      gelatoProductUid: 'test-uid-1',
      sizes: ['S', 'M'],
      colors: [{ name: 'White', hex: '#FFFFFF' }],
      designUrl: '/design1.jpg',
      published: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Product 2',
      description: 'Description 2',
      price: 39.99,
      gelatoProductId: 'test-id-2',
      gelatoProductUid: 'test-uid-2',
      sizes: ['M', 'L'],
      colors: [{ name: 'Black', hex: '#000000' }],
      designUrl: '/design2.jpg',
      published: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  it('should render all products in grid', () => {
    render(<ProductGrid products={mockProducts} />)

    expect(screen.getByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Product 2')).toBeInTheDocument()
  })

  it('should show loading skeleton when loading', () => {
    render(<ProductGrid products={[]} loading={true} />)

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should show empty state when no products', () => {
    render(<ProductGrid products={[]} />)

    expect(screen.getByText('No products found')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Try adjusting your filters or check back later for new items.'
      )
    ).toBeInTheDocument()
  })

  it('should render products in responsive grid layout', () => {
    const { container } = render(<ProductGrid products={mockProducts} />)

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-4')
  })
})

describe('ProductGallery', () => {
  const mockImages = ['/image1.jpg', '/image2.jpg', '/image3.jpg']

  it('should render main image', () => {
    render(<ProductGallery images={mockImages} productName="Test Product" />)

    const mainImage = screen.getByAltText('Test Product - View 1')
    expect(mainImage).toBeInTheDocument()
  })

  it('should render thumbnail navigation when multiple images', () => {
    render(<ProductGallery images={mockImages} productName="Test Product" />)

    const thumbnails = screen.getAllByRole('button').filter((btn) =>
      btn.querySelector('img')
    )
    expect(thumbnails).toHaveLength(3)
  })

  it('should change main image when thumbnail is clicked', () => {
    render(<ProductGallery images={mockImages} productName="Test Product" />)

    const thumbnails = screen.getAllByRole('button').filter((btn) =>
      btn.querySelector('img')
    )

    fireEvent.click(thumbnails[1])

    const mainImage = screen.getByAltText('Test Product - View 2')
    expect(mainImage).toBeInTheDocument()
  })

  it('should show navigation arrows on mobile', () => {
    render(<ProductGallery images={mockImages} productName="Test Product" />)

    const prevButton = screen.getByLabelText('Previous image')
    const nextButton = screen.getByLabelText('Next image')

    expect(prevButton).toBeInTheDocument()
    expect(nextButton).toBeInTheDocument()
  })

  it('should cycle through images with navigation arrows', () => {
    render(<ProductGallery images={mockImages} productName="Test Product" />)

    const nextButton = screen.getByLabelText('Next image')

    fireEvent.click(nextButton)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    fireEvent.click(nextButton)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    fireEvent.click(nextButton)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('should show empty state when no images', () => {
    render(<ProductGallery images={[]} productName="Test Product" />)

    expect(screen.getByText('No image available')).toBeInTheDocument()
  })

  it('should not show thumbnails when only one image', () => {
    render(
      <ProductGallery images={['/image1.jpg']} productName="Test Product" />
    )

    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })
})

describe('ProductOptions', () => {
  const mockSizes = ['S', 'M', 'L', 'XL']
  const mockColors: ProductColor[] = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#FF0000' },
  ]

  it('should render size options', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    mockSizes.forEach((size) => {
      expect(screen.getByText(size)).toBeInTheDocument()
    })
  })

  it('should render color options', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    mockColors.forEach((color) => {
      const colorButton = screen.getByTitle(color.name)
      expect(colorButton).toBeInTheDocument()
    })
  })

  it('should call onSizeChange when size is selected', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    const sizeButton = screen.getByText('M')
    fireEvent.click(sizeButton)

    expect(onSizeChange).toHaveBeenCalledWith('M')
  })

  it('should call onColorChange when color is selected', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    const colorButton = screen.getByTitle('Black')
    fireEvent.click(colorButton)

    expect(onColorChange).toHaveBeenCalledWith('Black')
  })

  it('should highlight selected size', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize="M"
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    const sizeButton = screen.getByText('M')
    expect(sizeButton).toHaveClass('bg-black')
    expect(sizeButton).toHaveClass('text-white')
  })

  it('should highlight selected color', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor="Black"
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    const colorButton = screen.getByTitle('Black')
    const colorDiv = colorButton.querySelector('div')
    expect(colorDiv).toHaveClass('ring-2')
    expect(colorDiv).toHaveClass('ring-black')
  })

  it('should not show selected size label (removed from design)', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize="L"
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    expect(screen.queryByText('Selected: L')).not.toBeInTheDocument()
  })

  it('should display selected color name', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor="Red"
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    expect(screen.getByText('Red')).toBeInTheDocument()
  })

  it('should render quantity input', () => {
    const onSizeChange = jest.fn()
    const onColorChange = jest.fn()

    render(
      <ProductOptions
        sizes={mockSizes}
        colors={mockColors}
        selectedSize=""
        selectedColor=""
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
      />
    )

    const quantityInput = screen.getByRole('spinbutton')
    expect(quantityInput).toBeInTheDocument()
    expect(quantityInput).toHaveAttribute('type', 'number')
    expect(quantityInput).toHaveAttribute('min', '1')
  })
})
