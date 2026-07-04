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
from models.inventory import Medicine, Batch, StockMovement, StockAdjustment, Category
from models.packaging import PackagingLevel
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
        query = db.query(Medicine).options(joinedload(Medicine.batches), joinedload(Medicine.packaging_levels)).filter(
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
        try:
            resp = MedicineResponse.model_validate(item)
            if not can_view_profit:
                resp.cost_per_base_unit = 0.0
                resp.stock_value = 0.0
            resp_items.append(resp)
        except Exception as e:
            print(f"Skipping invalid medicine {item.id}: {e}")
            total -= 1

    return {"total": total, "items": resp_items}


from sqlalchemy.exc import IntegrityError

@router.post("/medicines", response_model=MedicineResponse)
def create_medicine(
    medicine_in: MedicineCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    try:
        initial_batch = medicine_in.initial_batch
        substitute_ids = medicine_in.substitute_ids or []
        packaging_levels_in = medicine_in.packaging_levels or []
        
        data = medicine_in.model_dump(exclude={"initial_batch", "substitute_ids", "packaging_levels"})
        
        category_name = data.pop("category", None)
        if category_name:
            cat = db.query(Category).filter(Category.name == category_name, Category.tenant_id == tenant.tenant_id).first()
            if not cat:
                cat = Category(name=category_name, tenant_id=tenant.tenant_id)
                db.add(cat)
                db.flush()
            data["category_id"] = cat.id

        med = Medicine(**data, tenant_id=tenant.tenant_id)
        
        if substitute_ids:
            subs = db.query(Medicine).filter(Medicine.id.in_(substitute_ids)).all()
            med.substitutes = subs

        db.add(med)
        db.flush()
        
        for level_in in packaging_levels_in:
            # Auto-calculate sale price based on conversion_qty and margin_percent
            # Cost of this level = cost_per_base_unit * conversion_qty
            # Suggested sale price = Cost * (1 + margin_percent/100)
            # If user provided a sale price > 0, use it, otherwise auto-compute
            if level_in.sale_price <= 0:
                cost = med.cost_per_base_unit or 0.0
                margin = med.margin_percent or 0.0
                level_cost = cost * level_in.conversion_qty
                calculated_price = level_cost * (1 + (margin / 100))
                level_in.sale_price = calculated_price
                
            pkg = PackagingLevel(
                medicine_id=med.id,
                level_name=level_in.level_name,
                conversion_qty=level_in.conversion_qty,
                barcode=level_in.barcode,
                secondary_barcode=level_in.secondary_barcode,
                is_purchase_unit=level_in.is_purchase_unit,
                is_sale_unit=level_in.is_sale_unit,
                is_smallest_unit=level_in.is_smallest_unit,
                is_default_pos_unit=level_in.is_default_pos_unit,
                sale_price=level_in.sale_price
            )
            db.add(pkg)
            
        db.flush()

        if initial_batch and initial_batch.current_stock > 0:
            batch = Batch(
                tenant_id=tenant.tenant_id,
                branch_id=tenant.branch_id,
                medicine_id=med.id,
                batch_number=initial_batch.batch_number,
                manufacturing_date=initial_batch.manufacturing_date,
                expiry_date=initial_batch.expiry_date,
                supplier_id=initial_batch.supplier_id,
                purchase_invoice_id=initial_batch.purchase_invoice_id,
                mrp=initial_batch.mrp,
                initial_quantity=initial_batch.current_stock,
                current_quantity=initial_batch.current_stock,
                cost_per_base_unit=med.cost_per_base_unit
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
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="A medicine with this name, code, or barcode already exists. Please use a unique value.")


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
        
    update_data = medicine_in.model_dump(exclude_unset=True)
    
    category_name = update_data.pop("category", None)
    if category_name:
        cat = db.query(Category).filter(Category.name == category_name, Category.tenant_id == tenant.tenant_id).first()
        if not cat:
            cat = Category(name=category_name, tenant_id=tenant.tenant_id)
            db.add(cat)
            db.flush()
        update_data["category_id"] = cat.id

    packaging_levels_in = update_data.pop("packaging_levels", None)
        
    # We update manually instead of using medicine_repo.update since we altered the data dictionary
    for field, value in update_data.items():
        if field not in ['initial_batch', 'substitute_ids']:
            setattr(medicine, field, value)
            
    if packaging_levels_in is not None:
        # Delete old packaging levels
        db.query(PackagingLevel).filter(PackagingLevel.medicine_id == medicine.id).delete()
        db.flush()
        
        # Insert new packaging levels
        for level_in in packaging_levels_in:
            if hasattr(level_in, "model_dump"):
                level_in = level_in.model_dump()
            elif hasattr(level_in, "dict"):
                level_in = level_in.dict()
                
            if level_in.get("sale_price", 0) <= 0:
                cost = medicine.cost_per_base_unit or 0.0
                margin = medicine.margin_percent or 0.0
                level_cost = cost * level_in.get("conversion_qty", 1)
                calculated_price = level_cost * (1 + (margin / 100))
                level_in["sale_price"] = calculated_price
                
            pkg = PackagingLevel(
                medicine_id=medicine.id,
                level_name=level_in.get("level_name"),
                conversion_qty=level_in.get("conversion_qty", 1),
                barcode=level_in.get("barcode"),
                secondary_barcode=level_in.get("secondary_barcode"),
                is_purchase_unit=level_in.get("is_purchase_unit", False),
                is_sale_unit=level_in.get("is_sale_unit", True),
                is_smallest_unit=level_in.get("is_smallest_unit", False),
                is_default_pos_unit=level_in.get("is_default_pos_unit", False),
                sale_price=level_in.get("sale_price", 0)
            )
            db.add(pkg)
        
    db.add(medicine)
    try:
        db.commit()
        db.refresh(medicine)
    except Exception as e:
        db.rollback()
        # Check if it's an integrity error
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="A medicine with this name, code, or barcode already exists. Please use a unique value.")
        raise e
    return medicine


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
