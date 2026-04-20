# Payment & Fulfillment Security Audit - Design

## Overview
This design document outlines the comprehensive security audit and debugging system for the payment-to-delivery pipeline. We'll create automated audit tools, enhance logging, add monitoring dashboards, and implement property-based tests to ensure enterprise-grade reliability.

## Architecture

### System Flow
```
Customer Checkout
    ↓
Stripe Payment Processing
    ↓
Stripe Webhook (checkout.session.completed)
    ↓
Order Creation in Database
    ↓
Email Confirmation to Customer
    ↓
Gelato Order Submission
    ↓
Gelato Webhook (order.shipped)
    ↓
Tracking Number Storage
    ↓
Email Notification with Tracking
```

### Critical Security Points
1. **Webhook Signature Verification** - Both Stripe and Gelato
2. **Payment Amount Validation** - Prevent manipulation
3. **Idempotency** - Prevent duplicate processing
4. **Rate Limiting** - Prevent abuse
5. **Input Sanitization** - Prevent injection attacks
6. **Audit Logging** - Complete trail for compliance

## Components

### 1. Audit Service (`lib/services/auditService.ts`)

**Purpose**: Centralized audit logging and security monitoring

**Interface**:
```typescript
interface AuditEvent {
  id: string
  timestamp: Date
  eventType: AuditEventType
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: 'stripe' | 'gelato' | 'system'
  correlationId: string
  userId?: string
  metadata: Record<string, any>
  securityFlags?: string[]
}

type AuditEventType =
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'order.created'
  | 'order.submitted_to_gelato'
  | 'order.gelato_submission_failed'
  | 'tracking.received'
  | 'tracking.email_sent'
  | 'webhook.received'
  | 'webhook.signature_verified'
  | 'webhook.signature_failed'
  | 'security.rate_limit_exceeded'
  | 'security.suspicious_activity'

class AuditService {
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void>
  async getEvents(filters: AuditFilters): Promise<AuditEvent[]>
  async getSecurityAlerts(): Promise<AuditEvent[]>
  async generateAuditReport(startDate: Date, endDate: Date): Promise<AuditReport>
}
```

**Validates**: Requirements 1.8, 4.1-4.7

### 2. Payment Validator (`lib/utils/paymentValidator.ts`)

**Purpose**: Validate payment integrity and prevent manipulation

**Interface**:
```typescript
interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  securityFlags: string[]
}

class PaymentValidator {
  validateCheckoutSession(session: Stripe.Checkout.Session): PaymentValidationResult
  validatePaymentAmount(
    cartItems: CartItem[],
    sessionTotal: number,
    tax: number,
    shipping: number
  ): PaymentValidationResult
  detectDuplicatePayment(sessionId: string): Promise<boolean>
  validateWebhookTimestamp(timestamp: number): boolean
}
```

**Validates**: Requirements 1.2, 1.3, 1.5

### 3. Gelato Submission Validator (Enhancement to `orderService.ts`)

**Purpose**: Comprehensive validation before Gelato submission

**Current Implementation**: Already exists in `orderService.ts` as `validateOrderForGelato()`

**Enhancements Needed**:
- Add retry logic with exponential backoff
- Add circuit breaker pattern for Gelato API failures
- Add detailed logging of validation failures
- Add metrics collection

**Validates**: Requirements 2.1-2.8

### 4. Tracking Service (`lib/services/trackingService.ts`)

**Purpose**: Manage tracking number delivery and notifications

**Interface**:
```typescript
interface TrackingInfo {
  orderId: string
  orderNumber: string
  trackingNumber: string
  carrier: string
  trackingUrl: string
  status: string
  estimatedDelivery?: Date
  receivedAt: Date
}

class TrackingService {
  async processTrackingUpdate(
    orderId: string,
    trackingNumber: string,
    carrier: string
  ): Promise<void>
  
  async sendTrackingNotification(orderId: string): Promise<void>
  
  async getTrackingInfo(orderNumber: string): Promise<TrackingInfo | null>
  
  async validateTrackingNumber(
    trackingNumber: string,
    carrier: string
  ): boolean
}
```

