import { describe, it, expect } from '@jest/globals'
import { fontService } from '@/lib/services/fontService'

/**
 * Unit tests for Font Service
 * Feature: design-editor-system
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */
describe('Font Service Unit Tests', () => {
  describe('Font Library', () => {
    it('should provide at least 20 fonts', () => {
      const fonts = fontService.getFontList()
      
      expect(fonts.length).toBeGreaterThanOrEqual(20)
    })

    it('should include serif fonts', () => {
      const fonts = fontService.getFontList()
      const serifFonts = fonts.filter(f => f.category === 'serif')
      
      expect(serifFonts.length).toBeGreaterThan(0)
    })

    it('should include sans-serif fonts', () => {
      const fonts = fontService.getFontList()
      const sansSerifFonts = fonts.filter(f => f.category === 'sans-serif')
      
      expect(sansSerifFonts.length).toBeGreaterThan(0)
    })

    it('should include display fonts', () => {
      const fonts = fontService.getFontList()
      const displayFonts = fonts.filter(f => f.category === 'display')
      
      expect(displayFonts.length).toBeGreaterThan(0)
    })

    it('should include handwriting fonts', () => {
      const fonts = fontService.getFontList()
      const handwritingFonts = fonts.filter(f => f.category === 'handwriting')
      
      expect(handwritingFonts.length).toBeGreaterThan(0)
    })

    it('should have all required font properties', () => {
      const fonts = fontService.getFontList()
      
      fonts.forEach(font => {
        expect(font.family).toBeDefined()
        expect(typeof font.family).toBe('string')
        expect(font.family.length).toBeGreaterThan(0)
        
        expect(font.category).toBeDefined()
        expect(['serif', 'sans-serif', 'display', 'handwriting']).toContain(font.category)
        
        expect(font.variants).toBeDefined()
        expect(Array.isArray(font.variants)).toBe(true)
        expect(font.variants.length).toBeGreaterThan(0)
        
        expect(font.googleFontsUrl).toBeDefined()
        expect(typeof font.googleFontsUrl).toBe('string')
        expect(font.googleFontsUrl).toContain('fonts.googleapis.com')
      })
    })

    it('should return a new array instance each time', () => {
      const fonts1 = fontService.getFontList()
      const fonts2 = fontService.getFontList()
      
      expect(fonts1).not.toBe(fonts2) // Different array instances
      expect(fonts1).toEqual(fonts2) // Same content
    })

    it('should include specific curated fonts', () => {
      const fonts = fontService.getFontList()
      const fontFamilies = fonts.map(f => f.family)
      
      // Check for some expected fonts from each category
      expect(fontFamilies).toContain('Playfair Display') // serif
      expect(fontFamilies).toContain('Inter') // sans-serif
      expect(fontFamilies).toContain('Bebas Neue') // display
      expect(fontFamilies).toContain('Dancing Script') // handwriting
    })
  })

  describe('Font Loading State', () => {
    it('should report font as not loaded initially', () => {
      const isLoaded = fontService.isFontLoaded('Montserrat')
      
      expect(isLoaded).toBe(false)
    })

    it('should return false for unknown font', () => {
      const isLoaded = fontService.isFontLoaded('NonExistentFont')
      
      expect(isLoaded).toBe(false)
    })
  })

  describe('Font Loading - Browser Environment', () => {
    it('should handle loading in test environment', async () => {
      // In test environment (Node.js), font loading should complete without errors
      await expect(fontService.loadFont('Montserrat')).resolves.not.toThrow()
      
      // Font should be marked as loaded even in test environment
      expect(fontService.isFontLoaded('Montserrat')).toBe(true)
    })

    it('should handle multiple loads of same font', async () => {
      // Load the same font twice
      await fontService.loadFont('Inter')
      await fontService.loadFont('Inter')
      
      // Should not throw and font should be loaded
      expect(fontService.isFontLoaded('Inter')).toBe(true)
    })
  })

  describe('Font Validation', () => {
    it('should handle loading unknown font gracefully', async () => {
      // Should not throw, just log warning
      await expect(fontService.loadFont('UnknownFont')).resolves.not.toThrow()
    })

    it('should handle empty font family name', async () => {
      await expect(fontService.loadFont('')).resolves.not.toThrow()
    })
  })

  describe('Google Fonts URL Format', () => {
    it('should have valid Google Fonts URLs for all fonts', () => {
      const fonts = fontService.getFontList()
      
      fonts.forEach(font => {
        expect(font.googleFontsUrl).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/)
        expect(font.googleFontsUrl).toContain('display=swap')
      })
    })

    it('should have properly encoded font family names in URLs', () => {
      const fonts = fontService.getFontList()
      
      fonts.forEach(font => {
        // Font families with spaces should be encoded with +
        if (font.family.includes(' ')) {
          const encodedName = font.family.replace(/ /g, '+')
          expect(font.googleFontsUrl).toContain(encodedName)
        }
      })
    })
  })

  describe('Font Categories Distribution', () => {
    it('should have balanced distribution across categories', () => {
      const fonts = fontService.getFontList()
      const categoryCounts = {
        serif: 0,
        'sans-serif': 0,
        display: 0,
        handwriting: 0
      }

      fonts.forEach(font => {
        categoryCounts[font.category]++
      })

      // Each category should have at least 3 fonts for variety
      expect(categoryCounts.serif).toBeGreaterThanOrEqual(3)
      expect(categoryCounts['sans-serif']).toBeGreaterThanOrEqual(3)
      expect(categoryCounts.display).toBeGreaterThanOrEqual(3)
      expect(categoryCounts.handwriting).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Font Variants', () => {
    it('should have at least one variant for each font', () => {
      const fonts = fontService.getFontList()
      
      fonts.forEach(font => {
        expect(font.variants.length).toBeGreaterThan(0)
      })
    })

    it('should have valid weight values in variants', () => {
      const fonts = fontService.getFontList()
      const validWeights = ['100', '200', '300', '400', '500', '600', '700', '800', '900']
      
      fonts.forEach(font => {
        font.variants.forEach(variant => {
          expect(validWeights).toContain(variant)
        })
      })
    })
  })
})
