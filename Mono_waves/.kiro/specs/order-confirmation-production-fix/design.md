# Design Document

## Overview

This design addresses critical production issues in the order confirmation flow on Vercel. The system currently experiences "Order not found" errors after successful payment due to timing issues between Stripe webhook processing and confirmation page queries. Additionally, shipping fees are missing from Stripe invoices, and database queries are slow due to missing indexes.

The solution involves five key components:
1. Database index on stripe_session_id for fast order lookups
2. Shipping fee integration as a Stripe line item
3. Complete cost component tracking (subtotal, shipping, tax, total)
4. Exponential backoff polling strategy on the confirmation page
5. Enhanced logging and error handling with correlation IDs

## Architecture

### System Flow

```
Customer Checkout → Stripe Checkout Session (with shipping line item)
                 ↓
            Payment Success
                 ↓
         Stripe Webhook → Create Order (with all costs + session_id)
                 ↓
         Store in Database (indexed by stripe_session_id)
                 ↓
    Confirmation Page → Poll with Exponential Backoff
                 ↓
         Display Order Details
```

### Key Design Decisions

1. **Database Index**: Use a unique index on stripe_session_id to prevent duplicate orders and enable fast lookups
2. **Shipping as Line Item**: Include shipping in Stripe line_items (not just metadata) so it appears on invoices
3. **Exponential Backoff**: Start with 500ms delay, double each retry up to 10 attempts (max ~30 seconds)
4. **Correlation IDs**: Generate unique IDs to trace requests across webhook and confirmation page
5. **Cost Validation**: Enforce total = subtotal + shipping + tax at both checkout and order creation


## Components and Interfaces

### 1. Database Migration

**File**: `supabase/migrations/013_add_stripe_session_id_index.sql`

```sql
-- Create unique index on stripe_session_id for fast lookups and duplicate prevention
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_stripe_session_id 
ON orders(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- Verify index was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' 
    AND indexname = 'idx_orders_stripe_session_id'
  ) THEN
    RAISE EXCEPTION 'Index idx_orders_stripe_session_id was not created';
  END IF;
END $$;
```

**Key Features**:
- Uses `CREATE INDEX CONCURRENTLY` to avoid table locking
- Unique constraint prevents duplicate orders with same session_id
- Partial index (WHERE clause) excludes NULL values
- Includes verification step to ensure index creation succeeded

### 2. Stripe Service Updates

**File**: `lib/services/stripeService.ts`

**Modified Function**: `createCheckoutSession`

```typescript
// Add shipping as a line item (not just metadata)
const shippingLineItem = {
  price_data: {
    currency: 'usd',
    product_data: {
      name: 'Shipping',
      description: 'Standard shipping (7-10 business days)',
    },
    unit_amount: Math.round(shippingCost * 100), // Convert to cents
  },
  quantity: 1,
}

const lineItems = [
  ...productLineItems,
  shippingLineItem, // Add shipping as separate line item
]

// Also include in metadata for webhook processing
const metadata = {
  cartItems: JSON.stringify(cartItemsForMetadata),
  shippingAddress: JSON.stringify(shippingForMetadata),
  shippingCost: shippingCost.toFixed(2), // Add shipping cost to metadata
}
```

**Input Validation**:
- Validate shippingCost >= 0 before creating session
- Throw error if shippingCost is negative or NaN


### 3. Webhook Handler Updates

**File**: `app/api/webhooks/stripe/route.ts`

**Modified Function**: `handleCheckoutSessionCompleted`

```typescript
// Extract shipping cost from metadata
const shippingCost = session.metadata?.shippingCost 
  ? parseFloat(session.metadata.shippingCost) 
  : 10.00 // Fallback to default

// Extract tax from Stripe's automatic tax calculation
const tax = session.total_details?.amount_tax 
  ? session.total_details.amount_tax / 100 
  : 0

// Calculate and validate total
const subtotal = calculateSubtotal(paymentData.cartItems)
const calculatedTotal = subtotal + shippingCost + tax

// Validate total matches Stripe's amount
const stripeTotal = session.amount_total ? session.amount_total / 100 : 0
if (Math.abs(calculatedTotal - stripeTotal) > 0.01) {
  logger.error('Total mismatch', {
    calculated: calculatedTotal,
    stripe: stripeTotal,
    sessionId: session.id,
  })
}

// Create order with all cost components
const order = await orderService.createOrder({
  customerEmail: paymentData.customerEmail,
  stripePaymentId: paymentData.stripePaymentId,
  stripeSessionId: session.id, // Store session ID for lookup
  items: orderItems,
  shippingAddress: paymentData.shippingAddress,
  subtotal,
  shippingCost,
  tax,
  total: stripeTotal, // Use Stripe's total as source of truth
  correlationId,
})
```

