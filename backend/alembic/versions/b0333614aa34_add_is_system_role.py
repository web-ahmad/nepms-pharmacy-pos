"""add is_system_role

Revision ID: b0333614aa34
Revises: 7ca2c7f0e1ee
Create Date: 2026-07-17 21:18:02.839135

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b0333614aa34'
down_revision: Union[str, Sequence[str], None] = '7ca2c7f0e1ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_system_role', sa.Boolean(), nullable=True, server_default='0'))

def downgrade() -> None:
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.drop_column('is_system_role')
