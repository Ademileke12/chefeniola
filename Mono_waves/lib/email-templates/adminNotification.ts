export interface AdminNotificationTemplateData {
  subject: string
  message: string
  orderNumber?: string
  error?: string
  timestamp: string
}

/**
 * Generate admin notification email HTML template
 */
export function generateAdminNotificationEmail(data: AdminNotificationTemplateData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Admin Notification - ${data.subject}</title>
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
                  <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px 8px 0 0;">
                    <div style="text-align: center; font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">
                      Admin Notification
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 14px; text-align: center;">
                      Requires attention
                    </p>
                  </td>
                </tr>

                <!-- Alert Box -->
                <tr>
                  <td style="padding: 30px 40px 20px 40px;">
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                      <h2 style="margin: 0 0 10px 0; color: #991b1b; font-size: 18px; font-weight: 600;">
                        ${data.subject}
                      </h2>
                      <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                        Timestamp: ${data.timestamp}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      Message
                    </h3>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
                    </div>
                  </td>
                </tr>

                ${
                  data.orderNumber
                    ? `
                <!-- Order Information -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      Order Information
                    </h3>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">
                            Order Number:
                          </td>
                          <td style="padding: 5px 0; text-align: right;">
                            <strong style="color: #111827; font-size: 14px; font-family: 'Courier New', monospace;">${data.orderNumber}</strong>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                `
                    : ''
                }

                ${
                  data.error
                    ? `
                <!-- Error Details -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      Error Details
                    </h3>
                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca;">
                      <pre style="margin: 0; color: #7f1d1d; font-size: 12px; font-family: 'Courier New', monospace; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto;">${data.error}</pre>
                    </div>
                  </td>
                </tr>
                `
                    : ''
                }

                <!-- Action Items -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                        Recommended Actions
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                        <li>Review the error details and message above</li>
                        <li>Check the order in the admin dashboard if order number is provided</li>
                        <li>Investigate the root cause of the issue</li>
                        <li>Take corrective action as needed</li>
                        <li>Monitor for similar issues</li>
                      </ul>
                    </div>
                  </td>
                </tr>

                <!-- System Info -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                      <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">
                        System Information
                      </h4>
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">
                            Environment:
                          </td>
                          <td style="padding: 4px 0; text-align: right; color: #374151; font-size: 13px;">
                            ${process.env.NODE_ENV || 'production'}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">
                            Service:
                          </td>
                          <td style="padding: 4px 0; text-align: right; color: #374151; font-size: 13px;">
                            Order Fulfillment System
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">
                            Notification Type:
                          </td>
                          <td style="padding: 4px 0; text-align: right; color: #374151; font-size: 13px;">
                            Automated Alert
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center; line-height: 1.6;">
                      This is an automated notification from the <strong style="color: #374151;">Mono Waves</strong> order fulfillment system.<br>
                      Please do not reply to this email.
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
