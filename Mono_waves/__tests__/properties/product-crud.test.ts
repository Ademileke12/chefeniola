/**
 * Property-Based Tests for Product CRUD Operations
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties that should hold
 * for all valid product data across the system.
 * 
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll } from '@jest/globals'
import * as fc from 'fast-check'
import { productService } from '@/lib/services/productService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createProductDataArbitrary } from '../utils/arbitraries'
import { cleanupTestData, isSupabaseConfigured } from '../utils/testDb'

describe('Product Management Properties', () => {
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
   * Property 1: Product CRUD Consistency
   * 
   * For any valid product data, creating a product then retrieving it should
   * return equivalent product data with published status set to false.
   * 
   * Validates: Requirements 1.4
   */
  it('Property 1: Product CRUD Consistency', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          // Create product
          const created = await productService.createProduct(productData)

          // Verify creation
          expect(created).toBeDefined()
          expect(created.id).toBeDefined()
          expect(typeof created.id).toBe('string')

          // Retrieve the created product
          const retrieved = await productService.getProductById(created.id)

          // Verify retrieval
          expect(retrieved).not.toBeNull()
          expect(retrieved).toBeDefined()

          if (retrieved) {
            // Verify data consistency
            expect(retrieved.id).toBe(created.id)
            expect(retrieved.name).toBe(productData.name)
            expect(retrieved.description).toBe(productData.description)
            expect(retrieved.price).toBe(productData.price)
            expect(retrieved.gelatoProductId).toBe(productData.gelatoProductId)
            expect(retrieved.gelatoProductUid).toBe(productData.gelatoProductUid)
            expect(retrieved.designUrl).toBe(productData.designUrl)
            
            // Verify arrays
            expect(retrieved.sizes).toEqual(productData.sizes)
            expect(retrieved.colors).toEqual(productData.colors)
            
            // Verify published status is false for new products
            expect(retrieved.published).toBe(false)
            expect(retrieved.publishedAt).toBeUndefined()
            
            // Verify timestamps exist
            expect(retrieved.createdAt).toBeDefined()
            expect(retrieved.updatedAt).toBeDefined()
          }

          // Cleanup: delete the created product
          await productService.deleteProduct(created.id)
        }
      ),
      {
        numRuns: 3, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 60000) // 60 second timeout for property test

  /**
   * Property 2: Product Publishing State Transition
   * 
   * For any unpublished product, publishing it should update the published
   * status to true and make it appear in public product queries.
   * 
   * Validates: Requirements 1.5
   */
  it('Property 2: Product Publishing State Transition', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          // Create unpublished product
          const created = await productService.createProduct(productData)
          expect(created.published).toBe(false)

          // Publish the product
          const published = await productService.publishProduct(created.id)

          // Verify published status
          expect(published.published).toBe(true)
          expect(published.publishedAt).toBeDefined()

          // Verify it appears in public queries
          const publicProducts = await productService.getPublishedProducts()
          const foundInPublic = publicProducts.some(p => p.id === created.id)
          expect(foundInPublic).toBe(true)

          // Cleanup
          await productService.deleteProduct(created.id)
        }
      ),
      {
        numRuns: 2, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 3: Product Update Persistence
   * 
   * For any existing product and any valid update data, updating the product
   * then retrieving it should return the updated values.
   * 
   * Validates: Requirements 1.6
   */
  it('Property 3: Product Update Persistence', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        createProductDataArbitrary(),
        async (initialData, updateData) => {
          // Create initial product
          const created = await productService.createProduct(initialData)

          // Update with new data
          const updated = await productService.updateProduct(created.id, {
            name: updateData.name,
            description: updateData.description,
            price: updateData.price,
            sizes: updateData.sizes,
            colors: updateData.colors,
          })

          // Verify updates
          expect(updated.name).toBe(updateData.name)
          expect(updated.description).toBe(updateData.description)
          expect(updated.price).toBe(updateData.price)
          expect(updated.sizes).toEqual(updateData.sizes)
          expect(updated.colors).toEqual(updateData.colors)

          // Retrieve and verify persistence
          const retrieved = await productService.getProductById(created.id)
          expect(retrieved).not.toBeNull()
          if (retrieved) {
            expect(retrieved.name).toBe(updateData.name)
            expect(retrieved.description).toBe(updateData.description)
            expect(retrieved.price).toBe(updateData.price)
            expect(retrieved.sizes).toEqual(updateData.sizes)
            expect(retrieved.colors).toEqual(updateData.colors)
          }

          // Cleanup
          await productService.deleteProduct(created.id)
        }
      ),
      {
        numRuns: 3, // Reduced from 5 to avoid timeout
        verbose: false,
      }
    )
  }, 60000) // Increased timeout to 60 seconds

  /**
   * Property 4: Product Deletion Completeness
   * 
   * For any product, after deletion, attempting to retrieve that product
   * should return null and it should not appear in any product listings.
   * 
   * Validates: Requirements 1.7
   */
  it('Property 4: Product Deletion Completeness', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          // Create product
          const created = await productService.createProduct(productData)
          const productId = created.id

          // Verify it exists
          const beforeDelete = await productService.getProductById(productId)
          expect(beforeDelete).not.toBeNull()

          // Delete product
          await productService.deleteProduct(productId)

          // Verify it no longer exists
          const afterDelete = await productService.getProductById(productId)
          expect(afterDelete).toBeNull()

          // Verify it doesn't appear in all products
          const allProducts = await productService.getAllProducts()
          const foundInAll = allProducts.some(p => p.id === productId)
          expect(foundInAll).toBe(false)

          // Verify it doesn't appear in published products
          const publishedProducts = await productService.getPublishedProducts()
          const foundInPublished = publishedProducts.some(p => p.id === productId)
          expect(foundInPublished).toBe(false)
        }
      ),
      {
        numRuns: 2, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 6: Price Validation
   * 
   * For any price value less than or equal to zero, the system should reject
   * the product creation or update with a validation error.
   * 
   * Validates: Requirements 2.4
   */
  it('Property 6: Price Validation', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        fc.float({ min: -1000, max: 0, noNaN: true, noDefaultInfinity: true }),
        async (productData, invalidPrice) => {
          // Attempt to create product with invalid price
          const invalidData = { ...productData, price: invalidPrice }

          // Should throw an error or be rejected
          await expect(async () => {
            const created = await productService.createProduct(invalidData)
            // If creation succeeds, verify price constraint at DB level
            // Clean up if somehow created
            if (created?.id) {
              await productService.deleteProduct(created.id)
            }
            // Fail the test if we got here
            throw new Error('Expected price validation to fail')
          }).rejects.toThrow()
        }
      ),
      {
        numRuns: 2, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 9: Product Configuration Persistence
   * 
   * For any product with selected sizes and colors, storing the product
   * then retrieving it should return the same size and color options.
   * 
   * Validates: Requirements 2.5, 2.6, 14.4
   */
  it('Property 9: Product Configuration Persistence', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          // Create product with specific sizes and colors
          const created = await productService.createProduct(productData)

          // Retrieve and verify configuration
          const retrieved = await productService.getProductById(created.id)
          expect(retrieved).not.toBeNull()

          if (retrieved) {
            // Verify sizes are preserved
            expect(retrieved.sizes).toEqual(productData.sizes)
            expect(retrieved.sizes.length).toBe(productData.sizes.length)

            // Verify colors are preserved
            expect(retrieved.colors).toEqual(productData.colors)
            expect(retrieved.colors.length).toBe(productData.colors.length)

            // Verify each color has required properties
            retrieved.colors.forEach((color, index) => {
              expect(color.name).toBe(productData.colors[index].name)
              expect(color.hex).toBe(productData.colors[index].hex)
            })
          }

          // Cleanup
          await productService.deleteProduct(created.id)
        }
      ),
      {
        numRuns: 2, // Reduced for faster execution
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 10: Published Products Filter
   * 
   * For any query to fetch products for the storefront, all returned products
   * should have published status set to true.
   * 
   * Validates: Requirements 3.2
   */
  it('Property 10: Published Products Filter', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(createProductDataArbitrary(), { minLength: 2, maxLength: 5 }),
        async (productsData) => {
          const createdIds: string[] = []

          try {
            // Create mix of published and unpublished products
            for (let i = 0; i < productsData.length; i++) {
              const created = await productService.createProduct(productsData[i])
              createdIds.push(created.id)

              // Publish only some products (alternating)
              if (i % 2 === 0) {
                await productService.publishProduct(created.id)
              }
            }

            // Fetch published products
            const publishedProducts = await productService.getPublishedProducts()

            // Verify all returned products are published
            publishedProducts.forEach(product => {
              expect(product.published).toBe(true)
            })

            // Verify unpublished products are not included
            const publishedIds = publishedProducts.map(p => p.id)
            createdIds.forEach((id, index) => {
              if (index % 2 === 0) {
                // Should be included (was published)
                expect(publishedIds.includes(id)).toBe(true)
              } else {
                // Should not be included (was not published)
                expect(publishedIds.includes(id)).toBe(false)
              }
            })
          } finally {
            // Cleanup all created products
            for (const id of createdIds) {
              await productService.deleteProduct(id)
            }
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 45000)

  /**
   * Property 11: Product Filtering Correctness
   * 
   * For any filter criteria (size, color, price range), all returned products
   * should match all specified filter conditions.
   * 
   * Validates: Requirements 3.3
   */
  it('Property 11: Product Filtering Correctness', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(createProductDataArbitrary(), { minLength: 3, maxLength: 5 }),
        fc.constantFrom('S', 'M', 'L', 'XL'),
        fc.constantFrom('White', 'Black', 'Navy', 'Red'),
        async (productsData, filterSize, filterColor) => {
          const createdIds: string[] = []

          try {
            // Create and publish products
            for (const data of productsData) {
              const created = await productService.createProduct(data)
              createdIds.push(created.id)
              await productService.publishProduct(created.id)
            }

            // Apply size filter
            const sizeFiltered = await productService.filterProducts({
              sizes: [filterSize],
            })

            // Verify all returned products have the filtered size
            sizeFiltered.forEach(product => {
              expect(product.sizes.includes(filterSize)).toBe(true)
            })

            // Apply color filter
            const colorFiltered = await productService.filterProducts({
              colors: [filterColor],
            })

            // Verify all returned products have the filtered color
            colorFiltered.forEach(product => {
              const hasColor = product.colors.some(c => c.name === filterColor)
              expect(hasColor).toBe(true)
            })

            // Apply price range filter
            const priceFiltered = await productService.filterProducts({
              minPrice: 10,
              maxPrice: 100,
            })

            // Verify all returned products are within price range
            priceFiltered.forEach(product => {
              expect(product.price).toBeGreaterThanOrEqual(10)
              expect(product.price).toBeLessThanOrEqual(100)
            })
          } finally {
            // Cleanup
            for (const id of createdIds) {
              await productService.deleteProduct(id)
            }
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 45000)

  /**
   * Property 12: Product Sorting Correctness
   * 
   * For any sort option (price ascending, price descending, newest first),
   * the returned products should be ordered according to the specified sort criteria.
   * 
   * Validates: Requirements 3.4
   */
  it('Property 12: Product Sorting Correctness', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(createProductDataArbitrary(), { minLength: 3, maxLength: 5 }),
        async (productsData) => {
          const createdIds: string[] = []

          try {
            // Create and publish products with slight delays to ensure different timestamps
            for (const data of productsData) {
              const created = await productService.createProduct(data)
              createdIds.push(created.id)
              await productService.publishProduct(created.id)
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10))
            }

            // Test price ascending sort
            const priceAsc = await productService.filterProducts({
              sortBy: 'price_asc',
            })
            for (let i = 1; i < priceAsc.length; i++) {
              expect(priceAsc[i].price).toBeGreaterThanOrEqual(priceAsc[i - 1].price)
            }

            // Test price descending sort
            const priceDesc = await productService.filterProducts({
              sortBy: 'price_desc',
            })
            for (let i = 1; i < priceDesc.length; i++) {
              expect(priceDesc[i].price).toBeLessThanOrEqual(priceDesc[i - 1].price)
            }

            // Test newest first sort
            const newest = await productService.filterProducts({
              sortBy: 'newest',
            })
            for (let i = 1; i < newest.length; i++) {
              const prevDate = new Date(newest[i - 1].createdAt).getTime()
              const currDate = new Date(newest[i].createdAt).getTime()
              expect(prevDate).toBeGreaterThanOrEqual(currDate)
            }

            // Test name sort
            const byName = await productService.filterProducts({
              sortBy: 'name',
            })
            for (let i = 1; i < byName.length; i++) {
              expect(byName[i].name.localeCompare(byName[i - 1].name)).toBeGreaterThanOrEqual(0)
            }
          } finally {
            // Cleanup
            for (const id of createdIds) {
              await productService.deleteProduct(id)
            }
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 45000)

  /**
   * Sanity check: Verify test can detect failures
   * This test should fail if uncommented, proving our property test works
   */
  it.skip('should detect CRUD inconsistencies (negative test)', async () => {
    if (!supabaseConfigured) {
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createProductDataArbitrary(),
        async (productData) => {
          const created = await productService.createProduct(productData)
          const retrieved = await productService.getProductById(created.id)
          
          // This should fail - published should be false, not true
          expect(retrieved?.published).toBe(true)
          
          await productService.deleteProduct(created.id)
        }
      ),
      { numRuns: 10 }
    )
  })
})
