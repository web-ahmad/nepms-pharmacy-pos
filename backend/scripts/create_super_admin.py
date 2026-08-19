"""Create (or repair) the platform super-admin login.

    python scripts/create_super_admin.py --check
    python scripts/create_super_admin.py --run --username superadmin

A super admin is Level 1 -- the SaaS operator who manages pharmacies, not a
pharmacy user. It needs TWO rows, and both are checked:

    users.is_super_admin = true     -- what auth_service puts in the JWT claim
    super_admins.auth_user_id       -- what require_super_admin() verifies

Setting only the `users` flag (which is all seed_admin.py ever did) produces an
account that logs in reporting level 1 but is refused by every
/super-admin/* endpoint, because that dependency looks the caller up in
`super_admins` and finds nothing. This creates both.

`tenant_id` is deliberately left NULL: a super admin owns no pharmacy data.
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

from dotenv import load_dotenv

load_dotenv()


def make_password(n: int = 14) -> str:
    return "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(n))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--username", default="superadmin")
    ap.add_argument("--email", default=None)
    ap.add_argument("--password", default=None)
    ap.add_argument("--name", default="Platform Super Admin")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--run", action="store_true")
    args = ap.parse_args()

    import models  # noqa: F401
    from core.security import get_password_hash
    from database import SessionLocal
    from models.users import SuperAdmin, User

    email = args.email or f"{args.username}@pharvix.local"
    password = args.password or make_password()

    db = SessionLocal()
    try:
        existing_users = db.query(User).filter(User.is_super_admin == True).all()  # noqa: E712
        existing_rows = db.query(SuperAdmin).filter(SuperAdmin.is_active == True).all()  # noqa: E712
        print(f"users flagged is_super_admin : {len(existing_users)}")
        for u in existing_users:
            linked = db.query(SuperAdmin).filter(SuperAdmin.auth_user_id == u.id).first()
            print(f"   {u.username:16} super_admins row: {'yes' if linked else 'MISSING'}")
        print(f"active super_admins rows     : {len(existing_rows)}")

        if args.check or not args.run:
            print("\ncheck only -- nothing was written." if args.check
                  else "\nPass --check to inspect or --run to create.")
            return

        user = db.query(User).filter(User.username == args.username).first()
        if user:
            print(f"\nuser '{args.username}' already exists -- resetting password and flags")
            user.hashed_password = get_password_hash(password)
            user.is_super_admin = True
            user.is_active = True
        else:
            user = User(
                id=str(uuid.uuid4()),
                username=args.username,
                email=email,
                hashed_password=get_password_hash(password),
                full_name=args.name,
                is_active=True,
                is_super_admin=True,
                tenant_id=None,  # platform-level: belongs to no pharmacy
            )
            db.add(user)
            print(f"\ncreated user '{args.username}'")
        db.flush()

        row = db.query(SuperAdmin).filter(SuperAdmin.auth_user_id == user.id).first()
        if row:
            row.is_active = True
            row.name = args.name
            print("super_admins row already present -- reactivated")
        else:
            db.add(SuperAdmin(
                id=str(uuid.uuid4()),
                auth_user_id=user.id,
                name=args.name,
                is_active=True,
                created_at=datetime.utcnow(),
            ))
            print("created super_admins row")

        db.commit()

        # Prove it end to end rather than trusting the inserts.
        from schemas.auth import UserLogin
        from services.auth_service import AuthService
        token = AuthService.authenticate_user(db, UserLogin(username=args.username, password=password))
        payload = token.model_dump() if hasattr(token, "model_dump") else dict(token)
        who = payload.get("user") or {}
        print("\nlogin verified:")
        print(f"   is_super_admin : {who.get('is_super_admin', payload.get('is_super_admin'))}")
        print(f"   hierarchy_level: {who.get('hierarchy_level', payload.get('hierarchy_level'))}")
        print(f"\n   username : {args.username}")
        print(f"   password : {password}")
        print("   change that password after the first login.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
