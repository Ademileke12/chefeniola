/**
 * CatalogService - Manages product catalog with caching and availability tracking
 * 
 * Provides centralized service for:
 * - Fetching product catalog with 24-hour caching
 * - Manual catalog refresh
 * - Product availability tracking in database
 * - Availability history recording
 */

import { cacheManager } from './cacheManager'
import { gelatoService } from './gelatoService'
import { createClient } from '@supabase/supabase-js'
import type { GelatoProductDetails } from '@/types/gelato'
import type { GelatoProduct } from '@/types/product'

// Cache configuration
const CACHE_KEY = 'gelato:catalog:v1'
const CACHE_TTL = 86400 // 24 hours in seconds

// Availability status types
export type AvailabilityStatus = 'new' | 'available' | 'out_of_stock' | 'discontinued'

// Interfaces
export interface CatalogOptions {
  forceRefresh?: boolean
  includeDiscontinued?: boolean
  status?: AvailabilityStatus | AvailabilityStatus[]
}

export interface CatalogResponse {
  products: EnrichedProduct[]
  metadata: {
    totalCount: number
    cachedAt: Date | null
    source: 'cache' | 'api'
  }
}

export interface EnrichedProduct extends GelatoProduct {
  availabilityStatus: AvailabilityStatus
  lastSeen: Date
  isNew: boolean
  statusChangedAt?: Date
}

export interface AvailabilityMap {
  [productUid: string]: {
    status: AvailabilityStatus
    lastSeen: Date
    createdAt: Date
  }
}

interface AvailabilityRecord {
  uid: string
  name: string
  type: string
  status: AvailabilityStatus
  last_seen: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

/**
 * Get Supabase client for database operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Transform GelatoProductDetails to GelatoProduct format
 */
function transformProduct(product: GelatoProductDetails): GelatoProduct {
  return {
    uid: product.productUid,
    title: product.attributes?.GarmentCategory || product.productUid,
    description: product.attributes?.GarmentSubcategory || '',
    category: product.attributes?.GarmentCategory,
    availableSizes: [],
    availableColors: [],
    basePrice: 0,
    variants: {}
  }
}

/**
 * CatalogService class
 */
export class CatalogService {
  private refreshInProgress = false

  /**
   * Get product catalog with caching
   * Checks cache validity, fetches from API if needed, enriches with availability data
   */
  async getCatalog(options: CatalogOptions = {}): Promise<CatalogResponse> {
    const { forceRefresh = false, includeDiscontinued = true, status } = options
    
    try {
      // Check if refresh is forced
      if (forceRefresh) {
        return await this.refreshCatalog(options)
      }

      // Check cache validity
      const cached = await cacheManager.get<GelatoProduct[]>(CACHE_KEY)
      
      if (cached) {
        console.log('✓ Serving catalog from cache')
        
        // Enrich cached products with availability data
        const enrichedProducts = await this.enrichWithAvailability(cached.data)
        
        // Apply filters
        const filteredProducts = this.applyFilters(enrichedProducts, { includeDiscontinued, status })

        return {
          products: filteredProducts,
          metadata: {
            totalCount: filteredProducts.length,
            cachedAt: cached.cachedAt,
            source: 'cache'
          }
        }
      }

      // Cache miss - fetch fresh data
      console.log('✗ Cache miss - fetching fresh catalog')
      return await this.fetchFreshCatalog(options)

    } catch (error) {
      console.error('Error in getCatalog:', error)
      
      // Try to serve stale cache on error
      const staleCache = await cacheManager.get<GelatoProduct[]>(CACHE_KEY)
      if (staleCache) {
        console.warn('⚠ Serving stale cache due to error')
        const enrichedProducts = await this.enrichWithAvailability(staleCache.data)
        const filteredProducts = this.applyFilters(enrichedProducts, { includeDiscontinued, status })
        
        return {
          products: filteredProducts,
          metadata: {
            totalCount: filteredProducts.length,
            cachedAt: staleCache.cachedAt,
            source: 'cache'
          }
        }
      }

      throw error
    }
  }

