export interface ShippingNotificationTemplateData {
  orderNumber: string
  customerName: string
  trackingNumber: string
  carrier: string
  carrierTrackingUrl: string
  estimatedDelivery: string
  supportEmail: string
}

/**
 * Generate shipping notification email HTML template
 */
export function generateShippingNotificationEmail(data: ShippingNotificationTemplateData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Your Order Has Shipped - ${data.orderNumber}</title>
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
                  <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                    <div style="text-align: center; font-size: 48px; margin-bottom: 10px;">📦</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">
                      Your Order Has Shipped!
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px; text-align: center;">
                      Your package is on its way
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
                      Great news! Your order has been shipped and is on its way to you. You can track your package using the information below.
                    </p>
                  </td>
                </tr>

                <!-- Tracking Info Box -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border: 2px solid #10b981;">
                      <tr>
                        <td style="padding: 25px;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #065f46; font-size: 14px; font-weight: 600;">Order Number</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #064e3b; font-size: 14px;">${data.orderNumber}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #065f46; font-size: 14px; font-weight: 600;">Carrier</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #064e3b; font-size: 14px;">${data.carrier}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #065f46; font-size: 14px; font-weight: 600;">Tracking Number</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #064e3b; font-size: 14px; font-family: 'Courier New', monospace;">${data.trackingNumber}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #065f46; font-size: 14px; font-weight: 600;">Estimated Delivery</span>
                              </td>
                              <td style="padding: 8px 0; text-align: right;">
                                <strong style="color: #064e3b; font-size: 14px;">${data.estimatedDelivery}</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 40px 30px 40px; text-align: center;">
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 6px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                          <a href="${data.carrierTrackingUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px;">
                            Track Your Package →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 13px;">
                      Or copy this link: <a href="${data.carrierTrackingUrl}" style="color: #10b981; text-decoration: none; word-break: break-all;">${data.carrierTrackingUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Delivery Info -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                      <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">
                        What's Next?
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                        <li>Your package is in transit and will arrive by <strong>${data.estimatedDelivery}</strong></li>
                        <li>You'll receive updates from ${data.carrier} as your package moves</li>
                        <li>No signature required - package will be left at your door</li>
                        <li>Contact us if you have any questions or concerns</li>
                      </ul>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; text-align: center;">
                      Questions about your shipment? We're here to help!
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                      Contact us at <a href="mailto:${data.supportEmail}" style="color: #10b981; text-decoration: none; font-weight: 500;">${data.supportEmail}</a>
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
