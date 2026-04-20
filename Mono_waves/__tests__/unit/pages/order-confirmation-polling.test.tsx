/**
 * Unit tests for Order Confirmation Page Polling Logic
 * 
 * Tests:
 * - Exponential backoff timing
 * - Max retry limit (10 attempts)
 * - Error message display
 * - Cost component rendering
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import OrderConfirmationContent from '@/app/(storefront)/confirmation/OrderConfirmationContent'
import type { Order } from '@/types/order'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Order Confirmation Polling Logic', () => {
  const mockSessionId = 'cs_test_session_123'
  
  const mockOrder: Order = {
    id: 'order-123',
    orderNumber: 'MW-ABC123',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      addressLine2: '',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      country: 'US',
      phone: '+1234567890',
    },
    items: [
      {
        productName: 'Custom T-Shirt',
        gelatoProductUid: 'tshirt-001',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.00,
        designUrl: 'https://example.com/design.png',
      },
    ],
    subtotal: 50.00,
    shippingCost: 10.00,
    tax: 4.50,
    total: 64.50,
    stripePaymentId: 'pi_123',
    stripeSessionId: mockSessionId,
    status: 'payment_confirmed',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Mock useSearchParams to return session ID
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((key: string) => key === 'session_id' ? mockSessionId : null),
    })
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Requirement 4.2: Exponential backoff timing', () => {
    it('should use exponential backoff delays: 500ms, 1s, 2s, 4s, then capped at 8s', async () => {
      let callCount = 0

      // Mock fetch to fail initially, then succeed
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        
        if (callCount < 6) {
          // First 5 attempts fail
          return Promise.resolve({
            ok: false,
            status: 404,
          })
        }
        
        // 6th attempt succeeds
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ order: mockOrder }),
        })
      })

      render(<OrderConfirmationContent />)

      // Initial render - first fetch happens immediately
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Advance by 500ms and run pending promises - second attempt
      await act(async () => {
        jest.advanceTimersByTime(500)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(2)

      // Advance by 1000ms - third attempt
      await act(async () => {
        jest.advanceTimersByTime(1000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(3)

      // Advance by 2000ms - fourth attempt
      await act(async () => {
        jest.advanceTimersByTime(2000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(4)

      // Advance by 4000ms - fifth attempt
      await act(async () => {
        jest.advanceTimersByTime(4000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(5)

      // Advance by 8000ms - sixth attempt (should succeed)
      await act(async () => {
        jest.advanceTimersByTime(8000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(6)

      // Verify order is displayed
      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })
    })

    it('should cap delays at 8000ms for attempts 5-10', async () => {
      let callCount = 0

      // Mock fetch to always fail
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: false,
          status: 404,
        })
      })

      render(<OrderConfirmationContent />)

      // First attempt
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Attempts 2-5 with increasing delays
      await act(async () => {
        jest.advanceTimersByTime(500)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(2)

      await act(async () => {
        jest.advanceTimersByTime(1000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(3)

      await act(async () => {
        jest.advanceTimersByTime(2000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(4)

      await act(async () => {
        jest.advanceTimersByTime(4000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(5)

      // Attempts 6-10 should all use 8000ms delay
      for (let i = 6; i <= 10; i++) {
        await act(async () => {
          jest.advanceTimersByTime(8000)
          await Promise.resolve()
        })
        expect(global.fetch).toHaveBeenCalledTimes(i)
      }

      // Verify error message is shown after max attempts
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 4.3: Max retry limit (10 attempts)', () => {
    it('should stop polling after 10 attempts', async () => {
      // Mock fetch to always fail
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderConfirmationContent />)

      // First attempt
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Advance through all retry delays
      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (let i = 0; i < delays.length; i++) {
        await act(async () => {
          jest.advanceTimersByTime(delays[i])
          await Promise.resolve()
        })
        expect(global.fetch).toHaveBeenCalledTimes(i + 2)
      }

      // Verify exactly 10 attempts were made
      expect(global.fetch).toHaveBeenCalledTimes(10)

      // Advance more time to ensure no additional attempts
      await act(async () => {
        jest.advanceTimersByTime(10000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(10)
    })

    it('should stop polling immediately when order is found', async () => {
      // Mock fetch to succeed on 3rd attempt
      let callCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 404,
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ order: mockOrder }),
        })
      })

      render(<OrderConfirmationContent />)

      // First attempt
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Second attempt after 500ms
      await act(async () => {
        jest.advanceTimersByTime(500)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(2)

      // Third attempt after 1000ms - should succeed
      await act(async () => {
        jest.advanceTimersByTime(1000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(3)

      // Verify order is displayed
      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Advance more time to ensure no additional attempts
      await act(async () => {
        jest.advanceTimersByTime(10000)
        await Promise.resolve()
      })
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should stop polling after max attempts even with network errors', async () => {
      // Mock fetch to throw errors
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<OrderConfirmationContent />)

      // First attempt
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Advance through all retry delays
      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (let i = 0; i < delays.length; i++) {
        await act(async () => {
          jest.advanceTimersByTime(delays[i])
          await Promise.resolve()
        })
        expect(global.fetch).toHaveBeenCalledTimes(i + 2)
      }

      // Verify exactly 10 attempts were made
      expect(global.fetch).toHaveBeenCalledTimes(10)

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 4.4: Error message display', () => {
    it('should display helpful error message when order not found after retries', async () => {
      // Mock fetch to always return 404
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderConfirmationContent />)

      // Advance through all attempts
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (const delay of delays) {
        await act(async () => {
          jest.advanceTimersByTime(delay)
          await Promise.resolve()
        })
      }

      // Verify error message with support contact
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText(/Your payment was successful/i)).toBeInTheDocument()
      expect(screen.getByText(/support@monowaves\.com/i)).toBeInTheDocument()
    })

    it('should display error message for network failures', async () => {
      // Mock fetch to throw network error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<OrderConfirmationContent />)

      // Advance through all attempts
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (const delay of delays) {
        await act(async () => {
          jest.advanceTimersByTime(delay)
          await Promise.resolve()
        })
      }

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText(/support@monowaves\.com/i)).toBeInTheDocument()
    })

    it('should display error when no session ID is provided', async () => {
      // Mock useSearchParams to return null session ID
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn(() => null),
      })

      render(<OrderConfirmationContent />)

      // Verify error message is shown immediately
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
        expect(screen.getByText(/No session ID provided/i)).toBeInTheDocument()
      })

      // Verify no fetch attempts were made
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should include support email in error message', async () => {
      // Mock fetch to always fail
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderConfirmationContent />)

      // Advance through all attempts
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (const delay of delays) {
        await act(async () => {
          jest.advanceTimersByTime(delay)
          await Promise.resolve()
        })
      }

      // Verify support email is present
      await waitFor(() => {
        const supportEmail = screen.getByText(/support@monowaves\.com/i)
        expect(supportEmail).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 4.5: Cost component rendering', () => {
    it('should display all cost components: subtotal, shipping, tax, total', async () => {
      // Mock successful fetch
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: mockOrder }),
      })

      render(<OrderConfirmationContent />)

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Verify all cost components are displayed
      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getAllByText('$50.00')[1]).toBeInTheDocument() // subtotal in summary (not in items)

      expect(screen.getByText('Shipping')).toBeInTheDocument()
      expect(screen.getByText('$10.00')).toBeInTheDocument() // shipping

      expect(screen.getByText('Tax')).toBeInTheDocument()
      expect(screen.getByText('$4.50')).toBeInTheDocument() // tax

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('$64.50')).toBeInTheDocument() // total
    })

    it('should display cost components with correct formatting', async () => {
      const orderWithDecimalCosts: Order = {
        ...mockOrder,
        subtotal: 123.45,
        shippingCost: 12.99,
        tax: 10.87,
        total: 147.31,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: orderWithDecimalCosts }),
      })

      render(<OrderConfirmationContent />)

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Verify formatted costs
      expect(screen.getByText('$123.45')).toBeInTheDocument()
      expect(screen.getByText('$12.99')).toBeInTheDocument()
      expect(screen.getByText('$10.87')).toBeInTheDocument()
      expect(screen.getByText('$147.31')).toBeInTheDocument()
    })

    it('should display zero values correctly', async () => {
      const orderWithZeroTax: Order = {
        ...mockOrder,
        tax: 0,
        total: 60.00,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: orderWithZeroTax }),
      })

      render(<OrderConfirmationContent />)

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Verify zero tax is displayed
      expect(screen.getByText('Tax')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })

    it('should display cost breakdown in Order Summary section', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: mockOrder }),
      })

      render(<OrderConfirmationContent />)

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Verify Order Summary section exists
      expect(screen.getByText('Order Summary')).toBeInTheDocument()

      // Verify all components are in the summary
      const summary = screen.getByText('Order Summary').closest('div')
      expect(summary).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading spinner while polling', async () => {
      // Mock fetch to delay response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: false,
              status: 404,
            })
          }, 100)
        })
      )

      render(<OrderConfirmationContent />)

      // Verify loading state is shown
      expect(screen.getByText('Loading your order...')).toBeInTheDocument()
      
      // Advance timers to complete first fetch
      await act(async () => {
        jest.advanceTimersByTime(100)
        await Promise.resolve()
      })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('should hide loading state when order is found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: mockOrder }),
      })

      render(<OrderConfirmationContent />)

      // Initially loading
      expect(screen.getByText('Loading your order...')).toBeInTheDocument()

      // Wait for order to load
      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
      })

      // Loading should be gone
      expect(screen.queryByText('Loading your order...')).not.toBeInTheDocument()
    })

    it('should hide loading state when max retries reached', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderConfirmationContent />)

      // Initially loading
      expect(screen.getByText('Loading your order...')).toBeInTheDocument()

      // Advance through all attempts
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000]
      for (const delay of delays) {
        await act(async () => {
          jest.advanceTimersByTime(delay)
          await Promise.resolve()
        })
      }

      // Wait for state updates to complete
      await waitFor(() => {
        expect(screen.getByText(/Order Not Found/i)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Loading should be gone
      expect(screen.queryByText('Loading your order...')).not.toBeInTheDocument()
    })
  })

  describe('API endpoint usage', () => {
    it('should call correct API endpoint with session ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ order: mockOrder }),
      })

      render(<OrderConfirmationContent />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/orders/session/${mockSessionId}`
        )
      })
    })

    it('should handle API response correctly', async () => {
      const apiResponse = { order: mockOrder }
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      })

      render(<OrderConfirmationContent />)

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
        expect(screen.getByText(mockOrder.orderNumber)).toBeInTheDocument()
      })
    })
  })
})
