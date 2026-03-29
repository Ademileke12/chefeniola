export interface Product {
  id: string
  name: string
  description: string
  price: number
  gelatoProductId: string
  gelatoProductUid: string
  variants: ProductVariant[]
  designFileUrl: string
  images: string[]
  designUrl: string // Deprecated
  designData?: any // Serialized DesignState JSON for design editor
  mockupUrls?: Record<string, string> // Deprecated
  published: boolean
  publishedAt?: string
  colors?: ProductColor[]
  sizes?: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  size: string
  color: string
  colorCode?: string
  variantId: string
}

export interface ProductColor {
  name: string
  hex: string
  imageUrl?: string
}

export interface GelatoProduct {
  uid: string
  title: string
  description: string
  category?: string
  availableSizes: string[]
  availableColors: GelatoColor[]
  basePrice: number
  imageUrl?: string
  variants: Record<string, string> // Mapping of "size:color" to specific gelato productUid
}

export interface GelatoColor {
  name: string
  code: string
}

export interface ProductFilters {
  sizes?: string[]
  colors?: string[]
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name'
}

export interface CreateProductData {
  name: string
  description: string
  price: number
  gelatoProductId: string
  gelatoProductUid: string
  variants: ProductVariant[]
  designFileUrl: string
  images: string[]
  designData?: any
}

export interface UpdateProductData {
  name?: string
  description?: string
  price?: number
  variants?: ProductVariant[]
  designFileUrl?: string
  images?: string[]
  designData?: any
}
