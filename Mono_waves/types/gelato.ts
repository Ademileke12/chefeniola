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
  id?: string
  productUid: string
  productNameUid?: string
  productTypeUid?: string
  dimensions?: Array<{
    name: string
    nameFormatted: string
    value: string
    valueFormatted: string
  }>
  attributes?: {
    [key: string]: string
  }
  weight?: {
    value: number
    measureUnit: string
  }
  supportedCountries?: string[]
}

export interface GelatoShippingQuoteRequest {
  items: Array<{
    productUid: string
    quantity: number
  }>
  destination: {
    country: string
    state: string
    postCode: string
  }
}

export interface GelatoShippingQuoteResponse {
  shippingOptions: Array<{
    methodName: string
    price: {
      amount: number
      currency: string
    }
    estimatedDeliveryDays: number
  }>
}
