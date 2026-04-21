export interface Cart {
  id: string
  sessionId: string
  items: CartItem[]
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  size: string
  color: string
  quantity: number
  price: number
  imageUrl: string
  designUrl?: string // URL to the custom design file
  gelatoProductUid?: string // Gelato product UID for fulfillment
}
