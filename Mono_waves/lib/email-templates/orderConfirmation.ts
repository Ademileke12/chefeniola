import type { OrderItem, ShippingAddress } from '@/types'

export interface OrderConfirmationTemplateData {
  orderNumber: string
  customerName: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  estimatedDelivery: string
  supportEmail: string
}

/**
 * Generate order confirmation email HTML template
 */
export function generateOrderConfirmationEmail(data: OrderConfirmationTemplateData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 500; color: #111827;">${item.productName}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${item.size}, ${item.color}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">
          $${item.price.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Order Confirmation - ${data.orderNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">
                      Order Confirmed! ✓
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px; text-align: center;">
                      Thank you for your order
                    </p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding: 30px 40px 20px 40px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
                      Hi <strong>${data.customerName}</strong>,
                    </p>
                    <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                      We've received your order and are getting it ready. You'll receive a shipping notification with tracking information once your order is on its way.
                    </p>
                  </td>
                </tr>

                <!-- Order Info Box -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Order Number</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #111827; font-size: 14px;">${data.orderNumber}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Estimated Delivery</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #111827; font-size: 14px;">${data.estimatedDelivery}</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Order Details -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 20px; font-weight: 600;">
                      Order Details
                    </h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f9fafb;">
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 14px; border-bottom: 2px solid #e5e7eb;">
                            Item
                          </th>
                          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; font-size: 14px; border-bottom: 2px solid #e5e7eb;">
                            Qty
                          </th>
                          <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; font-size: 14px; border-bottom: 2px solid #e5e7eb;">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Order Summary -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">
                                Subtotal
                              </td>
                              <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 15px;">
                                $${data.subtotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">
                                Shipping
                              </td>
                              <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 15px;">
                                $${data.shippingCost.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">
                                Tax
                              </td>
                              <td style="padding: 8px 0; text-align: right; color: #374151; font-size: 15px;">
                                $${data.tax.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding: 12px 0 8px 0;">
                                <div style="border-top: 2px solid #d1d5db;"></div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #111827; font-size: 18px; font-weight: 700;">
                                Total
                              </td>
                              <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 18px; font-weight: 700;">
                                $${data.total.toFixed(2)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Shipping Address -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 20px; font-weight: 600;">
                      Shipping Address
                    </h2>
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #111827; font-size: 15px; line-height: 1.6;">
                        <strong>${data.shippingAddress.firstName} ${data.shippingAddress.lastName}</strong><br>
                        ${data.shippingAddress.addressLine1}<br>
                        ${data.shippingAddress.addressLine2 ? `${data.shippingAddress.addressLine2}<br>` : ''}
                        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postCode}<br>
                        ${data.shippingAddress.country}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; text-align: center;">
                      Questions about your order? We're here to help!
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                      Contact us at <a href="mailto:${data.supportEmail}" style="color: #667eea; text-decoration: none; font-weight: 500;">${data.supportEmail}</a>
                    </p>
                    <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                      Thank you for shopping with <strong style="color: #6b7280;">Mono Waves</strong>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
