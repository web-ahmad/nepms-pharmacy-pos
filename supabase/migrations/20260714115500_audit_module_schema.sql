-- Audit Events Table
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('void', 'discount', 'refund', 'drawer_open', 'stock_adjustment', 'expired_sale', 'after_hours_login')),
    transaction_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_branch_id ON audit_events(branch_id);
CREATE INDEX idx_audit_events_staff_id ON audit_events(staff_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Camera Snapshots Table
CREATE TABLE camera_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL,
    camera_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_camera_snapshots_audit_event_id ON camera_snapshots(audit_event_id);
CREATE INDEX idx_camera_snapshots_branch_id ON camera_snapshots(branch_id);

ALTER TABLE camera_snapshots ENABLE ROW LEVEL SECURITY;

-- Staff Risk Scores Table
CREATE TABLE staff_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    void_count INTEGER DEFAULT 0,
    discount_total NUMERIC DEFAULT 0.0,
    refund_count INTEGER DEFAULT 0,
    risk_score NUMERIC DEFAULT 0.0,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('green', 'yellow', 'red')),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_risk_scores_staff_id ON staff_risk_scores(staff_id);
CREATE INDEX idx_staff_risk_scores_branch_id ON staff_risk_scores(branch_id);
CREATE INDEX idx_staff_risk_scores_calculated_at ON staff_risk_scores(calculated_at);

ALTER TABLE staff_risk_scores ENABLE ROW LEVEL SECURITY;

-- Cash Reconciliation Table
CREATE TABLE cash_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    expected_cash NUMERIC NOT NULL,
    actual_cash NUMERIC NOT NULL,
    variance NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_reconciliation_branch_id ON cash_reconciliation(branch_id);
CREATE INDEX idx_cash_reconciliation_staff_id ON cash_reconciliation(staff_id);
CREATE INDEX idx_cash_reconciliation_created_at ON cash_reconciliation(created_at);

ALTER TABLE cash_reconciliation ENABLE ROW LEVEL SECURITY;

-- Inventory Audit Flags Table
CREATE TABLE inventory_audit_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('shrinkage', 'near_expiry', 'expired')),
    expected_qty INTEGER NOT NULL,
    actual_qty INTEGER NOT NULL,
    variance INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_audit_flags_branch_id ON inventory_audit_flags(branch_id);
CREATE INDEX idx_inventory_audit_flags_created_at ON inventory_audit_flags(created_at);

ALTER TABLE inventory_audit_flags ENABLE ROW LEVEL SECURITY;

-- Alert Config Table
CREATE TABLE alert_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    threshold_value NUMERIC,
    notify_via TEXT NOT NULL CHECK (notify_via IN ('whatsapp', 'dashboard', 'both'))
);

CREATE INDEX idx_alert_config_branch_id ON alert_config(branch_id);
CREATE INDEX idx_alert_config_owner_id ON alert_config(owner_id);

ALTER TABLE alert_config ENABLE ROW LEVEL SECURITY;

-- Alert History Table
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_event_id UUID REFERENCES audit_events(id) ON DELETE SET NULL,
    sent_to TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'dashboard')),
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_history_audit_event_id ON alert_history(audit_event_id);
CREATE INDEX idx_alert_history_sent_at ON alert_history(sent_at);

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Audit Log Chain Table
CREATE TABLE audit_log_chain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_chain_event_id ON audit_log_chain(event_id);
CREATE INDEX idx_audit_log_chain_created_at ON audit_log_chain(created_at);

ALTER TABLE audit_log_chain ENABLE ROW LEVEL SECURITY;
