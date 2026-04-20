/**
 * Property-Based Tests for StatusBadge Component
 * Feature: gelato-catalog-expansion
 * 
 * These tests validate universal correctness properties for the status badge component.
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import React from 'react'
import { render } from '@testing-library/react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { AvailabilityStatus } from '@/lib/services/catalogService'

describe('StatusBadge Properties', () => {
  /**
   * Property 11: Status Badge Display
   * 
   * For any product rendered in the admin interface, the HTML output should contain
   * a status badge element with the product's current availability status.
   * 
   * Validates: Requirements 4.1
   */
  it('Property 11: Status Badge Display', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AvailabilityStatus>('new', 'available', 'out_of_stock', 'discontinued'),
        fc.option(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => s.trim().length > 0 && !/\s/.test(s)), // valid CSS class names only
          { nil: undefined }
        ), // optional className
        (status, className) => {
          // Render the StatusBadge component
          const { container } = render(
            <StatusBadge status={status} className={className} />
          )

          // Verify HTML output contains a badge element
          const badge = container.querySelector('span[data-status]')
          expect(badge).not.toBeNull()

          // Verify badge has the correct status attribute
          expect(badge?.getAttribute('data-status')).toBe(status)

          // Verify badge contains text content
          const badgeText = badge?.textContent
          expect(badgeText).toBeTruthy()
          expect(badgeText!.length).toBeGreaterThan(0)

          // Verify badge has appropriate styling classes
          const classList = badge?.classList
          expect(classList).toBeTruthy()
          expect(classList!.length).toBeGreaterThan(0)

          // Verify badge has base structural classes
          expect(badge?.classList.contains('inline-flex')).toBe(true)
          expect(badge?.classList.contains('items-center')).toBe(true)
          expect(badge?.classList.contains('rounded')).toBe(true)
          expect(badge?.classList.contains('border')).toBe(true)

          // Verify badge has status-specific styling
          const hasColorClass = 
            badge?.classList.contains('bg-blue-100') ||
            badge?.classList.contains('bg-green-100') ||
            badge?.classList.contains('bg-yellow-100') ||
            badge?.classList.contains('bg-red-100')
          expect(hasColorClass).toBe(true)

          // Verify custom className is applied if provided
          if (className) {
            expect(badge?.classList.contains(className)).toBe(true)
          }
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Status Badge Consistency
   * 
   * For any given status, the badge should always render the same label text
   * and styling classes across multiple renders.
   */
  it('Additional Property: Status Badge Consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AvailabilityStatus>('new', 'available', 'out_of_stock', 'discontinued'),
        (status) => {
          // Render the badge multiple times
          const render1 = render(<StatusBadge status={status} />)
          const render2 = render(<StatusBadge status={status} />)

          // Get badge elements
          const badge1 = render1.container.querySelector('span[data-status]')
          const badge2 = render2.container.querySelector('span[data-status]')

          // Verify both renders produce identical output
          expect(badge1?.textContent).toBe(badge2?.textContent)
          expect(badge1?.getAttribute('data-status')).toBe(badge2?.getAttribute('data-status'))
          
          // Verify class lists are identical
          const classes1 = Array.from(badge1?.classList || []).sort()
          const classes2 = Array.from(badge2?.classList || []).sort()
          expect(classes1).toEqual(classes2)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Status Badge Label Mapping
   * 
   * For any status value, the badge should display a human-readable label
   * that corresponds to the status.
   */
  it('Additional Property: Status Badge Label Mapping', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AvailabilityStatus>('new', 'available', 'out_of_stock', 'discontinued'),
        (status) => {
          // Render the badge
          const { container } = render(<StatusBadge status={status} />)
          const badge = container.querySelector('span[data-status]')
          const labelText = badge?.textContent || ''

          // Define expected label mappings
          const expectedLabels: Record<AvailabilityStatus, string> = {
            new: 'New',
            available: 'Available',
            out_of_stock: 'Out of Stock',
            discontinued: 'Discontinued'
          }

          // Verify label matches expected mapping
          expect(labelText).toBe(expectedLabels[status])

          // Verify label is not empty
          expect(labelText.length).toBeGreaterThan(0)

          // Verify label is properly capitalized (starts with uppercase)
          expect(labelText[0]).toBe(labelText[0].toUpperCase())
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Status Badge Styling Uniqueness
   * 
   * For any two different status values, the badges should have distinct
   * color styling to visually differentiate them.
   */
  it('Additional Property: Status Badge Styling Uniqueness', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AvailabilityStatus>('new', 'available', 'out_of_stock', 'discontinued'),
        fc.constantFrom<AvailabilityStatus>('new', 'available', 'out_of_stock', 'discontinued'),
        (status1, status2) => {
          // Skip if statuses are the same
          fc.pre(status1 !== status2)

          // Render both badges
          const render1 = render(<StatusBadge status={status1} />)
          const render2 = render(<StatusBadge status={status2} />)

          // Get badge elements
          const badge1 = render1.container.querySelector('span[data-status]')
          const badge2 = render2.container.querySelector('span[data-status]')

          // Extract color classes
          const getColorClasses = (element: Element | null) => {
            if (!element) return []
            return Array.from(element.classList).filter(cls => 
              cls.startsWith('bg-') || cls.startsWith('text-') || cls.startsWith('border-')
            )
          }

          const colors1 = getColorClasses(badge1)
          const colors2 = getColorClasses(badge2)

          // Verify different statuses have different color schemes
          expect(colors1).not.toEqual(colors2)

          // Verify both have color classes
          expect(colors1.length).toBeGreaterThan(0)
          expect(colors2.length).toBeGreaterThan(0)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Discontinued Status Opacity
   * 
   * For any badge with "discontinued" status, it should have reduced opacity
   * to visually distinguish it from active products.
   */
  it('Additional Property: Discontinued Status Opacity', () => {
    fc.assert(
      fc.property(
        fc.constant('discontinued' as AvailabilityStatus),
        (status) => {
          // Render discontinued badge
          const { container } = render(<StatusBadge status={status} />)
          const badge = container.querySelector('span[data-status="discontinued"]')

          // Verify badge exists
          expect(badge).not.toBeNull()

          // Verify opacity class is present
          expect(badge?.classList.contains('opacity-60')).toBe(true)

          // Verify red color scheme is used
          expect(badge?.classList.contains('bg-red-100')).toBe(true)
          expect(badge?.classList.contains('text-red-800')).toBe(true)
          expect(badge?.classList.contains('border-red-300')).toBe(true)
        }
      ),
      {
        numRuns: 50,
        verbose: false,
      }
    )
  })
})
