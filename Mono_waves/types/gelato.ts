export interface GelatoOrderData {
  orderReferenceId: string
  customerReferenceId: string
  currency: string
  items: GelatoOrderItem[]
  shipmentMethodUid: string
  shippingAddress: GelatoShippingAddress
}

export interface GelatoOrderItem {
  itemReferenceId: string
  productUid: string
  files: Array<{
    type: 'default' | 'back'
    url: string
  }>
  quantity: number
}

export interface GelatoShippingAddress {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postCode: string
  country: string
  phone: string
}

export interface GelatoOrderResponse {
  orderId: string
  orderReferenceId: string
  status: string
}

export interface GelatoOrderStatus {
  orderId: string
  status: string
  trackingNumber?: string
  carrier?: string
  items: Array<{
    itemReferenceId: string
    status: string
  }>
}

export interface GelatoProductDetails {
  productUid: string
  attributes: {
    [key: string]: string
  }
  weight?: {
    value: number
    measureUnit: string
  }
  dimensions?: {
    [key: string]: {
      value: number
      measureUnit: string
    }
  }
  supportedCountries?: string[]
}
