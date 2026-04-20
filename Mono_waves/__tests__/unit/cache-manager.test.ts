/**
 * Unit tests for CacheManager
 * Tests cache operations: get, set, invalidate, isValid
 */

import { InMemoryCacheManager, CachedData } from '@/lib/services/cacheManager'

describe('CacheManager', () => {
  let cacheManager: InMemoryCacheManager

  beforeEach(() => {
    cacheManager = new InMemoryCacheManager()
  })

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const key = 'test:key'
      const data = { value: 'test data' }
      const ttl = 3600 // 1 hour

      await cacheManager.set(key, data, ttl)
      const cached = await cacheManager.get<typeof data>(key)

      expect(cached).not.toBeNull()
      expect(cached?.data).toEqual(data)
      expect(cached?.cachedAt).toBeInstanceOf(Date)
      expect(cached?.expiresAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent key', async () => {
      const cached = await cacheManager.get('non-existent')
      expect(cached).toBeNull()
    })

    it('should store data with default TTL of 24 hours', async () => {
      const key = 'gelato:catalog:v1'
      const data = { products: [] }

      await cacheManager.set(key, data)
      const cached = await cacheManager.get(key)

      expect(cached).not.toBeNull()
      
      // Verify TTL is approximately 24 hours (86400 seconds)
      const ttlMs = cached!.expiresAt.getTime() - cached!.cachedAt.getTime()
      const ttlSeconds = ttlMs / 1000
      expect(ttlSeconds).toBeCloseTo(86400, 0)
    })

    it('should handle different data types', async () => {
      // String
      await cacheManager.set('string', 'hello')
      expect((await cacheManager.get('string'))?.data).toBe('hello')

      // Number
      await cacheManager.set('number', 42)
      expect((await cacheManager.get('number'))?.data).toBe(42)

      // Array
      await cacheManager.set('array', [1, 2, 3])
      expect((await cacheManager.get('array'))?.data).toEqual([1, 2, 3])

      // Object
      await cacheManager.set('object', { a: 1, b: 2 })
      expect((await cacheManager.get('object'))?.data).toEqual({ a: 1, b: 2 })
    })
  })

  describe('cache expiration', () => {
    it('should return null for expired cache', async () => {
      const key = 'test:expire'
      const data = { value: 'will expire' }
      const ttl = 0.001 // 1 millisecond

      await cacheManager.set(key, data, ttl)
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      const cached = await cacheManager.get(key)
      expect(cached).toBeNull()
    })

    it('should remove expired entry from cache', async () => {
      const key = 'test:cleanup'
      const data = { value: 'cleanup test' }
      const ttl = 0.001

      await cacheManager.set(key, data, ttl)
      await new Promise(resolve => setTimeout(resolve, 10))

      // First get should return null and clean up
      await cacheManager.get(key)
      
      // Verify entry is removed
      const isValid = await cacheManager.isValid(key)
      expect(isValid).toBe(false)
    })

    it('should not expire before TTL', async () => {
      const key = 'test:valid'
      const data = { value: 'still valid' }
      const ttl = 10 // 10 seconds

      await cacheManager.set(key, data, ttl)
      
      // Check immediately
      const cached = await cacheManager.get(key)
      expect(cached).not.toBeNull()
      expect(cached?.data).toEqual(data)
    })
  })

  describe('invalidate', () => {
    it('should remove cached data', async () => {
      const key = 'test:invalidate'
      const data = { value: 'to be removed' }

      await cacheManager.set(key, data, 3600)
      
      // Verify data exists
      let cached = await cacheManager.get(key)
      expect(cached).not.toBeNull()

      // Invalidate
      await cacheManager.invalidate(key)

      // Verify data is removed
      cached = await cacheManager.get(key)
      expect(cached).toBeNull()
    })

    it('should not throw error for non-existent key', async () => {
      await expect(cacheManager.invalidate('non-existent')).resolves.not.toThrow()
    })

    it('should allow re-setting after invalidation', async () => {
      const key = 'test:reset'
      const data1 = { value: 'first' }
      const data2 = { value: 'second' }

      await cacheManager.set(key, data1, 3600)
      await cacheManager.invalidate(key)
      await cacheManager.set(key, data2, 3600)

      const cached = await cacheManager.get(key)
      expect(cached?.data).toEqual(data2)
    })
  })

  describe('isValid', () => {
    it('should return true for valid cache', async () => {
      const key = 'test:valid-check'
      const data = { value: 'valid' }

      await cacheManager.set(key, data, 3600)
      const isValid = await cacheManager.isValid(key)
      
      expect(isValid).toBe(true)
    })

    it('should return false for non-existent key', async () => {
      const isValid = await cacheManager.isValid('non-existent')
      expect(isValid).toBe(false)
    })

    it('should return false for expired cache', async () => {
      const key = 'test:expired-check'
      const data = { value: 'expired' }
      const ttl = 0.001

      await cacheManager.set(key, data, ttl)
      await new Promise(resolve => setTimeout(resolve, 10))

      const isValid = await cacheManager.isValid(key)
      expect(isValid).toBe(false)
    })

    it('should return false after invalidation', async () => {
      const key = 'test:invalidated-check'
      const data = { value: 'invalidated' }

      await cacheManager.set(key, data, 3600)
      await cacheManager.invalidate(key)

      const isValid = await cacheManager.isValid(key)
      expect(isValid).toBe(false)
    })
  })

  describe('cache key format', () => {
    it('should work with gelato catalog cache key format', async () => {
      const key = 'gelato:catalog:v1'
      const data = {
        products: [
          { uid: 'product1', name: 'Test Product' }
        ],
        metadata: {
          totalCount: 1,
          source: 'api'
        }
      }

      await cacheManager.set(key, data, 86400)
      const cached = await cacheManager.get(key)

      expect(cached).not.toBeNull()
      expect(cached?.data).toEqual(data)
    })
  })

  describe('concurrent operations', () => {
    it('should handle multiple keys independently', async () => {
      const key1 = 'test:key1'
      const key2 = 'test:key2'
      const data1 = { value: 'data1' }
      const data2 = { value: 'data2' }

      await cacheManager.set(key1, data1, 3600)
      await cacheManager.set(key2, data2, 3600)

      const cached1 = await cacheManager.get(key1)
      const cached2 = await cacheManager.get(key2)

      expect(cached1?.data).toEqual(data1)
      expect(cached2?.data).toEqual(data2)
    })

    it('should not affect other keys when invalidating one', async () => {
      const key1 = 'test:keep'
      const key2 = 'test:remove'
      const data1 = { value: 'keep this' }
      const data2 = { value: 'remove this' }

      await cacheManager.set(key1, data1, 3600)
      await cacheManager.set(key2, data2, 3600)
      await cacheManager.invalidate(key2)

      const cached1 = await cacheManager.get(key1)
      const cached2 = await cacheManager.get(key2)

      expect(cached1?.data).toEqual(data1)
      expect(cached2).toBeNull()
    })
  })
})
