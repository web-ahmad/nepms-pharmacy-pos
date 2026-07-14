-- Enable pgcrypto for SHA-256 hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigger Function: Computes hash and adds to audit_log_chain on INSERT
CREATE OR REPLACE FUNCTION process_audit_event_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash TEXT;
    new_hash TEXT;
    payload TEXT;
BEGIN
    -- 1. Fetch the most recent hash in the chain
    SELECT current_hash INTO prev_hash
    FROM audit_log_chain
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. If this is the very first event, use a genesis hash
    IF prev_hash IS NULL THEN
        prev_hash := 'genesis_hash_00000000000000000000000000000000000000000000000000000000';
    END IF;

    -- 3. Construct the payload for hashing. 
    -- We use EXTRACT(EPOCH FROM ...) for the timestamp to ensure the string 
    -- representation doesn't change based on the session's TimeZone.
    payload := NEW.id::TEXT || 
               NEW.branch_id::TEXT || 
               NEW.staff_id::TEXT || 
               NEW.event_type || 
               COALESCE(NEW.transaction_id::TEXT, '') || 
               NEW.metadata::TEXT || 
               NEW.severity ||
               EXTRACT(EPOCH FROM NEW.created_at)::TEXT || 
               prev_hash;

    -- 4. Compute SHA-256 hash using pgcrypto's digest
    new_hash := encode(digest(payload, 'sha256'), 'hex');

    -- 5. Insert the new link in the chain
    INSERT INTO audit_log_chain (event_id, previous_hash, current_hash)
    VALUES (NEW.id, prev_hash, new_hash);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on audit_events
CREATE TRIGGER trigger_audit_event_hash
AFTER INSERT ON audit_events
FOR EACH ROW
EXECUTE FUNCTION process_audit_event_hash();


-- Verification Function: Scans the entire chain and validates integrity
-- Usage: SELECT * FROM verify_audit_chain();
CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS TABLE (
    is_valid BOOLEAN,
    broken_event_id UUID,
    reason TEXT
) AS $$
DECLARE
    r RECORD;
    computed_hash TEXT;
    payload TEXT;
    expected_prev_hash TEXT := 'genesis_hash_00000000000000000000000000000000000000000000000000000000';
BEGIN
    -- Iterate through the chain chronologically
    FOR r IN (
        SELECT e.*, c.previous_hash, c.current_hash
        FROM audit_log_chain c
        JOIN audit_events e ON c.event_id = e.id
        ORDER BY c.created_at ASC
    ) LOOP
        
        -- 1. Check if the chain is contiguous
        IF r.previous_hash != expected_prev_hash THEN
            is_valid := FALSE;
            broken_event_id := r.id;
            reason := 'Chain broken: The previous_hash does not match the actual current_hash of the preceding event. A record may have been deleted.';
            RETURN NEXT;
            RETURN; -- Stop checking after the first break
        END IF;

        -- 2. Re-compute the hash for the current record
        payload := r.id::TEXT || 
                   r.branch_id::TEXT || 
                   r.staff_id::TEXT || 
                   r.event_type || 
                   COALESCE(r.transaction_id::TEXT, '') || 
                   r.metadata::TEXT || 
                   r.severity ||
                   EXTRACT(EPOCH FROM r.created_at)::TEXT || 
                   r.previous_hash;

        computed_hash := encode(digest(payload, 'sha256'), 'hex');

        -- 3. Verify the hash matches what is stored
        IF computed_hash != r.current_hash THEN
            is_valid := FALSE;
            broken_event_id := r.id;
            reason := 'Hash mismatch: The event data in audit_events has been tampered with or modified after insertion.';
            RETURN NEXT;
            RETURN;
        END IF;

        -- 4. Setup expected hash for the next iteration
        expected_prev_hash := r.current_hash;
    END LOOP;

    -- If the loop completes successfully, the chain is valid
    is_valid := TRUE;
    broken_event_id := NULL;
    reason := 'Audit chain is fully intact and cryptographically verified.';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
