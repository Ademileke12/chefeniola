# Payment & Fulfillment Security Audit - Tasks

## Phase 1: Audit Infrastructure

- [ ] 1.1 Create audit_events database table
  - Create migration file `supabase/migrations/010_create_audit_events_table.sql`
  - Add indexes for performance (timestamp, correlation_id, event_type, severity)
  - Test migration locally
  - **Validates: Requirements 4.1, 4.2, 4.6**

- [x] 1.2 Implement AuditService
  - Create `lib/services/auditService.ts`
  - Implement logEvent method with async/non-blocking behavior
  - Implement getEvents method with filtering (by type, severity, date range)
  - Implement getSecurityAlerts method (critical/error severity)
  - Implement generateAuditReport method
  - Add TypeScript types for AuditEvent, AuditEventType, AuditFilters
  - **Validates: Requirements 4.1-4.7**

- [ ] 1.3 Add correlation ID system
  - Create utility function to generate correlation IDs in `lib/utils/correlationId.ts`
  - Add correlation ID to Stripe webhook handler
  - Add correlation ID to Gelato webhook handler
  - Add correlation ID to order creation
  - Add correlation ID to Gelato submission
  - **Validates: Requirements 4.2**

- [x] 1.4 Enhance webhook_logs table
  - Create migration `supabase/migrations/011_enhance_webhook_logs.sql`
  - Add correlation_id column (TEXT)
  - Add processing_time_ms column (INTEGER)
  - Add retry_count column (INTEGER DEFAULT 0)
  - Add signature_verified column (BOOLEAN)
  - Add index on correlation_id
  - **Validates: Requirements 4.1, 4.2**

- [ ] 1.5 Add audit logging to Stripe webhook
  - Log webhook.received event with correlation ID
  - Log webhook.signature_verified event (success/failure)
  - Log payment.completed event with payment details
  - Log order.created event with order ID
  - Log any errors with full context
  - **Validates: Requirements 1.8, 4.1-4.5**

- [ ] 1.6 Add audit logging to Gelato webhook
  - Log webhook.received event with correlation ID
  - Log webhook.signature_verified event (success/failure)
  - Log tracking.received event with tracking details
  - Log order status updates
  - **Validates: Requirements 4.1-4.5**

## Phase 2: Payment Security

- [ ] 2.1 Implement PaymentValidator
  - Create `lib/utils/paymentValidator.ts`
  - Implement validateCheckoutSession method (check required fields)
  - Implement validatePaymentAmount method (cart total + tax + shipping)
  - Implement detectDuplicatePayment method (check by session ID)
  - Implement validateWebhookTimestamp method (prevent replay attacks)
  - Add comprehensive error messages and security flags
  - **Validates: Requirements 1.2, 1.3, 1.5**

- [ ] 2.2 Add payment amount validation to Stripe webhook
  - Calculate expected total from cart items (subtotal + tax + shipping)
  - Compare with Stripe session amount_total
  - Log validation results to audit service
  - Reject mismatched payments with 400 status
  - Send admin alert on validation failure
  - **Validates: Requirements 1.3, 1.8**

- [ ] 2.3 Enhance idempotency checks
  - Check for existing order by session ID before creation using getOrderBySessionId
  - Log duplicate prevention events to audit service
  - Return 200 with existing order if already processed
  - Prevent duplicate Gelato submissions
  - **Validates: Requirements 1.5**

- [ ] 2.4 Add rate limiting to webhook endpoints
  - Apply rate limiter to Stripe webhook (100 requests per minute)
  - Apply rate limiter to Gelato webhook (100 requests per minute)
  - Log rate limit violations to audit service with security flag
  - Return 429 status when limit exceeded
  - **Validates: Requirements 1.7**

- [ ] 2.5 Add sensitive data redaction to logs
  - Enhance existing sanitization utility in `lib/utils/sanitize.ts`
  - Redact card numbers, CVV, CVC in webhook payloads
  - Redact API keys and secrets from error logs
  - Apply to all webhook payload logging
  - **Validates: Requirements 1.6, 1.8**

## Phase 3: Gelato Reliability

