import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CartItem from '@/components/storefront/CartItem'
import CartSummary from '@/components/storefront/CartSummary'
import EmptyCart from '@/components/storefront/EmptyCart'
import { CartItem as CartItemType } from '@/types/cart'

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

describe('CartItem', () => {
  const mockItem: CartItemType = {
    id: '1',
    productId: 'prod-1',
    productName: 'Test T-Shirt',
    size: 'M',
    color: 'Blue',
    quantity: 2,
    price: 29.99,
    imageUrl: '/test-image.jpg',
  }

  it('should display product details correctly', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    expect(screen.getByText('Test T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('Size: M')).toBeInTheDocument()
    expect(screen.getByText('Color: Blue')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('$59.98')).toBeInTheDocument() // 2 * 29.99
  })

  it('should display product image', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const image = screen.getByAltText('Test T-Shirt')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/test-image.jpg')
  })

  it('should handle quantity update via input', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const quantityInput = screen.getByRole('spinbutton')
    fireEvent.change(quantityInput, { target: { value: '3' } })

    expect(onUpdateQuantity).toHaveBeenCalledWith(3)
  })

  it('should increment quantity when + button is clicked', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const incrementButton = screen.getByLabelText('Increase quantity')
    fireEvent.click(incrementButton)

    expect(onUpdateQuantity).toHaveBeenCalledWith(3)
  })

  it('should decrement quantity when - button is clicked', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const decrementButton = screen.getByLabelText('Decrease quantity')
    fireEvent.click(decrementButton)

    expect(onUpdateQuantity).toHaveBeenCalledWith(1)
  })

  it('should not decrement quantity below 1', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()
    const itemWithQuantity1 = { ...mockItem, quantity: 1 }

    render(
      <CartItem
        item={itemWithQuantity1}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const decrementButton = screen.getByLabelText('Decrease quantity')
    fireEvent.click(decrementButton)

    expect(onUpdateQuantity).not.toHaveBeenCalled()
  })

  it('should call onRemove when remove button is clicked', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const removeButton = screen.getByText('Remove')
    fireEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalled()
  })

  it('should not call onUpdateQuantity for invalid quantity input', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()

    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    const quantityInput = screen.getByRole('spinbutton')
    
    // Test zero
    fireEvent.change(quantityInput, { target: { value: '0' } })
    expect(onUpdateQuantity).not.toHaveBeenCalled()

    // Test negative
    fireEvent.change(quantityInput, { target: { value: '-1' } })
    expect(onUpdateQuantity).not.toHaveBeenCalled()
  })

  it('should calculate and display item total correctly', () => {
    const onUpdateQuantity = jest.fn()
    const onRemove = jest.fn()
    const itemWithHighQuantity = { ...mockItem, quantity: 5, price: 25.00 }

    render(
      <CartItem
        item={itemWithHighQuantity}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    )

    expect(screen.getByText('$125.00')).toBeInTheDocument() // 5 * 25.00
  })
})

describe('CartSummary', () => {
  it('should display subtotal, shipping, and total', () => {
    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
      />
    )

    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('Shipping')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('$110.00')).toBeInTheDocument()
  })

  it('should show "Calculated at checkout" when shipping is 0', () => {
    render(
      <CartSummary
        subtotal={100.00}
        shipping={0}
        total={100.00}
      />
    )

    expect(screen.getByText('Calculated at checkout')).toBeInTheDocument()
  })

  it('should render checkout button when onCheckout is provided', () => {
    const onCheckout = jest.fn()

    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
        onCheckout={onCheckout}
      />
    )

    const checkoutButton = screen.getByText('Proceed to Checkout')
    expect(checkoutButton).toBeInTheDocument()
  })

  it('should not render checkout button when onCheckout is not provided', () => {
    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
      />
    )

    const checkoutButton = screen.queryByText('Proceed to Checkout')
    expect(checkoutButton).not.toBeInTheDocument()
  })

  it('should call onCheckout when checkout button is clicked', () => {
    const onCheckout = jest.fn()

    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
        onCheckout={onCheckout}
      />
    )

    const checkoutButton = screen.getByText('Proceed to Checkout')
    fireEvent.click(checkoutButton)

    expect(onCheckout).toHaveBeenCalled()
  })

  it('should show loading state on checkout button', () => {
    const onCheckout = jest.fn()

    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
        onCheckout={onCheckout}
        loading={true}
      />
    )

    expect(screen.getByText('LOADING...')).toBeInTheDocument()
  })

  it('should disable checkout button when loading', () => {
    const onCheckout = jest.fn()

    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
        onCheckout={onCheckout}
        loading={true}
      />
    )

    const checkoutButton = screen.getByRole('button')
    expect(checkoutButton).toBeDisabled()
  })

  it('should display tax information', () => {
    render(
      <CartSummary
        subtotal={100.00}
        shipping={10.00}
        total={110.00}
      />
    )

    expect(screen.getByText('Taxes calculated at checkout')).toBeInTheDocument()
  })

  it('should format currency correctly', () => {
    render(
      <CartSummary
        subtotal={1234.56}
        shipping={78.90}
        total={1313.46}
      />
    )

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    expect(screen.getByText('$78.90')).toBeInTheDocument()
    expect(screen.getByText('$1,313.46')).toBeInTheDocument()
  })
})

describe('EmptyCart', () => {
  it('should display empty cart message', () => {
    render(<EmptyCart />)

    expect(screen.getByText('Your Cart is Empty')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Looks like you haven't added anything to your cart yet/
      )
    ).toBeInTheDocument()
  })

  it('should display shopping cart icon', () => {
    const { container } = render(<EmptyCart />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should render continue shopping button', () => {
    render(<EmptyCart />)

    const button = screen.getByText('Continue Shopping')
    expect(button).toBeInTheDocument()
  })

  it('should link to products page', () => {
    render(<EmptyCart />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/products')
  })
})
