# Order Fulfillment Automation - Design Document

## Overview

This feature automates the complete order fulfillment workflow from payment to delivery. After a customer completes payment through Stripe, the system automatically:
- Redirects to an order confirmation page
- Submits the order to Gelato for printing and fulfillment
- Sends email notifications at key stages (order confirmation, shipping)
- Calculates accurate sales tax using Stripe Tax
- Queries Gelato API for real-time shipping costs
- Displays tracking information when available

The design builds on existing Stripe webhook handling and Gelato integration, adding email notifications via Resend, tax calculation, dynamic shipping, and customer-facing pages.

## Architecture

### System Components

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │
       ├─────────────────────────────────────────┐
       │                                         │
       v                                         v
┌──────────────┐                        ┌──────────────┐
│   Checkout   │                        │ Confirmation │
│     Page     │                        │     Page     │
└──────┬───────┘                        └──────────────┘
       │
       v
┌──────────────┐
│    Stripe    │
│   Checkout   │
└──────┬───────┘
       │
       v (webhook)
┌──────────────────────────────────────────────────────┐
│              Stripe Webhook Handler                  │
│  1. Verify signature                                 │
│  2. Create order in database                         │
│  3. Submit to Gelato                                 │
│  4. Send confirmation email                          │
└──────┬───────────────────────────────────────────────┘
       │
       ├──────────────────┬──────────────────┐
       v                  v                  v
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    Gelato    │   │   Database   │   │    Resend    │
│     API      │   │   (Orders)   │   │    Email     │
└──────┬───────┘   └──────────────┘   └──────────────┘
       │
       v (webhook)
┌──────────────────────────────────────────────────────┐
│              Gelato Webhook Handler                  │
│  1. Update order status                              │
│  2. Store tracking info                              │
│  3. Send shipping notification email                 │
└──────────────────────────────────────────────────────┘
```

### Data Flow

1. **Checkout Flow**:
   - Customer adds items to cart
   - System queries Gelato API for shipping cost
   - Stripe Tax calculates sales tax
   - Customer completes payment via Stripe Checkout

2. **Order Creation Flow**:
   - Stripe webhook fires `checkout.session.completed`
   - System creates order record with tax and shipping details
   - System automatically submits order to Gelato
   - System sends confirmation email via Resend

3. **Fulfillment Flow**:
   - Gelato processes and ships order
   - Gelato webhook fires with tracking info
   - System updates order with tracking details
   - System sends shipping notification email

4. **Tracking Flow**:
   - Customer visits tracking page with order number and email
   - System displays order status and tracking information
   - Customer can click through to carrier tracking page

## Components and Interfaces

### 1. Order Confirmation Page

**Location**: `app/order/confirmation/page.tsx`

**Purpose**: Display order details immediately after successful payment

**Interface**:
```typescript
interface OrderConfirmationPageProps {
  searchParams: {
    session_id: string
  }
}

interface OrderConfirmationData {
  orderNumber: string
  customerEmail: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  estimatedDelivery: string
  trackingNumber?: string
  status: OrderStatus
}
```

**Behavior**:
- Receives `session_id` from Stripe redirect
- Fetches order details from database using session ID
- Displays order summary with all line items
- Shows estimated delivery date (7-10 business days from order date)
- Displays tracking number if available
- Provides "Track Order" button linking to tracking page

### 2. Order Tracking Page

**Location**: `app/order/track/page.tsx`

**Purpose**: Allow customers to check order status and tracking

**Interface**:
```typescript
interface TrackingPageProps {
  searchParams: {
    email?: string
    orderNumber?: string
  }
}

interface TrackingFormData {
  email: string
  orderNumber: string
}

interface TrackingDisplayData {
  orderNumber: string
  status: OrderStatus
  statusMessage: string
  trackingNumber?: string
  carrier?: string
  carrierTrackingUrl?: string
  estimatedDelivery: string
  orderDate: string
}
```

**Behavior**:
- Shows form to enter email and order number
- Validates credentials against database
- Displays order status with user-friendly messages
- Shows tracking number and carrier when available
- Provides link to carrier's tracking page
- Handles "not found" gracefully

### 3. Email Service

**Location**: `lib/services/emailService.ts`

**Purpose**: Send transactional emails using Resend

**Interface**:
```typescript
interface EmailService {
  sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<void>
  sendShippingNotification(data: ShippingNotificationEmailData): Promise<void>
  sendAdminNotification(data: AdminNotificationEmailData): Promise<void>
}