**Validates**: Requirements 3.1-3.7

### 5. Security Audit Dashboard (Admin UI)

**Purpose**: Real-time monitoring of payment and fulfillment security

**Location**: `app/admin/security/page.tsx`

**Features**:
- Payment success/failure rates (last 24h, 7d, 30d)
- Gelato submission success rates
- Tracking number delivery rates
- Failed webhook processing
- Security alerts (rate limiting, suspicious activity)
- Average time from payment to shipment
- Recent audit events with filtering

**Validates**: Requirements 6.1-6.7

### 6. Comprehensive Audit Script (`scripts/audit-payment-fulfillment.ts`)

**Purpose**: Run complete system audit on demand

**Features**:
```typescript
interface AuditReport {
  timestamp: Date
  summary: {
    totalOrders: number
    successfulPayments: number
    failedPayments: number
    gelatoSubmissions: number
    gelatoFailures: number
    trackingNumbersDelivered: number
    averageTimeToShipment: number
  }
  securityChecks: {
    webhookSignatureVerification: CheckResult
    paymentAmountValidation: CheckResult
    duplicatePaymentPrevention: CheckResult
    rateLimiting: CheckResult
    inputSanitization: CheckResult
  }
  issues: Issue[]
  recommendations: string[]
}

async function runFullAudit(): Promise<AuditReport>
```

**Validates**: Requirements 4.1-4.7, 5.1-5.7

## Data Models

