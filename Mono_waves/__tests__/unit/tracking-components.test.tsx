import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TrackOrderForm from '@/components/storefront/TrackOrderForm'
import OrderStatus from '@/components/storefront/OrderStatus'
import TrackingInfo from '@/components/storefront/TrackingInfo'
import { Order, OrderStatus as OrderStatusType } from '@/types/order'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe('TrackOrderForm', () => {
  it('should render email and order ID inputs', () => {
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/order id/i)).toBeInTheDocument()
  })

  it('should render track order button', () => {
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    expect(screen.getByRole('button', { name: /track order/i })).toBeInTheDocument()
  })

  it('should display help text', () => {
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    expect(
      screen.getByText(/you can find your order id in your confirmation email/i)
    ).toBeInTheDocument()
  })

  it('should handle form submission with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const orderIdInput = screen.getByLabelText(/order id/i)
    const submitButton = screen.getByRole('button', { name: /track order/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(orderIdInput, 'MW-2024-001')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'MW-2024-001')
    })
  })

  it('should show validation error for empty email', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const orderIdInput = screen.getByLabelText(/order id/i)
    const form = document.querySelector('form')!

    await user.type(orderIdInput, 'MW-2024-001')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const orderIdInput = screen.getByLabelText(/order id/i)
    const form = document.querySelector('form')!

    await user.type(emailInput, 'invalid-email')
    await user.type(orderIdInput, 'MW-2024-001')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should show validation error for empty order ID', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const form = document.querySelector('form')!

    await user.type(emailInput, 'test@example.com')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/order id is required/i)).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should display error message when order not found', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn().mockRejectedValue(new Error('Order not found'))
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const orderIdInput = screen.getByLabelText(/order id/i)
    const submitButton = screen.getByRole('button', { name: /track order/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(orderIdInput, 'INVALID-ID')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Order Not Found')).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const orderIdInput = screen.getByLabelText(/order id/i)
    const submitButton = screen.getByRole('button', { name: /track order/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(orderIdInput, 'MW-2024-001')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('LOADING...')).toBeInTheDocument()
    })
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('should clear field error when user starts typing', async () => {
    const onSubmit = jest.fn()
    render(<TrackOrderForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const form = document.querySelector('form')!

    // Trigger validation error
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    // Start typing
    fireEvent.change(emailInput, { target: { value: 't' } })

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })
  })
})

describe('OrderStatus', () => {
  const createMockOrder = (status: OrderStatusType): Order => ({
    id: '1',
    orderNumber: 'MW-2024-001',
    customerEmail: '[email protected]',
    customerName: 'John Doe',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      country: 'USA',
      phone: '555-0100',
    },
    items: [],
    subtotal: 100,
    shippingCost: 10,
    total: 110,
    stripePaymentId: 'pi_123',
    status,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  })

  it('should display order status header', () => {
    const order = createMockOrder('payment_confirmed')
    render(<OrderStatus order={order} />)

    expect(screen.getByText(/order status/i)).toBeInTheDocument()
  })

  it('should display status badge', () => {
    const order = createMockOrder('shipped')
    const { container } = render(<OrderStatus order={order} />)

    // Check for the badge specifically (not the step label)
    const badge = container.querySelector('.bg-blue-100.text-blue-800')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('shipped')
  })

  it('should display all status steps for normal order', () => {
    const order = createMockOrder('printing')
    render(<OrderStatus order={order} />)

    // Use getAllByText to handle multiple matches
    expect(screen.getAllByText(/order confirmed/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/processing/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/printing/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/shipped/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/delivered/i).length).toBeGreaterThan(0)
  })

  it('should mark completed steps with checkmark', () => {
    const order = createMockOrder('printing')
    const { container } = render(<OrderStatus order={order} />)

    // Should have checkmarks for completed steps
    const checkmarks = container.querySelectorAll('svg path[d*="M5 13l4 4L19 7"]')
    expect(checkmarks.length).toBeGreaterThan(0)
  })

  it('should highlight current status', () => {
    const order = createMockOrder('printing')
    render(<OrderStatus order={order} />)

    expect(screen.getByText(/current status/i)).toBeInTheDocument()
  })

  it('should display cancelled status message', () => {
    const order = createMockOrder('cancelled')
    render(<OrderStatus order={order} />)

    expect(screen.getByText(/this order has been cancelled/i)).toBeInTheDocument()
  })

  it('should display failed status message', () => {
    const order = createMockOrder('failed')
    render(<OrderStatus order={order} />)

    expect(
      screen.getByText(/there was an issue processing this order/i)
    ).toBeInTheDocument()
  })

  it('should display pending status message', () => {
    const order = createMockOrder('pending')
    render(<OrderStatus order={order} />)

    expect(
      screen.getByText(/your order is pending payment confirmation/i)
    ).toBeInTheDocument()
  })

  it('should display delivered status correctly', () => {
    const order = createMockOrder('delivered')
    const { container } = render(<OrderStatus order={order} />)

    // Check for the badge specifically
    const badge = container.querySelector('.bg-green-100.text-green-800')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('delivered')
  })
})

