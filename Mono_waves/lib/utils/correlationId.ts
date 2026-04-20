/**
 * Correlation ID Utility
 * 
 * Generates unique correlation IDs for tracing related events across the system.
 * Uses UUID v4 format for globally unique identifiers.
 * 
 * Requirements: 4.2
 */

import { randomUUID } from 'crypto'

/**
 * Generate a new correlation ID using UUID v4 format
 * 
 * @returns A unique correlation ID string (UUID v4)
 * 
 * @example
 * const correlationId = generateCorrelationId()
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateCorrelationId(): string {
  return randomUUID()
}

/**
 * Validate if a string is a valid UUID v4 correlation ID
 * 
 * @param id - The string to validate
 * @returns True if the string is a valid UUID v4, false otherwise
 */
export function isValidCorrelationId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(id)
}
