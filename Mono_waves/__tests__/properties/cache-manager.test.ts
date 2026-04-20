/**
 * Property-Based Tests for Cache Manager
 * Feature: gelato-catalog-expansion
 * 
 * These tests validate universal correctness properties for the cache manager service.
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import * as fc from 'fast-check'
import { InMemoryCacheManager, CachedData } from '@/lib/services/cacheManager'

describe('Cache Manager Properties', () => {
  let cacheManager: InMemoryCacheManager

  beforeEach(() => {
    cacheManager = new InMemoryCacheManager()
  })

  /**
   * Property 4: Cache Serves Within TTL
   * 
   * For any catalog request made within 24 hours of the last fetch, the system should
   * serve data from cache without making an API call, and the response time should be
   * under 1 second.
   * 
   * Validates: Requirements 2.2, 2.4, 6.3
   */
  it('Property 4: Cache Serves Within TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // cache key
        fc.anything(), // arbitrary data to cache
        fc.integer({ min: 1, max: 86400 }), // TTL in seconds (up to 24 hours)
        async (key, data, ttl) => {
          // Set cache with TTL
          await cacheManager.set(key, data, ttl)

          // Measure retrieval time
          const startTime = Date.now()
          const cached = await cacheManager.get(key)
          const retrievalTime = Date.now() - startTime

          // Verify data is served from cache
          expect(cached).not.toBeNull()
          expect(cached?.data).toEqual(data)

          // Verify response time is under 1 second (1000ms)
          expect(retrievalTime).toBeLessThan(1000)

          // Verify cache is still valid
          const isValid = await cacheManager.isValid(key)
          expect(isValid).toBe(true)

          // Verify cache metadata exists
          expect(cached?.cachedAt).toBeInstanceOf(Date)
          expect(cached?.expiresAt).toBeInstanceOf(Date)

          // Verify expiration is in the future
          const now = new Date()
          expect(cached!.expiresAt.getTime()).toBeGreaterThan(now.getTime())
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Property 5: Cache Metadata Completeness
   * 
   * For any cached catalog entry, it should contain metadata fields: cachedAt timestamp,
   * expiresAt timestamp, and version identifier.
   * 
   * Validates: Requirements 2.5
   */
  it('Property 5: Cache Metadata Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // cache key
        fc.record({
          products: fc.array(fc.record({
            uid: fc.string(),
            name: fc.string(),
            type: fc.string(),
          })),
          metadata: fc.record({
            totalCount: fc.integer({ min: 0 }),
            source: fc.constantFrom('cache', 'api'),
          }),
        }), // catalog-like data structure
        fc.integer({ min: 1, max: 86400 }), // TTL
        async (key, catalogData, ttl) => {
          // Set cache
          await cacheManager.set(key, catalogData, ttl)

          // Retrieve cached data
          const cached = await cacheManager.get(key)

          // Verify cached data exists
          expect(cached).not.toBeNull()

          // Verify all required metadata fields are present
          expect(cached).toHaveProperty('data')
          expect(cached).toHaveProperty('cachedAt')
          expect(cached).toHaveProperty('expiresAt')

          // Verify metadata field types
          expect(cached!.cachedAt).toBeInstanceOf(Date)
          expect(cached!.expiresAt).toBeInstanceOf(Date)

          // Verify data integrity
          expect(cached!.data).toEqual(catalogData)

          // Verify timestamp logic
          const cachedAtTime = cached!.cachedAt.getTime()
          const expiresAtTime = cached!.expiresAt.getTime()
          const expectedExpiration = cachedAtTime + (ttl * 1000)

          // Allow 10ms tolerance for timing differences
          expect(Math.abs(expiresAtTime - expectedExpiration)).toBeLessThan(10)

          // Verify cachedAt is not in the future
          const now = Date.now()
          expect(cachedAtTime).toBeLessThanOrEqual(now)

          // Verify expiresAt is in the future (for valid TTL)
          expect(expiresAtTime).toBeGreaterThan(cachedAtTime)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Cache Expiration Consistency
   * 
   * For any cache entry that has expired, all cache operations (get, isValid)
   * should consistently report the entry as invalid/non-existent.
   */
  it('Additional Property: Cache Expiration Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // cache key
        fc.anything(), // arbitrary data
        async (key, data) => {
          // Set cache with very short TTL (1 millisecond)
          await cacheManager.set(key, data, 0.001)

          // Wait for expiration
          await new Promise(resolve => setTimeout(resolve, 10))

          // Verify get returns null
          const cached = await cacheManager.get(key)
          expect(cached).toBeNull()

          // Verify isValid returns false
          const isValid = await cacheManager.isValid(key)
          expect(isValid).toBe(false)

          // Verify subsequent get still returns null
          const cachedAgain = await cacheManager.get(key)
          expect(cachedAgain).toBeNull()
        }
      ),
      {
        numRuns: 50, // Reduced runs due to setTimeout delays
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Cache Invalidation Completeness
   * 
   * For any cache entry that is invalidated, all subsequent operations
   * should treat it as non-existent.
   */
  it('Additional Property: Cache Invalidation Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // cache key
        fc.anything(), // arbitrary data
        fc.integer({ min: 1, max: 86400 }), // TTL
        async (key, data, ttl) => {
          // Set cache
          await cacheManager.set(key, data, ttl)

          // Verify cache exists
          const beforeInvalidation = await cacheManager.get(key)
          expect(beforeInvalidation).not.toBeNull()

          // Invalidate cache
          await cacheManager.invalidate(key)

          // Verify get returns null
          const afterInvalidation = await cacheManager.get(key)
          expect(afterInvalidation).toBeNull()

          // Verify isValid returns false
          const isValid = await cacheManager.isValid(key)
          expect(isValid).toBe(false)

          // Verify can set new data with same key
          const newData = { new: 'data' }
          await cacheManager.set(key, newData, ttl)
          const newCached = await cacheManager.get(key)
          expect(newCached?.data).toEqual(newData)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Cache Key Isolation
   * 
   * For any two different cache keys, operations on one key should not
   * affect the other key's cached data.
   */
  it('Additional Property: Cache Key Isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // key1
        fc.string({ minLength: 1, maxLength: 50 }), // key2
        fc.anything(), // data1
        fc.anything(), // data2
        fc.integer({ min: 1, max: 86400 }), // ttl
        async (key1, key2, data1, data2, ttl) => {
          // Skip if keys are the same
          fc.pre(key1 !== key2)

          // Set both caches
          await cacheManager.set(key1, data1, ttl)
          await cacheManager.set(key2, data2, ttl)

          // Verify both exist independently
          const cached1 = await cacheManager.get(key1)
          const cached2 = await cacheManager.get(key2)

          expect(cached1?.data).toEqual(data1)
          expect(cached2?.data).toEqual(data2)

          // Invalidate key1
          await cacheManager.invalidate(key1)

          // Verify key1 is gone but key2 remains
          const afterInvalidation1 = await cacheManager.get(key1)
          const afterInvalidation2 = await cacheManager.get(key2)

          expect(afterInvalidation1).toBeNull()
          expect(afterInvalidation2?.data).toEqual(data2)
        }
      ),
      {
        numRuns: 100,
        verbose: false,
      }
    )
  })
})
