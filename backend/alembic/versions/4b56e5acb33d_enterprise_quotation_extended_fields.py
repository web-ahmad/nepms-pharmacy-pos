"""enterprise_quotation_extended_fields

Revision ID: 4b56e5acb33d
Revises: 9fd161bdcc63
Create Date: 2026-07-16 12:02:59.028699

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b56e5acb33d'
down_revision: Union[str, Sequence[str], None] = '9fd161bdcc63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('purchase_quotation_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('moq', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('brand', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('manufacturer', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('batch_number', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('expiry_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('line_notes', sa.Text(), nullable=True))

    with op.batch_alter_table('purchase_quotations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('warehouse_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('quotation_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('currency', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('subtotal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('discount_amount', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('tax_amount', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('payment_terms', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('delivery_terms', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('warranty', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('attachment_url', sa.String(length=1024), nullable=True))
        batch_op.add_column(sa.Column('supplier_score', sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('purchase_quotations', schema=None) as batch_op:
        batch_op.drop_column('supplier_score')
        batch_op.drop_column('attachment_url')
        batch_op.drop_column('warranty')
        batch_op.drop_column('delivery_terms')
        batch_op.drop_column('payment_terms')
        batch_op.drop_column('tax_amount')
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('subtotal')
        batch_op.drop_column('currency')
        batch_op.drop_column('quotation_date')
        batch_op.drop_column('warehouse_id')

    with op.batch_alter_table('purchase_quotation_items', schema=None) as batch_op:
        batch_op.drop_column('line_notes')
        batch_op.drop_column('expiry_date')
        batch_op.drop_column('batch_number')
        batch_op.drop_column('manufacturer')
        batch_op.drop_column('brand')
        batch_op.drop_column('moq')
