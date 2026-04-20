/**
 * Product UID Validator
 * 
 * Validates Gelato product UIDs against the Gelato catalog
 * 
 * Requirements: Phase 4 - Product UID Validation
 */

import { gelatoService } from '../services/gelatoService'

/**
 * Validation result for product UID
 */
export interface ProductUidValidationResult {
  isValid: boolean
  error?: string
  productDetails?: any
}

/**
 * Validate a product UID against Gelato's catalog
 * 
 * @param productUid - The Gelato product UID to validate
 * @returns Validation result with product details if valid
 */
export async function validateProductUid(
  productUid: string
): Promise<ProductUidValidationResult> {
  if (!productUid || productUid.trim() === '') {
    return {
      isValid: false,
      error: 'Product UID is required',
    }
  }

  try {
    console.log('[validateProductUid] Validating:', productUid)
    
    // Try to fetch product details from Gelato
    const productDetails = await gelatoService.getProductDetails(productUid)
    
    console.log('[validateProductUid] Validation successful for:', productUid)
    
    return {
      isValid: true,
      productDetails,
    }
  } catch (error) {
    // If the product doesn't exist or API error, return invalid
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('[validateProductUid] Validation failed:', {
      productUid,
      error: errorMessage
    })
    
    return {
      isValid: false,
      error: `Invalid product UID: ${errorMessage}`,
    }
  }
}

/**
 * Validate multiple product UIDs
 * 
 * @param productUids - Array of product UIDs to validate
 * @returns Map of product UID to validation result
 */
export async function validateProductUids(
  productUids: string[]
): Promise<Map<string, ProductUidValidationResult>> {
  const results = new Map<string, ProductUidValidationResult>()
  
  // Validate each UID
  for (const uid of productUids) {
    const result = await validateProductUid(uid)
    results.set(uid, result)
  }
  
  return results
}
