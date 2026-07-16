"""enterprise_permission_unique

Revision ID: 5cec51a58f06
Revises: e3191e934658
Create Date: 2026-07-15 18:33:48.211511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cec51a58f06'
down_revision: Union[str, Sequence[str], None] = 'e3191e934658'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('enterprise_permissions', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_ent_perm_pharm_code', ['pharmacy_id', 'code'])

def downgrade() -> None:
    with op.batch_alter_table('enterprise_permissions', schema=None) as batch_op:
        batch_op.drop_constraint('uq_ent_perm_pharm_code', type_='unique')
