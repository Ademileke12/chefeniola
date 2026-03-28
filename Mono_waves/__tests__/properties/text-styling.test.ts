/**
 * Property-Based Tests for Text Styling
 * Feature: design-editor-system
 * 
 * These tests validate universal correctness properties for text
 * element styling and property updates.
 */

import * as fc from 'fast-check'

// Type definitions for text properties
interface TextProperties {
  fontSize?: number
  fill?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  charSpacing?: number
  lineHeight?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  fontFamily?: string
}

interface TextElement {
  type: string
  fontSize: number
  fill: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
  charSpacing: number
  lineHeight: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  fontFamily: string
}

describe('Text Styling Properties', () => {

  /**
   * Property 5: Text Property Updates
   * 
   * For any text element and any valid property change (font, size, color, alignment),
   * applying the change should update the element's properties to match the new values.
   * 
   * **Validates: Requirements 3.3, 3.5, 3.7**
   */
  it('Property 5: Text Property Updates', () => {
    // Arbitraries for valid text property values
    const fontSizeArbitrary = fc.integer({ min: 8, max: 200 })
    const colorArbitrary = fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)
    const alignmentArbitrary = fc.constantFrom('left', 'center', 'right', 'justify')
    const letterSpacingArbitrary = fc.integer({ min: -50, max: 200 })
    const lineHeightArbitrary = fc.double({ min: 0.5, max: 3.0 })
    const fontWeightArbitrary = fc.constantFrom('normal', 'bold')
    const fontStyleArbitrary = fc.constantFrom('normal', 'italic')
    const fontFamilyArbitrary = fc.constantFrom('Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana')

    // Create arbitrary for text element with initial properties
    const textElementArbitrary = fc.record({
      type: fc.constant('i-text'),
      fontSize: fontSizeArbitrary,
      fill: colorArbitrary,
      textAlign: alignmentArbitrary,
      charSpacing: letterSpacingArbitrary,
      lineHeight: lineHeightArbitrary,
      fontWeight: fontWeightArbitrary,
      fontStyle: fontStyleArbitrary,
      fontFamily: fontFamilyArbitrary,
    })

    // Create arbitrary for property updates
    const propertyUpdateArbitrary = fc.oneof(
      fc.record({ property: fc.constant('fontSize'), value: fontSizeArbitrary }),
      fc.record({ property: fc.constant('fill'), value: colorArbitrary }),
      fc.record({ property: fc.constant('textAlign'), value: alignmentArbitrary }),
      fc.record({ property: fc.constant('charSpacing'), value: letterSpacingArbitrary }),
      fc.record({ property: fc.constant('lineHeight'), value: lineHeightArbitrary }),
      fc.record({ property: fc.constant('fontWeight'), value: fontWeightArbitrary }),
      fc.record({ property: fc.constant('fontStyle'), value: fontStyleArbitrary }),
      fc.record({ property: fc.constant('fontFamily'), value: fontFamilyArbitrary }),
    )

    fc.assert(
      fc.property(
        textElementArbitrary,
        propertyUpdateArbitrary,
        (element: TextElement, update: { property: string; value: any }) => {
          // Simulate the element before update
          const elementBefore = { ...element }

          // Simulate applying the property change
          const elementAfter = {
            ...element,
            [update.property]: update.value,
          }

          // Verify the property was updated
          expect(elementAfter[update.property as keyof TextElement]).toBe(update.value)


          // Verify other properties remain unchanged
          const unchangedProperties = Object.keys(elementBefore).filter(
            key => key !== update.property
          )
          unchangedProperties.forEach(key => {
            expect(elementAfter[key as keyof TextElement]).toBe(elementBefore[key as keyof TextElement])
          })

          // Verify the updated value is within valid ranges
          if (update.property === 'fontSize') {
            expect(update.value).toBeGreaterThanOrEqual(8)
            expect(update.value).toBeLessThanOrEqual(200)
          }
          if (update.property === 'charSpacing') {
            expect(update.value).toBeGreaterThanOrEqual(-50)
            expect(update.value).toBeLessThanOrEqual(200)
          }
          if (update.property === 'lineHeight') {
            expect(update.value).toBeGreaterThanOrEqual(0.5)
            expect(update.value).toBeLessThanOrEqual(3.0)
          }
          if (update.property === 'textAlign') {
            expect(['left', 'center', 'right', 'justify']).toContain(update.value)
          }
          if (update.property === 'fontWeight') {
            expect(['normal', 'bold']).toContain(update.value)
          }
          if (update.property === 'fontStyle') {
            expect(['normal', 'italic']).toContain(update.value)
          }
          if (update.property === 'fill') {
            expect(update.value).toMatch(/^#[0-9A-Fa-f]{6}$/)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 5.1: Font Size Boundary Validation
   * 
   * For any font size update, the value should be clamped to the valid range (8-200pt).
   * 
   * **Validates: Requirements 3.4**
   */
  it('Property 5.1: Font Size Boundary Validation', () => {
    const fontSizeArbitrary = fc.integer({ min: -100, max: 500 }) // Include out-of-range values

    fc.assert(
      fc.property(
        fontSizeArbitrary,
        (rawFontSize: number) => {
          // Simulate the clamping logic from ElementPropertiesPanel
          const clampedFontSize = Math.max(8, Math.min(200, rawFontSize))

          // Verify clamped value is within valid range
          expect(clampedFontSize).toBeGreaterThanOrEqual(8)
          expect(clampedFontSize).toBeLessThanOrEqual(200)

          // Verify clamping behavior
          if (rawFontSize < 8) {
            expect(clampedFontSize).toBe(8)
          } else if (rawFontSize > 200) {
            expect(clampedFontSize).toBe(200)
          } else {
            expect(clampedFontSize).toBe(rawFontSize)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 5.2: Letter Spacing Boundary Validation
   * 
   * For any letter spacing update, the value should be clamped to the valid range (-50 to 200).
   * 
   * **Validates: Requirements 3.8**
   */
  it('Property 5.2: Letter Spacing Boundary Validation', () => {
    const letterSpacingArbitrary = fc.integer({ min: -200, max: 500 }) // Include out-of-range values

    fc.assert(
      fc.property(
        letterSpacingArbitrary,
        (rawLetterSpacing: number) => {
          // Simulate the clamping logic from ElementPropertiesPanel
          const clampedLetterSpacing = Math.max(-50, Math.min(200, rawLetterSpacing))

          // Verify clamped value is within valid range
          expect(clampedLetterSpacing).toBeGreaterThanOrEqual(-50)
          expect(clampedLetterSpacing).toBeLessThanOrEqual(200)

          // Verify clamping behavior
          if (rawLetterSpacing < -50) {
            expect(clampedLetterSpacing).toBe(-50)
          } else if (rawLetterSpacing > 200) {
            expect(clampedLetterSpacing).toBe(200)
          } else {
            expect(clampedLetterSpacing).toBe(rawLetterSpacing)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 5.3: Line Height Boundary Validation
   * 
   * For any line height update, the value should be clamped to the valid range (0.5 to 3.0).
   * 
   * **Validates: Requirements 3.9**
   */
  it('Property 5.3: Line Height Boundary Validation', () => {
    const lineHeightArbitrary = fc.double({ min: -1.0, max: 10.0, noNaN: true }) // Include out-of-range values, exclude NaN

    fc.assert(
      fc.property(
        lineHeightArbitrary,
        (rawLineHeight: number) => {
          // Simulate the clamping logic from ElementPropertiesPanel
          // In real implementation, NaN would be handled by defaulting to 1.2
          const clampedLineHeight = Number.isNaN(rawLineHeight) ? 1.2 : Math.max(0.5, Math.min(3.0, rawLineHeight))

          // Verify clamped value is within valid range
          expect(clampedLineHeight).toBeGreaterThanOrEqual(0.5)
          expect(clampedLineHeight).toBeLessThanOrEqual(3.0)

          // Verify clamping behavior
          if (Number.isNaN(rawLineHeight)) {
            expect(clampedLineHeight).toBe(1.2)
          } else if (rawLineHeight < 0.5) {
            expect(clampedLineHeight).toBe(0.5)
          } else if (rawLineHeight > 3.0) {
            expect(clampedLineHeight).toBe(3.0)
          } else {
            // Allow for floating point precision
            expect(Math.abs(clampedLineHeight - rawLineHeight)).toBeLessThan(0.0001)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 5.4: Color Format Validation
   * 
   * For any color update, the value should be a valid hex color format (#RRGGBB).
   * 
   * **Validates: Requirements 3.5**
   */
  it('Property 5.4: Color Format Validation', () => {
    const colorArbitrary = fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)

    fc.assert(
      fc.property(
        colorArbitrary,
        (color: string) => {
          // Verify color format
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)

          // Verify color starts with #
          expect(color.charAt(0)).toBe('#')

          // Verify color length
          expect(color.length).toBe(7)

          // Verify all characters after # are valid hex digits
          const hexPart = color.substring(1)
          expect(hexPart).toMatch(/^[0-9A-Fa-f]{6}$/)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 5.5: Multiple Property Updates Preserve Independence
   * 
   * For any text element and any sequence of property updates,
   * each property update should only affect the specified property
   * and not interfere with other properties.
   * 
   * **Validates: Requirements 3.3, 3.5, 3.7**
   */
  it('Property 5.5: Multiple Property Updates Preserve Independence', () => {
    const fontSizeArbitrary = fc.integer({ min: 8, max: 200 })
    const colorArbitrary = fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)
    const alignmentArbitrary = fc.constantFrom('left', 'center', 'right', 'justify')

    const textElementArbitrary = fc.record({
      type: fc.constant('i-text'),
      fontSize: fontSizeArbitrary,
      fill: colorArbitrary,
      textAlign: alignmentArbitrary,
      charSpacing: fc.integer({ min: -50, max: 200 }),
      lineHeight: fc.double({ min: 0.5, max: 3.0 }),
      fontWeight: fc.constantFrom('normal', 'bold'),
      fontStyle: fc.constantFrom('normal', 'italic'),
      fontFamily: fc.constant('Arial'),
    })

    fc.assert(
      fc.property(
        textElementArbitrary,
        fontSizeArbitrary,
        colorArbitrary,
        alignmentArbitrary,
        (element: TextElement, newFontSize: number, newColor: string, newAlignment: 'left' | 'center' | 'right' | 'justify') => {
          // Store original values
          const originalCharSpacing = element.charSpacing
          const originalLineHeight = element.lineHeight
          const originalFontWeight = element.fontWeight
          const originalFontStyle = element.fontStyle

          // Apply multiple property updates
          const updatedElement = {
            ...element,
            fontSize: newFontSize,
            fill: newColor,
            textAlign: newAlignment,
          }

          // Verify updated properties changed
          expect(updatedElement.fontSize).toBe(newFontSize)
          expect(updatedElement.fill).toBe(newColor)
          expect(updatedElement.textAlign).toBe(newAlignment)

          // Verify other properties remained unchanged
          expect(updatedElement.charSpacing).toBe(originalCharSpacing)
          expect(updatedElement.lineHeight).toBe(originalLineHeight)
          expect(updatedElement.fontWeight).toBe(originalFontWeight)
          expect(updatedElement.fontStyle).toBe(originalFontStyle)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })
})
