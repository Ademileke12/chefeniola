import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Validation result for file uploads
 */
export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

/**
 * Allowed image file types for design uploads
 */
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'application/pdf',
]

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Storage bucket name for design files
 */
const DESIGN_BUCKET = 'designs'

/**
 * File service for managing design file uploads to Supabase Storage
 */
export class FileService {
  /**
   * Validate a design file before upload
   * @param file - The file to validate
   * @returns Validation result with any errors
   */
  validateDesignFile(file: File): ValidationResult {
    const errors: string[] = []

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push(
        `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, SVG, PDF`
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `File size exceeds maximum: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      )
    }

    // Check file has content
    if (file.size === 0) {
      errors.push('File is empty')
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Upload a design file to Supabase Storage
   * @param file - The file to upload
   * @param productId - Optional product ID to organize files
   * @returns Public URL of the uploaded file
   * @throws Error if validation fails or upload fails
   */
  async uploadDesign(file: File, productId?: string): Promise<string> {
    console.log('Starting file upload:', {
      name: file.name,
      type: file.type,
      size: file.size,
      productId
    })
    
    // Validate file
    const validation = this.validateDesignFile(file)
    if (!validation.valid) {
      console.error('File validation failed:', validation.errors)
      throw new Error(`File validation failed: ${validation.errors?.join(', ')}`)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`
    
    // Organize by product ID if provided
    const filePath = productId 
      ? `designs/${productId}/${filename}`
      : `designs/${filename}`

    console.log('Generated file path:', filePath)

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('Uploading to Supabase Storage...')
    console.log('Bucket:', DESIGN_BUCKET)
    console.log('Path:', filePath)
    console.log('Content-Type:', file.type)

    // Upload to Supabase Storage with public access
    const { data, error } = await supabaseAdmin.storage
      .from(DESIGN_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage error:', error)
      // Provide helpful error message for common issues
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        throw new Error(
          `Storage bucket "${DESIGN_BUCKET}" not found. Please create the bucket in Supabase Storage. See STORAGE_SETUP.md for instructions.`
        )
      }
      throw new Error(`File upload failed: ${error.message}`)
    }

    console.log('Upload successful, getting public URL...')

    // Get public URL
    const publicUrl = this.getPublicUrl(data.path)
    
    console.log('Public URL:', publicUrl)
    
    // Verify URL is accessible
    const isAccessible = await this.verifyUrlAccessible(publicUrl)
    if (!isAccessible) {
      console.warn('Warning: Uploaded file URL may not be publicly accessible')
    }
    
    return publicUrl
  }

  /**
   * Verify that a URL is publicly accessible
   * @param url - The URL to check
   * @returns True if accessible, false otherwise
   */
  async verifyUrlAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      console.error('URL accessibility check failed:', error)
      return false
    }
  }

  /**
   * Delete a design file from Supabase Storage
   * @param url - The public URL of the file to delete
   * @throws Error if deletion fails
   */
  async deleteDesign(url: string): Promise<void> {
    // Extract file path from URL
    const filePath = this.extractPathFromUrl(url)
    
    if (!filePath) {
      throw new Error('Invalid file URL')
    }

    // Delete from Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from(DESIGN_BUCKET)
      .remove([filePath])

    if (error) {
      throw new Error(`File deletion failed: ${error.message}`)
    }
  }

  /**
   * Get public URL for a file path
   * @param path - The storage path of the file
   * @returns Public URL
   */
  getPublicUrl(path: string): string {
    const { data } = supabaseAdmin.storage
      .from(DESIGN_BUCKET)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Extract file path from public URL
   * @param url - The public URL
   * @returns File path or null if invalid
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/')
      
      // Find the bucket name in the path
      const bucketIndex = pathParts.indexOf(DESIGN_BUCKET)
      if (bucketIndex === -1) {
        return null
      }

      // Get everything after the bucket name
      const filePath = pathParts.slice(bucketIndex + 1).join('/')
      return filePath || null
    } catch {
      return null
    }
  }
}

/**
 * Singleton instance of FileService
 */
export const fileService = new FileService()