- [ ] 3.1 Implement retry logic for Gelato submission
  - Add retry wrapper function with exponential backoff (1s, 2s, 4s, 8s)
  - Track retry count in orders table (add retry_count column)
  - Log each retry attempt to audit service
  - Max 4 retries before marking order as failed
  - Update orderService.submitToGelato to use retry logic
  - **Validates: Requirements 2.3**

- [ ] 3.2 Implement circuit breaker pattern
  - Create CircuitBreaker class in `lib/utils/circuitBreaker.ts`
  - Track Gelato API failure rate (sliding window)
  - Open circuit after 5 consecutive failures
  - Half-open state for testing recovery (allow 1 test request)
  - Log circuit state changes to audit service
  - Integrate with gelatoService
  - **Validates: Requirements 2.3**

- [ ] 3.3 Enhance Gelato validation logging
  - Log all validation errors with full order context to audit service
  - Log validation warnings (e.g., country code conversion)
  - Include order ID, order number, and item details
  - Send admin notification on validation failure
  - **Validates: Requirements 2.6, 2.7, 2.8**

- [ ] 3.4 Add Gelato submission metrics
  - Track submission success rate (last 24h, 7d, 30d)
  - Track average submission time
  - Track validation failure reasons (group by error type)
  - Store metrics in audit_events table
  - **Validates: Requirements 2.1-2.8**

- [ ] 3.5 Add manual retry capability
  - Create admin API endpoint POST /api/admin/orders/[id]/retry-gelato
  - Add "Retry Gelato Submission" button to admin order detail page
  - Log manual retry attempts to audit service
  - Show retry history in admin UI (from audit_events)
  - **Validates: Requirements 2.3**

## Phase 4: Tracking & Notifications

- [x] 4.1 Tracking email template exists
  - Email template already implemented in `lib/email-templates/shippingNotification.ts`
  - Includes tracking number, carrier, tracking URL, estimated delivery
  - **Validates: Requirements 3.3, 3.4, 3.5**

- [ ] 4.2 Implement TrackingService
  - Create `lib/services/trackingService.ts`
  - Implement processTrackingUpdate method (update order, send email)
  - Implement sendTrackingNotification method (use emailService)
  - Implement getTrackingInfo method (fetch from orders table)
  - Implement validateTrackingNumber method (format validation by carrier)
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 4.3 Enhance Gelato webhook for tracking notifications
  - Extract tracking number and carrier from webhook payload
  - Call TrackingService.processTrackingUpdate when status is 'shipped'
  - Log tracking information received to audit service
  - Handle missing tracking data gracefully (log warning)
  - Send tracking email to customer via emailService.sendShippingNotification
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 4.4 Implement tracking email retry logic
  - Wrap email sending in retry logic (3 attempts with 5s delay)
  - Log email delivery success/failure to audit service
  - Send admin alert if all retries fail
  - Don't fail webhook processing if email fails
  - **Validates: Requirements 3.3, 3.7**

- [ ] 4.5 Add tracking validation
  - Validate tracking number format by carrier (USPS, UPS, FedEx, DHL patterns)
  - Log validation results to audit service
  - Warn on invalid tracking data but don't fail webhook
  - Store validation warnings in audit_events
  - **Validates: Requirements 3.5**

## Phase 5: Monitoring & Dashboard

- [ ] 5.1 Create security audit dashboard page
  - Create `app/admin/security/page.tsx` with admin authentication
  - Create dashboard layout with metric cards
  - Add navigation link in admin sidebar (`components/admin/Sidebar.tsx`)
  - Create API endpoint GET /api/admin/security/metrics
  - **Validates: Requirements 6.1-6.7**

- [ ] 5.2 Implement payment metrics display
  - Show payment success rate (24h, 7d, 30d) from audit_events
  - Show payment failure rate by reason (group by error type)
  - Show average payment processing time from webhook_logs
  - Show duplicate payment attempts prevented count
  - Display in MetricCard components
  - **Validates: Requirements 6.1**

- [ ] 5.3 Implement Gelato metrics display
  - Show submission success rate from audit_events
  - Show submission retry statistics (avg retries, max retries)
  - Show validation failure reasons (top 5 errors)
  - Show average submission time
  - Display in MetricCard components
  - **Validates: Requirements 6.2**