interface OrderConfirmationEmailData {
  to: string
  orderNumber: string
  customerName: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  estimatedDelivery: string
}

interface ShippingNotificationEmailData {
  to: string
  orderNumber: string
  customerName: string
  trackingNumber: string
  carrier: string
  carrierTrackingUrl: string
  estimatedDelivery: string
}

interface AdminNotificationEmailData {
  to: string
  subject: string
  message: string
  orderNumber?: string
  error?: string
}
```

**Email Templates**:
- Order confirmation: Includes order details, items, total, estimated delivery
- Shipping notification: Includes tracking number, carrier, tracking link
- Admin notification: For errors or issues requiring attention

**Configuration**:
- Uses Resend API with `RESEND_API_KEY` environment variable
- Sender email: `orders@monowaves.com` (configured in Resend)
- Reply-to: `support@monowaves.com`

### 4. Stripe Tax Integration

**Location**: Enhanced `lib/services/stripeService.ts`

**Purpose**: Calculate accurate sales tax based on customer location

**Interface**:
```typescript
interface TaxCalculation {
  amount: number
  rate: number
  jurisdiction: string
}

// Enhanced CheckoutSessionData
interface CheckoutSessionData {
  // ... existing fields
  automaticTax: boolean // Enable Stripe Tax
}
```

**Implementation**:
- Enable `automatic_tax` in Stripe Checkout session
- Stripe automatically calculates tax based on shipping address
- Tax amount stored in order record
- Tax displayed separately in order summary

**Configuration**:
- Requires Stripe Tax to be enabled in Stripe Dashboard
- Tax settings configured per business requirements
- Supports US state sales tax

### 5. Dynamic Shipping Cost Service

**Location**: `lib/services/shippingService.ts`

**Purpose**: Query Gelato API for accurate shipping costs

**Interface**:
```typescript
interface ShippingService {
  getShippingCost(data: ShippingCostRequest): Promise<ShippingCostResponse>
}

interface ShippingCostRequest {
  items: Array<{
    productUid: string
    quantity: number
  }>
  shippingAddress: {
    country: string
    state: string
    postCode: string
  }
}

interface ShippingCostResponse {
  cost: number
  currency: string
  estimatedDays: number
  method: string
}
```

**Behavior**:
- Called during cart/checkout to get real-time shipping cost
- Queries Gelato shipping quote API
- Falls back to fixed $10 if API fails
- Caches results for 5 minutes to reduce API calls
- Handles multiple items in single shipment

**Gelato API Endpoint**:
- `POST /v4/shipping/quotes`
- Requires product UIDs, quantities, and destination
- Returns shipping cost and estimated delivery time

### 6. Enhanced Order Service

**Location**: `lib/services/orderService.ts` (modifications)

**Enhancements**:
```typescript
// Add tax field to CreateOrderData
interface CreateOrderData {
  // ... existing fields
  tax: number
  stripeSessionId: string
}

// Add method to get order by session ID
async function getOrderBySessionId(sessionId: string): Promise<Order | null>

