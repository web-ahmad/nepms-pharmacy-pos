"""enterprise_purchase_upgrade_manual

Revision ID: c197f10b73df
Revises: ca78d677c016
Create Date: 2026-07-15 14:52:13.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'c197f10b73df'
down_revision: Union[str, Sequence[str], None] = 'ca78d677c016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name, column_name, conn):
    insp = Inspector.from_engine(conn)
    cols = [c['name'] for c in insp.get_columns(table_name)]
    return column_name in cols

def upgrade() -> None:
    conn = op.get_bind()
    
    # Add columns to purchase_orders
    with op.batch_alter_table('purchase_orders') as batch_op:
        if not column_exists('purchase_orders', 'warehouse_id', conn):
            batch_op.add_column(sa.Column('warehouse_id', sa.String(36), nullable=True))
            batch_op.add_column(sa.Column('approved_by', sa.String(36), nullable=True))
            batch_op.add_column(sa.Column('approved_at', sa.DateTime(), nullable=True))
            batch_op.add_column(sa.Column('approval_status', sa.String(50), nullable=True, server_default='Pending'))
            batch_op.add_column(sa.Column('delivery_status', sa.String(50), nullable=True, server_default='Pending'))
            batch_op.add_column(sa.Column('payment_status', sa.String(50), nullable=True, server_default='Unpaid'))
            batch_op.add_column(sa.Column('purchase_priority', sa.String(50), nullable=True, server_default='Normal'))
            batch_op.add_column(sa.Column('purchase_source', sa.String(50), nullable=True, server_default='Manual'))
            batch_op.add_column(sa.Column('reference_number', sa.String(100), nullable=True))
            batch_op.add_column(sa.Column('remarks', sa.Text(), nullable=True))

    # Add columns to po_items
    with op.batch_alter_table('po_items') as batch_op:
        if not column_exists('po_items', 'warehouse_id', conn):
            batch_op.add_column(sa.Column('warehouse_id', sa.String(36), nullable=True))
            batch_op.add_column(sa.Column('pending_quantity', sa.Integer(), nullable=True, server_default='0'))
            batch_op.add_column(sa.Column('rejected_quantity', sa.Integer(), nullable=True, server_default='0'))
            batch_op.add_column(sa.Column('bonus_quantity', sa.Integer(), nullable=True, server_default='0'))
            batch_op.add_column(sa.Column('discount_percentage', sa.Float(), nullable=True, server_default='0.0'))
            batch_op.add_column(sa.Column('tax_percentage', sa.Float(), nullable=True, server_default='0.0'))
            batch_op.add_column(sa.Column('expiry_required', sa.Boolean(), nullable=True, server_default='1'))
            batch_op.add_column(sa.Column('batch_required', sa.Boolean(), nullable=True, server_default='1'))

    insp = Inspector.from_engine(conn)
    tables = insp.get_table_names()

    # Create new tables
    if 'purchase_approvals' not in tables:
        op.create_table(
            'purchase_approvals',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('po_id', sa.String(36), sa.ForeignKey('purchase_orders.id'), nullable=True),
            sa.Column('approver_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('level', sa.Integer(), nullable=True, server_default='1'),
            sa.Column('status', sa.String(50), nullable=True, server_default='Pending'),
            sa.Column('comments', sa.Text(), nullable=True),
            sa.Column('approved_at', sa.DateTime(), nullable=True)
        )

    if 'purchase_receivings' not in tables:
        op.create_table(
            'purchase_receivings',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('receiving_number', sa.String(100), unique=True, index=True),
            sa.Column('po_id', sa.String(36), sa.ForeignKey('purchase_orders.id'), nullable=True),
            sa.Column('supplier_id', sa.String(36), sa.ForeignKey('suppliers.id'), nullable=True),
            sa.Column('branch_id', sa.String(36), sa.ForeignKey('branches.id'), nullable=True),
            sa.Column('warehouse_id', sa.String(36), sa.ForeignKey('branch_warehouses.id'), nullable=True),
            sa.Column('received_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(50), nullable=True, server_default='Draft'),
            sa.Column('total_amount', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('freight_charge', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('landed_cost_allocated', sa.Boolean(), nullable=True, server_default='0')
        )

    if 'purchase_receiving_items' not in tables:
        op.create_table(
            'purchase_receiving_items',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('receiving_id', sa.String(36), sa.ForeignKey('purchase_receivings.id'), nullable=True),
            sa.Column('po_item_id', sa.String(36), sa.ForeignKey('po_items.id'), nullable=True),
            sa.Column('medicine_id', sa.String(36), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('batch_id', sa.String(36), sa.ForeignKey('batches.id'), nullable=True),
            sa.Column('quantity_received', sa.Integer(), nullable=False),
            sa.Column('quantity_rejected', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('bonus_quantity', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('unit_price', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('discount_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('tax_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('landed_cost', sa.Float(), nullable=True, server_default='0.0')
        )

    if 'purchase_requests' not in tables:
        op.create_table(
            'purchase_requests',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('request_number', sa.String(100), unique=True, index=True),
            sa.Column('branch_id', sa.String(36), sa.ForeignKey('branches.id'), nullable=True),
            sa.Column('requested_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('request_date', sa.Date(), nullable=True),
            sa.Column('required_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(50), nullable=True, server_default='Draft'),
            sa.Column('priority', sa.String(50), nullable=True, server_default='Normal'),
            sa.Column('remarks', sa.Text(), nullable=True)
        )

    if 'purchase_request_items' not in tables:
        op.create_table(
            'purchase_request_items',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('request_id', sa.String(36), sa.ForeignKey('purchase_requests.id'), nullable=True),
            sa.Column('medicine_id', sa.String(36), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('quantity_requested', sa.Integer(), nullable=False),
            sa.Column('quantity_approved', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('remarks', sa.Text(), nullable=True)
        )

    if 'purchase_quotations' not in tables:
        op.create_table(
            'purchase_quotations',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('quotation_number', sa.String(100), unique=True, index=True),
            sa.Column('request_id', sa.String(36), sa.ForeignKey('purchase_requests.id'), nullable=True),
            sa.Column('supplier_id', sa.String(36), sa.ForeignKey('suppliers.id'), nullable=True),
            sa.Column('branch_id', sa.String(36), sa.ForeignKey('branches.id'), nullable=True),
            sa.Column('valid_until', sa.Date(), nullable=True),
            sa.Column('status', sa.String(50), nullable=True, server_default='Draft'),
            sa.Column('total_amount', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('remarks', sa.Text(), nullable=True)
        )

    if 'purchase_quotation_items' not in tables:
        op.create_table(
            'purchase_quotation_items',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('quotation_id', sa.String(36), sa.ForeignKey('purchase_quotations.id'), nullable=True),
            sa.Column('medicine_id', sa.String(36), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('discount_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('tax_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('lead_time_days', sa.Integer(), nullable=True, server_default='1')
        )

    if 'supplier_price_history' not in tables:
        op.create_table(
            'supplier_price_history',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('supplier_id', sa.String(36), sa.ForeignKey('suppliers.id'), nullable=True),
            sa.Column('medicine_id', sa.String(36), sa.ForeignKey('medicines.id'), nullable=True),
            sa.Column('effective_date', sa.Date(), nullable=True),
            sa.Column('trade_price', sa.Float(), nullable=False),
            sa.Column('discount_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('source', sa.String(50), nullable=True)
        )

    if 'supplier_contracts' not in tables:
        op.create_table(
            'supplier_contracts',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('supplier_id', sa.String(36), sa.ForeignKey('suppliers.id'), nullable=True),
            sa.Column('contract_number', sa.String(100), unique=True),
            sa.Column('start_date', sa.Date(), nullable=True),
            sa.Column('end_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(50), nullable=True, server_default='Active'),
            sa.Column('minimum_order_value', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('rebate_percentage', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('document_url', sa.String(255), nullable=True)
        )

    if 'purchase_attachments' not in tables:
        op.create_table(
            'purchase_attachments',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'),
            sa.Column('reference_type', sa.String(50), nullable=True),
            sa.Column('reference_id', sa.String(36), nullable=True),
            sa.Column('file_name', sa.String(255), nullable=True),
            sa.Column('file_url', sa.String(1024), nullable=True),
            sa.Column('file_type', sa.String(50), nullable=True),
            sa.Column('uploaded_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('uploaded_at', sa.DateTime(), nullable=True)
        )

def downgrade() -> None:
    pass
