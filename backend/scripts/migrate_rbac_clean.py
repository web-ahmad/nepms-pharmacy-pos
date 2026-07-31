"""
One-off RBAC cleanup + migration (keyed on pharmacy_id — the real RBAC grouping).

For every concrete pharmacy_id group that has RBAC data:
  1. Seed the curated 128-permission catalog + the 8 canonical roles.
  2. Repoint any user assigned to a retired-named role onto their pharmacy's
     kept role (Franchise Owner/Branch Manager -> Manager, etc.).
  3. Soft-delete the retired roles in that group.
  4. Prune stale permissions (codes not in the curated catalog) + their links.

Users whose role row lived in the historical `None` group are repointed onto
their OWN pharmacy's kept role by matching the retired role NAME.

Safe to run multiple times.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.enterprise.user import (
    EnterpriseRole, EnterprisePermission, EnterpriseRolePermission, EnterpriseUser,
)
from models.users import User
from repositories.enterprise.role import role_repository, PERMISSION_SEED, DEFAULT_ROLES

RETIRED_MAP = {
    "Devjix Support":                    "Super Admin",
    "Manager":                           "Franchise Owner",
    "Branch Manager":                    "Franchise Owner",
    "Senior Pharmacist":                 "Pharmacist",
    "Pharmacist & Cashier":              "Pharmacist",
    "Inventory Manager & Store Keeper":  "Pharmacist",
    "Auditor":                           "Franchise Owner",
}
KEEP_NAMES = set(DEFAULT_ROLES.keys())
VALID_CODES = {p["code"] for p in PERMISSION_SEED}


def run():
    db = SessionLocal()
    try:
        # concrete pharmacy_id groups that actually have RBAC data
        pids = set()
        for (v,) in db.query(EnterpriseRole.pharmacy_id).distinct().all():
            if v:
                pids.add(v)
        for (v,) in db.query(EnterprisePermission.pharmacy_id).distinct().all():
            if v:
                pids.add(v)

        for pid in sorted(pids):
            # 1. Seed curated catalog + 8 roles into this group
            role_repository.seed_permissions(db, pid)
            role_repository.seed_default_roles(db, pid)

            kept = {
                r.name: r
                for r in db.query(EnterpriseRole).filter(
                    EnterpriseRole.pharmacy_id == pid,
                    EnterpriseRole.is_deleted == False,
                    EnterpriseRole.name.in_(KEEP_NAMES),
                ).all()
            }

            # 2. Repoint users off retired roles WITHIN this pharmacy group.
            #    We match by role NAME so we also catch users whose role row lives
            #    in the None group but whose user.pharmacy_id == pid.
            group_user_ids = {
                uid for (uid,) in db.query(User.id).filter(User.pharmacy_id == pid).all()
            }
            for retired_name, target_name in RETIRED_MAP.items():
                target = kept.get(target_name)
                if not target:
                    continue
                # roles (any group) with this retired name
                retired_role_ids = [
                    r.id for (r,) in [(x,) for x in db.query(EnterpriseRole).filter(
                        EnterpriseRole.name == retired_name).all()]
                ]
                if not retired_role_ids:
                    continue
                eus = db.query(EnterpriseUser).filter(
                    EnterpriseUser.enterprise_role_id.in_(retired_role_ids),
                    EnterpriseUser.user_id.in_(group_user_ids),
                ).all()
                for eu in eus:
                    eu.enterprise_role_id = target.id
                    if hasattr(eu, "hierarchy_level"):
                        eu.hierarchy_level = target.hierarchy_level
                    print(f"  [{pid[:8]}] user {eu.user_id[:8]} : {retired_name} -> {target_name}")

            # 3. Soft-delete retired roles in THIS group
            db.query(EnterpriseRole).filter(
                EnterpriseRole.pharmacy_id == pid,
                EnterpriseRole.name.in_(RETIRED_MAP.keys()),
            ).update({EnterpriseRole.is_deleted: True}, synchronize_session=False)

            # 4. Prune stale permissions in this group + orphan links
            stale = db.query(EnterprisePermission).filter(
                EnterprisePermission.pharmacy_id == pid,
                EnterprisePermission.code.notin_(VALID_CODES),
            ).all()
            stale_ids = [p.id for p in stale]
            if stale_ids:
                db.query(EnterpriseRolePermission).filter(
                    EnterpriseRolePermission.permission_id.in_(stale_ids)
                ).delete(synchronize_session=False)
                for p in stale:
                    db.delete(p)
            db.commit()

            perms = db.query(EnterprisePermission).filter(
                EnterprisePermission.pharmacy_id == pid).count()
            roles = db.query(EnterpriseRole).filter(
                EnterpriseRole.pharmacy_id == pid,
                EnterpriseRole.is_deleted == False).count()
            print(f"[{pid[:8]}] {perms} perms, {roles} roles, pruned {len(stale_ids)}")

        # Final safety: any EnterpriseUser still on a soft-deleted / retired-named
        # role gets pushed to their pharmacy's Manager (or the role stays if none).
        orphans = db.query(EnterpriseUser).join(
            EnterpriseRole, EnterpriseRole.id == EnterpriseUser.enterprise_role_id
        ).filter(EnterpriseRole.is_deleted == True).all()
        for eu in orphans:
            u = db.query(User).filter(User.id == eu.user_id).first()
            if not u:
                continue
            mgr = db.query(EnterpriseRole).filter(
                EnterpriseRole.pharmacy_id == u.pharmacy_id,
                EnterpriseRole.name == "Franchise Owner",
                EnterpriseRole.is_deleted == False,
            ).first()
            if mgr:
                eu.enterprise_role_id = mgr.id
                print(f"  [orphan] user {eu.user_id[:8]} -> Franchise Owner ({u.pharmacy_id[:8] if u.pharmacy_id else '-'})")
        db.commit()
        print("\nDONE.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