// Add method to calculate estimated delivery
function calculateEstimatedDelivery(orderDate: Date): string
```

**New Methods**:
- `getOrderBySessionId()`: Fetch order using Stripe session ID for confirmation page
- `calculateEstimatedDelivery()`: Calculate delivery date (order date + 7-10 business days)

### 7. Enhanced Stripe Webhook Handler

**Location**: `app/api/webhooks/stripe/route.ts` (modifications)

**Enhancements**:
- Extract tax amount from Stripe session
- Store session ID in order record
- Send confirmation email after order creation
- Handle errors gracefully with admin notifications

**Updated Flow**:
```typescript
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // 1. Extract payment data (existing)
  const paymentData = await stripeService.handlePaymentSuccess(session)
  
  // 2. Extract tax amount
  const tax = session.total_details?.amount_tax ? 
    session.total_details.amount_tax / 100 : 0
  
  // 3. Create order with tax and session ID
  const order = await orderService.createOrder({
    ...paymentData,
    tax,
    stripeSessionId: session.id
  })
  
  // 4. Submit to Gelato (existing)
  await orderService.submitToGelato(order.id)
  
  // 5. Send confirmation email (new)
  await emailService.sendOrderConfirmation({
    to: order.customerEmail,
    orderNumber: order.orderNumber,
    // ... other order details
  })
  
  // 6. Handle errors with admin notification
  if (error) {
    await emailService.sendAdminNotification({
      to: process.env.ADMIN_EMAIL,
      subject: 'Order Processing Error',
      message: error.message,
      orderNumber: order.orderNumber
    })
  }
}
```

### 8. Enhanced Gelato Webhook Handler

**Location**: `app/api/webhooks/gelato/route.ts` (modifications)

**Enhancements**:
- Send shipping notification email when order ships
- Extract carrier tracking URL

**Updated Flow**:
```typescript
async function handleOrderShipped(gelatoEvent: GelatoWebhookEvent) {
  // 1. Update order status and tracking (existing)
  const order = await orderService.updateOrderStatus(
    orderId,
    'shipped',
    trackingData
  )
  
  // 2. Send shipping notification email (new)
  await emailService.sendShippingNotification({
    to: order.customerEmail,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    trackingNumber: trackingData.trackingNumber,
    carrier: trackingData.carrier,
    carrierTrackingUrl: getCarrierTrackingUrl(
      trackingData.carrier,
      trackingData.trackingNumber
    ),
    estimatedDelivery: calculateEstimatedDelivery(order.createdAt)
  })
}
```

## Data Models

### Database Schema Changes

**Orders Table** (add tax field):
```sql
ALTER TABLE orders
ADD COLUMN tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0);

-- Update existing orders to have 0 tax
UPDATE orders SET tax = 0 WHERE tax IS NULL;
```

**No other schema changes needed** - existing fields support all requirements:
- `stripe_session_id`: Already exists for confirmation page lookup
- `tracking_number`, `carrier`: Already exist for tracking display
- `shipping_cost`: Already exists for dynamic shipping

### TypeScript Type Updates

**Order Type**:
```typescript
interface Order {
  // ... existing fields
  tax: number // Add tax field
}

