import { describe, it, expect } from '@jest/globals'

describe('Project Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have TypeScript configured correctly', () => {
    const testValue: string = 'test'
    expect(typeof testValue).toBe('string')
  })
})
