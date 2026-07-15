"""Phase 6 Enterprise Sales Upgrade

Revision ID: 6001
Revises: 
Create Date: 2026-07-15 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '6001_phase_6_sales'
down_revision = 'c197f10b73df'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    existing_tables = inspector.get_table_names()

    # 1. Update sales table
    if 'sales' in existing_tables:
        columns = [col['name'] for col in inspector.get_columns('sales')]
        
        if 'warehouse_id' not in columns:
            op.add_column('sales', sa.Column('warehouse_id', sa.String(36), nullable=True))
        if 'counter_id' not in columns:
            op.add_column('sales', sa.Column('counter_id', sa.String(36), nullable=True))
        if 'shift_id' not in columns:
            op.add_column('sales', sa.Column('shift_id', sa.String(36), nullable=True))
        if 'salesperson_id' not in columns:
            op.add_column('sales', sa.Column('salesperson_id', sa.String(36), nullable=True))
        if 'delivery_type' not in columns:
            op.add_column('sales', sa.Column('delivery_type', sa.String(50), nullable=True))
        if 'order_source' not in columns:
            op.add_column('sales', sa.Column('order_source', sa.String(50), nullable=True))
        if 'loyalty_points_used' not in columns:
            op.add_column('sales', sa.Column('loyalty_points_used', sa.Integer(), server_default='0'))
        if 'loyalty_points_earned' not in columns:
            op.add_column('sales', sa.Column('loyalty_points_earned', sa.Integer(), server_default='0'))
        if 'promotion_id' not in columns:
            op.add_column('sales', sa.Column('promotion_id', sa.String(36), nullable=True))
        if 'coupon_id' not in columns:
            op.add_column('sales', sa.Column('coupon_id', sa.String(36), nullable=True))
        if 'approval_status' not in columns:
            op.add_column('sales', sa.Column('approval_status', sa.String(50), nullable=True))
        if 'hold_status' not in columns:
            op.add_column('sales', sa.Column('hold_status', sa.String(50), nullable=True))
        if 'payment_status' not in columns:
            op.add_column('sales', sa.Column('payment_status', sa.String(50), nullable=True))
        if 'price_level_id' not in columns:
            op.add_column('sales', sa.Column('price_level_id', sa.String(50), nullable=True))

    # 2. Update sale_items table
    if 'sale_items' in existing_tables:
        columns = [col['name'] for col in inspector.get_columns('sale_items')]
        
        if 'warehouse_id' not in columns:
            op.add_column('sale_items', sa.Column('warehouse_id', sa.String(36), nullable=True))
        if 'promotion_discount' not in columns:
            op.add_column('sale_items', sa.Column('promotion_discount', sa.Float(), server_default='0.0'))
        if 'scheme_discount' not in columns:
            op.add_column('sale_items', sa.Column('scheme_discount', sa.Float(), server_default='0.0'))
        if 'manual_discount' not in columns:
            op.add_column('sale_items', sa.Column('manual_discount', sa.Float(), server_default='0.0'))
        if 'cost_price' not in columns:
            op.add_column('sale_items', sa.Column('cost_price', sa.Float(), server_default='0.0'))
        if 'gross_profit' not in columns:
            op.add_column('sale_items', sa.Column('gross_profit', sa.Float(), server_default='0.0'))
        if 'margin_percentage' not in columns:
            op.add_column('sale_items', sa.Column('margin_percentage', sa.Float(), server_default='0.0'))


def downgrade() -> None:
    pass