  /**
   * Force refresh catalog from Gelato API
   * Invalidates cache, fetches fresh data, updates availability tracking
   */
  async refreshCatalog(options: CatalogOptions = {}): Promise<CatalogResponse> {
    // Prevent concurrent refreshes
    if (this.refreshInProgress) {
      console.log('⚠ Refresh already in progress, waiting...')
      // Wait a bit and try to get from cache
      await new Promise(resolve => setTimeout(resolve, 1000))
      const cached = await cacheManager.get<GelatoProduct[]>(CACHE_KEY)
      if (cached) {
        const enrichedProducts = await this.enrichWithAvailability(cached.data)
        return {
          products: enrichedProducts,
          metadata: {
            totalCount: enrichedProducts.length,
            cachedAt: cached.cachedAt,
            source: 'cache'
          }
        }
      }
    }

    this.refreshInProgress = true

    try {
      console.log('🔄 Refreshing catalog from Gelato API')
      
      // Invalidate existing cache
      await cacheManager.invalidate(CACHE_KEY)
      
      // Fetch fresh data
      const result = await this.fetchFreshCatalog(options)
      
      return result

    } finally {
      this.refreshInProgress = false
    }
  }

  /**
   * Fetch fresh catalog from Gelato API and update cache
   */
  private async fetchFreshCatalog(options: CatalogOptions = {}): Promise<CatalogResponse> {
    const { includeDiscontinued = true, status } = options
    
    try {
      // Fetch from Gelato API with exponential backoff
      const gelatoProducts = await this.fetchWithRetry()
      
      // Transform to standard format
      const products = gelatoProducts.map(transformProduct)
      
      // Update availability tracking in database
      await this.updateAvailability(products)
      
      // Store in cache
      await cacheManager.set(CACHE_KEY, products, CACHE_TTL)
      
      // Enrich with availability data
      const enrichedProducts = await this.enrichWithAvailability(products)
      
      // Apply filters
      const filteredProducts = this.applyFilters(enrichedProducts, { includeDiscontinued, status })

      console.log(`✓ Fetched ${filteredProducts.length} products from Gelato API`)

      return {
        products: filteredProducts,
        metadata: {
          totalCount: filteredProducts.length,
          cachedAt: new Date(),
          source: 'api'
        }
      }

    } catch (error) {
      console.error('Error fetching fresh catalog:', error)
      throw error
    }
  }

  /**
   * Fetch from Gelato API with exponential backoff on rate limits
   */
  private async fetchWithRetry(maxRetries = 5): Promise<GelatoProductDetails[]> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        
        // Log API request
        console.log(`📡 Gelato API request (attempt ${attempt + 1}/${maxRetries})`)
        
        const products = await gelatoService.getExpandedProductCatalog()
        
        const duration = Date.now() - startTime
        console.log(`✓ Gelato API response received (${duration}ms)`)
        