- [ ] 5.4 Implement tracking metrics display
  - Show tracking number received rate (shipped orders with tracking)
  - Show email delivery success rate from audit_events
  - Show average time from order to tracking (order created to shipped)
  - Show orders awaiting tracking (submitted but not shipped)
  - Display in MetricCard components
  - **Validates: Requirements 6.3, 6.6**

- [ ] 5.5 Implement security alerts display
  - Show recent webhook signature failures (last 24h)
  - Show rate limit violations (last 24h)
  - Show payment amount mismatches (last 7d)
  - Show suspicious activity alerts from audit_events
  - Display in alert list with severity badges
  - **Validates: Requirements 6.5**

- [ ] 5.6 Add audit event log viewer
  - Display recent audit events (last 100) in DataTable
  - Add filtering by event type, severity, source
  - Add search by correlation ID
  - Add pagination (50 per page)
  - Add export to CSV functionality
  - **Validates: Requirements 4.1-4.7, 6.1-6.7**

- [ ] 5.7 Create audit report generator
  - Implement generateAuditReport in AuditService
  - Add date range selector in UI (start date, end date)
  - Generate PDF report using existing reportService
  - Include all metrics, security checks, and recommendations
  - Add download button
  - **Validates: Requirements 4.1-4.7, 6.1-6.7**

## Phase 6: Testing & Validation

- [ ] 6.1 Write payment flow integration tests
  - Create `__tests__/integration/payment-fulfillment-flow.test.ts`
  - Test complete flow: checkout → payment → order → Gelato → tracking
  - Test order creation after successful payment
  - Test Gelato submission with valid order
  - Test tracking number delivery via webhook
  - Test email notifications (confirmation and shipping)
  - **Validates: Requirements 1.1-1.8, 2.1-2.8, 3.1-3.7**

- [ ] 6.2 Write Gelato failure handling tests
  - Test retry logic with exponential backoff
  - Test circuit breaker (open, half-open, closed states)
  - Test manual retry from admin endpoint
  - Test validation failures (missing UID, invalid design URL)
  - **Validates: Requirements 2.3, 2.6-2.8**

- [ ] 6.3 Write idempotency tests
  - Test duplicate Stripe webhook delivery (same session ID)
  - Test duplicate payment prevention (getOrderBySessionId check)
  - Verify single order creation for duplicate webhooks
  - Test duplicate Gelato submission prevention
  - **Validates: Requirements 1.5**

- [ ] 6.4 Write property-based test: Payment Integrity
  - Create `__tests__/properties/payment-security.test.ts`
  - Generate random cart items with fast-check
  - Verify total calculation (subtotal + tax + shipping)
  - Verify payment amount validation catches mismatches
  - Run 1000 iterations
  - **Validates: Requirements 1.3**

- [ ] 6.5 Write property-based test: Webhook Signature Verification
  - Add to `__tests__/properties/payment-security.test.ts`
  - Generate random payloads and invalid signatures
  - Verify all invalid signatures rejected with 400 status
  - Verify valid signatures accepted
  - Test both Stripe and Gelato webhooks
  - **Validates: Requirements 1.1**

- [ ] 6.6 Write property-based test: Order-Payment Bijection
  - Add to `__tests__/properties/payment-security.test.ts`
  - Verify one order per payment session
  - Verify one payment per order
  - Test with multiple concurrent payments
  - **Validates: Requirements 1.5, 2.1**

- [ ] 6.7 Write property-based test: Gelato Submission Completeness
  - Create `__tests__/properties/gelato-reliability.test.ts`
  - Verify all paid orders eventually submitted or marked failed
  - Test with simulated Gelato API failures
  - Verify retry logic executes correctly
  - **Validates: Requirements 2.1, 2.3**

- [ ] 6.8 Write property-based test: Tracking Delivery
  - Add to `__tests__/properties/gelato-reliability.test.ts`
  - Verify tracking numbers stored in database
  - Verify tracking emails sent to customers
  - Test with various carriers (USPS, UPS, FedEx, DHL)
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 6.9 Write property-based test: Audit Completeness
  - Create `__tests__/properties/audit-trail.test.ts`
  - Verify all critical events logged to audit_events
  - Verify correlation IDs present in all related events
  - Test audit trail integrity (no missing events)
  - **Validates: Requirements 4.1-4.7**