describe('TrackingInfo', () => {
  const createMockOrder = (
    trackingNumber?: string,
    carrier?: string
  ): Order => ({
    id: '1',
    orderNumber: 'MW-2024-001',
    customerEmail: '[email protected]',
    customerName: 'John Doe',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      country: 'USA',
      phone: '555-0100',
    },
    items: [],
    subtotal: 100,
    shippingCost: 10,
    total: 110,
    stripePaymentId: 'pi_123',
    status: 'shipped',
    trackingNumber,
    carrier,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  })

  it('should display tracking information header', () => {
    const order = createMockOrder('1Z999AA10123456784', 'UPS')
    render(<TrackingInfo order={order} />)

    expect(screen.getByText(/tracking information/i)).toBeInTheDocument()
  })

  it('should display carrier name', () => {
    const order = createMockOrder('1Z999AA10123456784', 'UPS')
    render(<TrackingInfo order={order} />)

    expect(screen.getByText('Carrier')).toBeInTheDocument()
    expect(screen.getByText('UPS')).toBeInTheDocument()
  })

  it('should display tracking number', () => {
    const order = createMockOrder('1Z999AA10123456784', 'UPS')
    render(<TrackingInfo order={order} />)

    expect(screen.getByText('Tracking Number')).toBeInTheDocument()
    expect(screen.getByText('1Z999AA10123456784')).toBeInTheDocument()
  })

  it('should display track package button when tracking available', () => {
    const order = createMockOrder('1Z999AA10123456784', 'UPS')
    render(<TrackingInfo order={order} />)

    const trackButton = screen.getByText(/track package/i)
    expect(trackButton).toBeInTheDocument()
    expect(trackButton.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('should generate correct UPS tracking URL', () => {
    const order = createMockOrder('1Z999AA10123456784', 'UPS')
    render(<TrackingInfo order={order} />)

    const trackButton = screen.getByText(/track package/i)
    expect(trackButton.closest('a')).toHaveAttribute(
      'href',
      'https://www.ups.com/track?tracknum=1Z999AA10123456784'
    )
  })

  it('should generate correct FedEx tracking URL', () => {
    const order = createMockOrder('123456789012', 'FedEx')
    render(<TrackingInfo order={order} />)

    const trackButton = screen.getByText(/track package/i)
    expect(trackButton.closest('a')).toHaveAttribute(
      'href',
      'https://www.fedex.com/fedextrack/?trknbr=123456789012'
    )
  })

  it('should generate correct USPS tracking URL', () => {
    const order = createMockOrder('9400111899562537883033', 'USPS')
    render(<TrackingInfo order={order} />)

    const trackButton = screen.getByText(/track package/i)
    expect(trackButton.closest('a')).toHaveAttribute(
      'href',
      'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899562537883033'
    )
  })

  it('should generate correct DHL tracking URL', () => {
    const order = createMockOrder('1234567890', 'DHL')
    render(<TrackingInfo order={order} />)

    const trackButton = screen.getByText(/track package/i)
    expect(trackButton.closest('a')).toHaveAttribute(
      'href',
      'https://www.dhl.com/en/express/tracking.html?AWB=1234567890'
    )
  })

  it('should display message when tracking not available', () => {
    const order = createMockOrder()
    render(<TrackingInfo order={order} />)

    expect(
      screen.getByText(/tracking information will be available once your order has shipped/i)
    ).toBeInTheDocument()
  })

  it('should not display track package button when tracking not available', () => {
    const order = createMockOrder()
    render(<TrackingInfo order={order} />)

    expect(screen.queryByText(/track package/i)).not.toBeInTheDocument()
  })

  it('should handle unknown carrier gracefully', () => {
    const order = createMockOrder('TRACK123', 'Unknown Carrier')
    render(<TrackingInfo order={order} />)

    expect(screen.getByText('Unknown Carrier')).toBeInTheDocument()
    expect(screen.getByText('TRACK123')).toBeInTheDocument()
    // Should not have track package button for unknown carrier
    expect(screen.queryByText(/track package/i)).not.toBeInTheDocument()
  })
})
