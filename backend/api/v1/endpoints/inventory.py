from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from core.deps import get_db, get_current_user, get_tenant_context, TenantContext, requires_permission, get_token_payload
from schemas.inventory import (
    MedicineCreate, MedicineUpdate, MedicineResponse, ExpiryAlert, LowStockAlert,
    PaginatedLowStockResponse,
    BatchResponse, StockMovementResponse, StockAdjustmentPayload
)
from repositories.inventory import medicine_repo
from services.inventory_service import InventoryService
from models.users import User
from models.inventory import Medicine, Batch, StockMovement, StockAdjustment
from dependencies.module_guard import require_module

router = APIRouter(dependencies=[Depends(require_module("inventory"))])


class MedicinePaginatedResponse(BaseModel):
    total: int
    items: List[MedicineResponse]

    class Config:
        from_attributes = True


@router.get("/medicines", response_model=MedicinePaginatedResponse)
def list_or_search_medicines(
    search_term: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_token_payload)
):
    """
    List all medicines or search medicines by Barcode, Generic Name, Brand, or Manufacturer.
    """
    if search_term:
        total, items = medicine_repo.search(db, tenant.tenant_id, search_term, skip, limit)
    else:
        query = db.query(Medicine).options(joinedload(Medicine.batches)).filter(
            Medicine.is_deleted == False,
            or_(Medicine.tenant_id == tenant.tenant_id, Medicine.tenant_id == None)
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()

    # Data Masking
    role = token_payload.get("role", "")
    permissions = token_payload.get("permissions", [])
    can_view_profit = role == "Owner" or "*" in permissions or "profit:view" in permissions
    
    resp_items = []
    for item in items:
        resp = MedicineResponse.model_validate(item)
        if not can_view_profit:
            resp.purchase_price = 0.0
            resp.stock_value = 0.0
        resp_items.append(resp)

    return {"total": total, "items": resp_items}


@router.post("/medicines", response_model=MedicineResponse)
def create_medicine(
    medicine_in: MedicineCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    # 1. Pre-save UOM Math
    strips = medicine_in.strips_per_box or 1
    units = medicine_in.units_per_strip or 1
    units_per_pack = strips * units
    medicine_in.units_per_pack = units_per_pack if units_per_pack > 0 else 1
    
    if medicine_in.units_per_pack > 0:
        medicine_in.unit_retail_price = (medicine_in.sale_price or 0.0) / medicine_in.units_per_pack

    initial_batch = medicine_in.initial_batch
    substitute_ids = medicine_in.substitute_ids or []
    
    data = medicine_in.model_dump(exclude={"initial_batch", "substitute_ids"})
    
    med = Medicine(**data, tenant_id=tenant.tenant_id)
    
    if substitute_ids:
        subs = db.query(Medicine).filter(Medicine.id.in_(substitute_ids)).all()
        med.substitutes = subs

    db.add(med)
    db.flush()

    if initial_batch and initial_batch.current_stock > 0:
        batch = Batch(
            batch_number=initial_batch.batch_number,
            medicine_id=med.id,
            tenant_id=tenant.tenant_id,
            branch_id=tenant.branch_id,
            manufacturing_date=initial_batch.manufacturing_date,
            expiry_date=initial_batch.expiry_date,
            supplier_id=initial_batch.supplier_id,
            current_quantity=initial_batch.current_stock,
            purchase_price=med.purchase_price,
            status="Active"
        )
        db.add(batch)
        db.flush()
        
        movement = StockMovement(
            tenant_id=tenant.tenant_id,
            branch_id=tenant.branch_id,
            medicine_id=med.id,
            batch_id=batch.id,
            user_id=current_user.id,
            movement_type="Opening Balance",
            quantity_change=initial_batch.current_stock,
            balance_after=initial_batch.current_stock,
            notes="Initial stock from Medicine Creation"
        )
        db.add(movement)
        
    db.commit()
    db.refresh(med)
    return med


@router.get("/medicines/{id}", response_model=MedicineResponse)
def get_medicine(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_token_payload)
):
    medicine = medicine_repo.get(db, id=id, tenant_id=tenant.tenant_id)
    if not medicine or (medicine.tenant_id and medicine.tenant_id != tenant.tenant_id):
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    resp = MedicineResponse.model_validate(medicine)
    role = token_payload.get("role", "")
    permissions = token_payload.get("permissions", [])
    can_view_profit = role == "Owner" or "*" in permissions or "profit:view" in permissions
    if not can_view_profit:
        resp.purchase_price = 0.0
        resp.stock_value = 0.0
        
    return resp


@router.get("/alerts/expiring", response_model=List[ExpiryAlert])
def get_expiring_batches(
    days: int = Query(30, description="Days until expiry"),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Get batches expiring within the specified number of days (30, 60, 90).
    """
    return InventoryService.get_expiring_batches(db, tenant.tenant_id, tenant.branch_id, days)


@router.get("/alerts/low-stock", response_model=PaginatedLowStockResponse)
def get_low_stock(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated and filtered low stock alerts.
    """
    return InventoryService.get_low_stock(
        db, tenant.tenant_id, tenant.branch_id,
        skip=skip, limit=limit,
        category_id=category_id, supplier_id=supplier_id,
        severity=severity, search=search
    )


@router.put("/medicines/{id}", response_model=MedicineResponse)
def update_medicine(
    id: str,
    medicine_in: MedicineUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    medicine = medicine_repo.get(db, id=id, tenant_id=tenant.tenant_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine_repo.update(db, db_obj=medicine, obj_in=medicine_in)


@router.get("/medicines/{id}/batches", response_model=List[BatchResponse])
def list_medicine_batches(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    batches = db.query(Batch).filter(
        Batch.medicine_id == id,
        Batch.branch_id == tenant.branch_id,
        Batch.is_deleted == False
    ).all()
    return batches


@router.get("/medicines/{id}/movements", response_model=List[StockMovementResponse])
def list_medicine_movements(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    movements = db.query(StockMovement).filter(
        StockMovement.medicine_id == id,
        StockMovement.branch_id == tenant.branch_id
    ).order_by(StockMovement.created_at.desc()).all()
    return movements


@router.post("/adjustments", response_model=StockMovementResponse)
def adjust_stock(
    payload: StockAdjustmentPayload,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("stock:adjust")),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(Batch).filter(
        Batch.id == payload.batch_id,
        Batch.medicine_id == payload.medicine_id,
        Batch.branch_id == tenant.branch_id,
        Batch.is_deleted == False
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    qty_change = payload.quantity
    if payload.adjustment_type == "DECREASE":
        if batch.current_quantity - batch.reserved_quantity < qty_change:
            raise HTTPException(status_code=400, detail="Insufficient stock in batch to decrease")
        qty_change = -qty_change

    batch.current_quantity += qty_change
    db.add(batch)

    adjustment = StockAdjustment(
        batch_id=batch.id,
        branch_id=tenant.branch_id,
        user_id=current_user.id,
        quantity_adjusted=qty_change,
        reason=payload.reason,
        tenant_id=tenant.tenant_id
    )
    db.add(adjustment)
    db.flush()

    movement = StockMovement(
        medicine_id=payload.medicine_id,
        batch_id=batch.id,
        branch_id=tenant.branch_id,
        user_id=current_user.id,
        movement_type=f"Adjustment {payload.adjustment_type.capitalize()}",
        quantity_change=qty_change,
        balance_after=batch.current_quantity,
        reference_id=adjustment.id,
        notes=payload.reason,
        tenant_id=tenant.tenant_id
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
