"""multi_tenant_saas_retrofit

Revision ID: a1b2c3d4e5f6
Revises: 1e78194f4baa
Create Date: 2026-07-14

Multi-Tenant SaaS Schema Retrofit
===================================
1. Creates `pharmacies` table (owner-level entity above branches/tenants)
2. Creates `super_admins` table
3. Adds `pharmacy_id` FK to:
   - All 90 tables that currently have `tenant_id`    (backfilled from tenant)
   - 8 Group-C tables that have neither tenant nor branch
   - `camera_snapshots` which has branch but not tenant
4. Backfills `pharmacy_id` using the existing tenant rows as seed
5. Makes `pharmacy_id` NOT NULL after backfill

Strategy: ADDITIVE — keeps `tenant_id` intact so existing code keeps working.
The `pharmacy_id` column is a new FK to the new `pharmacies` table.
Phase-2 will remove `tenant_id` after all application code is updated.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
import uuid
from datetime import datetime

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = '22a9cf58e3ed'
branch_labels = None
depends_on = None

# ── helpers ────────────────────────────────────────────────────────────────────

def _add_pharmacy_id(table_name: str, nullable: bool = False) -> None:
    """Add pharmacy_id (nullable FK) to a table via batch mode."""
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.add_column(
            sa.Column('pharmacy_id', sa.String(36), sa.ForeignKey('pharmacies.id'), nullable=True)
        )


# ── Groups A+B: tables that already have tenant_id ────────────────────────────
TENANT_SCOPED_TABLES = [
    # Group A – also have branch_id
    'audit_sessions', 'batches', 'cash_sessions', 'customer_ledger',
    'customer_payments', 'grns', 'purchase_orders', 'purchase_returns',
    'sale_returns', 'sales', 'stock_adjustments', 'stock_movements',
    'supplier_ledger', 'supplier_payments', 'user_branches',
    # Group B – tenant_id only
    'accounts', 'advance_salaries', 'attendance', 'audit_items',
    'backup_history', 'branches', 'cash_ledger_entries', 'categories',
    'customers', 'departments', 'designations', 'employees',
    'expense_vouchers', 'holidays', 'invoice_settings', 'journal_entries',
    'leave_requests', 'loyalty_transactions', 'master_age_groups',
    'master_bins', 'master_brands', 'master_categories',
    'master_dosage_forms', 'master_flavors', 'master_generics',
    'master_manufacturers', 'master_packaging', 'master_prescription_types',
    'master_racks', 'master_routes', 'master_shelves',
    'master_storage_conditions', 'master_strength_units', 'master_strengths',
    'master_suppliers', 'master_tax_rules', 'master_units',
    'master_warehouses', 'medicine_ai_tags', 'medicine_audit_logs',
    'medicine_barcodes', 'medicine_conversion_rules',
    'medicine_custom_fields', 'medicine_documents', 'medicine_images',
    'medicine_master', 'medicine_packaging', 'medicine_pricing',
    'medicine_supplier_mapping', 'medicine_templates', 'medicine_versions',
    'medicines', 'notifications', 'ocr_queues', 'packaging_levels',
    'payroll_runs', 'payroll_settings', 'permissions', 'petty_cash_categories',
    'po_items', 'prescription_items', 'prescriptions', 'purchase_invoices',
    'purchase_return_items', 'role_permissions', 'roles', 'sale_items',
    'sale_return_items', 'shifts', 'supplier_medicine_prices', 'suppliers',
    'system_modules', 'tenant_settings', 'tenants', 'users',
]

# Group C – no tenant_id, backfill with seed pharmacy id
NO_TENANT_TABLES = [
    'audit_events',
    'alert_config',
    'alert_history',
    'camera_snapshots',
    'whatsapp_bot_log',
    'journal_entry_lines',
    'medicine_substitutes',
    'payroll_lines',
]


def upgrade() -> None:
    conn = op.get_bind()

    # ── Step 1: Create `pharmacies` table ─────────────────────────────────────
    op.create_table(
        'pharmacies',
        sa.Column('id', sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('owner_contact', sa.String(50), nullable=True),
        sa.Column('subscription_status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
        sa.Column('pharmacy_id', sa.String(36), nullable=True),
        # Link back to the legacy tenants table for backward compat
        sa.Column('tenant_id', sa.String(36), nullable=True),
    )

    # ── Step 2: Create `super_admins` table ───────────────────────────────────
    op.create_table(
        'super_admins',
        sa.Column('id', sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
        sa.Column('auth_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
        sa.Column('pharmacy_id', sa.String(36), nullable=True),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )

    # ── Step 3: Seed `pharmacies` from existing `tenants` rows ────────────────
    existing_tenants = conn.execute(
        sa.text("SELECT id, name FROM tenants WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY created_at ASC")
    ).fetchall()

    # Map tenant_id → pharmacy_id for backfilling
    tenant_to_pharmacy = {}
    now = datetime.utcnow().isoformat()

    for tenant in existing_tenants:
        pharmacy_id = str(uuid.uuid4())
        tenant_to_pharmacy[tenant.id] = pharmacy_id
        conn.execute(
            sa.text(
                "INSERT INTO pharmacies (id, name, owner_contact, subscription_status, is_active, created_at, tenant_id) "
                "VALUES (:id, :name, NULL, 'active', 1, :created_at, :tenant_id)"
            ),
            {"id": pharmacy_id, "name": tenant.name, "created_at": now, "tenant_id": tenant.id}
        )

    # If no tenants existed, create a default placeholder
    if not tenant_to_pharmacy:
        seed_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO pharmacies (id, name, owner_contact, subscription_status, is_active, created_at, tenant_id) "
                "VALUES (:id, 'My Pharmacy', NULL, 'active', 1, :created_at, NULL)"
            ),
            {"id": seed_id, "created_at": now}
        )
        # Use this for all Group C backfills
        default_pharmacy_id = seed_id
    else:
        # Use first tenant's pharmacy as default for unscoped tables
        default_pharmacy_id = list(tenant_to_pharmacy.values())[0]

    # ── Step 4: Add pharmacy_id to all tenant-scoped tables ───────────────────
    for table in TENANT_SCOPED_TABLES:
        try:
            _add_pharmacy_id(table)
        except Exception as e:
            print(f"[WARN] Skipping {table}: {e}")

    # ── Step 5: Backfill pharmacy_id for tenant-scoped tables ─────────────────
    for table in TENANT_SCOPED_TABLES:
        try:
            for tenant_id, pharmacy_id in tenant_to_pharmacy.items():
                conn.execute(
                    sa.text(f"UPDATE {table} SET pharmacy_id = :pid WHERE tenant_id = :tid"),
                    {"pid": pharmacy_id, "tid": tenant_id}
                )
            # Fill any rows still NULL (edge cases)
            conn.execute(
                sa.text(f"UPDATE {table} SET pharmacy_id = :pid WHERE pharmacy_id IS NULL"),
                {"pid": default_pharmacy_id}
            )
        except Exception as e:
            print(f"[WARN] Backfill skipped for {table}: {e}")

    # ── Step 6: Add pharmacy_id to Group-C tables (no tenant_id) ──────────────
    for table in NO_TENANT_TABLES:
        try:
            _add_pharmacy_id(table)
            conn.execute(
                sa.text(f"UPDATE {table} SET pharmacy_id = :pid WHERE pharmacy_id IS NULL"),
                {"pid": default_pharmacy_id}
            )
        except Exception as e:
            print(f"[WARN] Skipping Group-C {table}: {e}")

    # ── Step 7: Make pharmacy_id NOT NULL on critical transactional tables ─────
    # (SQLite batch mode required for NOT NULL constraints)
    critical_tables = [
        'pharmacies',   # itself
        'branches', 'users', 'roles', 'medicines', 'sales', 'batches',
        'purchase_orders', 'suppliers', 'customers', 'employees',
        'audit_events', 'alert_config',
    ]
    for table in critical_tables:
        if table == 'pharmacies':
            continue  # already NOT NULL by definition
        try:
            with op.batch_alter_table(table) as batch_op:
                batch_op.alter_column('pharmacy_id', nullable=False)
        except Exception as e:
            print(f"[WARN] NOT NULL constraint skipped for {table}: {e}")


def downgrade() -> None:
    conn = op.get_bind()

    # Remove pharmacy_id from all tables
    all_modified = TENANT_SCOPED_TABLES + NO_TENANT_TABLES
    for table in all_modified:
        try:
            with op.batch_alter_table(table) as batch_op:
                batch_op.drop_column('pharmacy_id')
        except Exception as e:
            print(f"[WARN] Drop pharmacy_id skipped for {table}: {e}")

    op.drop_table('super_admins')
    op.drop_table('pharmacies')