**Logging Enhancements**:
- Log session ID, correlation ID, and all cost components
- Log validation errors with full context
- Include retry count in error logs


### 4. Order Service Updates

**File**: `lib/services/orderService.ts`

**Modified Function**: `createOrder`

```typescript
export async function createOrder(data: CreateOrderData): Promise<Order> {
  // Validate all cost components are present
  if (data.subtotal === undefined || data.subtotal < 0) {
    throw new Error('Valid subtotal is required')
  }
  if (data.shippingCost === undefined || data.shippingCost < 0) {
    throw new Error('Valid shipping cost is required')
  }
  if (data.tax === undefined || data.tax < 0) {
    throw new Error('Valid tax amount is required')
  }
  if (data.total === undefined || data.total <= 0) {
    throw new Error('Valid total is required')
  }

  // Validate total = subtotal + shipping + tax (within 1 cent tolerance)
  const calculatedTotal = data.subtotal + data.shippingCost + data.tax
  if (Math.abs(calculatedTotal - data.total) > 0.01) {
    const error = `Total validation failed: ${data.total} != ${calculatedTotal} (subtotal: ${data.subtotal}, shipping: ${data.shippingCost}, tax: ${data.tax})`
    logger.error(error, {
      sessionId: data.stripeSessionId,
      correlationId: data.correlationId,
    })
    throw new Error(error)
  }

  // Create order with all fields
  const { data: created, error } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_email: data.customerEmail,
      customer_name: customerName,
      shipping_address: data.shippingAddress,
      items: data.items,
      subtotal: data.subtotal,
      shipping_cost: data.shippingCost,
      tax: data.tax,
      total: data.total,
      stripe_payment_id: data.stripePaymentId,
      stripe_session_id: data.stripeSessionId, // Store for indexed lookup
      correlation_id: data.correlationId,
      status: 'payment_confirmed',
    })
    .select()
    .single()

  if (error) {
    // Log with session ID for debugging
    logger.error('Failed to create order', {
      error: error.message,
      sessionId: data.stripeSessionId,
      correlationId: data.correlationId,
    })
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return toOrder(created)
}
```

**New Function**: `getOrderBySessionId` (already exists, ensure it uses indexed column)

```typescript
export async function getOrderBySessionId(sessionId: string): Promise<Order | null> {
  if (!sessionId) {
    throw new Error('Session ID is required')
  }

  // This query will use the idx_orders_stripe_session_id index
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId) // Uses indexed column
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    logger.error('Failed to fetch order by session ID', {
      error: error.message,
      sessionId,
    })
    throw new Error(`Failed to fetch order by session ID: ${error.message}`)
  }

  return data ? toOrder(data) : null
}
```


### 5. Confirmation Page Updates

**File**: `app/(storefront)/confirmation/OrderConfirmationContent.tsx`

**Exponential Backoff Implementation**:

```typescript
useEffect(() => {
  if (!sessionId) {
    setError('No session ID provided')
    setLoading(false)
    return
  }

  let attempts = 0
  const maxAttempts = 10
  const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000] // Exponential backoff with cap

  const fetchOrder = async () => {
    attempts++
    const delay = delays[attempts - 1] || 8000
    
    console.log(`[Confirmation] Attempt ${attempts}/${maxAttempts}, delay: ${delay}ms`)
    
    try {
      const res = await fetch(`/api/orders/session/${sessionId}`)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[Confirmation] Order found:', data.order.orderNumber)
        setOrder(data.order)
        setLoading(false)
        return true // Success
      }
      
      // Log failure with session ID and retry count
      logger.info('Order not found yet', {
        sessionId,
        attempt: attempts,
        maxAttempts,
      })
      
      if (attempts >= maxAttempts) {
        logger.error('Max polling attempts reached', {
          sessionId,
          attempts,
        })
        setError('Order not found. Your payment was successful, but we\'re still processing your order. Please check your email for confirmation or contact support at support@monowaves.com.')
        setLoading(false)
        return true // Stop polling
      }
      
      return false // Continue polling
    } catch (err) {
      logger.error('Error fetching order', {
        error: err instanceof Error ? err.message : 'Unknown error',
        sessionId,
        attempt: attempts,
      })
      
      if (attempts >= maxAttempts) {
        setError('Failed to load order. Please check your email for confirmation or contact support at support@monowaves.com.')
        setLoading(false)
        return true // Stop polling
      }
      
      return false // Continue polling
    }
  }

  // Polling function with exponential backoff
  const poll = async () => {
    const shouldStop = await fetchOrder()
    if (!shouldStop && attempts < maxAttempts) {
      const nextDelay = delays[attempts] || 8000
      setTimeout(poll, nextDelay)
    }
  }

  // Start polling
  poll()
}, [sessionId])
```

