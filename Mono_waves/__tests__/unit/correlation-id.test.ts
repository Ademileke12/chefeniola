/**
 * Unit tests for Correlation ID utility
 * 
 * Tests the generation and validation of correlation IDs
 * 
 * Requirements: 4.2
 */

import { generateCorrelationId, isValidCorrelationId } from '@/lib/utils/correlationId'

describe('Correlation ID Utility', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid UUID v4 correlation ID', () => {
      const correlationId = generateCorrelationId()
      
      expect(correlationId).toBeDefined()
      expect(typeof correlationId).toBe('string')
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()
      const id3 = generateCorrelationId()
      
      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate correlation IDs with correct format', () => {
      const correlationId = generateCorrelationId()
      const parts = correlationId.split('-')
      
      expect(parts).toHaveLength(5)
      expect(parts[0]).toHaveLength(8)
      expect(parts[1]).toHaveLength(4)
      expect(parts[2]).toHaveLength(4)
      expect(parts[3]).toHaveLength(4)
      expect(parts[4]).toHaveLength(12)
      
      // Check version (4th character of 3rd group should be '4')
      expect(parts[2][0]).toBe('4')
    })
  })

  describe('isValidCorrelationId', () => {
    it('should validate correct UUID v4 correlation IDs', () => {
      const validId = generateCorrelationId()
      expect(isValidCorrelationId(validId)).toBe(true)
    })

    it('should accept valid UUID v4 strings', () => {
      const validIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ]
      
      validIds.forEach(id => {
        expect(isValidCorrelationId(id)).toBe(true)
      })
    })

    it('should reject invalid UUID formats', () => {
      const invalidIds = [
        '',
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        '550e8400-e29b-31d4-a716-446655440000', // Wrong version (3 instead of 4)
        '550e8400-e29b-51d4-a716-446655440000', // Wrong version (5 instead of 4)
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', // Invalid characters
        '550e8400e29b41d4a716446655440000', // Missing dashes
      ]
      
      invalidIds.forEach(id => {
        expect(isValidCorrelationId(id)).toBe(false)
      })
    })

    it('should be case-insensitive', () => {
      const lowerCase = '550e8400-e29b-41d4-a716-446655440000'
      const upperCase = '550E8400-E29B-41D4-A716-446655440000'
      const mixedCase = '550e8400-E29B-41d4-A716-446655440000'
      
      expect(isValidCorrelationId(lowerCase)).toBe(true)
      expect(isValidCorrelationId(upperCase)).toBe(true)
      expect(isValidCorrelationId(mixedCase)).toBe(true)
    })
  })
})
