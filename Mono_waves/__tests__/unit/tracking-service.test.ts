/**
 * Tracking Service Unit Tests
 * 
 * Tests tracking number validation and processing logic.
 */

import { trackingService } from '@/lib/services/trackingService'

describe('TrackingService', () => {
  describe('validateTrackingNumber', () => {
    describe('USPS tracking numbers', () => {
      it('should validate 20-digit USPS tracking numbers', () => {
        const validNumbers = [
          '94001234567890123456',
          '92055000000000000000',
          '93001234567890123456',
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'USPS')).toBe(true)
        })
      })

      it('should validate USPS international format', () => {
        const validNumbers = [
          'EC123456789US',
          'CP987654321US',
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'USPS')).toBe(true)
        })
      })

      it('should reject invalid USPS tracking numbers', () => {
        const invalidNumbers = [
          '1234567890', // Too short
          'ABC123456789', // Wrong format
          '85001234567890123456', // Wrong prefix
        ]

        invalidNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'USPS')).toBe(false)
        })
      })
    })

    describe('UPS tracking numbers', () => {
      it('should validate UPS tracking numbers', () => {
        const validNumbers = [
          '1Z999AA10123456784',
          '1Z12345E0205271688',
          '1Z12345E6605272234',
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'UPS')).toBe(true)
        })
      })

      it('should reject invalid UPS tracking numbers', () => {
        const invalidNumbers = [
          '1Z999AA1', // Too short
          '2Z999AA10123456784', // Wrong prefix
          '1Z999AA101234567841', // Too long
        ]

        invalidNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'UPS')).toBe(false)
        })
      })
    })

    describe('FedEx tracking numbers', () => {
      it('should validate 12-digit FedEx tracking numbers', () => {
        const validNumbers = [
          '123456789012',
          '987654321098',
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'FedEx')).toBe(true)
        })
      })

      it('should validate 15-digit FedEx tracking numbers', () => {
        const validNumbers = [
          '123456789012345',
          '987654321098765',
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'FedEx')).toBe(true)
        })
      })

      it('should reject invalid FedEx tracking numbers', () => {
        const invalidNumbers = [
          '12345', // Too short
          '12345678901234', // Wrong length (14 digits)
          'ABC123456789012', // Contains letters
        ]

        invalidNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'FedEx')).toBe(false)
        })
      })
    })

    describe('DHL tracking numbers', () => {
      it('should validate DHL tracking numbers', () => {
        const validNumbers = [
          '1234567890', // 10 digits
          '12345678901', // 11 digits
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'DHL')).toBe(true)
        })
      })

      it('should reject invalid DHL tracking numbers', () => {
        const invalidNumbers = [
          '123456789', // Too short (9 digits)
          '123456789012', // Too long (12 digits)
          'ABC1234567', // Contains letters
        ]

        invalidNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'DHL')).toBe(false)
        })
      })
    })

    describe('Unknown carriers', () => {
      it('should accept reasonable tracking numbers for unknown carriers', () => {
        const validNumbers = [
          '12345678', // 8 characters (minimum)
          'ABC123DEF456GHI789JKL012MNO', // 27 characters
          'TRACK-12345-67890', // With dashes
        ]

        validNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'Unknown Carrier')).toBe(true)
        })
      })

      it('should reject very short or very long tracking numbers', () => {
        const invalidNumbers = [
          '1234567', // Too short (7 characters)
          'A'.repeat(31), // Too long (31 characters)
        ]

        invalidNumbers.forEach(number => {
          expect(trackingService.validateTrackingNumber(number, 'Unknown Carrier')).toBe(false)
        })
      })
    })

    it('should handle tracking numbers with spaces', () => {
      // Spaces should be removed before validation
      expect(trackingService.validateTrackingNumber('1Z 999 AA1 01 2345 6784', 'UPS')).toBe(true)
      expect(trackingService.validateTrackingNumber('9400 1234 5678 9012 3456', 'USPS')).toBe(true)
    })

    it('should reject empty or null inputs', () => {
      expect(trackingService.validateTrackingNumber('', 'USPS')).toBe(false)
      expect(trackingService.validateTrackingNumber('123456789', '')).toBe(false)
    })
  })
})
