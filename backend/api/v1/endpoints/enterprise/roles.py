"""
api/v1/endpoints/enterprise/roles.py
──────────────────────────────────────
FastAPI router for Enterprise Role & Permission Management.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.deps import requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from database import get_db
from repositories.enterprise.role import role_repository
from schemas.enterprise.user import (
    RoleCreate,
    RoleUpdate,
    RoleRead,
    RoleListItem,
    RoleListResponse,
    RoleCloneRequest,
    PermissionMatrixUpdate,
    PermissionRead,
    PermissionGrouped,
)

router = APIRouter()


def _resolve_pid(scope: PharmacyScope) -> str:
    pid = scope.pharmacy_id or scope.tenant_id
    if not pid:
        pid = "system"
    return pid


def _get_role_or_404(db: Session, role_id: str, pharmacy_id: str):
    role = role_repository.get_by_id(db, role_id, pharmacy_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    return role


# ── Permissions catalogue ─────────────────────────────────────────────────────

@router.get("/permissions", response_model=List[PermissionGrouped], summary="All available permissions grouped by module")
def list_permissions(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pid(scope)
    # Seed if not present
    role_repository.seed_permissions(db, pid)
    all_perms = role_repository.get_all_permissions(db, pid)
    
    user_perms = token_payload.get("permissions", [])
    is_sa = token_payload.get("is_super_admin", False)
    has_wildcard = "*" in user_perms

    def _can_assign(code: str) -> bool:
        if is_sa: return True
        if code.startswith("system:"): return False
        if has_wildcard: return True
        if code in user_perms: return True
        resource = code.split(':')[0]
        if f"{resource}:manage" in user_perms: return True
        return False

    # Deduplicate by code (safety net against any DB duplicates)
    seen_codes: set = set()
    grouped: dict = {}
    for p in all_perms:
        if not _can_assign(p.code):
            continue
        if p.code in seen_codes:
            continue
        seen_codes.add(p.code)
        if p.module not in grouped:
            grouped[p.module] = []
        grouped[p.module].append(PermissionRead(
            id=p.id, module=p.module, action=p.action,
            code=p.code, label=p.label, description=p.description,
            is_sensitive=p.is_sensitive,
        ))
    return [PermissionGrouped(module=m, permissions=perms) for m, perms in grouped.items()]


# ── Role list ─────────────────────────────────────────────────────────────────

@router.get("", response_model=RoleListResponse, summary="List enterprise roles")
def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pid(scope)
    
    hierarchy_level = token_payload.get("hierarchy_level", 4)
    min_level = hierarchy_level if hierarchy_level >= 3 else None
    
    items, total = role_repository.get_list(db, pid, skip=skip, limit=limit, min_hierarchy_level=min_level)
    role_items = []
    for r in items:
        user_count = role_repository.get_user_count(db, r.id)
        role_items.append(RoleListItem(
            id=r.id,
            name=r.name,
            description=r.description,
            color=r.color,
            icon=r.icon,
            is_system_default=r.is_system_default,
            user_type=r.user_type,
            branch_scope=getattr(r, 'branch_scope', None),
            data_scope=getattr(r, 'data_scope', None),
            sort_order=r.sort_order,
            hierarchy_level=r.hierarchy_level,
            permission_count=len(r.role_permissions),
            user_count=user_count,
            created_at=r.created_at,
        ))
    return RoleListResponse(items=role_items, total=total)


# ── Create role ───────────────────────────────────────────────────────────────

@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED, summary="Create enterprise role")
def create_role(
    data: RoleCreate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pid(scope)
    role = role_repository.create_role(db, data=data, pharmacy_id=pid, permission_ids=data.permission_ids)
    return _build_role_read(db, role)


# ── Get role ──────────────────────────────────────────────────────────────────

@router.get("/{role_id}", response_model=RoleRead, summary="Get role with permissions")
def get_role(
    role_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:view")),
):
    pid = _resolve_pid(scope)
    role = _get_role_or_404(db, role_id, pid)
    return _build_role_read(db, role)


# ── Update role ───────────────────────────────────────────────────────────────

@router.patch("/{role_id}", response_model=RoleRead, summary="Update role")
def update_role(
    role_id: str,
    data: RoleUpdate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pid(scope)
    role = _get_role_or_404(db, role_id, pid)
    role = role_repository.update_role(db, role=role, data=data)
    return _build_role_read(db, role)


# ── Delete role ───────────────────────────────────────────────────────────────

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete role (non-system)")
def delete_role(
    role_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pid(scope)
    role = _get_role_or_404(db, role_id, pid)
    if role.is_system_default:
        raise HTTPException(status_code=400, detail="System default roles cannot be deleted.")
    user_count = role_repository.get_user_count(db, role_id)
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role assigned to {user_count} users.")
    role_repository.soft_delete(db, role)


# ── Clone role ────────────────────────────────────────────────────────────────

@router.post("/{role_id}/clone", response_model=RoleRead, status_code=status.HTTP_201_CREATED, summary="Clone role")
def clone_role(
    role_id: str,
    data: RoleCloneRequest,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pid(scope)
    source_role = _get_role_or_404(db, role_id, pid)
    new_role = role_repository.clone_role(
        db, source_role=source_role, new_name=data.new_name,
        pharmacy_id=pid, description=data.description,
    )
    return _build_role_read(db, new_role)


# ── Bulk permission update ────────────────────────────────────────────────────

@router.put("/{role_id}/permissions", response_model=RoleRead, summary="Bulk set role permissions")
def set_role_permissions(
    role_id: str,
    data: PermissionMatrixUpdate,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("users:manage")),
):
    pid = _resolve_pid(scope)
    role = _get_role_or_404(db, role_id, pid)
    role_repository.set_permissions(db, role_id=role.id, permission_ids=data.permission_ids)
    # Reload
    role = _get_role_or_404(db, role_id, pid)
    return _build_role_read(db, role)


# ── Seed defaults ─────────────────────────────────────────────────────────────

@router.post("/seed", status_code=status.HTTP_200_OK, summary="Seed default roles and permissions for pharmacy")
def seed_defaults(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("settings:manage")),
):
    pid = _resolve_pid(scope)
    perms_created = role_repository.seed_permissions(db, pid)
    roles_created = role_repository.seed_default_roles(db, pid)
    return {
        "permissions_created": len(perms_created),
        "roles_created": len(roles_created),
    }


@router.post("/seed-enterprise", status_code=status.HTTP_200_OK, summary="Seed Enterprise RBAC 3.0 — 85 modules, ~800 permissions, 27 roles")
def seed_enterprise(
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("settings:manage")),
):
    """
    Idempotent enterprise seed endpoint.
    - Seeds all ~800 permissions from the 85-module catalog.
    - Seeds all 27 default enterprise roles with scopes.
    - Safe to run multiple times — adds only what is missing.
    """
    pid = _resolve_pid(scope)
    perms_created = role_repository.seed_permissions(db, pid)
    roles_created = role_repository.seed_default_roles(db, pid)
    # Count totals in DB after seeding
    all_perms = role_repository.get_all_permissions(db, pid)
    roles_total, _ = role_repository.get_list(db, pid, limit=500)
    return {
        "status": "ok",
        "permissions_created": len(perms_created),
        "permissions_total": len(all_perms),
        "roles_created": len(roles_created),
        "roles_total": len(roles_total),
        "message": f"Enterprise RBAC 3.0 seed complete. {len(perms_created)} new permissions, {len(roles_created)} new roles.",
    }


# ── Helper ────────────────────────────────────────────────────────────────────

def _build_role_read(db: Session, role) -> RoleRead:
    user_count = role_repository.get_user_count(db, role.id)
    perms = [
        PermissionRead(
            id=rp.permission.id,
            module=rp.permission.module,
            action=rp.permission.action,
            code=rp.permission.code,
            label=rp.permission.label,
            description=rp.permission.description,
            is_sensitive=rp.permission.is_sensitive,
        )
        for rp in (role.role_permissions or [])
        if rp.permission
    ]
    # Deduplicate by code
    seen: set = set()
    unique_perms = []
    for p in perms:
        if p.code not in seen:
            seen.add(p.code)
            unique_perms.append(p)
    return RoleRead(
        id=role.id,
        name=role.name,
        description=role.description,
        color=role.color,
        icon=role.icon,
        is_system_default=role.is_system_default,
        is_branch_specific=role.is_branch_specific,
        user_type=role.user_type,
        max_users=role.max_users,
        sort_order=role.sort_order,
        branch_scope=getattr(role, 'branch_scope', None),
        data_scope=getattr(role, 'data_scope', None),
        pharmacy_id=role.pharmacy_id,
        permission_count=len(unique_perms),
        user_count=user_count,
        permissions=unique_perms,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )
