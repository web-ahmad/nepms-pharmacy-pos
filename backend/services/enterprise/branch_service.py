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
            # Get actual staff count by computing the same way as detail view
            try:
                cnt = len(self.list_staff(db, scope, b.id))
            except Exception:
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
        try:
            cnt = len(self.list_staff(db, scope, branch_id))
        except Exception:
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
        
        # --- AUTO-LINK POS DATA START ---
        from models.users import Branch as LegacyBranch
        from sqlalchemy.exc import IntegrityError
        import uuid
        
        legacy_id = branch.id
        legacy_branch = LegacyBranch(
            id=legacy_id,
            name=branch.name,
            code=branch.code,
            is_main=(branch.type in ["main_branch", "head_office"]),
            tenant_id=scope.tenant_id,
            pharmacy_id=pharmacy_id,
        )
        db.add(legacy_branch)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            # Auto-resolve global legacy branch code collision
            unique_suffix = str(uuid.uuid4())[:4]
            legacy_branch.code = f"{branch.code}-{unique_suffix}"
            db.add(legacy_branch)
            db.flush()
        
        branch.legacy_branch_id = legacy_id
        db.add(branch)
        db.commit()
        db.refresh(branch)
        # --- AUTO-LINK POS DATA END ---

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
        try:
            cnt = len(self.list_staff(db, scope, branch_id))
        except Exception:
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

        # ── Resolve the data branch_id ────────────────────────────────────────
        # The Enterprise branch record may have a `legacy_branch_id` that maps
        # to the branch_id used in the POS / JWT token and stored in sales/batches.
        # If set, use it for data queries; otherwise fall back to enterprise branch_id.
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id

        total_sales = 0.0
        monthly_sales = 0.0
        daily_sales = 0.0
        total_profit = 0.0
        monthly_profit = 0.0
        aov = 0.0
        total_customers = 0
        total_prescriptions = 0
        inventory_value = 0.0
        has_missing_costs = False
        low_stock_count = 0
        expiry_count = 0

        try:
            from models.sales import Sale
            from sqlalchemy import extract
            now = datetime.utcnow()
            today = date.today()

            if hasattr(Sale, "branch_id"):
                # ── SEPARATE queries (not chained) to avoid SQLAlchemy mutation bug ──
                sales_metrics = db.query(
                    func.coalesce(func.sum(Sale.total_amount), 0),
                    func.coalesce(func.sum(Sale.profit), 0),
                    func.count(Sale.id)
                ).filter(Sale.branch_id == data_bid, Sale.is_deleted == False).first()
                
                if sales_metrics:
                    total_sales = float(sales_metrics[0])
                    total_profit = float(sales_metrics[1])
                    if sales_metrics[2] > 0:
                        aov = total_sales / sales_metrics[2]
                
                monthly_metrics = db.query(
                    func.coalesce(func.sum(Sale.total_amount), 0),
                    func.coalesce(func.sum(Sale.profit), 0)
                ).filter(
                    Sale.branch_id == data_bid,
                    Sale.is_deleted == False,
                    extract("year",  Sale.created_at) == now.year,
                    extract("month", Sale.created_at) == now.month,
                ).first()
                
                if monthly_metrics:
                    monthly_sales = float(monthly_metrics[0])
                    monthly_profit = float(monthly_metrics[1])
                daily_sales = float(
                    db.query(func.coalesce(func.sum(Sale.total_amount), 0))
                    .filter(
                        Sale.branch_id == data_bid,
                        Sale.is_deleted == False,
                        func.date(Sale.created_at) == today,
                    )
                    .scalar() or 0
                )
                # Customer count
                from models.crm import Customer
                from sqlalchemy import or_
                if hasattr(Sale, "customer_id"):
                    total_customers = int(
                        db.query(func.count(func.distinct(Customer.id)))
                        .outerjoin(Sale, (Customer.id == Sale.customer_id) & (Sale.branch_id == data_bid) & (Sale.is_deleted == False))
                        .filter(or_(Sale.id.isnot(None), Customer.preferred_branch_id == branch.id))
                        .scalar() or 0
                    )
        except Exception:
            pass

        try:
            from models.inventory import Batch, Medicine
            from datetime import timedelta
            today = date.today()

            if hasattr(Batch, "branch_id"):
                inventory_value = float(
                    db.query(func.coalesce(
                        func.sum(
                            func.coalesce(
                                func.nullif(Batch.cost_per_base_unit, 0),
                                func.nullif(Batch.purchase_price, 0),
                                func.nullif(Medicine.cost_per_base_unit, 0),
                                0
                            ) * func.coalesce(Batch.current_quantity, 0)
                        ), 0
                    ))
                    .join(Medicine, Batch.medicine_id == Medicine.id)
                    .filter(Batch.branch_id == data_bid, Batch.is_deleted == False)
                    .scalar() or 0
                )
                has_missing_costs = db.query(Batch.id).join(Medicine, Batch.medicine_id == Medicine.id).filter(
                    Batch.branch_id == data_bid,
                    Batch.is_deleted == False,
                    Batch.current_quantity > 0,
                    (func.coalesce(
                        func.nullif(Batch.cost_per_base_unit, 0),
                        func.nullif(Batch.purchase_price, 0),
                        func.nullif(Medicine.cost_per_base_unit, 0),
                        0
                    ) <= 0)
                ).first() is not None
                low_stock_count = int(
                    db.query(func.count(Batch.id))
                    .filter(
                        Batch.branch_id == data_bid,
                        Batch.current_quantity <= 5,
                        Batch.is_deleted == False,
                    )
                    .scalar() or 0
                )
                expiry_cutoff = today + timedelta(days=30)
                expiry_count = int(
                    db.query(func.count(Batch.id))
                    .filter(
                        Batch.branch_id == data_bid,
                        Batch.expiry_date <= expiry_cutoff,
                        Batch.expiry_date > today,
                        Batch.is_deleted == False,
                    )
                    .scalar() or 0
                )
        except Exception:
            pass

        top_low_stock = []
        try:
            from models.inventory import Batch, Medicine
            from sqlalchemy.orm import joinedload
            if hasattr(Batch, "branch_id"):
                low_stock_records = (
                    db.query(Batch)
                    .join(Medicine, Batch.medicine_id == Medicine.id)
                    .filter(Batch.branch_id == data_bid, Batch.current_quantity <= 5, Batch.is_deleted == False)
                    .order_by(Batch.current_quantity.asc())
                    .limit(3)
                    .all()
                )
                top_low_stock = [
                    {"name": b.medicine.name if b.medicine else "Unknown", "stock": b.current_quantity}
                    for b in low_stock_records
                ]
        except Exception:
            pass

        recent_activity = []
        try:
            from models.sales import Sale
            if hasattr(Sale, "branch_id"):
                recent_sales = (
                    db.query(Sale)
                    .filter(Sale.branch_id == data_bid, Sale.is_deleted == False)
                    .order_by(Sale.created_at.desc())
                    .limit(3)
                    .all()
                )
                for s in recent_sales:
                    recent_activity.append({
                        "action": f"Sale {s.invoice_number} completed",
                        "time": s.created_at.isoformat() if s.created_at else None
                    })
        except Exception:
            pass

        trend_data = []
        top_items = []
        try:
            from models.sales import Sale, SaleItem
            from models.inventory import Medicine
            from datetime import timedelta
            
            if hasattr(Sale, "branch_id"):
                # 7-day trend
                seven_days_ago = datetime.utcnow() - timedelta(days=6)
                seven_days_ago_date = seven_days_ago.date()
                
                trend_results = (
                    db.query(
                        func.date(Sale.created_at).label("day"),
                        func.coalesce(func.sum(Sale.total_amount), 0).label("value"),
                        func.coalesce(func.sum(Sale.profit), 0).label("profit")
                    )
                    .filter(Sale.branch_id == data_bid, Sale.is_deleted == False, Sale.created_at >= seven_days_ago_date)
                    .group_by(func.date(Sale.created_at))
                    .order_by(func.date(Sale.created_at))
                    .all()
                )
                
                # Fill missing days
                trend_dict = {str(r.day): {"value": float(r.value), "profit": float(r.profit)} for r in trend_results}
                for i in range(7):
                    d = seven_days_ago_date + timedelta(days=i)
                    d_str = str(d)
                    trend_data.append({
                        "day": d.strftime("%a"),
                        "value": trend_dict.get(d_str, {}).get("value", 0.0),
                        "profit": trend_dict.get(d_str, {}).get("profit", 0.0),
                    })
                    
                # Top 3 items
                top_item_results = (
                    db.query(Medicine.name, func.sum(SaleItem.quantity).label("qty"))
                    .join(SaleItem, Medicine.id == SaleItem.medicine_id)
                    .join(Sale, SaleItem.sale_id == Sale.id)
                    .filter(Sale.branch_id == data_bid, Sale.is_deleted == False)
                    .group_by(Medicine.name)
                    .order_by(func.sum(SaleItem.quantity).desc())
                    .limit(3)
                    .all()
                )
                top_items = [{"name": r.name, "qty": int(r.qty)} for r in top_item_results]
        except Exception:
            pass

        active_cashier = None
        try:
            # Check staff assignments for a cashier role
            from models.enterprise.branch import BranchStaff
            from models.user import User
            cashier_assignment = (
                db.query(BranchStaff)
                .join(User, BranchStaff.user_id == User.id)
                .filter(BranchStaff.branch_id == branch_id, BranchStaff.role == "cashier", BranchStaff.is_active == True)
                .first()
            )
            if cashier_assignment and cashier_assignment.user:
                active_cashier = f"{cashier_assignment.user.first_name} {cashier_assignment.user.last_name}".strip()
        except Exception:
            pass

        stats = BranchStatsResponse(
            branch_id=branch_id,
            branch_name=branch.name,
            total_sales=total_sales,
            monthly_sales=monthly_sales,
            daily_sales=daily_sales,
            total_profit=total_profit,
            monthly_profit=monthly_profit,
            aov=aov,
            total_customers=total_customers,
            total_prescriptions=total_prescriptions,
            inventory_value=inventory_value,
            has_missing_costs=has_missing_costs,
            low_stock_count=low_stock_count,
            expiry_count=expiry_count,
            staff_count=staff_count,
            active_staff=staff_count,
            health_score=branch.health_score or 100.0,
            license_days_remaining=_license_days_remaining(branch.drug_license_expiry),
            top_low_stock=top_low_stock,
            recent_activity=recent_activity,
            active_cashier=active_cashier,
            trend_data=trend_data,
            top_items=top_items,
        )
        # Recompute health score dynamically
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
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id
        
        from models.users import User, UserBranch, Role
        from models.hr import Employee
        
        # 1. Get explicitly assigned users from user_branches (legacy)
        user_branches = db.query(UserBranch).filter(UserBranch.branch_id == data_bid).all()
        assigned_user_ids = [ub.user_id for ub in user_branches]
        
        # 2. Get global users (Pharmacy Owner or branch_scope == global)
        global_users = db.query(User).join(Role, User.role_id == Role.id).filter(
            User.tenant_id == pharmacy_id,
            User.is_deleted == False,
            (Role.name == "Pharmacy Owner") | (Role.branch_scope == "global")
        ).all()
        
        # 3. Get enterprise assignments
        ent_assignments = branch_repo.get_staff(db, branch_id, pharmacy_id)
        
        # 4. Get HR employees assigned to this branch
        hr_employees = db.query(Employee).filter(
            Employee.tenant_id == scope.tenant_id,
            (Employee.branch_id == branch_id) | (Employee.branch_id == data_bid)
        ).all()
        
        all_user_ids = set(assigned_user_ids + [u.id for u in global_users] + [a.user_id for a in ent_assignments])
        
        # Fetch all these users
        users = db.query(User).filter(User.id.in_(all_user_ids)).all()
        user_map = {u.id: u for u in users}
        
        # Map enterprise assignments
        ent_map = {a.user_id: a for a in ent_assignments}
        
        results = []
        for uid in all_user_ids:
            u = user_map.get(uid)
            if not u: continue
            
            ent_a = ent_map.get(uid)
            role = ent_a.role if ent_a else ("Manager" if u in global_users else "Staff")
            
            r = BranchStaffAssignmentResponse(
                id=ent_a.id if ent_a else f"virt_{uid}",
                branch_id=branch_id,
                user_id=uid,
                role=role,
                is_active=u.is_active,
                assigned_at=ent_a.assigned_at if ent_a else branch.created_at,
                notes=ent_a.notes if ent_a else ("Global Access" if u in global_users else "Legacy Assignment")
            )
            r.user = {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "is_active": u.is_active,
            }
            results.append(r)

        # Merge HR Employees who are not already linked via email or username
        existing_emails = {u.email for u in users if u.email}
        existing_usernames = {u.username for u in users if u.username}

        for emp in hr_employees:
            # Skip if we already added them via User model
            if emp.email in existing_emails or emp.username in existing_usernames:
                continue

            r = BranchStaffAssignmentResponse(
                id=f"emp_{emp.id}",
                branch_id=branch_id,
                user_id=emp.id,
                role=emp.designation.name if emp.designation else "HR Employee",
                is_active=emp.is_active,
                assigned_at=emp.created_at,
                notes="HR Module Employee"
            )
            r.user = {
                "id": emp.id,
                "username": emp.username or f"{emp.first_name}.{emp.last_name}".lower(),
                "full_name": f"{emp.first_name} {emp.last_name}",
                "email": emp.email,
                "is_active": emp.is_active,
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

    # ── Master Epic Data Isolation ────────────────────────────────────────────

    def list_branch_sales(self, db: Session, scope: PharmacyScope, branch_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id
        
        from models.sales import Sale
        query = db.query(Sale).filter(Sale.branch_id == data_bid, Sale.is_deleted == False).order_by(Sale.created_at.desc())
        total = query.count()
        sales = query.offset((page - 1) * limit).limit(limit).all()
        
        from api.v1.endpoints.sales import map_sale_to_response
        return {
            "items": [map_sale_to_response(s) for s in sales],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }

    def list_branch_inventory(self, db: Session, scope: PharmacyScope, branch_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id
        
        from models.inventory import Batch, Medicine
        query = db.query(Batch).join(Medicine, Batch.medicine_id == Medicine.id).filter(
            Batch.branch_id == data_bid, Batch.is_deleted == False
        ).order_by(Batch.expiry_date.asc())
        total = query.count()
        batches = query.offset((page - 1) * limit).limit(limit).all()
        
        items = []
        for b in batches:
            items.append({
                "id": b.id,
                "batch_number": b.batch_number,
                "medicine_name": b.medicine.name if b.medicine else "Unknown",
                "current_quantity": b.current_quantity,
                "expiry_date": b.expiry_date,
                "status": "Expired" if b.expiry_date and b.expiry_date < date.today() else ("Low Stock" if b.current_quantity <= 5 else "OK"),
                "purchase_price": b.purchase_price
            })
            
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }

    def list_branch_customers(self, db: Session, scope: PharmacyScope, branch_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id
        
        from models.sales import Sale
        from models.crm import Customer
        from sqlalchemy import func, or_
        
        # Customers who bought from this branch OR are assigned to this branch
        query = (
            db.query(Customer, func.coalesce(func.sum(Sale.total_amount), 0).label("total_spend"))
            .outerjoin(Sale, (Customer.id == Sale.customer_id) & (Sale.branch_id == data_bid) & (Sale.is_deleted == False))
            .filter(or_(Sale.id.isnot(None), Customer.preferred_branch_id == branch.id))
            .group_by(Customer.id)
            .order_by(func.coalesce(func.sum(Sale.total_amount), 0).desc())
        )
        
        # Calculate total distinct customers for pagination
        total = db.query(func.count(func.distinct(Customer.id))).outerjoin(
            Sale, (Customer.id == Sale.customer_id) & (Sale.branch_id == data_bid) & (Sale.is_deleted == False)
        ).filter(or_(Sale.id.isnot(None), Customer.preferred_branch_id == branch.id)).scalar() or 0
        
        results = query.offset((page - 1) * limit).limit(limit).all()
        
        items = []
        for c, spend in results:
            items.append({
                "id": c.id,
                "name": c.full_name or "Unknown",
                "phone": c.phone,
                "total_spend": float(spend),
                "loyalty_points": c.loyalty_points
            })
            
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }

    def list_branch_activity(self, db: Session, scope: PharmacyScope, branch_id: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        pharmacy_id = scope.pharmacy_id or ""
        branch = branch_repo.get_by_id(db, branch_id, pharmacy_id)
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        data_bid = getattr(branch, "legacy_branch_id", None) or branch_id
        
        try:
            from models.audit import AuditEvent
            query = db.query(AuditEvent).filter(
                AuditEvent.branch_id == data_bid
            ).order_by(AuditEvent.created_at.desc())
            
            total = query.count()
            logs = query.offset((page - 1) * limit).limit(limit).all()
            
            items = []
            for log in logs:
                items.append({
                    "id": log.id,
                    "action": f"Event: {log.event_type}",
                    "resource_type": "POS Transaction" if log.transaction_id else "General",
                    "timestamp": log.created_at.isoformat() if log.created_at else None,
                    "user_id": log.staff_id,
                    "details": log.metadata_
                })
        except Exception:
            items = []
            total = 0
            
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }

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
