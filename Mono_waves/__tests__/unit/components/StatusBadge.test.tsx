/**
 * Unit tests for StatusBadge component
 * Tests rendering and styling for each availability status
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { AvailabilityStatus } from '@/lib/services/catalogService'

describe('StatusBadge', () => {
  describe('status badge display', () => {
    it('should render "New" badge with blue styling', () => {
      render(<StatusBadge status="new" />)
      
      const badge = screen.getByText('New')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-300')
      expect(badge).toHaveAttribute('data-status', 'new')
    })

    it('should render "Available" badge with green styling', () => {
      render(<StatusBadge status="available" />)
      
      const badge = screen.getByText('Available')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-300')
      expect(badge).toHaveAttribute('data-status', 'available')
    })

    it('should render "Out of Stock" badge with yellow styling', () => {
      render(<StatusBadge status="out_of_stock" />)
      
      const badge = screen.getByText('Out of Stock')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-300')
      expect(badge).toHaveAttribute('data-status', 'out_of_stock')
    })

    it('should render "Discontinued" badge with red styling and reduced opacity', () => {
      render(<StatusBadge status="discontinued" />)
      
      const badge = screen.getByText('Discontinued')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300', 'opacity-60')
      expect(badge).toHaveAttribute('data-status', 'discontinued')
    })
  })

  describe('custom className', () => {
    it('should apply custom className alongside default styles', () => {
      render(<StatusBadge status="available" className="ml-2" />)
      
      const badge = screen.getByText('Available')
      expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-300', 'ml-2')
    })
  })

  describe('badge structure', () => {
    it('should render as a span element', () => {
      render(<StatusBadge status="new" />)
      
      const badge = screen.getByText('New')
      expect(badge.tagName).toBe('SPAN')
    })

    it('should have consistent base classes for all statuses', () => {
      const statuses: AvailabilityStatus[] = ['new', 'available', 'out_of_stock', 'discontinued']
      
      statuses.forEach(status => {
        const { container } = render(<StatusBadge status={status} />)
        const badge = container.querySelector('span')
        
        expect(badge).toHaveClass('inline-flex', 'items-center', 'px-2', 'py-1', 'text-xs', 'font-medium', 'rounded', 'border')
      })
    })
  })
})
