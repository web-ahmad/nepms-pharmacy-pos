"""
Phase 6 — Enterprise RBAC Unification
Adds hierarchy_level and is_global_role columns to enterprise_roles table.

hierarchy_level values:
    1 = Super Admin (SaaS level)
    2 = Pharmacy Owner (tenant level)
    3 = Branch Owner (branch level)
    4 = Branch Staff (permission-driven)

Revision ID: 6001_phase_6_rbac_hierarchy
Revises: 9fd161bdcc63
Create Date: 2026-07-18
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '6002_phase_6_rbac_hierarchy'
down_revision = ('9fd161bdcc63', 'b0333614aa34')   # merges both heads
branch_labels = None
depends_on = None



def upgrade():
    # Add hierarchy_level to enterprise_roles
    # Default 4 = Staff (most restrictive — safe default)
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'hierarchy_level',
            sa.Integer(),
            nullable=False,
            server_default='4',
        ))
        batch_op.add_column(sa.Column(
            'is_global_role',
            sa.Boolean(),
            nullable=True,
            server_default='0',
        ))
        batch_op.create_index(
            'ix_enterprise_roles_hierarchy_level',
            ['hierarchy_level'],
            unique=False,
        )

    # ── Seed hierarchy_level for existing system roles ────────────────────────
    # We identify system roles by name for the ONE-TIME migration only.
    # After this, ALL business logic must use hierarchy_level — never names.
    op.execute("""
        UPDATE enterprise_roles
        SET hierarchy_level = 1, is_global_role = 1
        WHERE is_system_role = 1
    """)

    op.execute("""
        UPDATE enterprise_roles
        SET hierarchy_level = 2
        WHERE LOWER(name) IN ('pharmacy owner', 'owner', 'main owner', 'admin owner')
          AND is_system_role = 0
    """)

    op.execute("""
        UPDATE enterprise_roles
        SET hierarchy_level = 3
        WHERE LOWER(name) IN ('branch owner', 'branch manager', 'branch admin')
          AND is_system_role = 0
    """)

    # Remaining roles default to 4 (Staff) from server_default
    print("[Phase 6] hierarchy_level migration complete.")


def downgrade():
    with op.batch_alter_table('enterprise_roles', schema=None) as batch_op:
        batch_op.drop_index('ix_enterprise_roles_hierarchy_level')
        batch_op.drop_column('is_global_role')
        batch_op.drop_column('hierarchy_level')
