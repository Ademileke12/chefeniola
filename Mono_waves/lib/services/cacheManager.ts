/**
 * CacheManager - In-memory cache with TTL support
 * 
 * Provides caching functionality for the Gelato catalog with 24-hour TTL.
 * Implements get, set, invalidate, and isValid methods for cache management.
 */

export interface CachedData<T> {
  data: T
  cachedAt: Date
  expiresAt: Date
}

export interface CacheManager {
  get<T>(key: string): Promise<CachedData<T> | null>
  set<T>(key: string, data: T, ttl: number): Promise<void>
  invalidate(key: string): Promise<void>
  isValid(key: string): Promise<boolean>
}

/**
 * In-memory cache implementation
 * Uses a Map to store cached data with expiration timestamps
 */
class InMemoryCacheManager implements CacheManager {
  private cache: Map<string, CachedData<any>>

  constructor() {
    this.cache = new Map()
  }

  /**
   * Retrieve cached data by key
   * Returns null if key doesn't exist or data has expired
   */
  async get<T>(key: string): Promise<CachedData<T> | null> {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }

    // Check if cache has expired
    const now = new Date()
    if (now > cached.expiresAt) {
      // Remove expired entry
      this.cache.delete(key)
      return null
    }

    return cached as CachedData<T>
  }

  /**
   * Store data in cache with TTL (time-to-live in seconds)
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time-to-live in seconds (default: 86400 = 24 hours)
   */
  async set<T>(key: string, data: T, ttl: number = 86400): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    const cachedData: CachedData<T> = {
      data,
      cachedAt: now,
      expiresAt
    }

    this.cache.set(key, cachedData)
  }

  /**
   * Remove cached data by key
   */
  async invalidate(key: string): Promise<void> {
    this.cache.delete(key)
  }

  /**
   * Check if cached data exists and is still valid (not expired)
   */
  async isValid(key: string): Promise<boolean> {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return false
    }

    const now = new Date()
    return now <= cached.expiresAt
  }
}

// Export singleton instance
export const cacheManager = new InMemoryCacheManager()

// Export class for testing
export { InMemoryCacheManager }