        return products

      } catch (error) {
        lastError = error as Error
        
        // Check if it's a rate limit error
        const isRateLimit = error instanceof Error && 
          (error.message.includes('rate limit') || error.message.includes('429'))
        
        if (isRateLimit && attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`⚠ Rate limit hit, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Not a rate limit error or max retries reached
        console.error(`✗ Gelato API error (attempt ${attempt + 1}/${maxRetries}):`, error)
        
        if (attempt < maxRetries - 1) {
          const delay = 1000 // 1 second for non-rate-limit errors
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }

    throw lastError || new Error('Failed to fetch from Gelato API')
  }

  /**
   * Get availability status for products from database
   */
  async getProductAvailability(productUids: string[]): Promise<AvailabilityMap> {
    if (productUids.length === 0) {
      return {}
    }

    try {
      const supabase = getSupabaseClient()
      
      const { data, error } = await supabase
        .from('gelato_products')
        .select('uid, status, last_seen, created_at')
        .in('uid', productUids)

      if (error) {
        console.error('Error fetching product availability:', error)
        return {}
      }

      const availabilityMap: AvailabilityMap = {}
      
      for (const record of data || []) {
        availabilityMap[record.uid] = {
          status: record.status as AvailabilityStatus,
          lastSeen: new Date(record.last_seen),
          createdAt: new Date(record.created_at)
        }
      }

      return availabilityMap

    } catch (error) {
      console.error('Error in getProductAvailability:', error)
      return {}
    }
  }

  /**
  /**
   * Query products by status from database
   * Uses database indexes for performance
   */
  async getProductsByStatus(status: AvailabilityStatus | AvailabilityStatus[]): Promise<AvailabilityRecord[]> {
    try {
      const supabase = getSupabaseClient()
      
      const statusArray = Array.isArray(status) ? status : [status]
      
      const { data, error } = await supabase
        .from('gelato_products')
        .select('*')
        .in('status', statusArray)

      if (error) {
        console.error('Error querying products by status:', error)
        throw error
      }

      return (data || []) as AvailabilityRecord[]

    } catch (error) {
      console.error('Error in getProductsByStatus:', error)
      throw error
    }
  }


  /**
   * Apply filters to enriched products
   */
  private applyFilters(
    products: EnrichedProduct[], 
    options: { includeDiscontinued?: boolean; status?: AvailabilityStatus | AvailabilityStatus[] }
  ): EnrichedProduct[] {
    let filtered = products

    // If status filter is specified, use it exclusively
    if (options.status) {
      const statusArray = Array.isArray(options.status) ? options.status : [options.status]
      filtered = filtered.filter(p => statusArray.includes(p.availabilityStatus))
      return filtered
    }

    // Otherwise, apply includeDiscontinued filter
    if (!options.includeDiscontinued) {
      filtered = filtered.filter(p => p.availabilityStatus !== 'discontinued')
    }

    return filtered
  }
  /**
   * Update product availability in database
   * Detects new products, discontinued products, and status changes
   */
  async updateAvailability(products: GelatoProduct[]): Promise<void> {
    if (products.length === 0) {
      return
    }

    try {
      const supabase = getSupabaseClient()
      const now = new Date().toISOString()
      
      // Get current products from database
      const { data: existingProducts, error: fetchError } = await supabase
        .from('gelato_products')
        .select('uid, status, name, type, created_at')

      if (fetchError) {
        console.error('Error fetching existing products:', fetchError)
        throw fetchError
      }

      const existingMap = new Map<string, AvailabilityRecord>()
      for (const product of existingProducts || []) {
        existingMap.set(product.uid, product as AvailabilityRecord)
      }

      const currentUids = new Set(products.map(p => p.uid))
      const upsertRecords: any[] = []
      const historyRecords: any[] = []

      // Process current products
      for (const product of products) {
        const existing = existingMap.get(product.uid)
        
        if (!existing) {
          // New product
          upsertRecords.push({
            uid: product.uid,
            name: product.title,
            type: product.category || 'unknown',
            status: 'new',
            last_seen: now,
            created_at: now,
            updated_at: now
          })
          
          historyRecords.push({
            product_uid: product.uid,
            status: 'new',
            changed_at: now,
            notes: 'Product first seen in catalog'
          })
        } else {
          // Existing product - update last_seen
          upsertRecords.push({
            uid: product.uid,
            name: product.title,
            type: product.category || existing.type,
            status: existing.status === 'new' ? 'available' : existing.status,
            last_seen: now,
            created_at: existing.created_at || now, // fallback in case field was missing
            updated_at: now
          })
          
          // Record status change if transitioning from 'new' to 'available'
          if (existing.status === 'new') {
            historyRecords.push({
              product_uid: product.uid,
              status: 'available',
              changed_at: now,
              notes: 'Product became available'
            })
          }
        }
      }

      // Detect discontinued products (in database but not in current API response)
      for (const [uid, existing] of existingMap.entries()) {
        if (!currentUids.has(uid) && existing.status !== 'discontinued') {
          upsertRecords.push({
            uid: existing.uid,
            name: existing.name,
            type: existing.type,
            status: 'discontinued',
            last_seen: existing.last_seen,
            created_at: existing.created_at,
            updated_at: now
          })
          
          historyRecords.push({
            product_uid: uid,
            status: 'discontinued',
            changed_at: now,
            notes: 'Product no longer in Gelato API response'
          })
        }
      }

      // Upsert products
      if (upsertRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('gelato_products')
          .upsert(upsertRecords, { onConflict: 'uid' })

        if (upsertError) {
          console.error('Error upserting products:', upsertError)
          throw upsertError
        }

        console.log(`✓ Updated ${upsertRecords.length} product records`)
      }

      // Insert history records
      if (historyRecords.length > 0) {
        const { error: historyError } = await supabase
          .from('gelato_availability_history')
          .insert(historyRecords)

        if (historyError) {
          console.error('Error inserting history records:', historyError)
          // Don't throw - history is not critical
        } else {
          console.log(`✓ Recorded ${historyRecords.length} availability changes`)
        }
      }

    } catch (error) {
      console.error('Error in updateAvailability:', error)
      throw error
    }
  }

  /**
   * Enrich products with availability data from database
   */
  private async enrichWithAvailability(products: GelatoProduct[]): Promise<EnrichedProduct[]> {
    if (products.length === 0) {
      return []
    }

    const productUids = products.map(p => p.uid)
    const availabilityMap = await this.getProductAvailability(productUids)

    return products.map(product => {
      const availability = availabilityMap[product.uid]
      
      return {
        ...product,
        availabilityStatus: availability?.status || 'available',
        lastSeen: availability?.lastSeen || new Date(),
        isNew: availability?.status === 'new',
        statusChangedAt: availability?.createdAt
      }
    })
  }
}

// Export singleton instance
export const catalogService = new CatalogService()
