"""add_platform_admin_tables

Revision ID: b1c2d3e4f5a6
Revises: 6544644a6582
Create Date: 2026-07-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '6544644a6582'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_columns():
    return [
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('tenant_id', sa.String(length=36), nullable=True),
        sa.Column('pharmacy_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('sync_version', sa.DateTime(), nullable=True),
    ]


def upgrade() -> None:
    # 1. platform_coupons
    op.create_table(
        'platform_coupons',
        *_base_columns(),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('discount_type', sa.String(length=20), nullable=False),
        sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('max_redemptions', sa.Integer(), nullable=True),
        sa.Column('times_redeemed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_platform_coupons_code', 'platform_coupons', ['code'], unique=True)

    # 2. platform_currencies
    op.create_table(
        'platform_currencies',
        *_base_columns(),
        sa.Column('code', sa.String(length=3), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('symbol', sa.String(length=10), nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=18, scale=6), nullable=False, server_default='1'),
        sa.Column('is_base', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_platform_currencies_code', 'platform_currencies', ['code'], unique=True)

    # 3. referral_program_settings
    op.create_table(
        'referral_program_settings',
        *_base_columns(),
        sa.Column('reward_type', sa.String(length=20), nullable=False),
        sa.Column('reward_value', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('reward_duration_months', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('terms', sa.Text(), nullable=True),
    )

    # 4. pharmacy_referrals
    op.create_table(
        'pharmacy_referrals',
        *_base_columns(),
        sa.Column('referrer_pharmacy_id', sa.String(length=36), sa.ForeignKey('pharmacies.id'), nullable=False),
        sa.Column('referred_pharmacy_id', sa.String(length=36), sa.ForeignKey('pharmacies.id'), nullable=True),
        sa.Column('referral_code', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('reward_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('rewarded_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_pharmacy_referrals_referral_code', 'pharmacy_referrals', ['referral_code'], unique=True)

    # 5. media_assets
    op.create_table(
        'media_assets',
        *_base_columns(),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('folder', sa.String(length=100), nullable=False, server_default='general'),
    )

    # 6. platform_settings
    op.create_table(
        'platform_settings',
        *_base_columns(),
        sa.Column('platform_name', sa.String(length=150), nullable=False, server_default='NEPMS'),
        sa.Column('support_email', sa.String(length=150), nullable=True),
        sa.Column('support_phone', sa.String(length=50), nullable=True),
        sa.Column('default_currency_code', sa.String(length=3), nullable=True),
        sa.Column('maintenance_mode', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('maintenance_message', sa.Text(), nullable=True),
        sa.Column('feature_flags', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('platform_settings')
    op.drop_table('media_assets')
    op.drop_index('ix_pharmacy_referrals_referral_code', table_name='pharmacy_referrals')
    op.drop_table('pharmacy_referrals')
    op.drop_table('referral_program_settings')
    op.drop_index('ix_platform_currencies_code', table_name='platform_currencies')
    op.drop_table('platform_currencies')
    op.drop_index('ix_platform_coupons_code', table_name='platform_coupons')
    op.drop_table('platform_coupons')
