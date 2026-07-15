"""
services/enterprise/user_service.py
──────────────────────────────────────
Business logic for Enterprise Users & Identity Management.

Handles:
- User creation (auth user + enterprise profile)
- Status lifecycle (suspend, lock, activate, unlock)
- Password management (reset, force-change, expiry, history)
- Branch assignment / transfer
- Permission computation (role + branch overrides)
- Session and device management
- Activity and login event logging
"""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models.enterprise.user import (
    EnterpriseUser,
    EnterpriseUserStatus,
    ActivityEventType,
)
from models.users import User, Role
from repositories.enterprise.user import enterprise_user_repository
from repositories.enterprise.role import role_repository
from schemas.enterprise.user import (
    EnterpriseUserCreate,
    EnterpriseUserUpdate,
    BranchAssignmentCreate,
    BranchTransferRequest,
    PasswordResetRequest,
    SuspendRequest,
    LockRequest,
    UnlockRequest,
    ApprovalAction,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Max failed logins before temp lock
MAX_FAILED_ATTEMPTS = 5
# Temp lock duration in minutes
TEMP_LOCK_MINUTES = 30
# Password history depth
PASSWORD_HISTORY_DEPTH = 5


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def _generate_temp_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    return "".join(secrets.choice(chars) for _ in range(length))


class UserService:

    # ── Create ────────────────────────────────────────────────────────────────

    def create_user(
        self,
        db: Session,
        *,
        data: EnterpriseUserCreate,
        pharmacy_id: str,
        created_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        # 1. Check username / email uniqueness
        if db.query(User).filter(User.username == data.username).first():
            raise HTTPException(status_code=400, detail="Username already exists.")
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered.")

        # 2. Create core auth user
        hashed = _hash_password(data.password)
        auth_user = User(
            username=data.username,
            email=str(data.email),
            hashed_password=hashed,
            full_name=data.full_name,
            phone=data.phone,
            is_active=True,
            is_super_admin=False,
            tenant_id=None,
            pharmacy_id=pharmacy_id,   # type: ignore[attr-defined]
        )
        db.add(auth_user)
        db.flush()

        # 3. Create enterprise profile
        eu = EnterpriseUser(
            user_id=auth_user.id,
            pharmacy_id=pharmacy_id,
            user_type=data.user_type,
            enterprise_role_id=data.enterprise_role_id,
            avatar_url=data.avatar_url,
            theme_preference=data.theme_preference,
            language=data.language,
            timezone=data.timezone,
            emergency_contact=data.emergency_contact.model_dump() if data.emergency_contact else None,
            notes=data.notes,
            notif_email=data.notif_email,
            notif_sms=data.notif_sms,
            notif_push=data.notif_push,
            notif_in_app=data.notif_in_app,
            notif_whatsapp=data.notif_whatsapp,
            employee_id=data.employee_id,
            cnic=data.cnic,
            license_number=data.license_number,
            qualification=data.qualification,
            joining_date=data.joining_date,
            blood_group=data.blood_group,
            address=data.address,
            allowed_branches=data.allowed_branches,
            allowed_devices=data.allowed_devices,
            allowed_ips=data.allowed_ips,
            allowed_hours=data.allowed_hours,
            max_concurrent_sessions=data.max_concurrent_sessions,
            geo_restriction_enabled=data.geo_restriction_enabled,
            force_password_change=data.force_password_change,
            password_history=[hashed],
            password_changed_at=datetime.utcnow(),
            status=EnterpriseUserStatus.ACTIVE.value,
        )
        db.add(eu)
        db.flush()

        # 4. Default branch assignment
        if data.default_branch_id:
            enterprise_user_repository.add_branch_assignment(
                db,
                enterprise_user_id=eu.id,
                branch_id=data.default_branch_id,
                role=data.branch_role or "staff",
                is_default=True,
                assigned_by_id=created_by_id,
                pharmacy_id=pharmacy_id,
            )

        db.commit()
        db.refresh(eu)

        # 5. Log activity
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=eu.id,
            event_type=ActivityEventType.PROFILE_UPDATED.value,
            description="User account created",
            performed_by_id=created_by_id,
            pharmacy_id=pharmacy_id,
        )

        return eu

    # ── Update ────────────────────────────────────────────────────────────────

    def update_user(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        data: EnterpriseUserUpdate,
        performed_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        update_data = data.model_dump(exclude_unset=True)

        # Sync profile fields to core User if present
        core_fields = {"full_name", "phone"}
        core_updates = {k: v for k, v in update_data.items() if k in core_fields}
        if core_updates and enterprise_user.user:
            for field, val in core_updates.items():
                setattr(enterprise_user.user, field, val)

        for field, value in update_data.items():
            if hasattr(enterprise_user, field):
                setattr(enterprise_user, field, value)

        db.commit()
        db.refresh(enterprise_user)

        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.PROFILE_UPDATED.value,
            description="Profile updated",
            metadata=update_data,
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return enterprise_user

    # ── Soft delete ───────────────────────────────────────────────────────────

    def delete_user(
        self, db: Session, *, enterprise_user: EnterpriseUser, performed_by_id: Optional[str] = None
    ) -> None:
        enterprise_user.is_deleted = True
        enterprise_user.status = EnterpriseUserStatus.INACTIVE.value
        if enterprise_user.user:
            enterprise_user.user.is_active = False
        # Terminate all sessions
        enterprise_user_repository.terminate_all_sessions(db, enterprise_user.id, reason="account_deleted")
        db.commit()

    # ── Status lifecycle ──────────────────────────────────────────────────────

    def suspend_user(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        reason: str,
        performed_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        enterprise_user.status = EnterpriseUserStatus.SUSPENDED.value
        enterprise_user.lock_reason = reason
        enterprise_user_repository.terminate_all_sessions(db, enterprise_user.id, reason="suspended")
        db.commit()
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.ACCOUNT_SUSPENDED.value,
            description=f"Account suspended: {reason}",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return enterprise_user

    def activate_user(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        performed_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        enterprise_user.status = EnterpriseUserStatus.ACTIVE.value
        enterprise_user.lock_reason = None
        enterprise_user.failed_login_count = 0
        enterprise_user.locked_at = None
        if enterprise_user.user:
            enterprise_user.user.is_active = True
        db.commit()
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.ACCOUNT_ACTIVATED.value,
            description="Account activated",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return enterprise_user

    def lock_user(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        reason: str,
        permanent: bool = False,
        performed_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        enterprise_user.status = (
            EnterpriseUserStatus.LOCKED_PERMANENT.value
            if permanent
            else EnterpriseUserStatus.LOCKED_TEMP.value
        )
        enterprise_user.lock_reason = reason
        enterprise_user.locked_at = datetime.utcnow()
        enterprise_user_repository.terminate_all_sessions(db, enterprise_user.id, reason="locked")
        db.commit()
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.ACCOUNT_LOCKED.value,
            description=f"Account locked ({'permanent' if permanent else 'temporary'}): {reason}",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return enterprise_user

    def unlock_user(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        performed_by_id: Optional[str] = None,
    ) -> EnterpriseUser:
        enterprise_user.status = EnterpriseUserStatus.ACTIVE.value
        enterprise_user.locked_at = None
        enterprise_user.lock_reason = None
        enterprise_user.failed_login_count = 0
        db.commit()
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.ACCOUNT_UNLOCKED.value,
            description="Account unlocked",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return enterprise_user

    # ── Password management ───────────────────────────────────────────────────

    def reset_password(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        data: PasswordResetRequest,
        performed_by_id: Optional[str] = None,
    ) -> str:
        """Returns the new plain-text password (show to admin once)."""
        new_plain = data.new_password or _generate_temp_password()
        new_hashed = _hash_password(new_plain)

        # Update password history
        history: List[str] = enterprise_user.password_history or []
        history.insert(0, new_hashed)
        enterprise_user.password_history = history[:PASSWORD_HISTORY_DEPTH]

        if enterprise_user.user:
            enterprise_user.user.hashed_password = new_hashed

        enterprise_user.password_changed_at = datetime.utcnow()
        enterprise_user.force_password_change = data.force_change
        enterprise_user.failed_login_count = 0
        enterprise_user.locked_at = None

        if enterprise_user.status in (EnterpriseUserStatus.LOCKED_TEMP.value,):
            enterprise_user.status = EnterpriseUserStatus.ACTIVE.value

        db.commit()

        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.PASSWORD_RESET.value,
            description="Password reset by administrator",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return new_plain

    def force_password_change(
        self, db: Session, *, enterprise_user: EnterpriseUser
    ) -> None:
        enterprise_user.force_password_change = True
        db.commit()

    # ── Branch assignment ─────────────────────────────────────────────────────

    def assign_to_branch(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        data: BranchAssignmentCreate,
        assigned_by_id: Optional[str] = None,
    ) -> Any:
        assignment = enterprise_user_repository.add_branch_assignment(
            db,
            enterprise_user_id=enterprise_user.id,
            branch_id=data.branch_id,
            role=data.role,
            is_default=data.is_default_branch,
            is_temporary=data.is_temporary,
            access_expires_at=data.access_expires_at,
            assigned_by_id=assigned_by_id,
            notes=data.notes,
            permission_overrides=data.permission_overrides,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.BRANCH_ASSIGNMENT.value,
            description=f"Assigned to branch {data.branch_id} as {data.role}",
            metadata={"branch_id": data.branch_id, "role": data.role},
            performed_by_id=assigned_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return assignment

    def transfer_to_branch(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        data: BranchTransferRequest,
        transferred_by_id: Optional[str] = None,
    ) -> Any:
        # Remove from source branch
        enterprise_user_repository.remove_branch_assignment(db, enterprise_user.id, data.from_branch_id)

        # Add to destination branch
        assignment = enterprise_user_repository.add_branch_assignment(
            db,
            enterprise_user_id=enterprise_user.id,
            branch_id=data.to_branch_id,
            role=data.role,
            is_default=True,
            assigned_by_id=transferred_by_id,
            notes=data.reason,
            pharmacy_id=enterprise_user.pharmacy_id,
        )

        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.BRANCH_TRANSFER.value,
            description=f"Transferred from {data.from_branch_id} to {data.to_branch_id}",
            metadata={
                "from_branch_id": data.from_branch_id,
                "to_branch_id": data.to_branch_id,
                "reason": data.reason,
            },
            performed_by_id=transferred_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return assignment

    # ── Permission computation ────────────────────────────────────────────────

    def compute_effective_permissions(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        branch_id: Optional[str] = None,
    ) -> List[str]:
        """Returns list of permission codes effective for this user (+ branch overrides)."""
        base_permissions: List[str] = []

        if enterprise_user.enterprise_role and enterprise_user.enterprise_role.role_permissions:
            base_permissions = [
                rp.permission.code
                for rp in enterprise_user.enterprise_role.role_permissions
                if rp.permission
            ]

        if branch_id:
            for assignment in enterprise_user.branch_assignments:
                if assignment.branch_id == branch_id and assignment.is_active:
                    overrides = assignment.permission_overrides or []
                    # Overrides that start with "-" revoke, others add
                    revoked = {p.lstrip("-") for p in overrides if p.startswith("-")}
                    added   = {p for p in overrides if not p.startswith("-")}
                    base_permissions = [p for p in base_permissions if p not in revoked]
                    base_permissions.extend(p for p in added if p not in base_permissions)

        return list(set(base_permissions))

    # ── Session management ────────────────────────────────────────────────────

    def terminate_session(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        session_id: str,
        performed_by_id: Optional[str] = None,
    ) -> None:
        enterprise_user_repository.terminate_session(db, session_id, reason="user_logout")
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.SESSION_TERMINATED.value,
            description="Session terminated",
            metadata={"session_id": session_id},
            performed_by_id=performed_by_id or enterprise_user.user_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )

    def terminate_all_sessions(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        performed_by_id: Optional[str] = None,
    ) -> int:
        count = enterprise_user_repository.terminate_all_sessions(
            db, enterprise_user.id, reason="admin_logout_all"
        )
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.SESSION_TERMINATED.value,
            description=f"All {count} sessions terminated",
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )
        return count

    # ── Device management ─────────────────────────────────────────────────────

    def revoke_device(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        device_id: str,
        performed_by_id: Optional[str] = None,
    ) -> None:
        enterprise_user_repository.revoke_device(db, device_id, revoked_by_id=performed_by_id)
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.DEVICE_REVOKED.value,
            description="Trusted device revoked",
            metadata={"device_id": device_id},
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )

    def block_device(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        device_id: str,
        performed_by_id: Optional[str] = None,
    ) -> None:
        enterprise_user_repository.block_device(db, device_id)
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=ActivityEventType.DEVICE_BLOCKED.value,
            description="Device blocked",
            metadata={"device_id": device_id},
            performed_by_id=performed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )

    # ── Approval workflow ─────────────────────────────────────────────────────

    def process_approval(
        self,
        db: Session,
        *,
        enterprise_user: EnterpriseUser,
        approval_id: str,
        action: ApprovalAction,
        reviewed_by_id: str,
    ) -> None:
        from models.enterprise.user import UserApprovalRequest, ApprovalStatus
        req = db.query(UserApprovalRequest).filter(UserApprovalRequest.id == approval_id).first()
        if not req or req.status != ApprovalStatus.PENDING.value:
            raise HTTPException(status_code=404, detail="Approval request not found or already reviewed.")

        req.status = ApprovalStatus.APPROVED.value if action.action == "approve" else ApprovalStatus.REJECTED.value
        req.reviewed_by_id = reviewed_by_id
        req.reviewed_at = datetime.utcnow()
        req.review_note = action.note
        db.commit()

        event = (
            ActivityEventType.APPROVAL_GRANTED.value
            if action.action == "approve"
            else ActivityEventType.APPROVAL_REJECTED.value
        )
        enterprise_user_repository.log_activity(
            db,
            enterprise_user_id=enterprise_user.id,
            event_type=event,
            description=f"Approval {action.action}d: {req.approval_type}",
            performed_by_id=reviewed_by_id,
            pharmacy_id=enterprise_user.pharmacy_id,
        )


user_service = UserService()
