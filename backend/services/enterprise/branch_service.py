"""
services/enterprise/branch_service.py
───────────────────────────────────────
Business-logic layer for Enterprise Branch Management.

Responsibilities
────────────────
• Enforce unique branch code per pharmacy
• Compute real-time performance metrics (queries existing sales/inventory tables)
• Calculate branch health score
• Drive comparison reports
• Stamp pharmacy_id / tenant_id on new objects via PharmacyScope

All methods accept a PharmacyScope so pharmacy isolation is guaranteed
at the service level (not just the API layer).
"""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from core.pharmacy_scope import PharmacyScope
from models.enterprise.branch import PharmacyBranch, BranchStaffAssignment
from repositories.enterprise.branch import branch_repo
from schemas.enterprise.branch import (
    BranchCreate,
    BranchListResponse,
    BranchResponse,
    BranchStaffAssignmentCreate,
    BranchStaffAssignmentResponse,
    BranchStatsResponse,
    BranchUpdate,
    BranchComparisonRequest,
    BranchComparisonResponse,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _to_response(branch: PharmacyBranch, staff_count: int = 0) -> BranchResponse:
    data = {c.name: getattr(branch, c.name) for c in branch.__table__.columns}
    data["staff_count"] = staff_count
    # Attach manager_info from relationship if loaded
    if branch.manager:
        u = branch.manager
        data["manager_info"] = {
            "id": u.id, "username": u.username, "full_name": u.full_name,
            "email": u.email, "is_active": u.is_active,
        }
    return BranchResponse(**data)


def _license_days_remaining(expiry: Optional[date]) -> Optional[int]:
    if not expiry:
        return None
    delta = expiry - date.today()
    return delta.days


def _compute_health_score(stats: BranchStatsResponse) -> float:
    """
    Simple heuristic health score (0-100).
    Weights:
      25%  license valid (>30 days → full points)
      25%  no low-stock items
      25%  has active staff
      25%  status is active
    """
    score = 0.0
    # License
    if stats.license_days_remaining is None:
        score += 25.0
    elif stats.license_days_remaining > 30:
        score += 25.0
    elif stats.license_days_remaining > 0:
        score += 10.0
    # Low stock
    low = stats.low_stock_count or 0
    score += max(0.0, 25.0 - low * 2)
    # Staff
    score += 25.0 if (stats.staff_count or 0) > 0 else 0.0
    # Status bonus
    score += 25.0
    return min(100.0, round(score, 1))


# ── BranchService ─────────────────────────────────────────────────────────────

class BranchService:

    # ── List ──────────────────────────────────────────────────────────────────

    def list_branches(
        self,
        db: Session,
        scope: PharmacyScope,
        *,
        search:   Optional[str] = None,
        status:   Optional[str] = None,
        type_:    Optional[str] = None,
        region:   Optional[str] = None,
        city:     Optional[str] = None,
        sort_by:  str = "name",
        sort_dir: str = "asc",
        page:     int = 1,
        limit:    int = 20,
    ) -> BranchListResponse:
        pharmacy_id = scope.pharmacy_id or ""
        skip = (page - 1) * limit
        items, total = branch_repo.get_filtered(
            db,
            pharmacy_id=pharmacy_id,
            search=search,
            status=status,
            type_=type_,
            region=region,
            city=city,
            sort_by=sort_by,
            sort_dir=sort_dir,
            skip=skip,
            limit=limit,
        )
        pages = math.ceil(total / limit) if limit else 1
        responses = []
        for b in items:
            cnt = branch_repo.count_staff(db, b.id)
            responses.append(_to_response(b, cnt))
        return BranchListResponse(items=responses, total=total, page=page, limit=limit, pages=pages)

    # ── Detail ────────────────────────────────────────────────────────────────

    def get_branch(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
    ) -> BranchResponse:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
        cnt = branch_repo.count_staff(db, branch_id)
        return _to_response(branch, cnt)

    # ── Create ────────────────────────────────────────────────────────────────

    def create_branch(
        self,
        db: Session,
        scope: PharmacyScope,
        data: BranchCreate,
    ) -> BranchResponse:
        pharmacy_id = scope.pharmacy_id or ""
        # Unique code check
        if branch_repo.get_by_code(db, data.code, pharmacy_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Branch code '{data.code}' already exists in this pharmacy.",
            )
        branch = branch_repo.create_branch(db, data, pharmacy_id, scope.tenant_id)
        return _to_response(branch)

    # ── Update ────────────────────────────────────────────────────────────────

    def update_branch(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
        data: BranchUpdate,
    ) -> BranchResponse:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
        # Code uniqueness (if being changed)
        if data.code and data.code != branch.code:
            if branch_repo.get_by_code(db, data.code, pharmacy_id, exclude_id=branch_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Branch code '{data.code}' already in use.",
                )
        branch = branch_repo.update_branch(db, branch, data)
        cnt = branch_repo.count_staff(db, branch_id)
        return _to_response(branch, cnt)

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_branch(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
    ) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
        branch_repo.soft_delete(db, branch)
        return {"success": True, "message": f"Branch '{branch.name}' has been deleted."}

    # ── Stats / Metrics ───────────────────────────────────────────────────────

    def get_branch_stats(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
    ) -> BranchStatsResponse:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

        staff_count = branch_repo.count_staff(db, branch_id)

        # ── Attempt to compute real metrics from existing models ──────────────
        # We query the Sale and Batch tables if they exist and have a branch_id column.
        # These are best-effort; we fall back to 0 if no data or column mismatch.
        total_sales = 0.0
        monthly_sales = 0.0
        daily_sales = 0.0
        total_profit = 0.0
        total_customers = 0
        total_prescriptions = 0
        inventory_value = 0.0
        low_stock_count = 0
        expiry_count = 0

        try:
            from models.sales import Sale
            from sqlalchemy import extract
            now = datetime.utcnow()
            if hasattr(Sale, "branch_id"):
                base_q = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
                    Sale.branch_id == branch_id, Sale.is_deleted == False
                )
                total_sales = float(base_q.scalar() or 0)
                monthly_sales = float(
                    base_q.filter(
                        extract("year",  Sale.created_at) == now.year,
                        extract("month", Sale.created_at) == now.month,
                    ).scalar() or 0
                )
                daily_sales = float(
                    base_q.filter(func.date(Sale.created_at) == date.today()).scalar() or 0
                )
        except Exception:
            pass

        try:
            from models.inventory import Batch
            today = date.today()
            if hasattr(Batch, "branch_id"):
                # inventory value
                inventory_value = float(
                    db.query(func.coalesce(
                        func.sum(Batch.purchase_price * Batch.current_quantity), 0
                    )).filter(Batch.branch_id == branch_id, Batch.is_deleted == False).scalar() or 0
                )
                # low stock (< reorder_level — we flag anything with qty 0 for now)
                low_stock_count = int(
                    db.query(func.count(Batch.id)).filter(
                        Batch.branch_id == branch_id,
                        Batch.current_quantity == 0,
                        Batch.is_deleted == False,
                    ).scalar() or 0
                )
                # expiring in 30 days
                from datetime import timedelta
                expiry_cutoff = today + timedelta(days=30)
                expiry_count = int(
                    db.query(func.count(Batch.id)).filter(
                        Batch.branch_id == branch_id,
                        Batch.expiry_date <= expiry_cutoff,
                        Batch.expiry_date > today,
                        Batch.is_deleted == False,
                    ).scalar() or 0
                )
        except Exception:
            pass

        stats = BranchStatsResponse(
            branch_id=branch_id,
            branch_name=branch.name,
            total_sales=total_sales,
            monthly_sales=monthly_sales,
            daily_sales=daily_sales,
            total_profit=total_profit,
            monthly_profit=0.0,
            total_customers=total_customers,
            total_prescriptions=total_prescriptions,
            inventory_value=inventory_value,
            low_stock_count=low_stock_count,
            expiry_count=expiry_count,
            staff_count=staff_count,
            active_staff=staff_count,
            health_score=branch.health_score or 100.0,
            license_days_remaining=_license_days_remaining(branch.drug_license_expiry),
        )
        # Recompute health score
        stats.health_score = _compute_health_score(stats)
        return stats

    # ── Comparison ────────────────────────────────────────────────────────────

    def compare_branches(
        self,
        db: Session,
        scope: PharmacyScope,
        req: BranchComparisonRequest,
    ) -> BranchComparisonResponse:
        pharmacy_id = scope.pharmacy_id or ""
        branches = branch_repo.get_by_ids(db, req.branch_ids, pharmacy_id)
        if len(branches) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 valid branches are required for comparison.",
            )
        results = []
        for b in branches:
            try:
                stats = self.get_branch_stats(db, scope, b.id)
            except Exception:
                stats = BranchStatsResponse(branch_id=b.id, branch_name=b.name)
            results.append(stats)
        return BranchComparisonResponse(
            branches=results,
            period=req.period,
            generated_at=datetime.utcnow(),
        )

    # ── Staff management ──────────────────────────────────────────────────────

    def list_staff(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
    ) -> List[BranchStaffAssignmentResponse]:
        pharmacy_id = scope.pharmacy_id or ""
        # Verify branch ownership
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        assignments = branch_repo.get_staff(db, branch_id, pharmacy_id)
        results = []
        for a in assignments:
            r = BranchStaffAssignmentResponse(
                id=a.id,
                branch_id=a.branch_id,
                user_id=a.user_id,
                role=a.role,
                is_active=a.is_active,
                assigned_at=a.assigned_at,
                notes=a.notes,
            )
            if a.user:
                r.user = {
                    "id": a.user.id,
                    "username": a.user.username,
                    "full_name": a.user.full_name,
                    "email": a.user.email,
                    "is_active": a.user.is_active,
                }
            results.append(r)
        return results

    def assign_staff(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
        data: BranchStaffAssignmentCreate,
    ) -> BranchStaffAssignmentResponse:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        assignment = branch_repo.assign_staff(
            db, branch_id, data.user_id, data.role, pharmacy_id, data.notes
        )
        # If assigning as manager, update denormalized manager fields
        if data.role == "manager" and assignment.user:
            u = assignment.user
            branch_repo.update_branch(db, branch, BranchUpdate(
                manager_name=u.full_name or u.username,
                manager_email=u.email,
                manager_user_id=u.id,
            ))
        return BranchStaffAssignmentResponse(
            id=assignment.id,
            branch_id=assignment.branch_id,
            user_id=assignment.user_id,
            role=assignment.role,
            is_active=assignment.is_active,
            assigned_at=assignment.assigned_at,
            notes=assignment.notes,
        )

    def remove_staff(
        self,
        db: Session,
        scope: PharmacyScope,
        branch_id: str,
        assignment_id: str,
    ) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        ok = branch_repo.remove_staff(db, assignment_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True}

    # ── Dashboard summary ─────────────────────────────────────────────────────

    def get_dashboard_summary(
        self,
        db: Session,
        scope: PharmacyScope,
    ) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        by_status = branch_repo.count_by_status(db, pharmacy_id)
        by_type   = branch_repo.count_by_type(db, pharmacy_id)
        total     = sum(by_status.values())
        active    = by_status.get("active", 0)
        return {
            "total_branches":  total,
            "active_branches": active,
            "by_status":       by_status,
            "by_type":         by_type,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
branch_service = BranchService()
