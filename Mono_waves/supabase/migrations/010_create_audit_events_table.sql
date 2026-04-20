-- Create audit_events table for comprehensive security and operational logging
CREATE TABLE IF NOT EXISTS public.audit_events (
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

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON public.audit_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON public.audit_events(severity);
CREATE INDEX IF NOT EXISTS idx_audit_events_source ON public.audit_events(source);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_severity_timestamp ON public.audit_events(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_source_event_type ON public.audit_events(source, event_type);

-- Enable Row Level Security
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit events
CREATE POLICY "Admins can view all audit events"
    ON public.audit_events
    FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
    );

-- Policy: System can insert audit events (no user authentication required for logging)
CREATE POLICY "System can insert audit events"
    ON public.audit_events
    FOR INSERT
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.audit_events IS 'Comprehensive audit log for payment processing, order fulfillment, and security events';
COMMENT ON COLUMN public.audit_events.event_type IS 'Type of event (e.g., payment.completed, order.submitted_to_gelato, webhook.signature_failed)';
COMMENT ON COLUMN public.audit_events.severity IS 'Severity level: info, warning, error, critical';
COMMENT ON COLUMN public.audit_events.source IS 'Source system: stripe, gelato, or system';
COMMENT ON COLUMN public.audit_events.correlation_id IS 'Correlation ID to trace related events across the system';
COMMENT ON COLUMN public.audit_events.user_id IS 'Optional user ID associated with the event';
COMMENT ON COLUMN public.audit_events.metadata IS 'Additional event data stored as JSONB for flexibility';
COMMENT ON COLUMN public.audit_events.security_flags IS 'Array of security-related flags (e.g., AMOUNT_MISMATCH, RATE_LIMIT_EXCEEDED)';
