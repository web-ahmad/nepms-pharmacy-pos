-- Create a GIN index on the JSONB metadata column to optimize .contains() and @> queries.
-- This significantly speeds up lookups like the 30-day repeated refund check.
CREATE INDEX idx_audit_events_metadata_gin ON audit_events USING GIN (metadata);
