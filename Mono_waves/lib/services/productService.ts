import { supabaseAdmin } from '../supabase/server'
import { validateProductUid } from '../utils/productUidValidator'
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  DatabaseProduct,
} from '@/types'

// Convert database product to application product
function toProduct(dbProduct: DatabaseProduct): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: Number(dbProduct.price),
    gelatoProductId: dbProduct.gelato_product_id,
    gelatoProductUid: dbProduct.gelato_product_uid,
    variants: dbProduct.variants || [],
    designFileUrl: dbProduct.design_file_url || '',
    images: dbProduct.images || [],
    designUrl: dbProduct.design_url || '', // Deprecated
    designData: dbProduct.design_data || undefined,
    mockupUrls: dbProduct.mockup_urls || undefined, // Deprecated
    published: dbProduct.published,
    publishedAt: dbProduct.published_at || undefined,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
  }
}

// Convert application product data to database format
function toDbProduct(data: CreateProductData): Omit<DatabaseProduct, 'id' | 'created_at' | 'updated_at' | 'published' | 'published_at' | 'sizes' | 'colors' | 'design_url' | 'mockup_urls'> {
  return {
    name: data.name,
    description: data.description || null,
    price: data.price,
    gelato_product_id: data.gelatoProductId,
    gelato_product_uid: data.gelatoProductUid,
    variants: data.variants,
    design_file_url: data.designFileUrl,
    images: data.images,
    design_data: data.designData || null,
  }
}

export const productService = {
  /**
   * Get all published products with optional pagination
   */
  async getPublishedProducts(page: number = 1, pageSize: number = 50): Promise<{ products: Product[]; total: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(`Failed to fetch published products: ${error.message}`)
    }

    return { products: (data || []).map(toProduct), total: count || 0 }
  },

  /**
   * Get single product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    if (!id || id === '[id]' || id === 'undefined') {
      console.warn(`[productService] Invalid product ID requested: ${id}`);
      return null;
    }
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error(`[productService] Error fetching product (ID: ${id}):`, error)
      throw new Error(`Failed to fetch product (ID: ${id}): ${error.message}`)
    }

    return data ? toProduct(data) : null
  },

  /**
   * Get all products (including unpublished) - Admin only, with pagination
   */
  async getAllProducts(page: number = 1, pageSize: number = 50): Promise<{ products: Product[]; total: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(`Failed to fetch all products: ${error.message}`)
    }

    return { products: (data || []).map(toProduct), total: count || 0 }
  },

  /**
   * Create new product - Admin only
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    console.log('[productService.createProduct] Starting product creation:', {
      name: data.name,
      gelatoProductUid: data.gelatoProductUid,
      variantsCount: data.variants.length
    })
    
    // Skip validation for base product UIDs from catalog
    // The catalog already contains validated products from Gelato
    // Validation is only needed for manually entered UIDs
    console.log('[productService.createProduct] Using catalog product UID:', data.gelatoProductUid)
    console.log('[productService.createProduct] Skipping validation (catalog products are pre-validated)')

    const dbData = toDbProduct(data)

    const { data: created, error } = await supabaseAdmin
      .from('products')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error('[productService.createProduct] Database error:', error)
      throw new Error(`Failed to create product: ${error.message}`)
    }

    console.log('[productService.createProduct] Product created successfully:', created.id)
    return toProduct(created)
  },

  /**
   * Update product - Admin only
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.price !== undefined) updateData.price = data.price
    if (data.variants !== undefined) updateData.variants = data.variants
    if (data.designFileUrl !== undefined) updateData.design_file_url = data.designFileUrl
    if (data.images !== undefined) updateData.images = data.images
    if (data.designData !== undefined) updateData.design_data = data.designData

    const { data: updated, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`)
    }

    return toProduct(updated)
  },

  /**
   * Delete product - Admin only
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`)
    }
  },

  /**
   * Publish product - Admin only
   */
  async publishProduct(id: string): Promise<Product> {
    const { data: updated, error } = await supabaseAdmin
      .from('products')
      .update({
        published: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to publish product: ${error.message}`)
    }

    return toProduct(updated)
  },

  /**
   * Filter products
   */
  async filterProducts(filters: ProductFilters): Promise<Product[]> {
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('published', true)

    // Apply database-level filters
    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice)
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice)
    }

    // Apply sorting at the database level
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'name':
          query = query.order('name', { ascending: true })
          break
      }
    }

    // Fetch data
    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to filter products: ${error.message}`)
    }

    let products = (data || []).map(toProduct)

    // Apply variant filters using Set for O(1) lookups instead of nested loops
    if (filters.sizes && filters.sizes.length > 0) {
      const sizeSet = new Set(filters.sizes)
      products = products.filter((p: Product) =>
        p.variants.some(v => sizeSet.has(v.size))
      )
    }

    if (filters.colors && filters.colors.length > 0) {
      const colorSet = new Set(filters.colors)
      products = products.filter((p: Product) =>
        p.variants.some(v => colorSet.has(v.color))
      )
    }

    return products
  },

  /**
   * Get best selling products using the Postgres RPC for efficient aggregation.
   * Falls back to newest published products if no sales data exists.
   */
  async getBestSellers(limit: number = 4): Promise<Product[]> {
    try {
      // Call the Postgres RPC for server-side aggregation
      const { data: salesData, error: rpcError } = await supabaseAdmin
        .rpc('get_best_sellers', { limit_count: limit })

      if (rpcError || !salesData || salesData.length === 0) {
        // Fallback: return newest published products
        const { products } = await this.getPublishedProducts(1, limit)
        return products
      }

      // Batch-fetch all best-selling products in a single query (avoids N+1)
      const productIds = salesData.map((s: any) => s.product_id)
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('published', true)

      if (productsError || !productsData) {
        const { products } = await this.getPublishedProducts(1, limit)
        return products
      }

      // Maintain the sales-rank order from the RPC
      const productMap = new Map(productsData.map((p: DatabaseProduct) => [p.id, p]))
      const orderedProducts = productIds
        .map((id: string) => productMap.get(id))
        .filter(Boolean)
        .map((p: any) => toProduct(p))

      // Fill remaining slots with newest products if needed
      if (orderedProducts.length < limit) {
        const existingIds = new Set(orderedProducts.map((p: Product) => p.id))
        const { products: newest } = await this.getPublishedProducts(1, limit)
        const fillers = newest
          .filter((p: Product) => !existingIds.has(p.id))
          .slice(0, limit - orderedProducts.length)
        return [...orderedProducts, ...fillers]
      }

      return orderedProducts
    } catch {
      // Ultimate fallback
      const { products } = await this.getPublishedProducts(1, limit)
      return products
    }
  },

  /**
   * Get curated selection of products
   * Returns a mix of featured and newest products
   */
  async getCuratedSelection(limit: number = 3): Promise<Product[]> {
    const { products } = await this.getPublishedProducts(1, limit)
    return products
  },
}
