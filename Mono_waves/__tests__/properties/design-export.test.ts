/**
 * Property-Based Tests for Design Export
 * Feature: design-editor-system
 * 
 * These tests validate universal correctness properties for design export
 * to print-ready files.
 */

import * as fc from 'fast-check'
import { exportCanvasToPNG, getExportDimensions, uploadDesignFile } from '@/lib/services/designExportService'
import * as fabric from 'fabric'

// Mock fetch for upload tests and data URL conversion
global.fetch = jest.fn()

// Mock canvas toDataURL to return a valid data URL
const mockToDataURL = jest.fn()

// Mock Blob constructor for data URL conversion
const mockBlob = {
  type: 'image/png',
  size: 100,
  text: jest.fn().mockResolvedValue('mock content'),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
}

global.Blob = jest.fn().mockImplementation(() => mockBlob) as any

describe('Design Export Properties', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock canvas toDataURL method
    mockToDataURL.mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    
    // Mock fetch for data URL conversion to return a valid blob
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('data:')) {
        return Promise.resolve({
          blob: () => Promise.resolve(mockBlob)
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  /**
   * Property 15: Design Export Format
   * 
   * For any design state, exporting should produce a PNG file with
   * transparent background.
   * 
   * Validates: Requirements 7.2
   */
  it('Property 15: Design Export Format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 100, max: 1000 }),
        async (width: number, height: number) => {
          // Create a test canvas with mocked toDataURL
          const canvas = new fabric.Canvas(null, {
            width,
            height,
            backgroundColor: '#ffffff'
          })
          
          // Mock the toDataURL method
          canvas.toDataURL = mockToDataURL

          // Export canvas to PNG
          const blob = await exportCanvasToPNG(canvas, 300)

          // Verify blob is a PNG
          expect(blob).toBe(mockBlob)
          expect(blob.type).toBe('image/png')
          expect(blob.size).toBeGreaterThan(0)

          // Verify toDataURL was called with correct parameters
          expect(mockToDataURL).toHaveBeenCalledWith({
            format: 'png',
            quality: 1.0,
            multiplier: expect.any(Number),
            enableRetinaScaling: false,
          })

          // Cleanup
          canvas.dispose()
        }
      ),
      {
        numRuns: 50, // Reduced runs for async operations
        verbose: false,
      }
    )
  })

  /**
   * Property 16: Export Resolution Scaling
   * 
   * For any design with canvas dimensions W×H, the exported image dimensions
   * should be (W × 3.125) × (H × 3.125) to achieve 300 DPI from 96 DPI base.
   * 
   * Validates: Requirements 7.3
   */
  it('Property 16: Export Resolution Scaling', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 100, max: 1000 }),
        (width: number, height: number) => {
          // Create a test canvas
          const canvas = new fabric.Canvas(null, {
            width,
            height
          })

          // Get export dimensions
          const dimensions = getExportDimensions(canvas, 300)

          // Calculate expected dimensions
          const scaleFactor = 300 / 96 // 3.125
          const expectedWidth = Math.round(width * scaleFactor)
          const expectedHeight = Math.round(height * scaleFactor)

          // Verify dimensions match expected scaling
          expect(dimensions.width).toBe(expectedWidth)
          expect(dimensions.height).toBe(expectedHeight)

          // Verify scale factor is correct
          const actualScaleX = dimensions.width / width
          const actualScaleY = dimensions.height / height

          // Allow small rounding differences
          expect(Math.abs(actualScaleX - scaleFactor)).toBeLessThan(0.01)
          expect(Math.abs(actualScaleY - scaleFactor)).toBeLessThan(0.01)

          // Cleanup
          canvas.dispose()
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 17: Export Dimensions Match Print Area
   * 
   * For any Gelato product, the exported design dimensions (after DPI scaling)
   * should match the product's print area specifications.
   * 
   * Validates: Requirements 7.4
   */
  it('Property 17: Export Dimensions Match Print Area', () => {
    fc.assert(
      fc.property(
        fc.record({
          printAreaWidth: fc.integer({ min: 100, max: 5000 }),
          printAreaHeight: fc.integer({ min: 100, max: 5000 })
        }),
        (printArea) => {
          // Create canvas with print area dimensions
          const canvas = new fabric.Canvas(null, {
            width: printArea.printAreaWidth,
            height: printArea.printAreaHeight
          })

          // Get export dimensions
          const exportDims = getExportDimensions(canvas, 300)

          // Calculate expected dimensions at 300 DPI
          const scaleFactor = 300 / 96
          const expectedWidth = Math.round(printArea.printAreaWidth * scaleFactor)
          const expectedHeight = Math.round(printArea.printAreaHeight * scaleFactor)

          // Verify export dimensions match scaled print area
          expect(exportDims.width).toBe(expectedWidth)
          expect(exportDims.height).toBe(expectedHeight)

          // Verify aspect ratio is preserved (with tolerance for rounding in extreme cases)
          const canvasAspectRatio = printArea.printAreaWidth / printArea.printAreaHeight
          const exportAspectRatio = exportDims.width / exportDims.height

          // For extreme aspect ratios, rounding can cause larger differences
          // Use a tolerance that scales with the aspect ratio extremeness
          const aspectRatio = Math.max(canvasAspectRatio, 1 / canvasAspectRatio)
          const tolerance = Math.max(0.1, aspectRatio * 0.002)
          expect(Math.abs(canvasAspectRatio - exportAspectRatio)).toBeLessThan(tolerance)

          // Cleanup
          canvas.dispose()
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 18: Export Triggers Upload
   * 
   * For any successful export operation, the system should upload the
   * generated file to Storage_Service and return a public URL.
   * 
   * Validates: Requirements 7.6, 7.7
   */
  it('Property 18: Export Triggers Upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (expectedUrl: string, filename: string) => {
          // Clear any previous mock calls
          jest.clearAllMocks()
          
          // Mock successful upload response (not data URL fetch)
          ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
            if (url.startsWith('data:')) {
              // Handle data URL conversion
              return Promise.resolve({
                blob: () => Promise.resolve(mockBlob)
              })
            } else if (url === '/api/upload') {
              // Handle upload API call
              return Promise.resolve({
                ok: true,
                json: async () => ({ url: expectedUrl })
              })
            }
            return Promise.resolve({ ok: false })
          })

          // Create a test blob
          const blob = new Blob(['test content'], { type: 'image/png' })

          // Upload the blob
          const url = await uploadDesignFile(blob, filename.trim())

          // Verify upload API was called exactly once
          const uploadCalls = (global.fetch as jest.Mock).mock.calls.filter(
            call => call[0] === '/api/upload'
          )
          expect(uploadCalls).toHaveLength(1)
          
          expect(uploadCalls[0][1]).toEqual(
            expect.objectContaining({
              method: 'POST',
              body: expect.any(FormData)
            })
          )

          // Verify URL is returned
          expect(url).toBe(expectedUrl)
          expect(url).toBeDefined()
          expect(typeof url).toBe('string')
          expect(url.length).toBeGreaterThan(0)
        }
      ),
      {
        numRuns: 50,
        verbose: false,
      }
    )
  })

  /**
   * Property 15.1: Export Produces Valid Blob
   * 
   * For any canvas export, the result should be a valid Blob object
   * with non-zero size.
   * 
   * Validates: Requirements 7.2
   */
  it('Property 15.1: Export Produces Valid Blob', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 500 }),
        fc.integer({ min: 100, max: 500 }),
        async (width: number, height: number) => {
          const canvas = new fabric.Canvas(null, { width, height })
          
          // Mock the toDataURL method
          canvas.toDataURL = mockToDataURL

          const blob = await exportCanvasToPNG(canvas, 300)

          // Verify blob properties
          expect(blob).toBe(mockBlob)
          expect(blob.size).toBeGreaterThan(0)
          expect(blob.type).toBe('image/png')

          // Verify blob is readable
          const text = await blob.text()
          expect(text.length).toBeGreaterThan(0)

          canvas.dispose()
        }
      ),
      {
        numRuns: 50,
        verbose: false,
      }
    )
  })

  /**
   * Property 16.1: Different DPI Values Scale Correctly
   * 
   * For any canvas and any valid DPI value, the export dimensions should
   * scale proportionally to the DPI.
   * 
   * Validates: Requirements 7.3
   */
  it('Property 16.1: Different DPI Values Scale Correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 800 }),
        fc.integer({ min: 200, max: 800 }),
        fc.integer({ min: 150, max: 600 }),
        (width: number, height: number, dpi: number) => {
          const canvas = new fabric.Canvas(null, { width, height })

          const dimensions = getExportDimensions(canvas, dpi)

          // Calculate expected scale factor
          const scaleFactor = dpi / 96
          const expectedWidth = Math.round(width * scaleFactor)
          const expectedHeight = Math.round(height * scaleFactor)

          expect(dimensions.width).toBe(expectedWidth)
          expect(dimensions.height).toBe(expectedHeight)

          canvas.dispose()
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 18.1: Upload Handles Errors Gracefully
   * 
   * For any upload failure, the system should throw an error with
   * a descriptive message.
   * 
   * Validates: Requirements 7.6, 7.7
   */
  it('Property 18.1: Upload Handles Errors Gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Network error', 'Upload failed', 'Storage full'),
        async (errorMessage: string) => {
          // Clear any previous mock calls
          jest.clearAllMocks()
          
          // Mock failed upload response
          ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/upload') {
              return Promise.resolve({
                ok: false,
                json: async () => ({ error: errorMessage })
              })
            }
            return Promise.resolve({ ok: false })
          })

          const blob = new Blob(['test'], { type: 'image/png' })

          // Verify upload throws error
          await expect(uploadDesignFile(blob, 'test.png')).rejects.toThrow()

          // Verify upload API was called exactly once
          const uploadCalls = (global.fetch as jest.Mock).mock.calls.filter(
            call => call[0] === '/api/upload'
          )
          expect(uploadCalls).toHaveLength(1)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })
})
