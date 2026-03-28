import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'

describe('Fast-check Property-Based Testing', () => {
  it('should run property-based tests', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n
      })
    )
  })

  it('should verify string concatenation properties', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const result = a + b
        return result.startsWith(a) && result.endsWith(b)
      })
    )
  })
})
