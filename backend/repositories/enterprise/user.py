"""
repositories/enterprise/user.py
─────────────────────────────────
Data-access layer for EnterpriseUser, BranchUserAssignment,
UserSession, UserTrustedDevice, UserLoginHistory, UserActivityLog,
UserApprovalRequest.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from models.enterprise.user import (
    EnterpriseUser,
    BranchUserAssignment,
    UserSession,
    UserTrustedDevice,
    UserLoginHistory,
    UserActivityLog,
    UserApprovalRequest,
    EnterpriseUserStatus,
    ActivityEventType,
)
from models.enterprise.branch import PharmacyBranch
from models.users import User
from repositories.base import CRUDBase
from schemas.enterprise.user import EnterpriseUserCreate, EnterpriseUserUpdate


class EnterpriseUserRepository(CRUDBase[EnterpriseUser, EnterpriseUserCreate, EnterpriseUserUpdate]):

    # ── Single-row lookups ────────────────────────────────────────────────────

    def get_by_id(
        self, db: Session, enterprise_user_id: str, pharmacy_id: str
    ) -> Optional[EnterpriseUser]:
        return (
            db.query(EnterpriseUser)
            .options(
                joinedload(EnterpriseUser.enterprise_role),
                joinedload(EnterpriseUser.branch_assignments).joinedload(BranchUserAssignment.branch),
                joinedload(EnterpriseUser.user),
            )
            .filter(
                EnterpriseUser.id == enterprise_user_id,
                EnterpriseUser.pharmacy_id == pharmacy_id,
                EnterpriseUser.is_deleted == False,
            )
            .first()
        )

    def get_by_user_id(
        self, db: Session, user_id: str, pharmacy_id: Optional[str] = None
    ) -> Optional[EnterpriseUser]:
        q = db.query(EnterpriseUser).filter(
            EnterpriseUser.user_id == user_id,
            EnterpriseUser.is_deleted == False,
        )
        if pharmacy_id:
            q = q.filter(EnterpriseUser.pharmacy_id == pharmacy_id)
        return q.options(joinedload(EnterpriseUser.enterprise_role)).first()

    # ── Filtered list ─────────────────────────────────────────────────────────

    def get_filtered(
        self,
        db: Session,
        pharmacy_id: str,
        *,
        search:     Optional[str] = None,
        status:     Optional[str] = None,
        user_type:  Optional[str] = None,
        role_id:    Optional[str] = None,
        branch_id:  Optional[str] = None,
        sort_by:    str = "created_at",
        sort_dir:   str = "desc",
        page:       int = 1,
        limit:      int = 20,
    ) -> Tuple[List[EnterpriseUser], int]:
        q = (
            db.query(EnterpriseUser)
            .join(User, EnterpriseUser.user_id == User.id)
            .options(
                joinedload(EnterpriseUser.enterprise_role),
                joinedload(EnterpriseUser.branch_assignments),
            )
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                EnterpriseUser.is_deleted == False,
            )
        )

        if search:
            term = f"%{search}%"
            q = q.filter(or_(
                User.full_name.ilike(term),
                User.username.ilike(term),
                User.email.ilike(term),
                EnterpriseUser.employee_id.ilike(term),
                EnterpriseUser.cnic.ilike(term),
            ))

        if status:
            q = q.filter(EnterpriseUser.status == status)
        if user_type:
            q = q.filter(EnterpriseUser.user_type == user_type)
        if role_id:
            q = q.filter(EnterpriseUser.enterprise_role_id == role_id)
        if branch_id:
            q = q.filter(
                EnterpriseUser.branch_assignments.any(
                    and_(BranchUserAssignment.branch_id == branch_id, BranchUserAssignment.is_active == True)
                )
            )

        # Sorting
        sort_map = {
            "created_at": EnterpriseUser.created_at,
            "full_name":  User.full_name,
            "email":      User.email,
            "status":     EnterpriseUser.status,
            "user_type":  EnterpriseUser.user_type,
            "last_login": EnterpriseUser.last_login_at,
        }
        sort_col = sort_map.get(sort_by, EnterpriseUser.created_at)
        q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

        total = q.count()
        items = q.offset((page - 1) * limit).limit(limit).all()
        return items, total

    # ── Dashboard summary ─────────────────────────────────────────────────────

    def get_dashboard_summary(self, db: Session, pharmacy_id: str) -> Dict[str, Any]:
        base = db.query(EnterpriseUser).filter(
            EnterpriseUser.pharmacy_id == pharmacy_id,
            EnterpriseUser.is_deleted == False,
        )
        total           = base.count()
        active          = base.filter(EnterpriseUser.status == EnterpriseUserStatus.ACTIVE.value).count()
        inactive        = base.filter(EnterpriseUser.status == EnterpriseUserStatus.INACTIVE.value).count()
        suspended       = base.filter(EnterpriseUser.status == EnterpriseUserStatus.SUSPENDED.value).count()
        locked          = base.filter(EnterpriseUser.status.in_([
                            EnterpriseUserStatus.LOCKED_TEMP.value,
                            EnterpriseUserStatus.LOCKED_PERMANENT.value,
                          ])).count()
        pending         = base.filter(EnterpriseUser.status == EnterpriseUserStatus.PENDING_APPROVAL.value).count()

        # Online users — active session in last 15 min
        fifteen_min_ago = datetime.utcnow() - timedelta(minutes=15)
        online = (
            db.query(func.count(func.distinct(UserSession.enterprise_user_id)))
            .join(EnterpriseUser, UserSession.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserSession.is_active == True,
                UserSession.last_activity_at >= fifteen_min_ago,
            )
            .scalar() or 0
        )

        # Active sessions
        active_sessions = (
            db.query(func.count(UserSession.id))
            .join(EnterpriseUser, UserSession.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserSession.is_active == True,
            )
            .scalar() or 0
        )

        # Devices
        trusted_devices = (
            db.query(func.count(UserTrustedDevice.id))
            .join(EnterpriseUser, UserTrustedDevice.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserTrustedDevice.is_trusted == True,
                UserTrustedDevice.is_blocked == False,
                UserTrustedDevice.is_deleted == False,
            )
            .scalar() or 0
        )
        blocked_devices = (
            db.query(func.count(UserTrustedDevice.id))
            .join(EnterpriseUser, UserTrustedDevice.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserTrustedDevice.is_blocked == True,
                UserTrustedDevice.is_deleted == False,
            )
            .scalar() or 0
        )

        # Failed logins today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        failed_today = (
            db.query(func.count(UserLoginHistory.id))
            .join(EnterpriseUser, UserLoginHistory.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserLoginHistory.success == False,
                UserLoginHistory.created_at >= today_start,
            )
            .scalar() or 0
        )

        # Pending approvals
        pending_approvals = (
            db.query(func.count(UserApprovalRequest.id))
            .join(EnterpriseUser, UserApprovalRequest.enterprise_user_id == EnterpriseUser.id)
            .filter(
                EnterpriseUser.pharmacy_id == pharmacy_id,
                UserApprovalRequest.status == "pending",
                UserApprovalRequest.is_deleted == False,
            )
            .scalar() or 0
        )

        # By type distribution
        by_type_rows = (
            db.query(EnterpriseUser.user_type, func.count(EnterpriseUser.id))
            .filter(EnterpriseUser.pharmacy_id == pharmacy_id, EnterpriseUser.is_deleted == False)
            .group_by(EnterpriseUser.user_type)
            .all()
        )

        return {
            "total_users":          total,
            "active_users":         active,
            "inactive_users":       inactive,
            "suspended_users":      suspended,
            "locked_users":         locked,
            "pending_approval":     pending,
            "online_users":         online,
            "active_sessions":      active_sessions,
            "trusted_devices":      trusted_devices,
            "blocked_devices":      blocked_devices,
            "failed_logins_today":  failed_today,
            "pending_approvals":    pending_approvals,
            "by_type":              [{"type": r[0], "count": r[1]} for r in by_type_rows],
            "by_role":              [],
            "by_branch":            [],
        }

    # ── Branch assignments ────────────────────────────────────────────────────

    def get_branch_assignments(
        self, db: Session, enterprise_user_id: str
    ) -> List[BranchUserAssignment]:
        return (
            db.query(BranchUserAssignment)
            .options(joinedload(BranchUserAssignment.branch))
            .filter(
                BranchUserAssignment.enterprise_user_id == enterprise_user_id,
                BranchUserAssignment.is_deleted == False,
            )
            .all()
        )

    def add_branch_assignment(
        self,
        db: Session,
        *,
        enterprise_user_id: str,
        branch_id: str,
        role: str = "staff",
        is_default: bool = False,
        is_temporary: bool = False,
        access_expires_at: Optional[datetime] = None,
        assigned_by_id: Optional[str] = None,
        notes: Optional[str] = None,
        permission_overrides: Optional[List[str]] = None,
        pharmacy_id: Optional[str] = None,
    ) -> BranchUserAssignment:
        # Unset previous default if setting a new one
        if is_default:
            db.query(BranchUserAssignment).filter(
                BranchUserAssignment.enterprise_user_id == enterprise_user_id,
                BranchUserAssignment.is_default_branch == True,
            ).update({"is_default_branch": False})

        assignment = BranchUserAssignment(
            enterprise_user_id=enterprise_user_id,
            branch_id=branch_id,
            role=role,
            is_default_branch=is_default,
            is_temporary=is_temporary,
            access_expires_at=access_expires_at,
            assigned_by_id=assigned_by_id,
            notes=notes,
            permission_overrides=permission_overrides,
            pharmacy_id=pharmacy_id,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    def remove_branch_assignment(
        self, db: Session, enterprise_user_id: str, branch_id: str
    ) -> None:
        db.query(BranchUserAssignment).filter(
            BranchUserAssignment.enterprise_user_id == enterprise_user_id,
            BranchUserAssignment.branch_id == branch_id,
            BranchUserAssignment.is_deleted == False,
        ).update({"is_active": False, "is_deleted": True})
        db.commit()

    # ── Sessions ──────────────────────────────────────────────────────────────

    def get_active_sessions(
        self, db: Session, enterprise_user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[UserSession], int]:
        q = db.query(UserSession).filter(
            UserSession.enterprise_user_id == enterprise_user_id,
            UserSession.is_active == True,
            UserSession.is_deleted == False,
        ).order_by(UserSession.last_activity_at.desc())
        return q.offset(skip).limit(limit).all(), q.count()

    def terminate_session(self, db: Session, session_id: str, reason: str = "logout") -> None:
        db.query(UserSession).filter(UserSession.id == session_id).update({
            "is_active": False,
            "terminated_at": datetime.utcnow(),
            "terminated_reason": reason,
        })
        db.commit()

    def terminate_all_sessions(
        self, db: Session, enterprise_user_id: str, reason: str = "admin"
    ) -> int:
        result = db.query(UserSession).filter(
            UserSession.enterprise_user_id == enterprise_user_id,
            UserSession.is_active == True,
        ).update({
            "is_active": False,
            "terminated_at": datetime.utcnow(),
            "terminated_reason": reason,
        })
        db.commit()
        return result

    # ── Trusted devices ───────────────────────────────────────────────────────

    def get_devices(
        self, db: Session, enterprise_user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[UserTrustedDevice], int]:
        q = db.query(UserTrustedDevice).filter(
            UserTrustedDevice.enterprise_user_id == enterprise_user_id,
            UserTrustedDevice.is_deleted == False,
        ).order_by(UserTrustedDevice.last_seen_at.desc())
        return q.offset(skip).limit(limit).all(), q.count()

    def revoke_device(
        self, db: Session, device_id: str, revoked_by_id: Optional[str] = None
    ) -> None:
        db.query(UserTrustedDevice).filter(UserTrustedDevice.id == device_id).update({
            "is_trusted": False,
            "revoked_at": datetime.utcnow(),
            "revoked_by_id": revoked_by_id,
        })
        db.commit()

    def block_device(self, db: Session, device_id: str) -> None:
        db.query(UserTrustedDevice).filter(UserTrustedDevice.id == device_id).update({
            "is_blocked": True,
            "is_trusted": False,
        })
        db.commit()

    # ── Login history ─────────────────────────────────────────────────────────

    def get_login_history(
        self, db: Session, enterprise_user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[UserLoginHistory], int]:
        q = db.query(UserLoginHistory).filter(
            UserLoginHistory.enterprise_user_id == enterprise_user_id,
            UserLoginHistory.is_deleted == False,
        ).order_by(UserLoginHistory.created_at.desc())
        return q.offset(skip).limit(limit).all(), q.count()

    def log_login_event(
        self,
        db: Session,
        *,
        enterprise_user_id: str,
        event_type: str,
        success: bool,
        ip_address: Optional[str] = None,
        device_name: Optional[str] = None,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        pharmacy_id: Optional[str] = None,
    ) -> None:
        event = UserLoginHistory(
            enterprise_user_id=enterprise_user_id,
            event_type=event_type,
            success=success,
            ip_address=ip_address,
            device_name=device_name,
            browser=browser,
            os=os,
            user_agent=user_agent,
            failure_reason=failure_reason,
            pharmacy_id=pharmacy_id,
        )
        db.add(event)
        db.commit()

    # ── Activity log ──────────────────────────────────────────────────────────

    def get_activity_log(
        self, db: Session, enterprise_user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[UserActivityLog], int]:
        q = db.query(UserActivityLog).filter(
            UserActivityLog.enterprise_user_id == enterprise_user_id,
            UserActivityLog.is_deleted == False,
        ).order_by(UserActivityLog.created_at.desc())
        return q.offset(skip).limit(limit).all(), q.count()

    def log_activity(
        self,
        db: Session,
        *,
        enterprise_user_id: str,
        event_type: str,
        description: Optional[str] = None,
        metadata: Optional[Dict] = None,
        performed_by_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        pharmacy_id: Optional[str] = None,
    ) -> None:
        log = UserActivityLog(
            enterprise_user_id=enterprise_user_id,
            event_type=event_type,
            description=description,
            metadata=metadata,
            performed_by_id=performed_by_id,
            ip_address=ip_address,
            pharmacy_id=pharmacy_id,
        )
        db.add(log)
        db.commit()

    # ── Approval requests ─────────────────────────────────────────────────────

    def get_approvals(
        self, db: Session, enterprise_user_id: str, skip: int = 0, limit: int = 20
    ) -> Tuple[List[UserApprovalRequest], int]:
        q = db.query(UserApprovalRequest).filter(
            UserApprovalRequest.enterprise_user_id == enterprise_user_id,
            UserApprovalRequest.is_deleted == False,
        ).order_by(UserApprovalRequest.requested_at.desc())
        return q.offset(skip).limit(limit).all(), q.count()

    def create_approval_request(
        self,
        db: Session,
        *,
        enterprise_user_id: str,
        approval_type: str,
        requested_by_id: str,
        reason: Optional[str] = None,
        payload: Optional[Dict] = None,
        pharmacy_id: Optional[str] = None,
    ) -> UserApprovalRequest:
        req = UserApprovalRequest(
            enterprise_user_id=enterprise_user_id,
            approval_type=approval_type,
            requested_by_id=requested_by_id,
            reason=reason,
            payload=payload,
            pharmacy_id=pharmacy_id,
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    # ── Status mutations ──────────────────────────────────────────────────────

    def set_status(
        self, db: Session, enterprise_user: EnterpriseUser, status: str, reason: Optional[str] = None
    ) -> None:
        enterprise_user.status = status
        if reason and hasattr(enterprise_user, "lock_reason"):
            enterprise_user.lock_reason = reason
        db.commit()

    def reset_failed_logins(self, db: Session, enterprise_user: EnterpriseUser) -> None:
        enterprise_user.failed_login_count = 0
        enterprise_user.locked_at = None
        db.commit()

    def increment_failed_login(
        self, db: Session, enterprise_user: EnterpriseUser, max_attempts: int = 5
    ) -> bool:
        """Returns True if account should be locked."""
        enterprise_user.failed_login_count = (enterprise_user.failed_login_count or 0) + 1
        if enterprise_user.failed_login_count >= max_attempts:
            enterprise_user.status = EnterpriseUserStatus.LOCKED_TEMP.value
            enterprise_user.locked_at = datetime.utcnow()
            db.commit()
            return True
        db.commit()
        return False


enterprise_user_repository = EnterpriseUserRepository(EnterpriseUser)
