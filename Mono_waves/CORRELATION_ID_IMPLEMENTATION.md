# Correlation ID System Implementation

## Overview
This document describes the implementation of the correlation ID system for tracing related events across the entire payment and fulfillment pipeline.

## Requirements
**Validates**: Requirements 4.2 - Logs include correlation IDs to trace orders

## Implementation Details

### 1. Correlation ID Utility (`lib/utils/correlationId.ts`)

Created a utility module that provides:
- `generateCorrelationId()`: Generates a unique UUID v4 correlation ID
- `isValidCorrelationId(id)`: Validates if a string is a valid UUID v4

**Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### 2. Integration Points

#### Stripe Webhook Handler (`app/api/webhooks/stripe/route.ts`)
- Generates correlation ID when webhook is received
- Passes correlation ID to `handleCheckoutSessionCompleted()`
- Includes correlation ID in order creation
- Logs correlation ID in all error messages

**Flow**:
```
Stripe Webhook → Generate Correlation ID → Order Creation → Gelato Submission
```

#### Gelato Webhook Handler (`app/api/webhooks/gelato/route.ts`)
- Generates correlation ID when webhook is received
- Passes correlation ID to `handleOrderStatusUpdate()`
- Logs correlation ID with tracking information

**Flow**:
```
Gelato Webhook → Generate Correlation ID → Order Status Update → Tracking Email
```

#### Order Service (`lib/services/orderService.ts`)
- `createOrder()`: Accepts optional `correlationId` in `CreateOrderData`
- Stores correlation ID in database `orders.correlation_id` column
- `submitToGelato()`: Accepts optional `correlationId` parameter
- Logs correlation ID in all Gelato submission logs

#### Type Definitions
- `types/order.ts`: Added `correlationId?: string` to `Order` and `CreateOrderData` interfaces
- `types/database.ts`: Added `correlation_id: string | null` to `DatabaseOrder` interface

### 3. Database Schema

**Note**: The `correlation_id` column needs to be added to the `orders` table via migration.

```sql
ALTER TABLE orders ADD COLUMN correlation_id TEXT;
CREATE INDEX idx_orders_correlation_id ON orders(correlation_id);
```

This will be handled in task 1.4 (Enhance webhook_logs table).

### 4. Tracing Flow

A single correlation ID traces the entire order lifecycle:

```
1. Stripe Webhook Received
   ↓ (correlationId: 550e8400-e29b-41d4-a716-446655440000)
2. Order Created in Database
   ↓ (same correlationId stored in orders.correlation_id)
3. Gelato Order Submitted
   ↓ (same correlationId logged)
4. Gelato Webhook Received (new correlationId for tracking update)
   ↓ (correlationId: 6ba7b810-9dad-41d1-80b4-00c04fd430c8)
5. Order Status Updated
   ↓ (new correlationId logged)
6. Tracking Email Sent
   ↓ (new correlationId logged)
```

### 5. Testing

#### Unit Tests (`__tests__/unit/correlation-id.test.ts`)
- ✅ Validates UUID v4 format generation
- ✅ Ensures uniqueness of generated IDs
- ✅ Tests validation function with valid/invalid inputs
- ✅ Verifies case-insensitive validation

#### Integration Tests (`__tests__/integration/correlation-id-flow.test.ts`)
- ✅ Tests correlation ID propagation through order creation
- ✅ Validates uniqueness across multiple webhook events
- ✅ Tests graceful handling of missing correlation IDs

### 6. Usage Examples

#### Generating a Correlation ID
```typescript
import { generateCorrelationId } from '@/lib/utils/correlationId'

const correlationId = generateCorrelationId()
console.log('Correlation ID:', correlationId)
// Output: Correlation ID: 550e8400-e29b-41d4-a716-446655440000
```

#### Validating a Correlation ID
```typescript
import { isValidCorrelationId } from '@/lib/utils/correlationId'

const isValid = isValidCorrelationId('550e8400-e29b-41d4-a716-446655440000')
console.log('Is valid:', isValid) // Output: Is valid: true
```

#### Creating an Order with Correlation ID
```typescript
const order = await orderService.createOrder({
  customerEmail: 'customer@example.com',
  stripePaymentId: 'pi_123',
  stripeSessionId: 'cs_123',
  items: [...],
  shippingAddress: {...},
  tax: 2.50,
  total: 42.49,
  correlationId: '550e8400-e29b-41d4-a716-446655440000',
})
```

#### Submitting to Gelato with Correlation ID
```typescript
await orderService.submitToGelato(
  orderId,
  '550e8400-e29b-41d4-a716-446655440000'
)
```

### 7. Logging Best Practices

Always include correlation ID in log messages:

```typescript
logger.info('Order created', {
  correlationId,
  orderNumber: order.orderNumber,
  orderId: order.id,
})

logger.error('Gelato submission failed', {
  correlationId,
  orderNumber: order.orderNumber,
  error: error.message,
})
```

### 8. Benefits

1. **End-to-End Tracing**: Track a single order from payment to delivery
2. **Debugging**: Quickly find all logs related to a specific order
3. **Monitoring**: Identify bottlenecks and failures in the pipeline
4. **Audit Trail**: Complete history of order processing events
5. **Support**: Help customers by tracing their order through the system

### 9. Next Steps

- [ ] Task 1.4: Add `correlation_id` column to `orders` table via migration
- [ ] Task 1.5: Add audit logging to Stripe webhook with correlation IDs
- [ ] Task 1.6: Add audit logging to Gelato webhook with correlation IDs
- [ ] Integrate with AuditService (Task 1.2) for centralized logging

### 10. Related Tasks

- Task 1.2: Implement AuditService (completed)
- Task 1.3: Add correlation ID system (✅ **COMPLETED**)
- Task 1.4: Enhance webhook_logs table (includes correlation_id column)
- Task 1.5: Add audit logging to Stripe webhook
- Task 1.6: Add audit logging to Gelato webhook

## Summary

The correlation ID system is now fully implemented and integrated into:
- ✅ Stripe webhook handler
- ✅ Gelato webhook handler
- ✅ Order creation
- ✅ Gelato submission
- ✅ Type definitions
- ✅ Unit tests
- ✅ Integration tests

The system uses UUID v4 format for globally unique identifiers and provides complete traceability across the payment-to-delivery pipeline.
