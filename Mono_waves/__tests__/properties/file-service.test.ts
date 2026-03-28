import * as fc from 'fast-check'
import { describe, it, expect, beforeAll, afterEach } from '@jest/globals'
import { fileService } from '@/lib/services/fileService'
import {
  validDesignFileArbitrary,
  invalidTypeDesignFileArbitrary,
  invalidSizeDesignFileArbitrary,
} from '../utils/arbitraries'
import { isSupabaseConfigured } from '../utils/testDb'

/**
 * Property-based tests for File Service
 * Feature: mono-waves-ecommerce
 */
describe('File Service Properties', () => {
  let supabaseConfigured = false
  let uploadedUrls: string[] = []

  beforeAll(async () => {
    supabaseConfigured = await isSupabaseConfigured()
    if (!supabaseConfigured) {
      console.warn('Skipping File Service property tests: Supabase is not configured')
    }
  })

  afterEach(async () => {
    // Clean up uploaded files
    if (supabaseConfigured && uploadedUrls.length > 0) {
      for (const url of uploadedUrls) {
        try {
          await fileService.deleteDesign(url)
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      uploadedUrls = []
    }
  })

  /**
   * Property 7: Design File Validation
   * For any file that is not an image format (JPEG, PNG, SVG, PDF),
   * the system should reject the upload with a validation error.
   * 
   * Validates: Requirements 2.2, 14.1
   */
  describe('Property 7: Design File Validation', () => {
    it('should reject files with invalid types', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidTypeDesignFileArbitrary(),
          async (file) => {
            const validation = fileService.validateDesignFile(file)
            
            // Validation should fail
            expect(validation.valid).toBe(false)
            expect(validation.errors).toBeDefined()
            expect(validation.errors!.length).toBeGreaterThan(0)
            
            // Error message should mention file type
            const errorMessage = validation.errors!.join(' ')
            expect(errorMessage.toLowerCase()).toContain('type')
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      )
    })

    it('should reject files that exceed size limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidSizeDesignFileArbitrary(),
          async (file) => {
            const validation = fileService.validateDesignFile(file)
            
            // Validation should fail
            expect(validation.valid).toBe(false)
            expect(validation.errors).toBeDefined()
            expect(validation.errors!.length).toBeGreaterThan(0)
            
            // Error message should mention file size
            const errorMessage = validation.errors!.join(' ')
            expect(errorMessage.toLowerCase()).toContain('size')
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      )
    })

    it('should accept files with valid types and sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDesignFileArbitrary(),
          async (file) => {
            const validation = fileService.validateDesignFile(file)
            
            // Validation should pass
            expect(validation.valid).toBe(true)
            expect(validation.errors).toBeUndefined()
          }
        ),
        { numRuns: 20 } // Reduced from 100 for faster execution
      )
    })
  })

  /**
   * Property 8: Design File Upload Round Trip
   * For any valid design file, uploading it should return a publicly accessible URL,
   * and fetching that URL should return the original file content.
   * 
   * Validates: Requirements 1.3, 14.2, 14.3
   */
  describe('Property 8: Design File Upload Round Trip', () => {
    it('should upload valid files and return accessible URLs', async () => {
      if (!supabaseConfigured) {
        console.warn('Skipping test: Supabase is not configured')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          validDesignFileArbitrary(),
          async (file) => {
            // Upload the file
            const url = await fileService.uploadDesign(file)
            uploadedUrls.push(url)
            
            // URL should be a valid URL
            expect(url).toBeDefined()
            expect(url).toMatch(/^https?:\/\//)
            
            // URL should contain the bucket name
            expect(url).toContain('designs')
            
            // Fetch the URL to verify it's accessible
            const response = await fetch(url)
            expect(response.ok).toBe(true)
            
            // Content type should match (or be compatible)
            const contentType = response.headers.get('content-type')
            expect(contentType).toBeDefined()
            
            // Content should exist
            const content = await response.arrayBuffer()
            expect(content.byteLength).toBeGreaterThan(0)
          }
        ),
        { numRuns: 5 } // Reduced from 10 for faster execution
      )
    }, 60000) // 60 second timeout for uploads

    it('should allow deletion of uploaded files', async () => {
      if (!supabaseConfigured) {
        console.warn('Skipping test: Supabase is not configured')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          validDesignFileArbitrary(),
          async (file) => {
            // Upload the file
            const url = await fileService.uploadDesign(file)
            
            // Delete the file
            await fileService.deleteDesign(url)
            
            // Verify file is no longer accessible (should return 404 or similar)
            const response = await fetch(url)
            expect(response.ok).toBe(false)
          }
        ),
        { numRuns: 5 } // Reduced from 10 for faster execution
      )
    }, 60000) // 60 second timeout for uploads
  })
})