**Display Updates**:
- Show all cost components: subtotal, shipping, tax, total
- Display helpful error message with support contact
- Show loading state with retry count


### 6. API Route for Session Lookup

**File**: `app/api/orders/session/[sessionId]/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    )
  }

  try {
    const order = await orderService.getOrderBySessionId(sessionId)

    if (!order) {
      logger.info('Order not found for session', { sessionId })
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    logger.error('Error fetching order by session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
    })
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
```

## Data Models

### Order Model Updates

```typescript
interface Order {
  id: string
  orderNumber: string
  customerEmail: string
  customerName: string
  shippingAddress: ShippingAddress
  items: OrderItem[]
  subtotal: number          // NEW: Explicit subtotal field
  shippingCost: number      // NEW: Explicit shipping cost field
  tax: number               // Existing field
  total: number             // Existing field
  stripePaymentId: string
  stripeSessionId?: string  // NEW: For indexed lookup
  gelatoOrderId?: string
  status: OrderStatus
  trackingNumber?: string
  carrier?: string
  correlationId?: string    // NEW: For request tracing
  retryCount?: number
  createdAt: string
  updatedAt: string
}

interface CreateOrderData {
  customerEmail: string
  stripePaymentId: string
  stripeSessionId: string   // NEW: Required field
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number          // NEW: Required field
  shippingCost: number      // NEW: Required field
  tax: number
  total: number
  correlationId?: string    // NEW: Optional correlation ID
}
```

### Database Schema Updates

The orders table already has these columns, but we're adding the index:

