"""
api/v1/endpoints/enterprise/users.py
──────────────────────────────────────
FastAPI router for Enterprise Users & Identity Management.

All routes are pharmacy-scoped. Super-admins see all pharmacy data.
"""

from __future__ import annotations

import os, uuid, shutil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Body
from sqlalchemy.orm import Session

from core.deps import get_current_user, requires_permission, oauth2_scheme
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from database import get_db
from models.enterprise.user import EnterpriseRole  # RBAC 4.0: elevation guard
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

# Avatars are saved under storage/ (statically served at /storage/... — see main.py).
AVATAR_DIR = os.path.join(os.getcwd(), "storage", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
_ALLOWED_AVATAR_EXT = {"png", "jpg", "jpeg", "webp", "gif"}


@router.post("/avatar", summary="Upload a user avatar image → returns its URL")
def upload_avatar(
    file: UploadFile = File(...),
    _: dict = Depends(requires_permission("users:update")),
):
    ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png")
    if ext not in _ALLOWED_AVATAR_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image type '.{ext}'. Use PNG, JPG, WEBP or GIF.")
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(AVATAR_DIR, filename), "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"url": f"/storage/avatars/{filename}"}


def _resolve_pharmacy_id(scope: PharmacyScope) -> str:
    pid = scope.pharmacy_id or scope.tenant_id
    if not pid:
        pid = "system"
    return pid


def _get_eu_or_404(db: Session, eu_id: str, pharmacy_id: str):
    eu = enterprise_user_repository.get_by_id(db, eu_id, pharmacy_id)
    if not eu:
        raise HTTPException(status_code=404, detail="User not found.")
    return eu


def _employee_code_map(db: Session, employee_ids) -> dict:
    """Resolve HR employee codes (e.g. EMP-1002) for a set of employee ids.
    The human code lives in Employee.employee_id (Employee.id is the UUID)."""
    ids = [i for i in set(employee_ids) if i]
    if not ids:
        return {}
    try:
        from models.hr import Employee
        rows = db.query(Employee.id, Employee.employee_id, Employee.employee_code).filter(Employee.id.in_(ids)).all()
        return {r[0]: (r[1] or r[2]) for r in rows if (r[1] or r[2])}
    except Exception:
        return {}


def _employee_code(db: Session, employee_id) -> Optional[str]:
    return _employee_code_map(db, [employee_id]).get(employee_id)


def require_users_view_or_self(
    eu_id: str,
    token: str = Depends(oauth2_scheme),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Read guard for the user-detail page: any user may view their OWN profile
    (even without users:view); otherwise users:view is required."""
    pid = _resolve_pharmacy_id(scope)
    eu = enterprise_user_repository.get_by_id(db, eu_id, pid)
    if eu and eu.user_id == current_user.id:
        return current_user  # self — always allowed to read own profile
    # Not self → enforce the normal permission.
    requires_permission("users:view")(token=token, db=db)
    return current_user


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=UserDashboardSummary, summary="Security & user dashboard KPIs")
def get_user_dashboard(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    hierarchy_level = token.get("hierarchy_level", 4)
    token_branch = token.get("branch_id")
    
    branch_id = token_branch if hierarchy_level >= 3 else None
    
    summary = enterprise_user_repository.get_dashboard_summary(db, pid, branch_id=branch_id)
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
    token: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pharmacy_id(scope)
    hierarchy_level = token.get("hierarchy_level", 4)
    token_branch = token.get("branch_id")

    # Force branch isolation for L3 (Branch Owner) and L4 (Staff)
    if hierarchy_level >= 3:
        branch_id = token_branch

    items, total = enterprise_user_repository.get_filtered(
        db, pid,
        search=search, status=status, user_type=user_type,
        role_id=role_id, branch_id=branch_id,
        sort_by=sort_by, sort_dir=sort_dir,
        page=page, limit=limit,
    )
    # Batch-resolve the human employee codes for linked employees.
    code_map = _employee_code_map(db, [eu.employee_id for eu in items])

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
            employee_code=code_map.get(eu.employee_id),
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
    hierarchy_level = token.get("hierarchy_level", 4)
    token_branch = token.get("branch_id")

    # ── RBAC 4.0: Role Elevation Guards ──────────────────────────────────────────────
    # Rule: A user can NEVER create another user with equal or higher privilege.
    # L1=SuperAdmin(highest) ... L4=Staff(lowest)
    if data.enterprise_role_id:
        # Use EnterpriseRole (correct model), NOT the legacy Role model
        target_role = db.query(EnterpriseRole).filter(
            EnterpriseRole.id == data.enterprise_role_id,
            EnterpriseRole.is_deleted == False,
        ).first()
        if target_role:
            target_level = target_role.hierarchy_level
            # L2 cannot create L1 or L2 users (no privilege escalation to same level)
            if hierarchy_level == 2 and target_level < 2:
                raise HTTPException(
                    status_code=403,
                    detail="Pharmacy Owners cannot create Super Admin users."
                )
            # L3 can only create L4 Staff
            if hierarchy_level == 3 and target_level <= 3:
                raise HTTPException(
                    status_code=403,
                    detail="Branch Owners can only create Level 4 (Branch Staff) users. "
                           f"The selected role has hierarchy level {target_level}."
                )

    # ── L3 Branch Owner: strict branch isolation ───────────────────────────────────
    if hierarchy_level == 3:
        if data.default_branch_id and data.default_branch_id != token_branch:
            raise HTTPException(
                status_code=403,
                detail="Branch Owners can only create users in their own branch."
            )
        if data.allowed_branches and any(b != token_branch for b in data.allowed_branches):
            raise HTTPException(
                status_code=403,
                detail="Branch Owners cannot assign users to other branches."
            )
        # Auto-assign the creator's branch when none was supplied, otherwise the
        # new user has no branch and stays invisible in the branch-scoped list.
        if token_branch and not data.default_branch_id:
            data.default_branch_id = token_branch
            if not data.allowed_branches:
                data.allowed_branches = [token_branch]

    eu = user_service.create_user(db, data=data, pharmacy_id=pid, created_by_id=created_by)
    return _build_read(eu)


# ── Get single ────────────────────────────────────────────────────────────────

# NOTE: defined BEFORE "/{eu_id}" so "me" isn't captured as a dynamic id.
@router.get("/me", summary="Current user's own enterprise profile id")
def get_my_profile(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Resolve the logged-in user's enterprise-user id so the client can open
    their own profile detail page (/users/{eu_id})."""
    pid = _resolve_pharmacy_id(scope)
    from models.enterprise.user import EnterpriseUser
    eu = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == current_user.id,
        EnterpriseUser.pharmacy_id == pid,
        EnterpriseUser.is_deleted == False,
    ).first()
    if not eu:
        # Fall back to any enterprise-user row for this core user.
        eu = db.query(EnterpriseUser).filter(EnterpriseUser.user_id == current_user.id).first()
    if not eu:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return {"enterprise_user_id": eu.id, "user_id": eu.user_id}


@router.get("/{eu_id}", response_model=EnterpriseUserRead, summary="Get user detail")
def get_user(
    eu_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _ = Depends(require_users_view_or_self),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    return _build_read(eu, employee_code=_employee_code(db, eu.employee_id))


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

    hierarchy_level = token.get("hierarchy_level", 4)
    token_branch = token.get("branch_id")

    # ── RBAC 4.0: Role Elevation Guard on Update ────────────────────────────────────
    if data.enterprise_role_id:
        target_role = db.query(EnterpriseRole).filter(
            EnterpriseRole.id == data.enterprise_role_id,
            EnterpriseRole.is_deleted == False,
        ).first()
        if target_role:
            target_level = target_role.hierarchy_level
            if hierarchy_level == 2 and target_level < 2:
                raise HTTPException(
                    status_code=403,
                    detail="Pharmacy Owners cannot elevate users to Super Admin."
                )
            if hierarchy_level == 3 and target_level <= 3:
                raise HTTPException(
                    status_code=403,
                    detail=f"Branch Owners can only assign Level 4 (Branch Staff) roles. "
                           f"The selected role has hierarchy level {target_level}."
                )

    # ── L3 Branch Owner: strict branch isolation ───────────────────────────────────
    if hierarchy_level == 3:
        # Verify target user is in the L3 user's branch
        user_branch_ids = [
            ba.branch_id for ba in eu.branch_assignments if ba.is_active
        ]
        if token_branch not in user_branch_ids:
            raise HTTPException(
                status_code=403,
                detail="You cannot modify users outside your own branch."
            )
        if data.default_branch_id and data.default_branch_id != token_branch:
            raise HTTPException(
                status_code=403,
                detail="Branch Owners cannot move users to another branch."
            )
        if data.allowed_branches and any(b != token_branch for b in data.allowed_branches):
            raise HTTPException(
                status_code=403,
                detail="Branch Owners cannot assign users to other branches."
            )

    eu = user_service.update_user(db, enterprise_user=eu, data=data, performed_by_id=token.get("sub"))
    return _build_read(eu)


# ── Delete (soft) ─────────────────────────────────────────────────────────────

@router.delete("/{eu_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Permanently delete user")
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
    _ = Depends(require_users_view_or_self),
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
    _ = Depends(require_users_view_or_self),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    bid = branch_id or scope.branch_id
    perms = user_service.compute_effective_permissions(db, enterprise_user=eu, branch_id=bid)
    base = user_service.role_base_permissions(eu)
    role_name = eu.enterprise_role.name if eu.enterprise_role else None
    level = eu.enterprise_role.hierarchy_level if eu.enterprise_role else 4
    return {
        "permissions": perms, "count": len(perms),
        "role_permissions": base, "role_name": role_name, "hierarchy_level": level,
        # L1/L2 are wildcard owners — per-permission editing doesn't apply to them.
        "is_wildcard": level is not None and level <= 2,
    }


@router.put("/{eu_id}/permissions", summary="Set (grant/revoke) permissions for a user")
def set_user_permissions(
    eu_id: str,
    payload: dict = Body(...),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pharmacy_id(scope)
    eu = _get_eu_or_404(db, eu_id, pid)
    granted = payload.get("permissions") or []
    branch_id = payload.get("branch_id") or scope.branch_id
    perms = user_service.set_user_permissions(db, enterprise_user=eu, granted=granted, branch_id=branch_id)
    return {"permissions": perms, "count": len(perms)}


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/{eu_id}/sessions", response_model=PaginatedSessions, summary="List user sessions")
def list_sessions(
    eu_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _ = Depends(require_users_view_or_self),
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
    _ = Depends(require_users_view_or_self),
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
    _ = Depends(require_users_view_or_self),
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
    _ = Depends(require_users_view_or_self),
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
    _ = Depends(require_users_view_or_self),
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

def _build_read(eu: "EnterpriseUser", employee_code: Optional[str] = None) -> EnterpriseUserRead:
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
        employee_code=employee_code,
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
