"""Phase 4 Inventory Multi-Branch

Revision ID: ca78d677c016
Revises: a2b3c4d5e6f7
Create Date: 2026-07-15 14:04:41.272831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca78d677c016'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create warehouse_racks
    op.create_table('warehouse_racks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('warehouse_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['warehouse_id'], ['branch_warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Create warehouse_bins
    op.create_table('warehouse_bins',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('rack_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_weight', sa.Float(), nullable=True),
        sa.Column('max_volume', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['rack_id'], ['warehouse_racks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 3. Create stock_transfers
    op.create_table('stock_transfers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('source_branch_id', sa.String(length=36), nullable=False),
        sa.Column('destination_branch_id', sa.String(length=36), nullable=False),
        sa.Column('source_warehouse_id', sa.String(length=36), nullable=True),
        sa.Column('destination_warehouse_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('reference_no', sa.String(length=100), nullable=True),
        sa.Column('requested_by', sa.String(length=36), nullable=True),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('dispatched_by', sa.String(length=36), nullable=True),
        sa.Column('received_by', sa.String(length=36), nullable=True),
        sa.Column('dispatch_date', sa.DateTime(), nullable=True),
        sa.Column('receive_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['destination_branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['destination_warehouse_id'], ['branch_warehouses.id'], ),
        sa.ForeignKeyConstraint(['dispatched_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['received_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['source_branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['source_warehouse_id'], ['branch_warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 4. Create stock_transfer_items
    op.create_table('stock_transfer_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('transfer_id', sa.String(length=36), nullable=True),
        sa.Column('medicine_id', sa.String(length=36), nullable=True),
        sa.Column('batch_id', sa.String(length=36), nullable=True),
        sa.Column('requested_qty', sa.Integer(), nullable=False),
        sa.Column('dispatched_qty', sa.Integer(), nullable=True),
        sa.Column('received_qty', sa.Integer(), nullable=True),
        sa.Column('damaged_qty', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
        sa.ForeignKeyConstraint(['transfer_id'], ['stock_transfers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 5. Create inventory_reservations
    op.create_table('inventory_reservations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('medicine_id', sa.String(length=36), nullable=True),
        sa.Column('batch_id', sa.String(length=36), nullable=True),
        sa.Column('branch_id', sa.String(length=36), nullable=True),
        sa.Column('warehouse_id', sa.String(length=36), nullable=True),
        sa.Column('reference_type', sa.String(length=50), nullable=True),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
        sa.ForeignKeyConstraint(['warehouse_id'], ['branch_warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 6. Create inventory_cycle_counts
    op.create_table('inventory_cycle_counts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('branch_id', sa.String(length=36), nullable=True),
        sa.Column('warehouse_id', sa.String(length=36), nullable=True),
        sa.Column('rack_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_to', sa.String(length=36), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('completion_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['rack_id'], ['warehouse_racks.id'], ),
        sa.ForeignKeyConstraint(['warehouse_id'], ['branch_warehouses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 7. Create inventory_cycle_count_items
    op.create_table('inventory_cycle_count_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('cycle_count_id', sa.String(length=36), nullable=True),
        sa.Column('medicine_id', sa.String(length=36), nullable=True),
        sa.Column('batch_id', sa.String(length=36), nullable=True),
        sa.Column('bin_id', sa.String(length=36), nullable=True),
        sa.Column('system_qty', sa.Integer(), nullable=True),
        sa.Column('counted_qty', sa.Integer(), nullable=True),
        sa.Column('variance_qty', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id'], ),
        sa.ForeignKeyConstraint(['bin_id'], ['warehouse_bins.id'], ),
        sa.ForeignKeyConstraint(['cycle_count_id'], ['inventory_cycle_counts.id'], ),
        sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add columns to batches
    with op.batch_alter_table('batches') as batch_op:
        batch_op.add_column(sa.Column('warehouse_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('rack_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('bin_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('damaged_qty', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('quarantine_qty', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('in_transit_qty', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('last_count_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('cycle_count_due', sa.Date(), nullable=True))
        batch_op.create_foreign_key('fk_batches_warehouse_id', 'branch_warehouses', ['warehouse_id'], ['id'])
        batch_op.create_foreign_key('fk_batches_rack_id', 'warehouse_racks', ['rack_id'], ['id'])
        batch_op.create_foreign_key('fk_batches_bin_id', 'warehouse_bins', ['bin_id'], ['id'])

    # Add columns to stock_adjustments
    with op.batch_alter_table('stock_adjustments') as batch_op:
        batch_op.add_column(sa.Column('warehouse_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('rack_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('bin_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('approval_status', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('approved_by', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('approval_date', sa.DateTime(), nullable=True))
        batch_op.create_foreign_key('fk_sa_warehouse_id', 'branch_warehouses', ['warehouse_id'], ['id'])
        batch_op.create_foreign_key('fk_sa_rack_id', 'warehouse_racks', ['rack_id'], ['id'])
        batch_op.create_foreign_key('fk_sa_bin_id', 'warehouse_bins', ['bin_id'], ['id'])
        batch_op.create_foreign_key('fk_sa_approved_by', 'users', ['approved_by'], ['id'])

    # Add columns to stock_movements
    with op.batch_alter_table('stock_movements') as batch_op:
        batch_op.add_column(sa.Column('warehouse_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('rack_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('bin_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('reference_branch_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('reference_transfer_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('movement_reason', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('created_by', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key('fk_sm_warehouse_id', 'branch_warehouses', ['warehouse_id'], ['id'])
        batch_op.create_foreign_key('fk_sm_rack_id', 'warehouse_racks', ['rack_id'], ['id'])
        batch_op.create_foreign_key('fk_sm_bin_id', 'warehouse_bins', ['bin_id'], ['id'])
        batch_op.create_foreign_key('fk_sm_reference_branch_id', 'branches', ['reference_branch_id'], ['id'])
        batch_op.create_foreign_key('fk_sm_reference_transfer_id', 'stock_transfers', ['reference_transfer_id'], ['id'])
        batch_op.create_foreign_key('fk_sm_created_by', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    pass
