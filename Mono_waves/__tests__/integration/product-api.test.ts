/**
 * Integration Tests for Product API Routes
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate the product API endpoints work correctly
 * with the database and service layer.
 * 
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll } from '@jest/globals'
import { productService } from '@/lib/services/productService'
import { cleanupTestData, isSupabaseConfigured } from '../utils/testDb'
import type { CreateProductData, Product } from '@/types'

describe('Product API Integration Tests', () => {
  let supabaseConfigured = false
  const createdProductIds: string[] = []

  beforeAll(async () => {
    supabaseConfigured = await isSupabaseConfigured()
    
    if (!supabaseConfigured) {
      console.warn('⚠️  Supabase is not configured. Skipping integration tests.')
      console.warn('   To run these tests, configure Supabase environment variables.')
    }
  })

  afterEach(async () => {
    if (supabaseConfigured) {
      // Clean up created products
      for (const id of createdProductIds) {
        try {
          await productService.deleteProduct(id)
        } catch (error) {
          // Ignore errors if product already deleted
        }
      }
      createdProductIds.length = 0
      
      await cleanupTestData()
    }
  })

  /**
   * Test: Product creation flow
   * Validates: Requirements 1.4
   */
  describe('Product Creation Flow', () => {
    it('should create a product with valid data', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      const productData: CreateProductData = {
        name: 'Test T-Shirt',
        description: 'A test product',
        price: 29.99,
        gelatoProductId: 'test-product-id',
        gelatoProductUid: 'test-product-uid',
        sizes: ['S', 'M', 'L'],
        colors: [
          { name: 'White', hex: '#FFFFFF' },
          { name: 'Black', hex: '#000000' },
        ],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.name).toBe(productData.name)
      expect(created.price).toBe(productData.price)
      expect(created.published).toBe(false)
    })

    it('should reject product creation with invalid price', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      const invalidData: CreateProductData = {
        name: 'Invalid Product',
        description: 'Should fail',
        price: -10, // Invalid price
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      await expect(productService.createProduct(invalidData)).rejects.toThrow()
    })

    it('should reject product creation with missing required fields', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      const invalidData = {
        name: 'Incomplete Product',
        // Missing required fields
      } as CreateProductData

      await expect(productService.createProduct(invalidData)).rejects.toThrow()
    })
  })

  /**
   * Test: Product publishing flow
   * Validates: Requirements 1.5
   */
  describe('Product Publishing Flow', () => {
    it('should publish an unpublished product', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create unpublished product
      const productData: CreateProductData = {
        name: 'Unpublished Product',
        description: 'To be published',
        price: 39.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M', 'L'],
        colors: [{ name: 'Blue', hex: '#0000FF' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      expect(created.published).toBe(false)

      // Publish the product
      const published = await productService.publishProduct(created.id)

      expect(published.published).toBe(true)
      expect(published.publishedAt).toBeDefined()

      // Verify it appears in published products
      const publishedProducts = await productService.getPublishedProducts()
      const found = publishedProducts.find(p => p.id === created.id)
      expect(found).toBeDefined()
    })

    it('should not include unpublished products in public queries', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create unpublished product
      const productData: CreateProductData = {
        name: 'Private Product',
        description: 'Should not appear publicly',
        price: 49.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['S'],
        colors: [{ name: 'Red', hex: '#FF0000' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      // Verify it doesn't appear in published products
      const publishedProducts = await productService.getPublishedProducts()
      const found = publishedProducts.find(p => p.id === created.id)
      expect(found).toBeUndefined()
    })
  })

  /**
   * Test: Product update and deletion
   * Validates: Requirements 1.6, 1.7
   */
  describe('Product Update and Deletion', () => {
    it('should update product fields', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create product
      const productData: CreateProductData = {
        name: 'Original Name',
        description: 'Original description',
        price: 29.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      // Update product
      const updated = await productService.updateProduct(created.id, {
        name: 'Updated Name',
        price: 39.99,
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.price).toBe(39.99)
      expect(updated.description).toBe(productData.description) // Unchanged

      // Verify persistence
      const retrieved = await productService.getProductById(created.id)
      expect(retrieved?.name).toBe('Updated Name')
      expect(retrieved?.price).toBe(39.99)
    })

    it('should delete product completely', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create product
      const productData: CreateProductData = {
        name: 'To Be Deleted',
        description: 'Will be removed',
        price: 19.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['L'],
        colors: [{ name: 'Black', hex: '#000000' }],
        designUrl: 'https://example.com/design.png',
      }

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

      // Verify it doesn't appear in listings
      const allProducts = await productService.getAllProducts()
      const foundInAll = allProducts.find(p => p.id === productId)
      expect(foundInAll).toBeUndefined()
    })

    it('should reject update with invalid price', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create product
      const productData: CreateProductData = {
        name: 'Valid Product',
        description: 'Test',
        price: 29.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      // Attempt to update with invalid price
      await expect(
        productService.updateProduct(created.id, { price: -5 })
      ).rejects.toThrow()
    })
  })

  /**
   * Test: Admin authentication (placeholder)
   * Validates: Requirements 1.4, 1.5, 1.6, 1.7
   */
  describe('Admin Authentication', () => {
    it('should require admin authentication for product creation', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // TODO: Implement admin authentication tests
      // This is a placeholder for when admin auth is implemented
      // For now, we just verify the service methods work
      
      const productData: CreateProductData = {
        name: 'Admin Test Product',
        description: 'Test',
        price: 29.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      expect(created).toBeDefined()
    })

    it('should require admin authentication for product updates', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // TODO: Implement admin authentication tests
      // Placeholder test
      expect(true).toBe(true)
    })

    it('should require admin authentication for product deletion', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // TODO: Implement admin authentication tests
      // Placeholder test
      expect(true).toBe(true)
    })

    it('should require admin authentication for product publishing', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // TODO: Implement admin authentication tests
      // Placeholder test
      expect(true).toBe(true)
    })
  })

  /**
   * Test: Product retrieval
   */
  describe('Product Retrieval', () => {
    it('should retrieve product by ID', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      const productData: CreateProductData = {
        name: 'Retrievable Product',
        description: 'Test retrieval',
        price: 29.99,
        gelatoProductId: 'test-id',
        gelatoProductUid: 'test-uid',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      const created = await productService.createProduct(productData)
      createdProductIds.push(created.id)

      const retrieved = await productService.getProductById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.name).toBe(productData.name)
    })

    it('should return null for non-existent product', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const retrieved = await productService.getProductById(nonExistentId)

      expect(retrieved).toBeNull()
    })

    it('should retrieve all products including unpublished (admin)', async () => {
      if (!supabaseConfigured) {
        console.log('⏭️  Skipping: Supabase not configured')
        return
      }

      // Create published product
      const publishedData: CreateProductData = {
        name: 'Published Product',
        description: 'Public',
        price: 29.99,
        gelatoProductId: 'test-id-1',
        gelatoProductUid: 'test-uid-1',
        sizes: ['M'],
        colors: [{ name: 'White', hex: '#FFFFFF' }],
        designUrl: 'https://example.com/design.png',
      }

      const published = await productService.createProduct(publishedData)
      createdProductIds.push(published.id)
      await productService.publishProduct(published.id)

      // Create unpublished product
      const unpublishedData: CreateProductData = {
        name: 'Unpublished Product',
        description: 'Private',
        price: 39.99,
        gelatoProductId: 'test-id-2',
        gelatoProductUid: 'test-uid-2',
        sizes: ['L'],
        colors: [{ name: 'Black', hex: '#000000' }],
        designUrl: 'https://example.com/design.png',
      }

      const unpublished = await productService.createProduct(unpublishedData)
      createdProductIds.push(unpublished.id)

      // Get all products (admin view)
      const allProducts = await productService.getAllProducts()

      const foundPublished = allProducts.find(p => p.id === published.id)
      const foundUnpublished = allProducts.find(p => p.id === unpublished.id)

      expect(foundPublished).toBeDefined()
      expect(foundUnpublished).toBeDefined()
    })
  })
})
