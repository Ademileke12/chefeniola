# Migration 010: Create Audit Events Table

## Overview

This migration creates the `audit_events` table for comprehensive security and operational logging of the payment-to-delivery pipeline. This table is essential for:

- Payment processing audit trail
- Order fulfillment monitoring
- Security event tracking
- Webhook processing logs
- Compliance and debugging

## What This Migration Does

1. **Creates `audit_events` table** with the following columns:
   - `id` - UUID primary key
   - `timestamp` - Event timestamp (auto-generated)
   - `event_type` - Type of event (e.g., payment.completed, order.submitted_to_gelato)
   - `severity` - Event severity (info, warning, error, critical)
   - `source` - Event source (stripe, gelato, system)
   - `correlation_id` - ID to trace related events
   - `user_id` - Optional user identifier
   - `metadata` - JSONB field for flexible event data
   - `security_flags` - Array of security-related flags
   - `created_at` - Record creation timestamp

2. **Creates performance indexes**:
   - `idx_audit_events_timestamp` - For time-based queries
   - `idx_audit_events_correlation_id` - For tracing related events
   - `idx_audit_events_event_type` - For filtering by event type
   - `idx_audit_events_severity` - For filtering by severity
   - `idx_audit_events_source` - For filtering by source
   - `idx_audit_events_severity_timestamp` - Composite index for common queries
   - `idx_audit_events_source_event_type` - Composite index for source-specific queries

3. **Enables Row Level Security (RLS)**:
   - Admins can view all audit events
   - System can insert audit events (no authentication required for logging)

4. **Adds constraints**:
   - Severity must be one of: info, warning, error, critical
   - Source must be one of: stripe, gelato, system

## How to Run This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `010_create_audit_events_table.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success message

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed and linked
supabase db push
```

### Option 3: Using the Script

```bash
# Run the migration script (provides instructions)
npx tsx scripts/run-migration-010.ts
```

## Verification

After running the migration, verify it was successful:

```bash
# Run the verification script
npx tsx scripts/verify-migration-010.ts
```

The verification script will:
- Check if the table exists
- Test insert operations
- Verify constraints are working
- Test all indexes
- Clean up test data

### Manual Verification

You can also verify manually in the Supabase dashboard:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'audit_events';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'audit_events';

-- Test insert
INSERT INTO audit_events (
  event_type,
  severity,
  source,
  correlation_id,
  metadata
) VALUES (
  'system.test',
  'info',
  'system',
  'test-123',
  '{"test": true}'::jsonb
);

-- Query test data
SELECT * FROM audit_events WHERE correlation_id = 'test-123';

-- Clean up
DELETE FROM audit_events WHERE correlation_id = 'test-123';
```

## Event Types

The following event types will be logged by the system:

### Payment Events
- `payment.initiated` - Payment process started
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.duplicate_prevented` - Duplicate payment attempt blocked

### Order Events
- `order.created` - Order created in database
- `order.submitted_to_gelato` - Order submitted to Gelato
- `order.gelato_submission_failed` - Gelato submission failed

### Tracking Events
- `tracking.received` - Tracking number received from Gelato
- `tracking.email_sent` - Tracking email sent to customer

### Webhook Events
- `webhook.received` - Webhook received
- `webhook.signature_verified` - Webhook signature valid
- `webhook.signature_failed` - Webhook signature invalid

### Security Events
- `security.rate_limit_exceeded` - Rate limit hit
- `security.suspicious_activity` - Suspicious activity detected
- `security.payment_amount_mismatch` - Payment amount validation failed

## Usage Examples

### Logging an Event (via AuditService)

```typescript
import { auditService } from '@/lib/services/auditService'

// Log a payment completion
await auditService.logEvent({
  eventType: 'payment.completed',
  severity: 'info',
  source: 'stripe',
  correlationId: session.id,
  userId: session.customer_email,
  metadata: {
    amount: session.amount_total,
    currency: session.currency,
    sessionId: session.id
  }
})

// Log a security event
await auditService.logEvent({
  eventType: 'security.payment_amount_mismatch',
  severity: 'critical',
  source: 'stripe',
  correlationId: session.id,
  metadata: {
    expectedAmount: calculatedTotal,
    receivedAmount: session.amount_total,
    difference: Math.abs(calculatedTotal - session.amount_total)
  },
  securityFlags: ['AMOUNT_MISMATCH', 'REQUIRES_INVESTIGATION']
})
```

### Querying Events

```typescript
// Get all events for a specific order
const events = await auditService.getEvents({
  correlationId: orderId,
  orderBy: 'timestamp',
  ascending: true
})

// Get security alerts
const alerts = await auditService.getSecurityAlerts()

// Get events by type
const paymentEvents = await auditService.getEvents({
  eventType: 'payment.completed',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
})
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop the table (this will delete all audit data)
DROP TABLE IF EXISTS public.audit_events CASCADE;
```

⚠️ **Warning**: This will permanently delete all audit logs. Only rollback if absolutely necessary.

## Next Steps

After this migration is complete:

1. ✅ Task 1.1 complete: audit_events table created
2. → Task 1.2: Implement AuditService (`lib/services/auditService.ts`)
3. → Task 1.3: Add correlation ID system
4. → Task 1.5: Add audit logging to Stripe webhook
5. → Task 1.6: Add audit logging to Gelato webhook

## Troubleshooting

### Error: relation "audit_events" already exists

The table already exists. You can either:
- Skip this migration
- Drop the existing table first (see Rollback section)

### Error: permission denied

Make sure you're using the service role key, not the anon key:
- Check `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`

### Error: constraint violation

Check that your data matches the constraints:
- `severity` must be: info, warning, error, or critical
- `source` must be: stripe, gelato, or system

## Support

For issues or questions:
1. Check the verification script output
2. Review the SQL file for syntax errors
3. Check Supabase dashboard logs
4. Consult the main spec: `.kiro/specs/payment-fulfillment-security-audit/`
