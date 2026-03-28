/**
 * Property-Based Tests for Product Component Display
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties for product
 * display components and data completeness.
 * 
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll } from '@jest/globals'
import * as fc from 'fast-check'
import { productService } from '@/lib/services/productService'
import { createProductDataArbitrary } from '../utils/arbitraries'
import { cleanupTestData, isSupabaseConfigured } from '../utils/testDb'

describe('Product Component Properties', () => {
  let supabaseConfigured = false

  beforeAll(async () => {
    supabaseConfigured = await isSupabaseConfigured()
    
    if (!supabaseConfigured) {
      console.warn('⚠️  Supabase is not configured. Skipping property tests.')
      console.warn('   To run these tests, configure Supabase environment variables.')
    }
  })

  afterEach(async () => {
    if (supabaseConfigured) {
      await cleanupTestData()
    }
  })

  /**
   * Property 13: Product Detail Completeness
   * 
   * For any product displayed on the detail page, all required fields
   * (name, description, price, images, sizes, colors) should be present
   * and non-empty.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  it('Property 13: Product Detail Completeness', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          // Create and publish product
          const created = await productService.createProduct(productData)
          await productService.publishProduct(created.id)

          // Retrieve product as it would be displayed on detail page
          const product = await productService.getProductById(created.id)

          // Verify product exists
          expect(product).not.toBeNull()
          expect(product).toBeDefined()

          if (product) {
            // Verify all required fields are present and non-empty
            
            // Name should be present and non-empty
            expect(product.name).toBeDefined()
            expect(product.name).not.toBe('')
            expect(typeof product.name).toBe('string')
            expect(product.name.length).toBeGreaterThan(0)

            // Description should be present and non-empty
            expect(product.description).toBeDefined()
            expect(product.description).not.toBe('')
            expect(typeof product.description).toBe('string')
            expect(product.description.length).toBeGreaterThan(0)

            // Price should be present and valid
            expect(product.price).toBeDefined()
            expect(typeof product.price).toBe('number')
            expect(product.price).toBeGreaterThan(0)
            expect(Number.isFinite(product.price)).toBe(true)

            // Images should be present (designUrl at minimum)
            expect(product.designUrl).toBeDefined()
            expect(product.designUrl).not.toBe('')
            expect(typeof product.designUrl).toBe('string')
            expect(product.designUrl.length).toBeGreaterThan(0)

            // Sizes should be present and non-empty array
            expect(product.sizes).toBeDefined()
            expect(Array.isArray(product.sizes)).toBe(true)
            expect(product.sizes.length).toBeGreaterThan(0)
            
            // Each size should be a non-empty string
            product.sizes.forEach(size => {
              expect(typeof size).toBe('string')
              expect(size.length).toBeGreaterThan(0)
            })

            // Colors should be present and non-empty array
            expect(product.colors).toBeDefined()
            expect(Array.isArray(product.colors)).toBe(true)
            expect(product.colors.length).toBeGreaterThan(0)

            // Each color should have required properties
            product.colors.forEach(color => {
              expect(color.name).toBeDefined()
              expect(color.name).not.toBe('')
              expect(typeof color.name).toBe('string')
              
              expect(color.hex).toBeDefined()
              expect(color.hex).not.toBe('')
              expect(typeof color.hex).toBe('string')
              // Verify hex format (should start with #)
              expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
            })

            // Verify product is published (should be visible on detail page)
            expect(product.published).toBe(true)
            expect(product.publishedAt).toBeDefined()
          }

          // Cleanup
          await productService.deleteProduct(created.id)
        }
      ),
      {
        numRuns: 3, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 60000) // 60 second timeout for property test
})
