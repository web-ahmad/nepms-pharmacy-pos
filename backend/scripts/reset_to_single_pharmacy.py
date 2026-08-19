"""Wipe every row from the database and set up exactly one pharmacy.

    python scripts/reset_to_single_pharmacy.py --check
    python scripts/reset_to_single_pharmacy.py --run --name "Pharvix Pharmacy" --username pharvix

DESTRUCTIVE. Truncates every table in the public schema (alembic_version aside)
and then creates a single tenant, pharmacy, main branch and owner login, with
the chart of accounts and the RBAC catalogue seeded for that tenant.

The tables are left in place -- only their contents go -- so the schema stays
exactly as `create_all` built it.

Note on the owner's role: the app's own onboarding
(api/v1/endpoints/super_admin.py::create_pharmacy) looks up
`EnterpriseRole.name == "Pharmacy Owner"` with no tenant filter, so it can bind
a new owner to some other tenant's role -- a role with no permissions attached,
which leaves that owner locked out of everything. This script binds the owner to
the role seeded for their own tenant and asserts the permission count afterwards.
"""

from __future__ import annotations

import argparse
import os
import secrets
import string
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from sqlalchemy import inspect, text

load_dotenv()

KEEP = {"alembic_version"}


def make_password(n: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="Pharvix Pharmacy", help="Pharmacy / tenant name")
    ap.add_argument("--username", default=None, help="Owner login (default: slug of --name)")
    ap.add_argument("--password", default=None, help="Owner password (default: generated)")
    ap.add_argument("--check", action="store_true", help="Report what would be wiped")
    ap.add_argument("--run", action="store_true", help="Actually wipe and rebuild")
    args = ap.parse_args()

    import models  # noqa: F401
    from database import SessionLocal, engine

    username = args.username or args.name.split()[0].lower()
    password = args.password or make_password()

    tables = [t for t in inspect(engine).get_table_names() if t not in KEEP]

    # One round trip, not 194 -- the Supabase pooler drops a connection that
    # sits through two hundred sequential statements.
    union = " UNION ALL ".join(
        "SELECT '{0}' AS t, COUNT(*) AS n FROM \"{0}\"".format(t) for t in tables
    )
    with engine.connect() as c:
        populated = [(t, n) for t, n in c.execute(text(union)).all() if n]

    print(f"database : {engine.url.render_as_string(hide_password=True)}")
    print(f"would wipe {sum(n for _, n in populated)} rows from {len(populated)} tables "
          f"({len(tables)} tables total, {', '.join(sorted(KEEP))} preserved)")
    for t, n in sorted(populated, key=lambda x: -x[1]):
        print(f"   {t:34} {n}")
    print(f"\nwould then create tenant/pharmacy '{args.name}' with owner '{username}'")

    if args.check or not args.run:
        print("\ncheck only -- nothing was written." if args.check
              else "\nPass --run to apply, or --check to inspect.")
        return

    print("\n1/5 truncating ...")
    # One TRUNCATE naming all 194 tables needs an ACCESS EXCLUSIVE lock on every
    # one of them at once, which the Supabase pooler kills mid-statement. Chunk
    # it, each chunk on its own connection. CASCADE means order does not matter.
    # AUTOCOMMIT so a crash can't strand an open transaction holding ACCESS
    # EXCLUSIVE on every table -- that is what makes the *next* attempt hang for
    # the full statement_timeout with no obvious cause.
    CHUNK = 20
    done = 0
    for i in range(0, len(tables), CHUNK):
        batch = tables[i:i + CHUNK]
        quoted = ", ".join(f'"{t}"' for t in batch)
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as c:
            # Fail fast on a lock we cannot get, rather than sitting on it.
            c.execute(text("SET lock_timeout = '15s'"))
            c.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
        done += len(batch)
        print(f"      {done}/{len(tables)} tables emptied")

    from core.security import get_password_hash
    from models.users import Branch, Pharmacy, Tenant, User
    from models.enterprise.user import EnterpriseUser

    db = SessionLocal()
    tenant_id = str(uuid.uuid4())

    print("2/5 creating tenant, pharmacy, branch, owner ...")
    tenant = Tenant(id=tenant_id, name=args.name,
                    subdomain=f"pharmacy-{tenant_id[:8]}", is_active=True)
    db.add(tenant)
    db.flush()

    pharmacy = Pharmacy(id=str(uuid.uuid4()), name=args.name, is_active=True,
                        tenant_id=tenant_id, subscription_status="active",
                        created_at=datetime.utcnow())
    db.add(pharmacy)
    db.flush()

    branch = Branch(id=str(uuid.uuid4()), tenant_id=tenant_id, name="Main Branch",
                    address="Head Office", is_main=True, created_at=datetime.utcnow())
    db.add(branch)
    db.flush()

    user = User(id=str(uuid.uuid4()), username=username,
                email=f"{username}@pharmacy.local",
                hashed_password=get_password_hash(password),
                full_name="Pharmacy Owner", is_active=True, tenant_id=tenant_id)
    db.add(user)
    db.flush()
    db.commit()

    print("3/5 seeding chart of accounts ...")
    from services.accounts_service import AccountsService
    AccountsService(db).seed_default_chart(tenant_id)
    db.commit()

    print("4/5 seeding RBAC for this tenant ...")
    from seed_rbac import seed_permissions, seed_system_roles
    perm_map = seed_permissions(db, tenant_id)  # already keyed by permission code
    seed_system_roles(db, tenant_id, perm_map)
    db.commit()

    print("5/5 binding owner to their tenant's Pharmacy Owner role ...")
    db.expire_all()
    role_id = db.execute(text("""
        SELECT id FROM enterprise_roles
        WHERE tenant_id = :t AND name = 'Pharmacy Owner' AND is_deleted = false LIMIT 1
    """), {"t": tenant_id}).scalar()
    if not role_id:
        raise SystemExit("RBAC seeding did not produce a Pharmacy Owner role for this tenant")

    eu = EnterpriseUser(id=str(uuid.uuid4()), user_id=user.id,
                        enterprise_role_id=role_id, user_type="OWNER",
                        tenant_id=tenant_id, pharmacy_id=pharmacy.id)
    db.add(eu)
    db.commit()

    from services.enterprise.user_service import user_service
    perms = user_service.compute_effective_permissions(db, enterprise_user=eu)
    print(f"      owner resolves to {len(perms)} permissions")
    if not perms:
        raise SystemExit("Owner has no effective permissions -- do not ship this state")

    counts = {t: db.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
              for t in ("tenants", "users", "pharmacies", "branches", "enterprise_users",
                        "enterprise_roles", "enterprise_permissions", "accounts")}
    db.close()

    print("\ndone.")
    for k, v in counts.items():
        print(f"   {k:26} {v}")
    print(f"\n   pharmacy : {args.name}")
    print(f"   username : {username}")
    print(f"   password : {password}")
    print("   change that password after the first login.")


if __name__ == "__main__":
    main()
