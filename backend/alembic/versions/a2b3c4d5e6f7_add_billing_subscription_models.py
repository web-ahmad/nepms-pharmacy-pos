"""add_billing_subscription_models

Revision ID: a2b3c4d5e6f7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-14 22:06:41.543654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. subscription_plans
    op.create_table(
        'subscription_plans',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('pharmacy_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('billing_cycle', sa.String(length=20), nullable=False),
        sa.Column('features_limits', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False)
    )

    # 2. pharmacy_subscriptions
    op.create_table(
        'pharmacy_subscriptions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('pharmacy_id', sa.String(length=36), sa.ForeignKey('pharmacies.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
        sa.Column('plan_id', sa.String(length=36), sa.ForeignKey('subscription_plans.id'), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('gateway_customer_id', sa.String(length=100), nullable=True),
        sa.Column('gateway_subscription_id', sa.String(length=100), nullable=True)
    )

    # 3. payment_transactions
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('pharmacy_id', sa.String(length=36), sa.ForeignKey('pharmacies.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
        sa.Column('subscription_id', sa.String(length=36), sa.ForeignKey('pharmacy_subscriptions.id'), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('gateway', sa.String(length=50), nullable=False),
        sa.Column('gateway_transaction_id', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('raw_gateway_response', sa.JSON(), nullable=True)
    )

def downgrade() -> None:
    op.drop_table('payment_transactions')
    op.drop_table('pharmacy_subscriptions')
    op.drop_table('subscription_plans')
