"""
api/v1/endpoints/enterprise/users.py
──────────────────────────────────────
FastAPI router for Enterprise Users & Identity Management.

All routes are pharmacy-scoped. Super-admins see all pharmacy data.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.deps import get_current_user, requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from database import get_db
from repositories.enterprise.user import enterprise_user_repository
from services.enterprise.user_service import user_service
from schemas.enterprise.user import (
    EnterpriseUserCreate,
    EnterpriseUserUpdate,
    EnterpriseUserRead,
    EnterpriseUserListItem,
    UserListResponse,
    UserDashboardSummary,
    BranchAssignmentCreate,
    BranchAssignmentRead,
    BranchTransferRequest,
    SessionRead,
    TrustedDeviceRead,
    LoginHistoryRead,
    ActivityLogRead,
    ApprovalRequestRead,
    ApprovalAction,
    PasswordResetRequest,
    SuspendRequest,
    LockRequest,
    UnlockRequest,
    PaginatedSessions,
    PaginatedLoginHistory,
    PaginatedActivity,
    PaginatedApprovals,
    PaginatedDevices,
)

router = APIRouter()


def _resolve_pharmacy_id(scope: PharmacyScope) -> str:
    if scope.pharmacy_id:
        return scope.pharmacy_id
    raise HTTPException(status_code=400, detail="pharmacy_id required in token for non-super-admin users.")


def _get_eu_or_404(db: Session, eu_id: str, pharmacy_id: str):
    eu = enterprise_user_repository.get_by_id(db, eu_id, pharmacy_id)
    if not eu:
        raise HTTPException(status_code=404, detail="User not found.")
    return eu


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=UserDashboardSummary, summary="Security & user dashboard KPIs")
def get_user_dashboard(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    summary = enterprise_user_repository.get_dashboard_summary(db, pid)
    return UserDashboardSummary(**summary)


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=UserListResponse, summary="List enterprise users")
def list_users(
    search:     Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
    user_type:  Optional[str] = Query(None),
    role_id:    Optional[str] = Query(None),
    branch_id:  Optional[str] = Query(None),
    sort_by:    str           = Query("created_at"),
    sort_dir:   str           = Query("desc"),
    page:       int           = Query(1, ge=1),
    limit:      int           = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    items, total = enterprise_user_repository.get_filtered(
        db, pid,
        search=search, status=status, user_type=user_type,
        role_id=role_id, branch_id=branch_id,
        sort_by=sort_by, sort_dir=sort_dir,
        page=page, limit=limit,
    )
    list_items = []
    for eu in items:
        u = eu.user
        list_items.append(EnterpriseUserListItem(
            id=eu.id,
            user_id=eu.user_id,
            user_type=eu.user_type,
            status=eu.status,
            username=u.username if u else None,
            email=u.email if u else None,
            full_name=u.full_name if u else None,
            phone=u.phone if u else None,
            avatar_url=eu.avatar_url,
            employee_id=eu.employee_id,
            enterprise_role=eu.enterprise_role,
            branch_count=len([a for a in eu.branch_assignments if a.is_active]),
            last_login_at=eu.last_login_at,
            created_at=eu.created_at,
        ))
    pages = max(1, (total + limit - 1) // limit)
    return UserListResponse(items=list_items, total=total, page=page, pages=pages, limit=limit)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=EnterpriseUserRead, status_code=status.HTTP_201_CREATED, summary="Create enterprise user")
def create_user(
    data: EnterpriseUserCreate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:create")),
):
    pid = _resolve_pharmacy_id(scope)
    created_by = token.get("sub")
    eu = user_service.create_user(db, data=data, pharmacy_id=pid, created_by_id=created_by)
    return _build_read(eu)


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{eu_id}", response_model=EnterpriseUserRead, summary="Get user detail")
def get_user(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    return _build_read(eu)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{eu_id}", response_model=EnterpriseUserRead, summary="Update user")
def update_user(
    eu_id: str,
    data: EnterpriseUserUpdate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    eu = user_service.update_user(db, enterprise_user=eu, data=data, performed_by_id=token.get("sub"))
    return _build_read(eu)


# ── Delete (soft) ─────────────────────────────────────────────────────────────

@router.delete("/{eu_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Soft-delete user")
def delete_user(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.delete_user(db, enterprise_user=eu, performed_by_id=token.get("sub"))


# ── Status actions ────────────────────────────────────────────────────────────

@router.post("/{eu_id}/suspend", response_model=EnterpriseUserRead, summary="Suspend user")
def suspend_user(
    eu_id: str,
    data: SuspendRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:suspend")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    eu = user_service.suspend_user(db, enterprise_user=eu, reason=data.reason, performed_by_id=token.get("sub"))
    return _build_read(eu)


@router.post("/{eu_id}/activate", response_model=EnterpriseUserRead, summary="Activate user")
def activate_user(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    eu = user_service.activate_user(db, enterprise_user=eu, performed_by_id=token.get("sub"))
    return _build_read(eu)


@router.post("/{eu_id}/lock", response_model=EnterpriseUserRead, summary="Lock user account")
def lock_user(
    eu_id: str,
    data: LockRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:suspend")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    eu = user_service.lock_user(
        db, enterprise_user=eu, reason=data.reason,
        permanent=data.permanent, performed_by_id=token.get("sub")
    )
    return _build_read(eu)


@router.post("/{eu_id}/unlock", response_model=EnterpriseUserRead, summary="Unlock user account")
def unlock_user(
    eu_id: str,
    data: UnlockRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:unlock")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    eu = user_service.unlock_user(db, enterprise_user=eu, performed_by_id=token.get("sub"))
    return _build_read(eu)


# ── Password ──────────────────────────────────────────────────────────────────

@router.post("/{eu_id}/reset-password", summary="Reset user password")
def reset_password(
    eu_id: str,
    data: PasswordResetRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:reset_password")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    new_password = user_service.reset_password(db, enterprise_user=eu, data=data, performed_by_id=token.get("sub"))
    return {"message": "Password reset successfully.", "temporary_password": new_password}


@router.post("/{eu_id}/force-password-change", summary="Flag user to change password on next login")
def force_password_change(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.force_password_change(db, enterprise_user=eu)
    return {"message": "User will be required to change password on next login."}


# ── Branch assignments ────────────────────────────────────────────────────────

@router.get("/{eu_id}/branches", response_model=List[BranchAssignmentRead], summary="List user branch assignments")
def list_user_branches(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    return enterprise_user_repository.get_branch_assignments(db, eu.id)


@router.post("/{eu_id}/branches", response_model=BranchAssignmentRead, status_code=status.HTTP_201_CREATED)
def assign_branch(
    eu_id: str,
    data: BranchAssignmentCreate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    return user_service.assign_to_branch(db, enterprise_user=eu, data=data, assigned_by_id=token.get("sub"))


@router.delete("/{eu_id}/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_branch(
    eu_id: str,
    branch_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    enterprise_user_repository.remove_branch_assignment(db, eu.id, branch_id)


@router.post("/{eu_id}/transfer", response_model=BranchAssignmentRead, summary="Transfer user to another branch")
def transfer_branch(
    eu_id: str,
    data: BranchTransferRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    return user_service.transfer_to_branch(db, enterprise_user=eu, data=data, transferred_by_id=token.get("sub"))


# ── Permissions ───────────────────────────────────────────────────────────────

@router.get("/{eu_id}/permissions", summary="Get effective permissions for user")
def get_user_permissions(
    eu_id: str,
    branch_id: Optional[str] = Query(None),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    perms = user_service.compute_effective_permissions(db, enterprise_user=eu, branch_id=branch_id)
    return {"permissions": perms, "count": len(perms)}


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/{eu_id}/sessions", response_model=PaginatedSessions, summary="List user sessions")
def list_sessions(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    items, total = enterprise_user_repository.get_active_sessions(db, eu.id, skip=skip, limit=limit)
    return PaginatedSessions(items=items, total=total)


@router.delete("/{eu_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def terminate_session(
    eu_id: str,
    session_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.terminate_session(db, enterprise_user=eu, session_id=session_id, performed_by_id=token.get("sub"))


@router.delete("/{eu_id}/sessions", status_code=status.HTTP_200_OK, summary="Terminate all sessions")
def terminate_all_sessions(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    count = user_service.terminate_all_sessions(db, enterprise_user=eu, performed_by_id=token.get("sub"))
    return {"message": f"{count} sessions terminated."}


# ── Devices ───────────────────────────────────────────────────────────────────

@router.get("/{eu_id}/devices", response_model=PaginatedDevices, summary="List trusted devices")
def list_devices(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    items, total = enterprise_user_repository.get_devices(db, eu.id, skip=skip, limit=limit)
    return PaginatedDevices(items=items, total=total)


@router.delete("/{eu_id}/devices/{device_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_device(
    eu_id: str,
    device_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.revoke_device(db, enterprise_user=eu, device_id=device_id, performed_by_id=token.get("sub"))


@router.post("/{eu_id}/devices/{device_id}/block", status_code=status.HTTP_200_OK)
def block_device(
    eu_id: str,
    device_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.block_device(db, enterprise_user=eu, device_id=device_id, performed_by_id=token.get("sub"))
    return {"message": "Device blocked."}


# ── Login history ─────────────────────────────────────────────────────────────

@router.get("/{eu_id}/login-history", response_model=PaginatedLoginHistory, summary="Login history")
def login_history(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    items, total = enterprise_user_repository.get_login_history(db, eu.id, skip=skip, limit=limit)
    return PaginatedLoginHistory(items=items, total=total)


# ── Activity log ──────────────────────────────────────────────────────────────

@router.get("/{eu_id}/activity", response_model=PaginatedActivity, summary="User activity timeline")
def activity_log(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    items, total = enterprise_user_repository.get_activity_log(db, eu.id, skip=skip, limit=limit)
    return PaginatedActivity(items=items, total=total)


# ── Approvals ─────────────────────────────────────────────────────────────────

@router.get("/{eu_id}/approvals", response_model=PaginatedApprovals, summary="Approval requests for user")
def list_approvals(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    items, total = enterprise_user_repository.get_approvals(db, eu.id, skip=skip, limit=limit)
    return PaginatedApprovals(items=items, total=total)


@router.post("/{eu_id}/approvals/{approval_id}/review", summary="Approve or reject an approval request")
def review_approval(
    eu_id: str,
    approval_id: str,
    data: ApprovalAction,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    user_service.process_approval(
        db, enterprise_user=eu, approval_id=approval_id,
        action=data, reviewed_by_id=token.get("sub"),
    )
    return {"message": f"Approval request {data.action}d."}


# ── Helper ────────────────────────────────────────────────────────────────────

def _build_read(eu: "EnterpriseUser") -> EnterpriseUserRead:
    u = eu.user
    from schemas.enterprise.user import BranchAssignmentRead, BranchInfoNested
    assignments = []
    for a in (eu.branch_assignments or []):
        branch_info = None
        if a.branch:
            branch_info = BranchInfoNested(
                id=a.branch.id, name=a.branch.name, code=a.branch.code,
                city=a.branch.city, status=a.branch.status,
            )
        assignments.append(BranchAssignmentRead(
            id=a.id, branch_id=a.branch_id, branch=branch_info,
            role=a.role, is_default_branch=a.is_default_branch,
            is_temporary=a.is_temporary, access_expires_at=a.access_expires_at,
            assigned_at=a.assigned_at, is_active=a.is_active, notes=a.notes,
        ))
    return EnterpriseUserRead(
        id=eu.id,
        user_id=eu.user_id,
        pharmacy_id=eu.pharmacy_id,
        user_type=eu.user_type,
        status=eu.status,
        enterprise_role_id=eu.enterprise_role_id,
        username=u.username if u else None,
        email=u.email if u else None,
        full_name=u.full_name if u else None,
        phone=u.phone if u else None,
        is_active=u.is_active if u else True,
        avatar_url=eu.avatar_url,
        theme_preference=eu.theme_preference,
        language=eu.language,
        timezone=eu.timezone,
        emergency_contact=eu.emergency_contact,
        notes=eu.notes,
        notif_email=eu.notif_email,
        notif_sms=eu.notif_sms,
        notif_push=eu.notif_push,
        notif_in_app=eu.notif_in_app,
        notif_whatsapp=eu.notif_whatsapp,
        employee_id=eu.employee_id,
        cnic=eu.cnic,
        license_number=eu.license_number,
        qualification=eu.qualification,
        joining_date=eu.joining_date,
        blood_group=eu.blood_group,
        address=eu.address,
        failed_login_count=eu.failed_login_count or 0,
        force_password_change=eu.force_password_change,
        password_changed_at=eu.password_changed_at,
        password_expires_at=eu.password_expires_at,
        two_factor_enabled=eu.two_factor_enabled,
        otp_enabled=eu.otp_enabled,
        last_login_at=eu.last_login_at,
        last_login_ip=eu.last_login_ip,
        last_activity_at=eu.last_activity_at,
        allowed_branches=eu.allowed_branches,
        allowed_devices=eu.allowed_devices,
        allowed_ips=eu.allowed_ips,
        allowed_hours=eu.allowed_hours,
        max_concurrent_sessions=eu.max_concurrent_sessions,
        geo_restriction_enabled=eu.geo_restriction_enabled,
        enterprise_role=eu.enterprise_role,
        branch_assignments=assignments,
        created_at=eu.created_at,
        updated_at=eu.updated_at,
    )
