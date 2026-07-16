"""Add branch_scope and data_scope to Role

Revision ID: e3191e934658
Revises: 368dfd59e6ba
Create Date: 2026-07-15 18:17:56.233327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3191e934658'
down_revision: Union[str, Sequence[str], None] = '368dfd59e6ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('branch_scope', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('data_scope', sa.String(length=50), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.drop_column('data_scope')
        batch_op.drop_column('branch_scope')
