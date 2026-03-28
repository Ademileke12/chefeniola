import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { fileService, FileService } from '@/lib/services/fileService'
import { createMockFile } from '../utils/arbitraries'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Unit tests for File Service edge cases
 * Feature: mono-waves-ecommerce
 * Validates: Requirements 14.5
 */
describe('File Service Unit Tests', () => {
  describe('File Validation Edge Cases', () => {
    it('should reject empty files', () => {
      const emptyFile = createMockFile('', 'empty.jpg', 'image/jpeg', 0)
      
      const validation = fileService.validateDesignFile(emptyFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('File is empty')
    })

    it('should reject text files', () => {
      const textFile = createMockFile('Hello World', 'test.txt', 'text/plain')
      
      const validation = fileService.validateDesignFile(textFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('Invalid file type')
    })

    it('should reject video files', () => {
      const videoFile = createMockFile('video content', 'test.mp4', 'video/mp4')
      
      const validation = fileService.validateDesignFile(videoFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('Invalid file type')
    })

    it('should reject audio files', () => {
      const audioFile = createMockFile('audio content', 'test.mp3', 'audio/mpeg')
      
      const validation = fileService.validateDesignFile(audioFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('Invalid file type')
    })

    it('should reject files exactly at size limit + 1 byte', () => {
      const maxSize = 10 * 1024 * 1024
      const oversizedFile = createMockFile(
        'content',
        'large.jpg',
        'image/jpeg',
        maxSize + 1
      )
      
      const validation = fileService.validateDesignFile(oversizedFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('File size exceeds maximum')
    })

    it('should accept files exactly at size limit', () => {
      const maxSize = 10 * 1024 * 1024
      const maxSizeFile = createMockFile(
        'content',
        'large.jpg',
        'image/jpeg',
        maxSize
      )
      
      const validation = fileService.validateDesignFile(maxSizeFile)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toBeUndefined()
    })

    it('should accept JPEG files', () => {
      const jpegFile = createMockFile('jpeg content', 'test.jpg', 'image/jpeg')
      
      const validation = fileService.validateDesignFile(jpegFile)
      
      expect(validation.valid).toBe(true)
    })

    it('should accept PNG files', () => {
      const pngFile = createMockFile('png content', 'test.png', 'image/png')
      
      const validation = fileService.validateDesignFile(pngFile)
      
      expect(validation.valid).toBe(true)
    })

    it('should accept SVG files', () => {
      const svgFile = createMockFile('svg content', 'test.svg', 'image/svg+xml')
      
      const validation = fileService.validateDesignFile(svgFile)
      
      expect(validation.valid).toBe(true)
    })

    it('should accept PDF files', () => {
      const pdfFile = createMockFile('pdf content', 'test.pdf', 'application/pdf')
      
      const validation = fileService.validateDesignFile(pdfFile)
      
      expect(validation.valid).toBe(true)
    })

    it('should return multiple errors for multiple violations', () => {
      // File that is both wrong type and too large
      const invalidFile = createMockFile(
        'content',
        'test.txt',
        'text/plain',
        11 * 1024 * 1024
      )
      
      const validation = fileService.validateDesignFile(invalidFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toBeDefined()
      expect(validation.errors!.length).toBe(2)
      expect(validation.errors!.some(e => e.includes('type'))).toBe(true)
      expect(validation.errors!.some(e => e.includes('size'))).toBe(true)
    })
  })

  describe('Upload Error Handling', () => {
    it('should throw error when validation fails', async () => {
      const invalidFile = createMockFile('content', 'test.txt', 'text/plain')
      
      await expect(fileService.uploadDesign(invalidFile)).rejects.toThrow(
        'File validation failed'
      )
    })

    it('should throw error when file is empty', async () => {
      const emptyFile = createMockFile('', 'empty.jpg', 'image/jpeg', 0)
      
      await expect(fileService.uploadDesign(emptyFile)).rejects.toThrow(
        'File validation failed'
      )
    })

    it('should throw error when file is too large', async () => {
      const largeFile = createMockFile(
        'content',
        'large.jpg',
        'image/jpeg',
        11 * 1024 * 1024
      )
      
      await expect(fileService.uploadDesign(largeFile)).rejects.toThrow(
        'File validation failed'
      )
    })
  })

  describe('URL Handling', () => {
    it('should extract path from valid Supabase URL', () => {
      const service = new FileService()
      const url = 'https://example.supabase.co/storage/v1/object/public/designs/test.jpg'
      
      // Use reflection to access private method for testing
      const extractPath = (service as any).extractPathFromUrl.bind(service)
      const path = extractPath(url)
      
      expect(path).toBe('test.jpg')
    })

    it('should extract nested path from URL', () => {
      const service = new FileService()
      const url = 'https://example.supabase.co/storage/v1/object/public/designs/folder/test.jpg'
      
      const extractPath = (service as any).extractPathFromUrl.bind(service)
      const path = extractPath(url)
      
      expect(path).toBe('folder/test.jpg')
    })

    it('should return null for invalid URL', () => {
      const service = new FileService()
      const invalidUrl = 'not-a-url'
      
      const extractPath = (service as any).extractPathFromUrl.bind(service)
      const path = extractPath(invalidUrl)
      
      expect(path).toBeNull()
    })

    it('should return null for URL without bucket name', () => {
      const service = new FileService()
      const url = 'https://example.com/some/path/test.jpg'
      
      const extractPath = (service as any).extractPathFromUrl.bind(service)
      const path = extractPath(url)
      
      expect(path).toBeNull()
    })

    it('should throw error when deleting with invalid URL', async () => {
      await expect(fileService.deleteDesign('invalid-url')).rejects.toThrow(
        'Invalid file URL'
      )
    })
  })

  describe('Public URL Generation', () => {
    it('should generate public URL for given path', () => {
      // Skip if Supabase is not configured
      if (!supabaseAdmin) {
        console.warn('Skipping test: Supabase is not configured')
        return
      }
      
      const path = 'designs/test.jpg'
      const url = fileService.getPublicUrl(path)
      
      expect(url).toBeDefined()
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('should generate different URLs for different paths', () => {
      // Skip if Supabase is not configured
      if (!supabaseAdmin) {
        console.warn('Skipping test: Supabase is not configured')
        return
      }
      
      const url1 = fileService.getPublicUrl('designs/test1.jpg')
      const url2 = fileService.getPublicUrl('designs/test2.jpg')
      
      expect(url1).not.toBe(url2)
    })
  })

  describe('File Size Validation Messages', () => {
    it('should include actual file size in error message', () => {
      const fileSize = 15 * 1024 * 1024 // 15MB
      const largeFile = createMockFile(
        'content',
        'large.jpg',
        'image/jpeg',
        fileSize
      )
      
      const validation = fileService.validateDesignFile(largeFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('15.00MB')
    })

    it('should include maximum size in error message', () => {
      const largeFile = createMockFile(
        'content',
        'large.jpg',
        'image/jpeg',
        11 * 1024 * 1024
      )
      
      const validation = fileService.validateDesignFile(largeFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('10MB')
    })
  })

  describe('File Type Validation Messages', () => {
    it('should list allowed file types in error message', () => {
      const textFile = createMockFile('content', 'test.txt', 'text/plain')
      
      const validation = fileService.validateDesignFile(textFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('JPEG')
      expect(validation.errors?.[0]).toContain('PNG')
      expect(validation.errors?.[0]).toContain('SVG')
      expect(validation.errors?.[0]).toContain('PDF')
    })

    it('should include actual file type in error message', () => {
      const textFile = createMockFile('content', 'test.txt', 'text/plain')
      
      const validation = fileService.validateDesignFile(textFile)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors?.[0]).toContain('text/plain')
    })
  })
})
