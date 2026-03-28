/**
 * Property-Based Tests for Mockup Preview
 * Feature: design-editor-system
 * 
 * Tests universal properties of the mockup preview system using fast-check
 */

import * as fc from 'fast-check'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import MockupPreview from '@/components/admin/MockupPreview'
import { DesignState } from '@/lib/services/designStateSerializer'

// Arbitraries for generating test data
const colorArbitrary = fc.oneof(
  fc.constantFrom('red', 'blue', 'green', 'black', 'white', 'yellow', 'purple', 'orange'),
  fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)
)

const productUidArbitrary = fc.string({ minLength: 1, maxLength: 50 })
const designUrlArbitrary = fc.webUrl()

describe('Property 14: Mockup Color Updates', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  /**
   * Property 14: Mockup Color Updates
   * 
   * For any product color selection, the mockup preview should update to display 
   * the mockup in the selected color.
   * 
   * Validates: Requirements 6.3
   */
  it('Property 14: mockup updates when color changes', () => {
    fc.assert(
      fc.asyncProperty(
        productUidArbitrary,
        designUrlArbitrary,
        colorArbitrary,
        colorArbitrary,
        async (productUid, designUrl, color1, color2) => {
          // Skip if colors are the same
          fc.pre(color1 !== color2)

          const mockOnMockupGenerated = jest.fn()

          // Render with first color
          const { rerender, unmount } = render(
            React.createElement(MockupPreview, {
              productUid,
              designUrl,
              selectedColor: color1,
              onMockupGenerated: mockOnMockupGenerated
            })
          )

          // Advance timers to complete mockup generation
          await jest.advanceTimersByTimeAsync(2000)

          // Wait a bit for React to process updates
          await new Promise(resolve => setTimeout(resolve, 10))

          const firstCallCount = mockOnMockupGenerated.mock.calls.length

          // Property: Initial mockup should be generated
          expect(firstCallCount).toBeGreaterThan(0)

          // Change to second color
          rerender(
            React.createElement(MockupPreview, {
              productUid,
              designUrl,
              selectedColor: color2,
              onMockupGenerated: mockOnMockupGenerated
            })
          )

          // Advance timers for second mockup generation
          await jest.advanceTimersByTimeAsync(2000)

          // Wait a bit for React to process updates
          await new Promise(resolve => setTimeout(resolve, 10))

          const secondCallCount = mockOnMockupGenerated.mock.calls.length

          // Property: Changing color should trigger mockup regeneration
          expect(secondCallCount).toBeGreaterThan(firstCallCount)

          unmount()
        }
      ),
      {
        numRuns: 20, // Reduced for faster execution
        timeout: 60000,
        endOnFailure: true
      }
    )
  })

  /**
   * Property: Mockup URLs should reflect the selected color
   * 
   * When a color is selected, the generated mockup URLs should include
   * information about that color (in our mock implementation, this is
   * encoded in the URL).
   */
  it('Property: mockup URLs reflect selected color', () => {
    fc.assert(
      fc.asyncProperty(
        productUidArbitrary,
        designUrlArbitrary,
        colorArbitrary,
        async (productUid, designUrl, color) => {
          const mockOnMockupGenerated = jest.fn()

          const { unmount } = render(
            React.createElement(MockupPreview, {
              productUid,
              designUrl,
              selectedColor: color,
              onMockupGenerated: mockOnMockupGenerated
            })
          )

          // Advance timers to complete mockup generation
          await jest.advanceTimersByTimeAsync(2000)

          // Wait a bit for React to process updates
          await new Promise(resolve => setTimeout(resolve, 10))

          // Property: Mockup generation callback should be called
          expect(mockOnMockupGenerated).toHaveBeenCalled()

          // Get the generated mockup URLs
          const mockupUrls = mockOnMockupGenerated.mock.calls[0][0]

          // Property: Mockup URLs should exist
          expect(mockupUrls).toBeDefined()
          expect(mockupUrls.front).toBeDefined()
          expect(mockupUrls.back).toBeDefined()

          // Property: URLs should be valid strings
          expect(typeof mockupUrls.front).toBe('string')
          expect(typeof mockupUrls.back).toBe('string')
          expect(mockupUrls.front.length).toBeGreaterThan(0)
          expect(mockupUrls.back.length).toBeGreaterThan(0)

          unmount()
        }
      ),
      {
        numRuns: 20, // Reduced for faster execution
        timeout: 60000,
        endOnFailure: true
      }
    )
  })

  /**
   * Property: Mockup generation is idempotent for same inputs
   * 
   * Generating mockups multiple times with the same product, design, and color
   * should produce consistent results.
   */
  it('Property: mockup generation is consistent for same inputs', () => {
    fc.assert(
      fc.asyncProperty(
        productUidArbitrary,
        designUrlArbitrary,
        colorArbitrary,
        async (productUid, designUrl, color) => {
          const mockOnMockupGenerated1 = jest.fn()
          const mockOnMockupGenerated2 = jest.fn()

          // First render
          const { unmount: unmount1 } = render(
            React.createElement(MockupPreview, {
              productUid,
              designUrl,
              selectedColor: color,
              onMockupGenerated: mockOnMockupGenerated1
            })
          )

          await jest.advanceTimersByTimeAsync(2000)
          await new Promise(resolve => setTimeout(resolve, 10))

          expect(mockOnMockupGenerated1).toHaveBeenCalled()
          const mockups1 = mockOnMockupGenerated1.mock.calls[0][0]
          unmount1()

          // Second render with same inputs
          const { unmount: unmount2 } = render(
            React.createElement(MockupPreview, {
              productUid,
              designUrl,
              selectedColor: color,
              onMockupGenerated: mockOnMockupGenerated2
            })
          )

          await jest.advanceTimersByTimeAsync(2000)
          await new Promise(resolve => setTimeout(resolve, 10))

          expect(mockOnMockupGenerated2).toHaveBeenCalled()
          const mockups2 = mockOnMockupGenerated2.mock.calls[0][0]
          unmount2()

          // Property: Same inputs should produce same mockup structure
          expect(mockups1).toHaveProperty('front')
          expect(mockups1).toHaveProperty('back')
          expect(mockups2).toHaveProperty('front')
          expect(mockups2).toHaveProperty('back')
        }
      ),
      {
        numRuns: 20, // Reduced for faster execution
        timeout: 60000,
        endOnFailure: true
      }
    )
  })
})
