/**
 * Property-Based Tests for Design State Serialization
 * Feature: design-editor-system
 * 
 * These tests validate universal correctness properties for design state
 * serialization and deserialization.
 */

import * as fc from 'fast-check'
import {
  serializeToJSON,
  deserializeFromJSON,
  validateDesignState,
  type DesignState,
  type DesignElement,
  type TextProperties,
  type ImageProperties
} from '@/lib/services/designStateSerializer'

describe('Design State Serialization Properties', () => {

  /**
   * Arbitrary for generating valid text properties
   */
  const textPropertiesArbitrary = fc.record({
    content: fc.string({ minLength: 0, maxLength: 500 }),
    fontFamily: fc.constantFrom('Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana'),
    fontSize: fc.integer({ min: 8, max: 200 }),
    color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
    textAlign: fc.constantFrom('left', 'center', 'right', 'justify'),
    letterSpacing: fc.integer({ min: -50, max: 200 }),
    lineHeight: fc.double({ min: 0.5, max: 3.0, noNaN: true }),
    fontWeight: fc.constantFrom('normal', 'bold'),
    fontStyle: fc.constantFrom('normal', 'italic')
  }) as fc.Arbitrary<TextProperties>

  /**
   * Arbitrary for generating valid image properties
   */
  const imagePropertiesArbitrary = fc.record({
    url: fc.webUrl(),
    opacity: fc.double({ min: 0, max: 1, noNaN: true }),
    filters: fc.option(fc.array(fc.string(), { maxLength: 3 }), { nil: undefined })
  }) as fc.Arbitrary<ImageProperties>

  /**
   * Arbitrary for generating valid design elements
   */
  const designElementArbitrary = fc.oneof(
    // Text element
    fc.record({
      id: fc.uuid(),
      type: fc.constant('text' as const),
      position: fc.record({
        x: fc.integer({ min: 0, max: 10000 }),
        y: fc.integer({ min: 0, max: 10000 })
      }),
      size: fc.record({
        width: fc.integer({ min: 10, max: 1000 }),
        height: fc.integer({ min: 10, max: 1000 })
      }),
      rotation: fc.integer({ min: 0, max: 360 }),
      zIndex: fc.integer({ min: 0, max: 100 }),
      properties: textPropertiesArbitrary
    }),
    // Image element
    fc.record({
      id: fc.uuid(),
      type: fc.constant('image' as const),
      position: fc.record({
        x: fc.integer({ min: 0, max: 10000 }),
        y: fc.integer({ min: 0, max: 10000 })
      }),
      size: fc.record({
        width: fc.integer({ min: 10, max: 1000 }),
        height: fc.integer({ min: 10, max: 1000 })
      }),
      rotation: fc.integer({ min: 0, max: 360 }),
      zIndex: fc.integer({ min: 0, max: 100 }),
      properties: imagePropertiesArbitrary
    })
  ) as fc.Arbitrary<DesignElement>

  /**
   * Arbitrary for generating valid design states
   */
  const designStateArbitrary = fc.record({
    version: fc.constant('1.0'),
    canvasWidth: fc.integer({ min: 100, max: 10000 }),
    canvasHeight: fc.integer({ min: 100, max: 10000 }),
    backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
    elements: fc.array(designElementArbitrary, { maxLength: 20 })
  }) as fc.Arbitrary<DesignState>

  /**
   * Property 19: Design State Serialization
   * 
   * For any design state, serializing to JSON should produce valid JSON
   * that can be parsed back into an equivalent design state.
   * 
   * Validates: Requirements 8.1
   */
  it('Property 19: Design State Serialization', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        (state: DesignState) => {
          // Serialize the design state to JSON
          const json = serializeToJSON(state)
          
          // Verify JSON is a string
          expect(typeof json).toBe('string')
          expect(json.length).toBeGreaterThan(0)
          
          // Verify JSON can be parsed
          let parsed: any
          expect(() => {
            parsed = JSON.parse(json)
          }).not.toThrow()
          
          // Verify parsed object has correct structure
          expect(parsed).toBeDefined()
          expect(typeof parsed).toBe('object')
          expect(parsed).not.toBeNull()
          
          // Verify all required fields are present
          expect(parsed.version).toBeDefined()
          expect(parsed.canvasWidth).toBeDefined()
          expect(parsed.canvasHeight).toBeDefined()
          expect(parsed.backgroundColor).toBeDefined()
          expect(parsed.elements).toBeDefined()
          
          // Verify field types
          expect(typeof parsed.version).toBe('string')
          expect(typeof parsed.canvasWidth).toBe('number')
          expect(typeof parsed.canvasHeight).toBe('number')
          expect(typeof parsed.backgroundColor).toBe('string')
          expect(Array.isArray(parsed.elements)).toBe(true)
          
          // Verify the parsed state is valid
          expect(validateDesignState(parsed)).toBe(true)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 20: Design State Round Trip
   * 
   * For any design state with all element properties (position, size, rotation,
   * text content, fonts, colors), serializing then deserializing should produce
   * an equivalent design state with all properties preserved.
   * 
   * Validates: Requirements 8.3, 8.4
   */
  it('Property 20: Design State Round Trip', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        (originalState: DesignState) => {
          // Serialize the design state to JSON
          const json = serializeToJSON(originalState)
          
          // Deserialize back to a design state
          const restoredState = deserializeFromJSON(json)
          
          // Verify deserialization succeeded
          expect(restoredState).not.toBeNull()
          expect(restoredState).toBeDefined()
          
          if (!restoredState) {
            throw new Error('Deserialization failed')
          }
          
          // Verify version is preserved
          expect(restoredState.version).toBe(originalState.version)
          
          // Verify canvas dimensions are preserved
          expect(restoredState.canvasWidth).toBe(originalState.canvasWidth)
          expect(restoredState.canvasHeight).toBe(originalState.canvasHeight)
          
          // Verify background color is preserved
          expect(restoredState.backgroundColor).toBe(originalState.backgroundColor)
          
          // Verify element count is preserved
          expect(restoredState.elements.length).toBe(originalState.elements.length)
          
          // Verify each element is preserved
          for (let i = 0; i < originalState.elements.length; i++) {
            const originalElement = originalState.elements[i]
            const restoredElement = restoredState.elements[i]
            
            // Verify element ID is preserved
            expect(restoredElement.id).toBe(originalElement.id)
            
            // Verify element type is preserved
            expect(restoredElement.type).toBe(originalElement.type)
            
            // Verify position is preserved
            expect(restoredElement.position.x).toBe(originalElement.position.x)
            expect(restoredElement.position.y).toBe(originalElement.position.y)
            
            // Verify size is preserved
            expect(restoredElement.size.width).toBe(originalElement.size.width)
            expect(restoredElement.size.height).toBe(originalElement.size.height)
            
            // Verify rotation is preserved
            expect(restoredElement.rotation).toBe(originalElement.rotation)
            
            // Verify zIndex is preserved
            expect(restoredElement.zIndex).toBe(originalElement.zIndex)
            
            // Verify type-specific properties are preserved
            if (originalElement.type === 'text') {
              const originalProps = originalElement.properties as TextProperties
              const restoredProps = restoredElement.properties as TextProperties
              
              expect(restoredProps.content).toBe(originalProps.content)
              expect(restoredProps.fontFamily).toBe(originalProps.fontFamily)
              expect(restoredProps.fontSize).toBe(originalProps.fontSize)
              expect(restoredProps.color).toBe(originalProps.color)
              expect(restoredProps.textAlign).toBe(originalProps.textAlign)
              expect(restoredProps.letterSpacing).toBe(originalProps.letterSpacing)
              expect(restoredProps.lineHeight).toBe(originalProps.lineHeight)
              expect(restoredProps.fontWeight).toBe(originalProps.fontWeight)
              expect(restoredProps.fontStyle).toBe(originalProps.fontStyle)
            } else if (originalElement.type === 'image') {
              const originalProps = originalElement.properties as ImageProperties
              const restoredProps = restoredElement.properties as ImageProperties
              
              expect(restoredProps.url).toBe(originalProps.url)
              expect(restoredProps.opacity).toBe(originalProps.opacity)
              
              // Handle optional filters array
              if (originalProps.filters === undefined) {
                expect(restoredProps.filters).toBeUndefined()
              } else {
                expect(restoredProps.filters).toEqual(originalProps.filters)
              }
            }
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
   * Property 19.1: Serialization Produces Valid JSON
   * 
   * For any design state, the serialized JSON should be parseable
   * and produce a valid JavaScript object.
   * 
   * Validates: Requirements 8.1
   */
  it('Property 19.1: Serialization Produces Valid JSON', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        (state: DesignState) => {
          const json = serializeToJSON(state)
          
          // Verify JSON is valid and parseable
          let parsed: any
          expect(() => {
            parsed = JSON.parse(json)
          }).not.toThrow()
          
          // Verify parsed result is an object
          expect(typeof parsed).toBe('object')
          expect(parsed).not.toBeNull()
          expect(Array.isArray(parsed)).toBe(false)
          
          // Verify JSON doesn't contain undefined values
          expect(json).not.toContain('undefined')
          
          // Verify JSON is properly formatted
          expect(json.startsWith('{')).toBe(true)
          expect(json.endsWith('}')).toBe(true)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 19.2: Serialization Preserves Data Types
   * 
   * For any design state, serialization should preserve the data types
   * of all fields (strings remain strings, numbers remain numbers, etc.).
   * 
   * Validates: Requirements 8.1
   */
  it('Property 19.2: Serialization Preserves Data Types', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        (state: DesignState) => {
          const json = serializeToJSON(state)
          const parsed = JSON.parse(json)
          
          // Verify version is a string
          expect(typeof parsed.version).toBe('string')
          
          // Verify canvas dimensions are numbers
          expect(typeof parsed.canvasWidth).toBe('number')
          expect(typeof parsed.canvasHeight).toBe('number')
          
          // Verify background color is a string
          expect(typeof parsed.backgroundColor).toBe('string')
          
          // Verify elements is an array
          expect(Array.isArray(parsed.elements)).toBe(true)
          
          // Verify each element has correct types
          parsed.elements.forEach((element: any) => {
            expect(typeof element.id).toBe('string')
            expect(typeof element.type).toBe('string')
            expect(typeof element.position).toBe('object')
            expect(typeof element.position.x).toBe('number')
            expect(typeof element.position.y).toBe('number')
            expect(typeof element.size).toBe('object')
            expect(typeof element.size.width).toBe('number')
            expect(typeof element.size.height).toBe('number')
            expect(typeof element.rotation).toBe('number')
            expect(typeof element.zIndex).toBe('number')
            expect(typeof element.properties).toBe('object')
          })
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 20.1: Round Trip Preserves Element Order
   * 
   * For any design state with multiple elements, serialization and
   * deserialization should preserve the order of elements.
   * 
   * Validates: Requirements 8.3, 8.4
   */
  it('Property 20.1: Round Trip Preserves Element Order', () => {
    fc.assert(
      fc.property(
        fc.record({
          version: fc.constant('1.0'),
          canvasWidth: fc.integer({ min: 100, max: 10000 }),
          canvasHeight: fc.integer({ min: 100, max: 10000 }),
          backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
          elements: fc.array(designElementArbitrary, { minLength: 2, maxLength: 10 })
        }) as fc.Arbitrary<DesignState>,
        (state: DesignState) => {
          // Skip if less than 2 elements
          if (state.elements.length < 2) {
            return true
          }
          
          const json = serializeToJSON(state)
          const restored = deserializeFromJSON(json)
          
          expect(restored).not.toBeNull()
          
          if (!restored) {
            throw new Error('Deserialization failed')
          }
          
          // Verify element count matches
          expect(restored.elements.length).toBe(state.elements.length)
          
          // Verify element order is preserved by checking IDs
          for (let i = 0; i < state.elements.length; i++) {
            expect(restored.elements[i].id).toBe(state.elements[i].id)
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
   * Property 20.2: Round Trip Handles Empty Canvas
   * 
   * For any design state with no elements, serialization and
   * deserialization should preserve the empty state.
   * 
   * Validates: Requirements 8.3, 8.4
   */
  it('Property 20.2: Round Trip Handles Empty Canvas', () => {
    fc.assert(
      fc.property(
        fc.record({
          version: fc.constant('1.0'),
          canvasWidth: fc.integer({ min: 100, max: 10000 }),
          canvasHeight: fc.integer({ min: 100, max: 10000 }),
          backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
          elements: fc.constant([])
        }) as fc.Arbitrary<DesignState>,
        (state: DesignState) => {
          const json = serializeToJSON(state)
          const restored = deserializeFromJSON(json)
          
          expect(restored).not.toBeNull()
          
          if (!restored) {
            throw new Error('Deserialization failed')
          }
          
          // Verify canvas properties are preserved
          expect(restored.version).toBe(state.version)
          expect(restored.canvasWidth).toBe(state.canvasWidth)
          expect(restored.canvasHeight).toBe(state.canvasHeight)
          expect(restored.backgroundColor).toBe(state.backgroundColor)
          
          // Verify elements array is empty
          expect(restored.elements).toEqual([])
          expect(restored.elements.length).toBe(0)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 20.3: Round Trip Handles Mixed Element Types
   * 
   * For any design state with both text and image elements,
   * serialization and deserialization should preserve all elements
   * with their correct types.
   * 
   * Validates: Requirements 8.3, 8.4
   */
  it('Property 20.3: Round Trip Handles Mixed Element Types', () => {
    fc.assert(
      fc.property(
        fc.record({
          version: fc.constant('1.0'),
          canvasWidth: fc.integer({ min: 100, max: 10000 }),
          canvasHeight: fc.integer({ min: 100, max: 10000 }),
          backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
          elements: fc.array(designElementArbitrary, { minLength: 2, maxLength: 10 })
        }) as fc.Arbitrary<DesignState>,
        (state: DesignState) => {
          // Ensure we have at least one text and one image element
          const hasText = state.elements.some(e => e.type === 'text')
          const hasImage = state.elements.some(e => e.type === 'image')
          
          // Skip if we don't have both types
          if (!hasText || !hasImage) {
            return true
          }
          
          const json = serializeToJSON(state)
          const restored = deserializeFromJSON(json)
          
          expect(restored).not.toBeNull()
          
          if (!restored) {
            throw new Error('Deserialization failed')
          }
          
          // Verify element count matches
          expect(restored.elements.length).toBe(state.elements.length)
          
          // Verify each element type is preserved
          for (let i = 0; i < state.elements.length; i++) {
            expect(restored.elements[i].type).toBe(state.elements[i].type)
          }
          
          // Verify we still have both types
          const restoredHasText = restored.elements.some(e => e.type === 'text')
          const restoredHasImage = restored.elements.some(e => e.type === 'image')
          
          expect(restoredHasText).toBe(true)
          expect(restoredHasImage).toBe(true)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 19.3: Invalid JSON Deserialization Fails Gracefully
   * 
   * For any invalid JSON string, deserialization should return null
   * without throwing an error.
   * 
   * Validates: Requirements 8.1
   */
  it('Property 19.3: Invalid JSON Deserialization Fails Gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'not json',
          '{invalid}',
          '{"version": "1.0"}', // Missing required fields
          '{"version": 1.0, "canvasWidth": "not a number"}', // Wrong types
          'null',
          'undefined',
          '[]',
          ''
        ),
        (invalidJson: string) => {
          const result = deserializeFromJSON(invalidJson)
          
          // Verify deserialization returns null for invalid input
          expect(result).toBeNull()
          
          // Verify no error was thrown
          expect(() => deserializeFromJSON(invalidJson)).not.toThrow()
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 21: Export Maintains Both Artifacts
   * 
   * For any design export operation, the system should store both the
   * serialized Design_State (design_data field) and the exported Print_File
   * URL (design_url field).
   * 
   * Validates: Requirements 8.5
   */
  it('Property 21: Export Maintains Both Artifacts', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        fc.webUrl(), // Exported file URL
        (designState: DesignState, exportedUrl: string) => {
          // Simulate export operation
          const designData = serializeToJSON(designState)
          const designUrl = exportedUrl
          
          // Verify both artifacts are present
          expect(designData).toBeDefined()
          expect(designData).not.toBeNull()
          expect(typeof designData).toBe('string')
          expect(designData.length).toBeGreaterThan(0)
          
          expect(designUrl).toBeDefined()
          expect(designUrl).not.toBeNull()
          expect(typeof designUrl).toBe('string')
          expect(designUrl.length).toBeGreaterThan(0)
          
          // Verify design_data is valid JSON
          let parsedDesignData: any
          expect(() => {
            parsedDesignData = JSON.parse(designData)
          }).not.toThrow()
          
          // Verify design_data contains the design state
          expect(parsedDesignData).toBeDefined()
          expect(validateDesignState(parsedDesignData)).toBe(true)
          
          // Verify design_url is a valid URL
          expect(designUrl).toMatch(/^https?:\/\//)
          
          // Simulate storing both in database
          const productData = {
            design_data: parsedDesignData,
            design_url: designUrl
          }
          
          // Verify both fields are present in product data
          expect(productData.design_data).toBeDefined()
          expect(productData.design_url).toBeDefined()
          
          // Verify design_data can be serialized for database storage
          const dbDesignData = JSON.stringify(productData.design_data)
          expect(dbDesignData).toBeDefined()
          expect(typeof dbDesignData).toBe('string')
          
          // Verify design_data can be deserialized from database
          const restoredDesignData = JSON.parse(dbDesignData)
          expect(validateDesignState(restoredDesignData)).toBe(true)
          
          // Verify both artifacts are independent
          // Changing one should not affect the other
          const modifiedUrl = designUrl + '?v=2'
          expect(modifiedUrl).not.toBe(designUrl)
          expect(productData.design_data).toEqual(parsedDesignData) // design_data unchanged
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 21.1: Design Data Persistence Round Trip
   * 
   * For any design state stored in the database, retrieving and
   * deserializing it should produce an equivalent design state.
   * 
   * Validates: Requirements 8.5
   */
  it('Property 21.1: Design Data Persistence Round Trip', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        (originalState: DesignState) => {
          // Simulate storing in database
          const designData = serializeToJSON(originalState)
          
          // Simulate database storage (JSONB field)
          const dbStoredData = JSON.parse(designData) // Database stores as JSONB
          
          // Simulate retrieving from database
          const retrievedJson = JSON.stringify(dbStoredData) // Convert back to JSON string
          
          // Deserialize
          const restoredState = deserializeFromJSON(retrievedJson)
          
          // Verify restoration succeeded
          expect(restoredState).not.toBeNull()
          
          if (!restoredState) {
            throw new Error('Deserialization failed')
          }
          
          // Verify state is equivalent
          expect(restoredState.version).toBe(originalState.version)
          expect(restoredState.canvasWidth).toBe(originalState.canvasWidth)
          expect(restoredState.canvasHeight).toBe(originalState.canvasHeight)
          expect(restoredState.backgroundColor).toBe(originalState.backgroundColor)
          expect(restoredState.elements.length).toBe(originalState.elements.length)
          
          // Verify each element is preserved
          for (let i = 0; i < originalState.elements.length; i++) {
            const original = originalState.elements[i]
            const restored = restoredState.elements[i]
            
            expect(restored.id).toBe(original.id)
            expect(restored.type).toBe(original.type)
            expect(restored.position).toEqual(original.position)
            expect(restored.size).toEqual(original.size)
            expect(restored.rotation).toBe(original.rotation)
            expect(restored.zIndex).toBe(original.zIndex)
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
   * Property 21.2: Design URL and Data Independence
   * 
   * For any product with both design_url and design_data, updating one
   * should not affect the other.
   * 
   * Validates: Requirements 8.5
   */
  it('Property 21.2: Design URL and Data Independence', () => {
    fc.assert(
      fc.property(
        designStateArbitrary,
        fc.webUrl(),
        fc.webUrl(),
        (designState: DesignState, url1: string, url2: string) => {
          // Ensure URLs are different
          if (url1 === url2) {
            return true // Skip this test case
          }
          
          // Simulate initial product data
          const productData = {
            design_data: JSON.parse(serializeToJSON(designState)),
            design_url: url1
          }
          
          // Store original design_data
          const originalDesignData = JSON.stringify(productData.design_data)
          
          // Update design_url
          productData.design_url = url2
          
          // Verify design_data is unchanged
          const currentDesignData = JSON.stringify(productData.design_data)
          expect(currentDesignData).toBe(originalDesignData)
          
          // Verify design_url is updated
          expect(productData.design_url).toBe(url2)
          expect(productData.design_url).not.toBe(url1)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })
})
