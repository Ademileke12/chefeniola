/**
 * Design Export Service
 * 
 * Handles exporting design canvas to print-ready files with proper scaling
 * and uploading to storage.
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.6, 7.7
 */

import * as fabric from 'fabric'

/**
 * Export a Fabric.js canvas to a high-resolution PNG blob
 * 
 * @param canvas - The Fabric.js canvas to export
 * @param targetDPI - Target DPI for print (default 300)
 * @returns Promise<Blob> - PNG blob with transparent background
 * 
 * Requirements:
 * - 7.2: Export as PNG with transparent background
 * - 7.3: Export at 300 DPI resolution
 * - 7.4: Match Gelato print area dimensions
 */
export async function exportCanvasToPNG(
  canvas: fabric.Canvas,
  targetDPI: number = 300
): Promise<Blob> {
  // Calculate scale factor for 300 DPI
  // Screen DPI: 96 (standard)
  // Target DPI: 300 (print quality)
  // Scale factor: 300 / 96 = 3.125
  const screenDPI = 96
  const scaleFactor = targetDPI / screenDPI

  // Get original canvas dimensions
  const originalWidth = canvas.width || 400
  const originalHeight = canvas.height || 500

  // Calculate scaled dimensions
  const scaledWidth = originalWidth * scaleFactor
  const scaledHeight = originalHeight * scaleFactor

  // Export canvas to data URL with scaling
  // multiplier applies the scale factor to achieve higher resolution
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1.0,
    multiplier: scaleFactor,
    enableRetinaScaling: false, // We handle scaling manually
  })

  // Convert data URL to Blob
  const blob = await dataURLToBlob(dataURL)

  return blob
}

/**
 * Convert a data URL to a Blob
 */
async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const response = await fetch(dataURL)
  const blob = await response.blob()
  return blob
}

/**
 * Upload a design file blob to storage
 * 
 * @param blob - The file blob to upload
 * @param filename - Optional filename (will be generated if not provided)
 * @returns Promise<string> - Public URL of uploaded file
 * 
 * Requirements:
 * - 7.6: Upload to storage service
 * - 7.7: Return public URL
 */
export async function uploadDesignFile(
  blob: Blob,
  filename?: string
): Promise<string> {
  // Generate filename if not provided
  const finalFilename = filename || `design-${Date.now()}.png`

  // Convert blob to File object
  const file = new File([blob], finalFilename, { type: 'image/png' })

  // Upload using existing upload API
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  const result = await response.json()
  return result.url
}

/**
 * Export canvas and upload to storage in one operation
 * 
 * @param canvas - The Fabric.js canvas to export
 * @param targetDPI - Target DPI for print (default 300)
 * @param filename - Optional filename
 * @returns Promise<string> - Public URL of uploaded file
 */
export async function exportAndUpload(
  canvas: fabric.Canvas,
  targetDPI: number = 300,
  filename?: string
): Promise<string> {
  // Export canvas to PNG blob
  const blob = await exportCanvasToPNG(canvas, targetDPI)

  // Upload to storage
  const url = await uploadDesignFile(blob, filename)

  return url
}

/**
 * Get the dimensions of an exported canvas
 * 
 * @param canvas - The Fabric.js canvas
 * @param targetDPI - Target DPI for print (default 300)
 * @returns Object with width and height in pixels
 */
export function getExportDimensions(
  canvas: fabric.Canvas,
  targetDPI: number = 300
): { width: number; height: number } {
  const screenDPI = 96
  const scaleFactor = targetDPI / screenDPI

  const originalWidth = canvas.width || 400
  const originalHeight = canvas.height || 500

  return {
    width: Math.round(originalWidth * scaleFactor),
    height: Math.round(originalHeight * scaleFactor),
  }
}
