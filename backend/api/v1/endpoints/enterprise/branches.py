"""
api/v1/endpoints/enterprise/branches.py
─────────────────────────────────────────
FastAPI router for Enterprise Branch Management.

All routes require an authenticated pharmacy user with `settings:manage` permission.
Super-admins bypass the permission check (handled by PharmacyScope).

Endpoints
─────────
  GET    /enterprise/branches                    list (filtered, paginated)
  POST   /enterprise/branches                    create
  GET    /enterprise/branches/dashboard          aggregated dashboard summary
  GET    /enterprise/branches/compare            compare 2-6 branches
  GET    /enterprise/branches/{id}               detail
  PATCH  /enterprise/branches/{id}               partial update
  DELETE /enterprise/branches/{id}               soft delete
  GET    /enterprise/branches/{id}/stats         performance metrics
  GET    /enterprise/branches/{id}/staff         list staff assignments
  POST   /enterprise/branches/{id}/staff         assign staff
  DELETE /enterprise/branches/{id}/staff/{aid}   remove staff assignment
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from core.deps import requires_permission
from schemas.enterprise.branch import (
    BranchCreate,
    BranchUpdate,
    BranchResponse,
    BranchListResponse,
    BranchStatsResponse,
    BranchStaffAssignmentCreate,
    BranchStaffAssignmentResponse,
    BranchComparisonRequest,
    BranchComparisonResponse,
)
from services.enterprise.branch_service import branch_service

router = APIRouter()

# Permission guard — reusable dependency
def _require_branch_access(token: dict = Depends(requires_permission("settings:manage"))):
    return token


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=BranchListResponse, summary="List branches (paginated)")
def list_branches(
    search:   Optional[str] = Query(None,  description="Full-text search across name/code/city"),
    status:   Optional[str] = Query(None,  description="Filter by status"),
    type:     Optional[str] = Query(None,  alias="type", description="Filter by branch type"),
    region:   Optional[str] = Query(None,  description="Filter by region"),
    city:     Optional[str] = Query(None,  description="Filter by city"),
    sort_by:  str           = Query("name", description="Sort field"),
    sort_dir: str           = Query("asc",  description="asc | desc"),
    page:     int           = Query(1,     ge=1),
    limit:    int           = Query(20,    ge=1, le=100),
    db:       Session       = Depends(get_db),
    scope:    PharmacyScope = Depends(get_pharmacy_scope),
    _:        dict          = Depends(_require_branch_access),
):
    return branch_service.list_branches(
        db, scope,
        search=search, status=status, type_=type, region=region, city=city,
        sort_by=sort_by, sort_dir=sort_dir, page=page, limit=limit,
    )


# ── Dashboard summary ─────────────────────────────────────────────────────────

@router.get("/dashboard", summary="Branch management dashboard summary")
def branch_dashboard(
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.get_dashboard_summary(db, scope)


# ── Comparison ────────────────────────────────────────────────────────────────

@router.post("/compare", response_model=BranchComparisonResponse, summary="Compare 2-6 branches")
def compare_branches(
    req:   BranchComparisonRequest,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.compare_branches(db, scope, req)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=BranchResponse, status_code=201, summary="Create branch")
def create_branch(
    data:  BranchCreate,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.create_branch(db, scope, data)


# ── Detail ────────────────────────────────────────────────────────────────────

@router.get("/{branch_id}", response_model=BranchResponse, summary="Get branch detail")
def get_branch(
    branch_id: str,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.get_branch(db, scope, branch_id)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{branch_id}", response_model=BranchResponse, summary="Update branch (partial)")
def update_branch(
    branch_id: str,
    data:  BranchUpdate,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.update_branch(db, scope, branch_id, data)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{branch_id}", summary="Soft-delete branch")
def delete_branch(
    branch_id: str,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.delete_branch(db, scope, branch_id)


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/{branch_id}/stats", response_model=BranchStatsResponse, summary="Branch performance metrics")
def get_branch_stats(
    branch_id: str,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.get_branch_stats(db, scope, branch_id)


# ── Staff ─────────────────────────────────────────────────────────────────────

@router.get(
    "/{branch_id}/staff",
    response_model=List[BranchStaffAssignmentResponse],
    summary="List branch staff assignments",
)
def list_staff(
    branch_id: str,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.list_staff(db, scope, branch_id)


@router.post(
    "/{branch_id}/staff",
    response_model=BranchStaffAssignmentResponse,
    status_code=201,
    summary="Assign staff to branch",
)
def assign_staff(
    branch_id: str,
    data: BranchStaffAssignmentCreate,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.assign_staff(db, scope, branch_id, data)


@router.delete(
    "/{branch_id}/staff/{assignment_id}",
    summary="Remove staff assignment",
)
def remove_staff(
    branch_id:     str,
    assignment_id: str,
    db:    Session       = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    _:     dict          = Depends(_require_branch_access),
):
    return branch_service.remove_staff(db, scope, branch_id, assignment_id)