```sql
-- Existing columns (no changes needed)
stripe_session_id TEXT
subtotal DECIMAL(10, 2)
shipping_cost DECIMAL(10, 2)
tax DECIMAL(10, 2)
total DECIMAL(10, 2)
correlation_id TEXT

-- New index (migration 013)
CREATE UNIQUE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id)
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Unique Session ID Constraint

*For any* two orders with the same stripe_session_id, the database SHALL reject the second insert and return a unique constraint violation error.

**Validates: Requirements 1.3**

### Property 2: Shipping Fee in Line Items

*For any* checkout session creation with a valid shipping cost, the resulting Stripe session SHALL include a line item with name "Shipping" and the correct amount.

**Validates: Requirements 2.1**

### Property 3: Total Equals Sum of Components

*For any* order, the total amount SHALL equal the sum of subtotal, shipping cost, and tax (within 1 cent tolerance for rounding).

**Validates: Requirements 2.2, 3.3**

### Property 4: Shipping Cost in Metadata

*For any* checkout session, the metadata SHALL contain a shippingCost field with a numeric value greater than or equal to zero.

**Validates: Requirements 2.3**

### Property 5: All Cost Components Stored

*For any* order created from a webhook, the order record SHALL have non-null values for subtotal, shipping_cost, tax, and total fields.

**Validates: Requirements 2.4, 3.2**

### Property 6: Shipping Cost Validation

*For any* checkout session creation request with a negative shipping cost, the system SHALL reject the request with a validation error.

**Validates: Requirements 2.5**

### Property 7: Shipping Cost Extraction

*For any* webhook event with shipping cost in metadata, the created order SHALL have a shipping_cost field matching the metadata value.

**Validates: Requirements 3.1**

### Property 8: Validation Error Logging

*For any* order creation that fails validation, the system SHALL produce a log entry containing the session ID and the specific validation error message.

**Validates: Requirements 3.4**

### Property 9: Session ID in Order Record

*For any* order created from a Stripe webhook, the order record SHALL have a non-null stripe_session_id field matching the webhook session ID.

**Validates: Requirements 3.5**

### Property 10: Exponential Backoff Delays

*For any* polling sequence on the confirmation page, the delays between attempts SHALL follow an exponential pattern: 500ms, 1000ms, 2000ms, 4000ms, then capped at 8000ms.

**Validates: Requirements 4.2**

### Property 11: All Cost Components Displayed

*For any* order displayed on the confirmation page, the UI SHALL render all four cost components: subtotal, shipping cost, tax, and total.

**Validates: Requirements 4.5**

### Property 12: Failed Lookup Logging

*For any* confirmation page request that fails to find an order after all retries, the system SHALL produce a log entry containing the session ID and the final retry count.

**Validates: Requirements 5.1**

### Property 13: Webhook Processing Logging

*For any* successful webhook processing, the system SHALL produce a log entry containing the session ID, subtotal, shipping cost, tax, and total.

**Validates: Requirements 5.2**

### Property 14: Database Error Logging

*For any* database query failure during order lookup, the system SHALL produce a log entry containing the session ID and error details.

**Validates: Requirements 5.3**

### Property 15: Correlation ID Tracing

*For any* webhook event that creates an order, both the webhook log and the order record SHALL contain the same correlation ID value.

**Validates: Requirements 5.4**

### Property 16: Validation Error Details

*For any* validation failure during order creation, the system SHALL produce a log entry containing both the validation error message and the data that failed validation.

**Validates: Requirements 5.5**


## Error Handling

### 1. Database Errors

**Duplicate Session ID**:
- Error: Unique constraint violation on stripe_session_id
- Handling: Log warning, return existing order (idempotent behavior)
- User Impact: None (order already exists)

**Index Missing**:
- Error: Query slow or times out
- Handling: Log error, attempt query anyway
- User Impact: Slow confirmation page load
- Prevention: Verify index exists in deployment script

**Connection Failure**:
- Error: Database connection timeout
- Handling: Retry with exponential backoff (up to 3 times)
- User Impact: Delayed confirmation page
- Fallback: Show error message with support contact

### 2. Stripe API Errors

**Session Creation Failure**:
- Error: Stripe API returns 4xx or 5xx
- Handling: Log error with full context, return user-friendly message
- User Impact: Cannot proceed to checkout
- Retry: No automatic retry (user must try again)

**Webhook Signature Verification Failure**:
- Error: Invalid signature
- Handling: Log security warning, return 400 status
- User Impact: Order not created (payment may succeed but order fails)
- Prevention: Verify webhook secret is correct in deployment

**Metadata Parse Error**:
- Error: Invalid JSON in session metadata
- Handling: Log error, attempt to extract what's possible
- User Impact: Order may be created with missing data
- Fallback: Use default values where possible

### 3. Validation Errors

**Negative Shipping Cost**:
- Error: shippingCost < 0
- Handling: Reject checkout session creation
- User Impact: Cannot proceed to checkout
- Message: "Invalid shipping cost. Please try again."

**Total Mismatch**:
- Error: total != subtotal + shipping + tax
- Handling: Log error with all values, use Stripe's total as source of truth
- User Impact: None (order created with Stripe's total)
- Alert: Send admin notification for investigation

**Missing Cost Components**:
- Error: subtotal, shipping, tax, or total is null/undefined
- Handling: Reject order creation, log error
- User Impact: Order not created, webhook returns 500
- Retry: Stripe will retry webhook automatically

### 4. Polling Timeout

**Order Not Found After 10 Attempts**:
- Error: Order still not in database after ~30 seconds
- Handling: Show error message with support contact
- User Impact: Cannot see order details immediately
- Message: "Order not found. Your payment was successful, but we're still processing your order. Please check your email for confirmation or contact support at support@monowaves.com."
- Recovery: User can check email or contact support with session ID

### 5. Logging Failures

**Log Write Failure**:
- Error: Cannot write to log system
- Handling: Continue processing, log to console as fallback
- User Impact: None (order processing continues)
- Alert: Monitor log system health


## Testing Strategy

### Unit Tests

Unit tests verify specific examples, edge cases, and error conditions. They complement property-based tests by focusing on concrete scenarios.

**Stripe Service Tests** (`__tests__/unit/stripe-service.test.ts`):
- Test shipping line item creation with various costs
- Test negative shipping cost rejection
- Test metadata includes shipping cost
- Test session creation with missing fields
- Test total calculation accuracy

**Order Service Tests** (`__tests__/unit/order-service.test.ts`):
- Test order creation with all cost components
- Test total validation (exact match and tolerance)
- Test session ID storage
- Test duplicate session ID handling
- Test missing cost component rejection
- Test correlation ID storage

**Webhook Handler Tests** (`__tests__/unit/webhooks/stripe.test.ts`):
- Test shipping cost extraction from metadata
- Test cost component logging
- Test validation error logging
- Test correlation ID propagation

**Confirmation Page Tests** (`__tests__/unit/confirmation-page.test.tsx`):
- Test exponential backoff timing
- Test max retry limit (10 attempts)
- Test error message display
- Test cost component rendering
- Test loading states

### Property-Based Tests

Property-based tests verify universal properties across many generated inputs. Each test should run a minimum of 100 iterations.

**Property Test 1: Unique Session ID** (`__tests__/properties/order-creation.test.ts`):
```typescript
// Feature: order-confirmation-production-fix, Property 1: Unique Session ID Constraint
test('duplicate session IDs are rejected', async () => {
  await fc.assert(
    fc.asyncProperty(fc.uuid(), async (sessionId) => {
      // Create first order
      const order1 = await createTestOrder({ stripeSessionId: sessionId })
      expect(order1).toBeDefined()
      
      // Attempt to create second order with same session ID
      await expect(
        createTestOrder({ stripeSessionId: sessionId })
      ).rejects.toThrow(/unique constraint/i)
    }),
    { numRuns: 100 }
  )
})
```

**Property Test 2: Total Equals Sum** (`__tests__/properties/cost-validation.test.ts`):
```typescript
// Feature: order-confirmation-production-fix, Property 3: Total Equals Sum of Components
test('total always equals subtotal + shipping + tax', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.float({ min: 0, max: 1000 }), // subtotal
      fc.float({ min: 0, max: 100 }),  // shipping
      fc.float({ min: 0, max: 100 }),  // tax
      async (subtotal, shipping, tax) => {
        const total = subtotal + shipping + tax
        const order = await createTestOrder({
          subtotal,
          shippingCost: shipping,
          tax,
          total,
        })
        
        const calculatedTotal = order.subtotal + order.shippingCost + order.tax
        expect(Math.abs(order.total - calculatedTotal)).toBeLessThan(0.01)
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property Test 3: Exponential Backoff** (`__tests__/properties/polling-strategy.test.ts`):
```typescript
// Feature: order-confirmation-production-fix, Property 10: Exponential Backoff Delays
test('polling delays follow exponential pattern', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (attemptNumber) => {
      const delays = [500, 1000, 2000, 4000, 8000, 8000, 8000, 8000, 8000, 8000]
      const delay = getPollingDelay(attemptNumber)
      expect(delay).toBe(delays[attemptNumber - 1])
    }),
    { numRuns: 100 }
  )
})
```

### Integration Tests

Integration tests verify the complete flow from checkout to confirmation.

**End-to-End Flow Test** (`__tests__/integration/order-confirmation-flow.test.ts`):
1. Create checkout session with shipping cost
2. Verify session includes shipping line item
3. Trigger webhook with session data
4. Verify order created with all cost components
5. Query order by session ID
6. Verify order found and costs match
7. Verify correlation ID matches across webhook and order

**Database Index Test** (`__tests__/integration/database-performance.test.ts`):
1. Verify index exists on stripe_session_id
2. Create 1000 test orders
3. Query by session ID and measure performance
4. Verify query uses index (EXPLAIN ANALYZE)
5. Verify query completes in < 10ms

### Manual Testing Checklist

Before deployment, manually verify:

1. **Database Migration**:
   - [ ] Run migration script on staging database
   - [ ] Verify index created successfully
   - [ ] Test duplicate session ID rejection
   - [ ] Verify query performance improvement

2. **Stripe Integration**:
   - [ ] Create test checkout session
   - [ ] Verify shipping appears as line item in Stripe dashboard
   - [ ] Verify invoice shows shipping fee
   - [ ] Complete test payment

3. **Webhook Processing**:
   - [ ] Trigger test webhook
   - [ ] Verify order created with all cost components
   - [ ] Verify session ID stored correctly
   - [ ] Check logs for correlation ID

4. **Confirmation Page**:
   - [ ] Load confirmation page immediately after payment
   - [ ] Verify polling behavior (check console logs)
   - [ ] Verify order displays all costs
   - [ ] Test "order not found" scenario (invalid session ID)

5. **Error Scenarios**:
   - [ ] Test negative shipping cost rejection
   - [ ] Test total mismatch handling
   - [ ] Test database connection failure
   - [ ] Test webhook signature failure