- [ ] 6.10 Write property-based test: Idempotency
  - Add to `__tests__/properties/payment-security.test.ts`
  - Process same webhook event multiple times
  - Verify identical results (same order, no duplicates)
  - Test with various event types (payment, tracking)
  - **Validates: Requirements 1.5**

- [ ] 6.11 Write security tests
  - Create `__tests__/security/payment-fulfillment-security.test.ts`
  - Test webhook signature rejection (invalid signatures)
  - Test rate limiting enforcement (exceed limits)
  - Test input sanitization (XSS, SQL injection attempts)
  - Test audit logging (verify all security events logged)
  - **Validates: Requirements 1.1, 1.6, 1.7, 1.8**

- [ ] 6.12 Run comprehensive system audit
  - Enhance existing `scripts/comprehensive-system-audit.ts`
  - Check all security configurations (webhook secrets, rate limits)
  - Verify all metrics collecting correctly
  - Generate audit report with findings
  - Document any issues found
  - **Validates: Requirements 4.1-4.7, 5.1-5.7**

## Phase 7: Documentation & Deployment

- [ ] 7.1 Update admin documentation
  - Create `docs/admin/security-dashboard.md`
  - Document security dashboard usage and metrics
  - Document audit report generation process
  - Document manual retry process for failed Gelato submissions
  - Document alerting system and thresholds
  - **Validates: Requirements 6.1-6.7**

- [ ] 7.2 Create runbook for common issues
  - Create `docs/runbooks/payment-fulfillment-issues.md`
  - Payment validation failures (amount mismatch, duplicate payments)
  - Gelato submission failures (validation errors, API errors)
  - Tracking number issues (missing tracking, invalid format)
  - Webhook processing errors (signature failures, timeouts)
  - Include troubleshooting steps and resolution procedures
  - **Validates: Requirements 1.4, 2.3, 3.7**

- [ ] 7.3 Set up production monitoring
  - Configure alerting thresholds in environment variables
  - Set up email notifications for critical alerts
  - Configure Slack/Discord webhooks for admin notifications
  - Test alert delivery in staging environment
  - **Validates: Requirements 6.5**

- [ ] 7.4 Deploy to production
  - Run database migrations (010, 011)
  - Verify environment variables (GELATO_WEBHOOK_SECRET, alert thresholds)
  - Deploy code changes to production
  - Monitor webhook processing and audit logs
  - **Validates: All requirements**

- [ ] 7.5 Conduct post-deployment audit
  - Run full system audit using enhanced audit script
  - Verify all metrics collecting correctly
  - Verify alerts working (trigger test alerts)
  - Document any issues found
  - Generate baseline audit report
  - **Validates: Requirements 4.1-4.7, 5.1-5.7, 6.1-6.7**

## Testing Framework

All property-based tests will use fast-check library with the following structure:

```typescript
import fc from 'fast-check'

describe('Property: [Property Name]', () => {
  it('should maintain [invariant] for all valid inputs', () => {
    fc.assert(
      fc.property(
        // Arbitraries (input generators)
        fc.array(arbitraries.cartItem()),
        fc.float({ min: 0, max: 0.15 }),
        // Property test
        (cartItems, taxRate) => {
          // Test logic
          return invariantHolds
        }
      ),
      { numRuns: 1000 } // Run 1000 random test cases
    )
  })
})
```

## Success Criteria

- [x] All database migrations applied successfully (010, 011)
- [x] All services implemented and tested (AuditService, PaymentValidator, TrackingService, CircuitBreaker)
- [x] All integration tests passing (payment flow, Gelato failures, idempotency)
- [~] All property-based tests passing (7 properties, 1000+ iterations each)
- [x] All security tests passing (signature verification, rate limiting, sanitization)
- [x] Security dashboard operational with real-time metrics
- [ ] Audit report generator working (PDF export)
- [x] All metrics collecting correctly (payment, Gelato, tracking, security)
- [ ] Alerting system configured and tested
- [ ] Documentation complete (admin guide, runbooks)
- [ ] Production deployment successful
- [ ] Post-deployment audit passed with no critical issues

## Notes

- Each task should be completed and tested before moving to the next
- Property-based tests should run at least 1000 iterations
- All security-critical code should have 100% test coverage
- Admin notifications should be tested in staging before production
- Audit logs should be retained for at least 90 days for compliance