interface CreateOrderData {
  // ... existing fields
  tax: number // Add tax field
  stripeSessionId: string // Make required (currently optional)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Successful Payment Triggers Confirmation Redirect

*For any* successful Stripe payment, the system should redirect to `/order/confirmation` with the correct `session_id` parameter.

**Validates: Requirements 1.1**

### Property 2: Confirmation Page Contains Required Order Information

*For any* order, the confirmation page should display order number, all items ordered, shipping address, and total paid.

**Validates: Requirements 1.2**

### Property 3: Estimated Delivery Date is Future Date

*For any* order, the estimated delivery date should be a valid date in the future (7-10 business days from order date).

**Validates: Requirements 1.3**

### Property 4: Tracking Information Display is Conditional

*For any* order with a tracking ID, the confirmation page should display it; for orders without tracking, the page should render without errors.

**Validates: Requirements 1.5**

### Property 5: Payment Success Triggers Gelato Submission

*For any* successful Stripe payment, the system should automatically create a Gelato order without manual intervention.

**Validates: Requirements 2.1, 2.4**

### Property 6: Order Data Persistence Round Trip

*For any* order created after payment, retrieving the order from the database should return all stored fields including Gelato order ID, tax amount, and tracking information when available.

**Validates: Requirements 2.2, 4.5, 6.1**

### Property 7: Gelato Submission Failure Triggers Error Handling

*For any* Gelato API failure during order submission, the system should log the error and send an admin notification email.

**Validates: Requirements 2.3**

### Property 8: Order Status Transitions After Gelato Submission

*For any* order successfully submitted to Gelato, the order status should transition from "payment_confirmed" to "submitted_to_gelato".

**Validates: Requirements 2.5**

### Property 9: Payment Success Triggers Confirmation Email

*For any* successful payment, the system should send an order confirmation email to the customer's email address.

**Validates: Requirements 3.1**

### Property 10: Confirmation Email Contains Required Information

*For any* order confirmation email, the email content should include order number, all items, total amount, and estimated delivery date.

**Validates: Requirements 3.2**

### Property 11: Order Shipment Triggers Notification Email

*For any* order that transitions to "shipped" status, the system should send a shipping notification email to the customer.

**Validates: Requirements 3.3**

### Property 12: Shipping Email Contains Tracking Information

*For any* shipping notification email, the email content should include tracking number, carrier name, and carrier tracking URL.

**Validates: Requirements 3.4, 6.5**

### Property 13: Order Total Arithmetic Correctness

*For any* order, the total amount should equal subtotal + shipping cost + tax amount.

**Validates: Requirements 4.1, 4.4**

### Property 14: Tax Display in Order Summary

*For any* order with a non-zero tax amount, the order summary should display tax as a separate line item.

**Validates: Requirements 4.3**

### Property 15: Shipping Cost Included in Checkout

*For any* checkout session, the Stripe session total should include the shipping cost obtained from Gelato API or the fallback amount.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 16: Shipping Cost Fallback on API Failure

*For any* Gelato API failure when querying shipping costs, the system should use a fixed fallback shipping cost of $10.

**Validates: Requirements 5.5**

### Property 17: Tracking Page Displays Order Status

*For any* valid order lookup (correct email and order number), the tracking page should display the current order status and tracking information when available.

**Validates: Requirements 6.2, 6.3**

### Property 18: Carrier Tracking URL Generation

*For any* carrier and tracking number combination, the system should generate a valid carrier tracking URL.

**Validates: Requirements 6.4**

## Error Handling

### Error Scenarios and Responses

1. **Gelato API Failures**:
   - **Scenario**: Gelato API is unavailable or returns error during order submission
   - **Response**: 
     - Log error with full details
     - Update order status to "failed"
     - Send admin notification email
     - Do NOT retry automatically (admin intervention required)

2. **Email Service Failures**:
   - **Scenario**: Resend API fails to send email
   - **Response**:
     - Log error with email details
     - Do NOT block order processing
     - Send admin notification about email failure
     - Store email attempt in database for manual retry

3. **Shipping Cost API Failures**:
   - **Scenario**: Gelato shipping quote API is unavailable
   - **Response**:
     - Fall back to fixed $10 shipping cost
     - Log warning about fallback usage
     - Continue with checkout process
     - Display message to customer about estimated shipping

4. **Tax Calculation Failures**:
   - **Scenario**: Stripe Tax service fails
   - **Response**:
     - Log error
     - Fall back to 0 tax (better than blocking checkout)
     - Send admin notification
     - Display message to customer

5. **Order Lookup Failures**:
   - **Scenario**: Customer provides wrong email or order number
   - **Response**:
     - Return "Order not found" message
     - Do NOT reveal whether email or order number is wrong (security)
     - Log failed lookup attempts (detect abuse)

6. **Database Failures**:
   - **Scenario**: Database connection fails during order creation
   - **Response**:
     - Return 500 error to Stripe webhook (triggers retry)
     - Log error with full context
     - Send admin notification
     - Stripe will retry webhook up to 3 days

### Error Logging

All errors should be logged with:
- Timestamp
- Error type and message
- Order number (if available)
- Customer email (if available)
- Full stack trace
- Request context (headers, body)

### Admin Notifications

Admin notifications should be sent for:
- Gelato submission failures
- Email service failures
- Tax calculation failures
- Database errors during order processing

Notification format:
```typescript
{
  to: process.env.ADMIN_EMAIL,
  subject: '[URGENT] Order Processing Error',
  message: 'Detailed error description',
  orderNumber: 'MW-XXX',
  error: 'Error stack trace'
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Together, these provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

We will use **fast-check** (TypeScript property-based testing library) to implement the correctness properties defined above.

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: order-fulfillment-automation, Property {number}: {property_text}`
- Each correctness property implemented by a SINGLE property-based test

**Test Organization**:
```
__tests__/
  properties/
    order-fulfillment.test.ts          # Properties 1-8 (order flow)
    email-notifications.test.ts        # Properties 9-12 (emails)
    tax-and-shipping.test.ts           # Properties 13-16 (pricing)
    order-tracking.test.ts             # Properties 17-18 (tracking)
```

### Unit Testing

Unit tests should focus on:

1. **Specific Examples**:
   - Confirmation page renders correctly for sample order
   - Email templates format correctly with sample data
   - Carrier tracking URLs generated correctly for known carriers

2. **Edge Cases**:
   - Order with zero tax
   - Order with no tracking information yet
   - Very long product names in emails
   - International addresses

3. **Error Conditions**:
   - Gelato API returns 500 error
   - Resend API rate limit exceeded
   - Invalid session ID on confirmation page
   - Database connection timeout

4. **Integration Points**:
   - Stripe webhook signature verification
   - Gelato webhook payload parsing
   - Email service API calls
   - Database queries and updates

**Test Organization**:
```
__tests__/
  unit/
    pages/
      order-confirmation.test.tsx
      order-tracking.test.tsx
    services/
      email-service.test.ts
      shipping-service.test.ts
    api/
      stripe-webhook-enhanced.test.ts
      gelato-webhook-enhanced.test.ts
```

### Integration Testing

Integration tests should verify:
- End-to-end order flow from payment to email
- Webhook handling with real payload formats
- Database transactions and rollbacks
- Email service integration with Resend

### Manual Testing Checklist

Before deployment, manually verify:
- [ ] Stripe Tax is enabled in Stripe Dashboard
- [ ] Resend API key is configured and verified
- [ ] Gelato API credentials are valid
- [ ] Admin email is configured for notifications
- [ ] Email templates render correctly in email clients
- [ ] Confirmation page loads quickly (< 2 seconds)
- [ ] Tracking page handles invalid lookups gracefully
- [ ] All emails have correct sender and reply-to addresses

## Implementation Notes

### Environment Variables Required

```bash
# Existing
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
GELATO_API_KEY=...
DATABASE_URL=...

# New
RESEND_API_KEY=re_...
ADMIN_EMAIL=admin@monowaves.com
SENDER_EMAIL=orders@monowaves.com
SUPPORT_EMAIL=support@monowaves.com
```

### Deployment Considerations

1. **Database Migration**: Run migration to add `tax` column to orders table before deploying code
2. **Stripe Tax Setup**: Enable Stripe Tax in dashboard and configure tax settings
3. **Resend Setup**: Verify domain and configure sender email
4. **Webhook Testing**: Test webhooks in Stripe/Gelato test mode before production
5. **Email Testing**: Send test emails to verify templates and deliverability

### Performance Considerations

1. **Shipping Cost Caching**: Cache Gelato shipping quotes for 5 minutes to reduce API calls
2. **Email Queue**: Consider using a queue for email sending to avoid blocking webhook handlers
3. **Database Indexes**: Ensure indexes exist on `stripe_session_id` and `order_number` columns
4. **Webhook Timeouts**: Keep webhook handlers under 10 seconds to avoid timeouts

### Security Considerations

1. **Webhook Signature Verification**: Always verify Stripe and Gelato webhook signatures
2. **Order Lookup**: Don't reveal whether email or order number is wrong (prevents enumeration)
3. **Email Content**: Sanitize all user input before including in emails
4. **Admin Notifications**: Don't include sensitive customer data in admin emails
5. **Rate Limiting**: Implement rate limiting on tracking page to prevent abuse

## Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "resend": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### Existing Dependencies (No Changes)

- `stripe`: Already installed
- `@supabase/supabase-js`: Already installed
- `fast-check`: Already installed for property testing

## Migration Path

### Phase 1: Database and Email Setup
1. Run database migration to add `tax` column
2. Install Resend package
3. Configure Resend API key and sender email
4. Create email service with templates

### Phase 2: Stripe Tax Integration
1. Enable Stripe Tax in dashboard
2. Update Stripe checkout session creation to include automatic tax
3. Update order creation to store tax amount
4. Test tax calculation with various addresses

### Phase 3: Dynamic Shipping
1. Create shipping service
2. Implement Gelato shipping quote API integration
3. Add caching layer
4. Update checkout flow to query shipping costs
5. Implement fallback logic

### Phase 4: Order Confirmation Page
1. Create confirmation page component
2. Implement order lookup by session ID
3. Add estimated delivery calculation
4. Test with various order states

### Phase 5: Order Tracking Page
1. Create tracking page component
2. Implement order lookup by email and order number
3. Add carrier tracking URL generation
4. Test with various carriers

### Phase 6: Email Notifications
1. Update Stripe webhook to send confirmation email
2. Update Gelato webhook to send shipping notification
3. Implement admin notification for errors
4. Test email delivery and formatting

### Phase 7: Testing and Deployment
1. Write property-based tests
2. Write unit tests
3. Perform integration testing
4. Manual testing checklist
5. Deploy to production

## Success Metrics

- **Order Processing Time**: < 1 minute from payment to Gelato submission
- **Email Delivery Time**: < 2 minutes from trigger event
- **Shipping Cost Accuracy**: Within $1 of actual Gelato cost
- **Tax Calculation Accuracy**: 100% correct for US addresses
- **Gelato Submission Success Rate**: > 99%
- **Email Delivery Success Rate**: > 98%
- **Page Load Time**: Confirmation page < 2 seconds, Tracking page < 1 second