### Audit Events Table
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'gelato', 'system')),
  correlation_id TEXT NOT NULL,
  user_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  security_flags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_correlation_id ON audit_events(correlation_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_severity ON audit_events(severity);
```

### Enhanced Webhook Logs Table
```sql
-- Add columns to existing webhook_logs table
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_correlation_id ON webhook_logs(correlation_id);
```

## Security Enhancements

### 1. Webhook Signature Verification

**Current State**: ✅ Already implemented in both Stripe and Gelato webhooks

**Enhancements**:
- Add timing-safe comparison (already done for Gelato)
- Log all signature verification attempts
- Alert on repeated failures

**Validates**: Requirements 1.1, 2.2

### 2. Payment Amount Validation

**Current State**: ⚠️ Basic validation exists

**Enhancements**:
```typescript
// In webhook handler, before creating order
const validator = new PaymentValidator()
const validation = validator.validatePaymentAmount(
  cartItems,
  session.amount_total / 100,
  session.total_details?.amount_tax / 100 || 0,
  10.00 // shipping
)

if (!validation.isValid) {
  await auditService.logEvent({
    eventType: 'security.payment_amount_mismatch',
    severity: 'critical',
    source: 'stripe',
    correlationId: session.id,
    metadata: {
      errors: validation.errors,
      sessionTotal: session.amount_total,
      calculatedTotal: calculateTotal(cartItems)
    },
    securityFlags: ['AMOUNT_MISMATCH']
  })
  throw new Error('Payment amount validation failed')
}
```

**Validates**: Requirements 1.3

### 3. Idempotency

**Current State**: ⚠️ Relies on Stripe's event deduplication

**Enhancements**:
```typescript
// Check if order already exists for this session
const existingOrder = await getOrderBySessionId(session.id)
if (existingOrder) {
  await auditService.logEvent({
    eventType: 'payment.duplicate_prevented',
    severity: 'warning',
    source: 'stripe',
    correlationId: session.id,
    metadata: { existingOrderId: existingOrder.id }
  })
  return // Already processed
}
```

**Validates**: Requirements 1.5

### 4. Rate Limiting

**Current State**: ✅ Already implemented in `lib/utils/rateLimiter.ts`

**Enhancements**:
- Apply to webhook endpoints
- Log rate limit violations
- Alert on suspicious patterns

**Validates**: Requirements 1.7

## Monitoring & Alerting

### Metrics to Track

1. **Payment Metrics**
   - Payment success rate (target: >99%)
   - Payment failure rate by reason
   - Average payment processing time
   - Duplicate payment attempts

2. **Gelato Submission Metrics**
   - Submission success rate (target: 100%)
   - Submission retry count
   - Average submission time
   - Validation failure reasons

3. **Tracking Delivery Metrics**
   - Tracking number received rate (target: >95%)
   - Email delivery success rate
   - Average time from order to tracking

4. **Security Metrics**
   - Webhook signature failures
   - Rate limit violations
   - Suspicious activity alerts
   - Payment amount mismatches

### Alert Thresholds

- **Critical**: Payment success rate < 95%
- **Critical**: Gelato submission failure > 5%
- **Warning**: Tracking delivery rate < 90%
- **Critical**: Any webhook signature failure
- **Warning**: Rate limit exceeded > 10 times/hour

## Testing Strategy

### 1. Integration Tests

**File**: `__tests__/integration/payment-fulfillment-flow.test.ts`

```typescript
describe('Payment to Fulfillment Flow', () => {
  it('should process complete order flow from payment to Gelato', async () => {
    // 1. Create checkout session
    // 2. Simulate successful payment webhook
    // 3. Verify order created
    // 4. Verify Gelato submission
    // 5. Simulate Gelato shipment webhook
    // 6. Verify tracking number stored
    // 7. Verify email sent
  })

  it('should handle Gelato submission failure gracefully', async () => {
    // Test retry logic and error handling
  })

  it('should prevent duplicate order creation', async () => {
    // Test idempotency
  })
})
```

**Validates**: Requirements 5.1-5.6

### 2. Property-Based Tests

**File**: `__tests__/properties/payment-security.test.ts`

```typescript
describe('Payment Security Properties', () => {
  it('PROPERTY: Payment amount always matches cart total + tax + shipping', () => {
    fc.assert(
      fc.property(
        arbitraries.cartItems(),
        arbitraries.taxRate(),
        (cartItems, taxRate) => {
          const subtotal = calculateSubtotal(cartItems)
          const tax = subtotal * taxRate
          const total = subtotal + tax + 10.00 // shipping
          
          const validation = validator.validatePaymentAmount(
            cartItems,
            total,
            tax,
            10.00
          )
          
          return validation.isValid
        }
      )
    )
  })

  it('PROPERTY: Webhook signature verification never accepts invalid signatures', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (payload, invalidSignature) => {
          expect(() => {
            stripeService.verifyWebhookSignature(payload, invalidSignature)
          }).toThrow()
        }
      )
    )
  })
})
```

**Validates**: Requirements 5.7

### 3. Security Tests

**File**: `__tests__/security/payment-fulfillment-security.test.ts`

```typescript
describe('Payment & Fulfillment Security', () => {
  it('should reject webhooks without valid signatures', async () => {
    // Test Stripe webhook
    // Test Gelato webhook
  })

  it('should enforce rate limiting on webhook endpoints', async () => {
    // Rapid-fire requests
  })

  it('should sanitize all user inputs', async () => {
    // Test XSS, SQL injection attempts
  })

  it('should log all security events', async () => {
    // Verify audit trail
  })
})
```

**Validates**: Requirements 1.1, 1.7, 1.8

## Implementation Plan

### Phase 1: Audit Infrastructure
1. Create audit_events table migration
2. Implement AuditService
3. Add audit logging to existing webhook handlers
4. Create correlation ID system

### Phase 2: Payment Security
1. Implement PaymentValidator
2. Add payment amount validation to webhook
3. Enhance idempotency checks
4. Add rate limiting to webhooks

### Phase 3: Gelato Reliability
1. Add retry logic with exponential backoff
2. Implement circuit breaker pattern
3. Enhance validation logging
4. Add Gelato submission metrics

### Phase 4: Tracking & Notifications
1. Implement TrackingService
2. Enhance Gelato webhook handler
3. Add tracking email notifications
4. Validate tracking numbers

### Phase 5: Monitoring & Dashboard
1. Create security audit dashboard UI
2. Implement metrics collection
3. Add alerting system
4. Create audit report generator

### Phase 6: Testing & Validation
1. Write integration tests
2. Write property-based tests
3. Write security tests
4. Run full system audit

## Correctness Properties

### Property 1: Payment Integrity
**Statement**: For all successful payments, the order total in the database MUST equal the Stripe session amount_total.

**Test Strategy**: Property-based test with generated cart items
**Validates**: Requirements 1.3

### Property 2: Webhook Signature Verification
**Statement**: All webhook requests without valid signatures MUST be rejected with 400 status.

**Test Strategy**: Property-based test with random payloads and signatures
**Validates**: Requirements 1.1

### Property 3: Order-Payment Bijection
**Statement**: Every successful payment MUST create exactly one order, and every order MUST have exactly one payment.

**Test Strategy**: Integration test with database queries
**Validates**: Requirements 1.5, 2.1

### Property 4: Gelato Submission Completeness
**Statement**: Every order with status 'payment_confirmed' MUST eventually be submitted to Gelato or marked as 'failed'.

**Test Strategy**: Integration test with retry simulation
**Validates**: Requirements 2.1, 2.3

### Property 5: Tracking Delivery
**Statement**: Every order with status 'shipped' MUST have a tracking number and the customer MUST receive an email.

**Test Strategy**: Integration test with email mock
**Validates**: Requirements 3.1, 3.2, 3.3

### Property 6: Audit Completeness
**Statement**: Every critical event (payment, order creation, Gelato submission, tracking) MUST have a corresponding audit log entry.

**Test Strategy**: Integration test verifying audit_events table
**Validates**: Requirements 4.1-4.7

### Property 7: Idempotency
**Statement**: Processing the same webhook event multiple times MUST produce the same result as processing it once.

**Test Strategy**: Integration test with duplicate webhook delivery
**Validates**: Requirements 1.5

## Security Checklist

- [x] Webhook signature verification (Stripe)
- [x] Webhook signature verification (Gelato)
- [ ] Payment amount validation
- [ ] Duplicate payment prevention
- [x] Rate limiting on API endpoints
- [ ] Rate limiting on webhook endpoints
- [ ] Input sanitization on all user data
- [ ] SQL injection prevention (using Supabase parameterized queries)
- [ ] XSS prevention (React auto-escaping)
- [x] Secrets in environment variables
- [ ] Sensitive data redaction in logs
- [ ] Audit trail for all critical operations
- [ ] HTTPS enforcement
- [ ] CORS configuration
- [ ] Admin authentication on security dashboard

## Performance Considerations

1. **Webhook Processing**: Must complete within 5 seconds to avoid timeouts
2. **Database Queries**: Use indexes on frequently queried fields
3. **Audit Logging**: Async/non-blocking to avoid slowing down main flow
4. **Gelato Submission**: Retry with exponential backoff (1s, 2s, 4s, 8s)
5. **Email Sending**: Async/non-blocking

## Error Handling

### Webhook Processing Errors
- Log error with full context
- Return 500 to trigger provider retry
- Send admin notification for critical failures
- Store in dead letter queue after max retries

### Gelato Submission Errors
- Log error with order details
- Update order status to 'failed'
- Send admin notification
- Allow manual retry from admin dashboard

### Email Delivery Errors
- Log error but don't fail order
- Retry email delivery (3 attempts)
- Send admin notification if all retries fail

## Deployment Considerations

1. **Database Migration**: Run audit_events table creation
2. **Environment Variables**: Ensure all secrets are configured
3. **Monitoring**: Set up alerting for critical metrics
4. **Documentation**: Update admin guide with security dashboard usage
5. **Testing**: Run full audit before production deployment

## Success Criteria

- ✅ All 7 correctness properties pass
- ✅ All integration tests pass
- ✅ All security tests pass
- ✅ Payment success rate > 99%
- ✅ Gelato submission success rate = 100%
- ✅ Tracking delivery rate > 95%
- ✅ Zero security vulnerabilities found
- ✅ Complete audit trail for all orders
- ✅ Security dashboard operational
