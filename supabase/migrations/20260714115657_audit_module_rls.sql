-- Row Level Security Policies for Audit Module

-- 1. Branch staff can only INSERT audit_events for their own branch
CREATE POLICY "Staff can insert audit events for their branch"
ON audit_events
FOR INSERT
TO authenticated
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM staff_roles WHERE user_id = auth.uid()
    )
);

-- 2. Only owner/admin role can SELECT staff_risk_scores, cash_reconciliation, and alert_config
CREATE POLICY "Owners and Admins can view staff_risk_scores"
ON staff_risk_scores
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM staff_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Owners and Admins can view cash_reconciliation"
ON cash_reconciliation
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM staff_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Owners and Admins can view alert_config"
ON alert_config
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM staff_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- 3. No one can UPDATE or DELETE rows in audit_events or audit_log_chain 
-- (These tables are append-only. By default, with RLS enabled and no policy, it is denied.
-- We explicitly define these as false to ensure it cannot be bypassed via RLS by any app admin).

CREATE POLICY "Deny UPDATE on audit_events"
ON audit_events
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Deny DELETE on audit_events"
ON audit_events
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "Deny UPDATE on audit_log_chain"
ON audit_log_chain
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Deny DELETE on audit_log_chain"
ON audit_log_chain
FOR DELETE
TO authenticated
USING (false);

-- Supplementary policies for Owners/Admins to view the append-only tables
CREATE POLICY "Owners and Admins can view audit_events"
ON audit_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM staff_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Owners and Admins can view audit_log_chain"
ON audit_log_chain
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM staff_roles 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);
