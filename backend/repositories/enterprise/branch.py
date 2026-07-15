"""
repositories/enterprise/branch.py
───────────────────────────────────
Repository (data-access layer) for the PharmacyBranch entity.

Follows the CRUDBase pattern already used across NEPMS, extended with:
• Multi-column filtered listing with server-side pagination
• Unique code validation scoped to a single pharmacy
• Staff-count aggregation
• Soft-delete semantics (is_deleted=True)
• Cross-branch comparison data fetch
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from models.enterprise.branch import (
    PharmacyBranch,
    BranchStaffAssignment,
)
from repositories.base import CRUDBase
from schemas.enterprise.branch import BranchCreate, BranchUpdate


# ── BranchRepository ──────────────────────────────────────────────────────────

class BranchRepository(CRUDBase[PharmacyBranch, BranchCreate, BranchUpdate]):

    # ── Single-row queries ────────────────────────────────────────────────────

    def get_by_id(
        self,
        db: Session,
        branch_id: str,
        pharmacy_id: str,
    ) -> Optional[PharmacyBranch]:
        return (
            db.query(PharmacyBranch)
            .filter(
                PharmacyBranch.id == branch_id,
                PharmacyBranch.pharmacy_id == pharmacy_id,
                PharmacyBranch.is_deleted == False,
            )
            .first()
        )

    def get_by_code(
        self,
        db: Session,
        code: str,
        pharmacy_id: str,
        exclude_id: Optional[str] = None,
    ) -> Optional[PharmacyBranch]:
        """Check uniqueness of a branch code within the pharmacy."""
        q = db.query(PharmacyBranch).filter(
            PharmacyBranch.code == code,
            PharmacyBranch.pharmacy_id == pharmacy_id,
            PharmacyBranch.is_deleted == False,
        )
        if exclude_id:
            q = q.filter(PharmacyBranch.id != exclude_id)
        return q.first()

    # ── List / search ─────────────────────────────────────────────────────────

    def get_filtered(
        self,
        db: Session,
        pharmacy_id: str,
        *,
        search:     Optional[str] = None,
        status:     Optional[str] = None,
        type_:      Optional[str] = None,
        region:     Optional[str] = None,
        city:       Optional[str] = None,
        sort_by:    str = "name",
        sort_dir:   str = "asc",
        skip:       int = 0,
        limit:      int = 20,
    ) -> Tuple[List[PharmacyBranch], int]:
        """
        Returns (items, total_count) for the given filters.
        Supports full-text search across name/code/city.
        """
        q = db.query(PharmacyBranch).filter(
            PharmacyBranch.pharmacy_id == pharmacy_id,
            PharmacyBranch.is_deleted == False,
        )

        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    PharmacyBranch.name.ilike(term),
                    PharmacyBranch.code.ilike(term),
                    PharmacyBranch.city.ilike(term),
                    PharmacyBranch.manager_name.ilike(term),
                    PharmacyBranch.email.ilike(term),
                )
            )

        if status:
            q = q.filter(PharmacyBranch.status == status)
        if type_:
            q = q.filter(PharmacyBranch.type == type_)
        if region:
            q = q.filter(PharmacyBranch.region.ilike(f"%{region}%"))
        if city:
            q = q.filter(PharmacyBranch.city.ilike(f"%{city}%"))

        total = q.count()

        # Sorting
        sortable = {
            "name":         PharmacyBranch.name,
            "code":         PharmacyBranch.code,
            "status":       PharmacyBranch.status,
            "type":         PharmacyBranch.type,
            "city":         PharmacyBranch.city,
            "created_at":   PharmacyBranch.created_at,
            "health_score": PharmacyBranch.health_score,
            "sort_order":   PharmacyBranch.sort_order,
        }
        col = sortable.get(sort_by, PharmacyBranch.name)
        q = q.order_by(col.desc() if sort_dir == "desc" else col.asc())

        items = q.offset(skip).limit(limit).all()
        return items, total

    # ── Create ────────────────────────────────────────────────────────────────

    def create_branch(
        self,
        db: Session,
        data: BranchCreate,
        pharmacy_id: str,
        tenant_id: Optional[str] = None,
    ) -> PharmacyBranch:
        obj = PharmacyBranch(**data.model_dump(exclude_none=False))
        obj.pharmacy_id = pharmacy_id
        if tenant_id:
            obj.tenant_id = tenant_id
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    # ── Update ────────────────────────────────────────────────────────────────

    def update_branch(
        self,
        db: Session,
        branch: PharmacyBranch,
        data: BranchUpdate,
    ) -> PharmacyBranch:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(branch, field, value)
        db.add(branch)
        db.commit()
        db.refresh(branch)
        return branch

    # ── Soft delete ───────────────────────────────────────────────────────────

    def soft_delete(
        self,
        db: Session,
        branch: PharmacyBranch,
    ) -> PharmacyBranch:
        branch.is_deleted = True
        branch.status = "closed"
        db.add(branch)
        db.commit()
        return branch

    # ── Staff assignments ─────────────────────────────────────────────────────

    def get_staff(
        self,
        db: Session,
        branch_id: str,
        pharmacy_id: str,
    ) -> List[BranchStaffAssignment]:
        return (
            db.query(BranchStaffAssignment)
            .filter(
                BranchStaffAssignment.branch_id == branch_id,
                BranchStaffAssignment.pharmacy_id == pharmacy_id,
                BranchStaffAssignment.is_deleted == False,
            )
            .all()
        )

    def assign_staff(
        self,
        db: Session,
        branch_id: str,
        user_id: str,
        role: str,
        pharmacy_id: str,
        notes: Optional[str] = None,
    ) -> BranchStaffAssignment:
        # Deactivate any existing assignment for this user in this branch
        existing = (
            db.query(BranchStaffAssignment)
            .filter(
                BranchStaffAssignment.branch_id == branch_id,
                BranchStaffAssignment.user_id == user_id,
                BranchStaffAssignment.is_deleted == False,
            )
            .first()
        )
        if existing:
            existing.role = role
            existing.is_active = True
            existing.notes = notes
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

        assignment = BranchStaffAssignment(
            branch_id=branch_id,
            user_id=user_id,
            role=role,
            is_active=True,
            notes=notes,
            pharmacy_id=pharmacy_id,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    def remove_staff(
        self,
        db: Session,
        assignment_id: str,
        pharmacy_id: str,
    ) -> bool:
        obj = (
            db.query(BranchStaffAssignment)
            .filter(
                BranchStaffAssignment.id == assignment_id,
                BranchStaffAssignment.pharmacy_id == pharmacy_id,
            )
            .first()
        )
        if not obj:
            return False
        obj.is_deleted = True
        obj.is_active = False
        db.add(obj)
        db.commit()
        return True

    # ── Staff count helper ────────────────────────────────────────────────────

    def count_staff(self, db: Session, branch_id: str) -> int:
        return (
            db.query(func.count(BranchStaffAssignment.id))
            .filter(
                BranchStaffAssignment.branch_id == branch_id,
                BranchStaffAssignment.is_active == True,
                BranchStaffAssignment.is_deleted == False,
            )
            .scalar()
            or 0
        )

    # ── Comparison data ───────────────────────────────────────────────────────

    def get_by_ids(
        self,
        db: Session,
        branch_ids: List[str],
        pharmacy_id: str,
    ) -> List[PharmacyBranch]:
        return (
            db.query(PharmacyBranch)
            .filter(
                PharmacyBranch.id.in_(branch_ids),
                PharmacyBranch.pharmacy_id == pharmacy_id,
                PharmacyBranch.is_deleted == False,
            )
            .all()
        )

    # ── Summary counts ────────────────────────────────────────────────────────

    def count_by_status(
        self, db: Session, pharmacy_id: str
    ) -> Dict[str, int]:
        rows = (
            db.query(PharmacyBranch.status, func.count(PharmacyBranch.id))
            .filter(
                PharmacyBranch.pharmacy_id == pharmacy_id,
                PharmacyBranch.is_deleted == False,
            )
            .group_by(PharmacyBranch.status)
            .all()
        )
        return {row[0]: row[1] for row in rows}

    def count_by_type(
        self, db: Session, pharmacy_id: str
    ) -> Dict[str, int]:
        rows = (
            db.query(PharmacyBranch.type, func.count(PharmacyBranch.id))
            .filter(
                PharmacyBranch.pharmacy_id == pharmacy_id,
                PharmacyBranch.is_deleted == False,
            )
            .group_by(PharmacyBranch.type)
            .all()
        )
        return {row[0]: row[1] for row in rows}


# ── Singleton ─────────────────────────────────────────────────────────────────
branch_repo = BranchRepository(PharmacyBranch)
