"""Add branch_id to hr models

Revision ID: a0a184e08a94
Revises: 6002_phase_6_rbac_hierarchy
Create Date: 2026-07-20 00:02:29.500882

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'a0a184e08a94'
down_revision: Union[str, Sequence[str], None] = '6002_phase_6_rbac_hierarchy'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add branch_id columns
    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('branch_id', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_departments_branch_id_branches', 'branches', ['branch_id'], ['id'])

    with op.batch_alter_table('designations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('branch_id', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_designations_branch_id_branches', 'branches', ['branch_id'], ['id'])

    with op.batch_alter_table('shifts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('branch_id', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_shifts_branch_id_branches', 'branches', ['branch_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('shifts', schema=None) as batch_op:
        batch_op.drop_constraint('fk_shifts_branch_id_branches', type_='foreignkey')
        batch_op.drop_column('branch_id')

    with op.batch_alter_table('designations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_designations_branch_id_branches', type_='foreignkey')
        batch_op.drop_column('branch_id')

    with op.batch_alter_table('departments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_departments_branch_id_branches', type_='foreignkey')
        batch_op.drop_column('branch_id')
