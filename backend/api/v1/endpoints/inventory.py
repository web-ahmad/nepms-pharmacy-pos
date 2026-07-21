from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel
from core.deps import get_db, get_current_user, requires_permission, get_token_payload
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from schemas.inventory import (
    MedicineCreate, MedicineUpdate, MedicineResponse, ExpiryAlert, LowStockAlert,
    PaginatedLowStockResponse,
    BatchResponse, StockMovementResponse, StockAdjustmentPayload,
    BulkDeletePayload, BulkImportPayload
)
from repositories.inventory import medicine_repo
from services.inventory_service import InventoryService
from models.users import User
from models.inventory import Medicine, Batch, StockMovement, StockAdjustment, Category
from models.packaging import PackagingLevel
from dependencies.module_guard import require_module

from services.accounts_service import AccountsService
from repositories.accounts import AccountsRepository
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate
from datetime import datetime

router = APIRouter(dependencies=[Depends(require_module("inventory"))])


class MedicinePaginatedResponse(BaseModel):
    total: int
    items: List[MedicineResponse]

    class Config:
        from_attributes = True


from datetime import date, timedelta
from sqlalchemy import func

from sqlalchemy.orm import contains_eager
from sqlalchemy import and_

@router.get("/medicines", response_model=MedicinePaginatedResponse)
def list_or_search_medicines(
    search_term: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    expiry: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_token_payload)
):
    """
    List all medicines with optional search and filters.
    """
    # If no branch is explicitly selected (Global mode), default to Main Pharmacy 
    # so that inventory and POS don't aggregate everything from all franchises.
    effective_branch_id = scope.branch_id
    if not effective_branch_id:
        from models.users import Branch
        main_branch = db.query(Branch).filter(Branch.tenant_id == scope.tenant_id, Branch.is_main == True).first()
        if main_branch:
            effective_branch_id = main_branch.id

    query = db.query(Medicine).options(joinedload(Medicine.packaging_levels)).filter(
        Medicine.is_deleted == False,
        Medicine.tenant_id == scope.tenant_id
    ).distinct()
    
    # Apply outer join when searching so all catalog items are findable.
    # Otherwise, apply inner join so the default inventory list only shows items this branch carries.
    if effective_branch_id:
        if search_term:
            query = query.outerjoin(Batch, and_(Batch.medicine_id == Medicine.id, Batch.branch_id == effective_branch_id, Batch.is_deleted == False))
        else:
            query = query.join(Batch, and_(Batch.medicine_id == Medicine.id, Batch.branch_id == effective_branch_id, Batch.is_deleted == False))
    else:
        if search_term:
            query = query.outerjoin(Batch, and_(Batch.medicine_id == Medicine.id, Batch.is_deleted == False))
        else:
            query = query.join(Batch, and_(Batch.medicine_id == Medicine.id, Batch.is_deleted == False))

    if search_term:
        query = query.filter(or_(
            Medicine.name.ilike(f"%{search_term}%"),
            Medicine.generic_name.ilike(f"%{search_term}%"),
            Medicine.brand_name.ilike(f"%{search_term}%"),
            Medicine.manufacturer.ilike(f"%{search_term}%"),
            Medicine.barcode == search_term
        ))

    if category:
        query = query.join(Category, Medicine.category_id == Category.id).filter(Category.name.ilike(f"%{category}%"))

    if warehouse_id:
        query = query.join(Batch, Medicine.id == Batch.medicine_id).filter(
            Batch.warehouse_id == warehouse_id,
            Batch.is_deleted == False
        )

    if status or expiry:
        batch_stats = db.query(
            Batch.medicine_id,
            func.sum(Batch.current_quantity - Batch.reserved_quantity).label("tot_qty"),
            func.min(Batch.expiry_date).label("min_exp")
        ).filter(
            Batch.status == "Active",
            Batch.is_deleted == False
        )
        if warehouse_id:
            batch_stats = batch_stats.filter(Batch.warehouse_id == warehouse_id)
            
        if effective_branch_id:
            batch_stats = batch_stats.filter(Batch.branch_id == effective_branch_id)
            
        batch_stats = batch_stats.group_by(Batch.medicine_id).subquery()
        
        query = query.outerjoin(batch_stats, Medicine.id == batch_stats.c.medicine_id)
        
        if status == "critical":
            query = query.filter(func.coalesce(batch_stats.c.tot_qty, 0) <= 0)
        elif status == "low":
            query = query.filter(func.coalesce(batch_stats.c.tot_qty, 0) > 0, func.coalesce(batch_stats.c.tot_qty, 0) <= Medicine.min_stock_level)
        elif status == "normal":
            query = query.filter(func.coalesce(batch_stats.c.tot_qty, 0) > Medicine.min_stock_level)
            
        if expiry == "expired":
            query = query.filter(batch_stats.c.min_exp < date.today())
        elif expiry == "near_expiry":
            query = query.filter(batch_stats.c.min_exp >= date.today(), batch_stats.c.min_exp <= date.today() + timedelta(days=30))

    total = query.count()
    query = query.options(contains_eager(Medicine.batches))
    items = query.order_by(Medicine.created_at.desc()).offset(skip).limit(limit).all()

    # Data Masking
    role = token_payload.get("role", "")
    permissions = token_payload.get("permissions", [])
    is_sa = token_payload.get("is_super_admin", False)
    allowed_roles = ["Owner", "Pharmacy Owner", "Franchise Owner", "Super Admin", "General Manager", "Admin", "Inventory Manager"]
    can_view_profit = is_sa or role in allowed_roles or "*" in permissions or "reports:view" in permissions
    
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
    scope: PharmacyScope = Depends(get_pharmacy_scope),
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
            cat = db.query(Category).filter(Category.name == category_name, Category.tenant_id == scope.tenant_id).first()
            if not cat:
                cat = Category(name=category_name, tenant_id=scope.tenant_id)
                db.add(cat)
                db.flush()
            data["category_id"] = cat.id

        valid_columns = {c.name for c in Medicine.__table__.columns}
        UNIQUE_FIELDS = {'sku', 'barcode', 'slug', 'internal_product_code', 'qr_code'}
        
        filtered_data = {}
        for field, value in data.items():
            if field in valid_columns and field not in ['id', 'tenant_id', 'created_at', 'updated_at']:
                if field in UNIQUE_FIELDS and value == '':
                    value = None
                filtered_data[field] = value

        med = Medicine(**filtered_data, tenant_id=scope.tenant_id)
        
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
            target_branch_id = scope.branch_id
            if not target_branch_id:
                from models.users import Branch
                main_branch = db.query(Branch).filter(Branch.tenant_id == scope.tenant_id, Branch.is_main == True).first()
                if main_branch:
                    target_branch_id = main_branch.id

            batch = Batch(
                tenant_id=scope.tenant_id,
                branch_id=target_branch_id,
                medicine_id=med.id,
                batch_number=initial_batch.batch_number,
                manufacturing_date=initial_batch.manufacturing_date,
                expiry_date=initial_batch.expiry_date,
                supplier_id=initial_batch.supplier_id,
                purchase_invoice_id=initial_batch.purchase_invoice_id,
                mrp=initial_batch.mrp,
                purchase_price=initial_batch.purchase_price,
                initial_quantity=initial_batch.current_stock,
                current_quantity=initial_batch.current_stock,
                cost_per_base_unit=med.cost_per_base_unit,
                warehouse_id=initial_batch.warehouse_id,
                rack_id=initial_batch.rack_id,
                bin_id=initial_batch.bin_id
            )
            db.add(batch)
            db.flush()
            
            movement = StockMovement(
                tenant_id=scope.tenant_id,
                branch_id=target_branch_id,
                medicine_id=med.id,
                batch_id=batch.id,
                user_id=current_user.id,
                movement_type="Opening Balance",
                quantity_change=initial_batch.current_stock,
                balance_after=initial_batch.current_stock,
                notes="Initial stock from Medicine Creation",
                warehouse_id=initial_batch.warehouse_id,
                rack_id=initial_batch.rack_id,
                bin_id=initial_batch.bin_id
            )
            db.add(movement)
            db.flush()
            
            # --- Accounting Integration ---
            cost = initial_batch.purchase_price if initial_batch.purchase_price and initial_batch.purchase_price > 0 else (med.cost_per_base_unit or 0.0)
            total_value = initial_batch.current_stock * cost
            if total_value > 0:
                from services.auto_posting_service import AutoPostingService
                auto_poster = AutoPostingService(db)
                try:
                    auto_poster.post_opening_stock(
                        tenant_id=scope.tenant_id,
                        user_id=current_user.id,
                        reference=f"OPENING-MED-{med.id[:8]}",
                        amount=total_value,
                        description=f"Opening Stock for {med.name}",
                        branch_id=target_branch_id,
                        source_module="Inventory",
                        source_id=batch.id
                    )
                except Exception as e:
                    print(f"Failed to post opening stock journal entry: {e}")
            
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
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_token_payload)
):
    medicine = medicine_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not medicine or (medicine.tenant_id and medicine.tenant_id != scope.tenant_id):
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    resp = MedicineResponse.model_validate(medicine)
    role = token_payload.get("role", "")
    permissions = token_payload.get("permissions", [])
    is_sa = token_payload.get("is_super_admin", False)
    allowed_roles = ["Owner", "Pharmacy Owner", "Franchise Owner", "Super Admin", "General Manager", "Admin", "Inventory Manager"]
    can_view_profit = is_sa or role in allowed_roles or "*" in permissions or "reports:view" in permissions
    if not can_view_profit:
        resp.stock_value = 0.0
        
    return resp


@router.get("/alerts/expiring", response_model=List[ExpiryAlert])
def get_expiring_batches(
    days: int = Query(30, description="Days until expiry"),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Get batches expiring within the specified number of days (30, 60, 90).
    """
    return InventoryService.get_expiring_batches(db, scope.tenant_id, scope.branch_id, days)


@router.get("/alerts/low-stock", response_model=PaginatedLowStockResponse)
def get_low_stock(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated and filtered low stock alerts.
    """
    return InventoryService.get_low_stock(
        db, scope.tenant_id, scope.branch_id,
        skip=skip, limit=limit,
        category_id=category_id, supplier_id=supplier_id,
        severity=severity, search=search
    )


@router.put("/medicines/{id}", response_model=MedicineResponse)
def update_medicine(
    id: str,
    medicine_in: MedicineUpdate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    medicine = medicine_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
        
    try:
        update_data = medicine_in.model_dump(exclude_unset=True)
        
        category_name = update_data.pop("category", None)
        if category_name:
            cat = db.query(Category).filter(Category.name == category_name, Category.tenant_id == scope.tenant_id).first()
            if not cat:
                cat = Category(name=category_name, tenant_id=scope.tenant_id)
                db.add(cat)
                db.flush()
            update_data["category_id"] = cat.id

        packaging_levels_in = update_data.pop("packaging_levels", None)
        
        # Filter keys that actually exist in the Medicine model
        valid_columns = {c.name for c in Medicine.__table__.columns}
            
        # We update manually instead of using medicine_repo.update since we altered the data dictionary
        # Fields with UNIQUE constraint in DB — empty string must become NULL to avoid constraint violations
        UNIQUE_FIELDS = {'sku', 'barcode', 'slug', 'internal_product_code', 'qr_code'}

        for field, value in update_data.items():
            if field in valid_columns and field not in ['id', 'tenant_id', 'created_at', 'updated_at']:
                # Record last_location if shelf changes
                if field == 'shelf' and value != medicine.shelf:
                    setattr(medicine, 'last_location', medicine.shelf)

                # Convert empty string → None for unique fields to avoid UNIQUE constraint failures
                if field in UNIQUE_FIELDS and value == '':
                    value = None
                # Cast numeric fields appropriately
                elif field in ['cost_per_base_unit', 'discount_percentage', 'margin_percent', 'wholesale_margin_percent', 'mrp', 'tax_rate']:
                    try:
                        value = float(value) if value is not None and value != '' else 0.0
                    except (ValueError, TypeError):
                        value = 0.0
                elif field in ['min_stock_level', 'max_stock_level', 'reorder_level', 'strips_per_box', 'units_per_strip', 'age_restriction']:
                    try:
                        value = int(value) if value is not None and value != '' else None
                    except (ValueError, TypeError):
                        value = None
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
            
        return MedicineResponse.model_validate(medicine)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"UPDATE MEDICINE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/medicines/{id}")
def delete_medicine(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    medicine = medicine_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    from models.inventory import Inventory
    from models.sales import SaleItem
    from models.purchase import POItem
    
    has_inventory = db.query(Inventory).filter(Inventory.medicine_id == id, Inventory.tenant_id == scope.tenant_id).first()
    has_sales = db.query(SaleItem).filter(SaleItem.medicine_id == id).first()
    has_pos = db.query(POItem).filter(POItem.medicine_id == id).first()
    
    if has_inventory or has_sales or has_pos:
        medicine.is_deleted = True
        db.commit()
        return {"detail": "Medicine soft-deleted because usage history exists."}
    else:
        db.delete(medicine)
        db.commit()
        return {"detail": "Medicine permanently deleted."}


@router.post("/medicines/bulk-delete")
def bulk_delete_medicines(
    payload: BulkDeletePayload,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    try:
        deleted_count = db.query(Medicine).filter(
            Medicine.id.in_(payload.ids),
            Medicine.tenant_id == scope.tenant_id
        ).delete(synchronize_session=False)
        db.commit()
        return {"detail": f"{deleted_count} medicines deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/medicines/bulk-import")
def bulk_import_medicines(
    payload: BulkImportPayload,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    success_count = 0
    failed_items = []
    
    for medicine_in in payload.medicines:
        try:
            if medicine_in.barcode:
                exists = db.query(Medicine).filter(Medicine.barcode == medicine_in.barcode, Medicine.tenant_id == scope.tenant_id).first()
                if exists:
                    failed_items.append({"name": medicine_in.name, "reason": f"Duplicate barcode: {medicine_in.barcode}"})
                    continue
                    
            initial_batch = medicine_in.initial_batch
            packaging_levels_in = medicine_in.packaging_levels or []
            data = medicine_in.model_dump(exclude={"initial_batch", "substitute_ids", "packaging_levels"})
            
            category_name = data.pop("category", None)
            if category_name:
                cat = db.query(Category).filter(Category.name == category_name, Category.tenant_id == scope.tenant_id).first()
                if not cat:
                    cat = Category(name=category_name, tenant_id=scope.tenant_id)
                    db.add(cat)
                    db.flush()
                data["category_id"] = cat.id

            med = Medicine(**data, tenant_id=scope.tenant_id)
            db.add(med)
            db.flush()
            
            for level_in in packaging_levels_in:
                if level_in.sale_price <= 0:
                    cost = med.cost_per_base_unit or 0.0
                    margin = med.margin_percent or 0.0
                    calculated_price = (cost * level_in.conversion_qty) * (1 + (margin / 100))
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
                if not initial_batch.purchase_price or initial_batch.purchase_price <= 0:
                    db.rollback()
                    failed_items.append({"name": medicine_in.name, "reason": "Purchase Price is required when opening stock is > 0"})
                    continue
                    
                target_branch_id = scope.branch_id
                if not target_branch_id:
                    from models.users import Branch
                    main_branch = db.query(Branch).filter(Branch.tenant_id == scope.tenant_id, Branch.is_main == True).first()
                    if main_branch:
                        target_branch_id = main_branch.id

                batch = Batch(
                    tenant_id=scope.tenant_id,
                    branch_id=target_branch_id,
                    medicine_id=med.id,
                    batch_number=initial_batch.batch_number,
                    manufacturing_date=initial_batch.manufacturing_date,
                    expiry_date=initial_batch.expiry_date,
                    supplier_id=initial_batch.supplier_id,
                    purchase_invoice_id=initial_batch.purchase_invoice_id,
                    purchase_price=initial_batch.purchase_price,
                    mrp=initial_batch.mrp,
                    initial_quantity=initial_batch.current_stock,
                    current_quantity=initial_batch.current_stock,
                    cost_per_base_unit=med.cost_per_base_unit,
                    warehouse_id=initial_batch.warehouse_id,
                    rack_id=initial_batch.rack_id,
                    bin_id=initial_batch.bin_id
                )
                db.add(batch)
                db.flush()
                
                movement = StockMovement(
                    tenant_id=scope.tenant_id,
                    branch_id=target_branch_id,
                    medicine_id=med.id,
                    batch_id=batch.id,
                    user_id=current_user.id,
                    movement_type="Opening Balance",
                    quantity_change=initial_batch.current_stock,
                    balance_after=initial_batch.current_stock,
                    notes="Initial stock from Bulk Import",
                    warehouse_id=initial_batch.warehouse_id,
                    rack_id=initial_batch.rack_id,
                    bin_id=initial_batch.bin_id
                )
                db.add(movement)
                
                # Auto Posting for Opening Stock
                total_value = initial_batch.current_stock * initial_batch.purchase_price
                if total_value > 0:
                    from services.auto_posting_service import AutoPostingService
                    auto_posting = AutoPostingService(db)
                    auto_posting.post_opening_stock(
                        tenant_id=scope.tenant_id,
                        user_id=current_user.id,
                        reference=f"OPEN-{batch.batch_number}",
                        amount=total_value,
                        branch_id=target_branch_id,
                        source_module="Inventory",
                        source_id=batch.id
                    )
            
            db.commit()
            success_count += 1
            
        except IntegrityError as e:
            db.rollback()
            failed_items.append({"name": medicine_in.name, "reason": "Database Integrity Error (Duplicate name/SKU)"})
        except Exception as e:
            db.rollback()
            failed_items.append({"name": medicine_in.name, "reason": str(e)})

    return {"detail": f"{success_count} medicines imported successfully", "failed": failed_items, "success_count": success_count}


@router.get("/medicines/{id}/batches", response_model=List[BatchResponse])
def list_medicine_batches(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    batches = db.query(Batch).filter(
        Batch.medicine_id == id,
        Batch.branch_id == scope.branch_id,
        Batch.is_deleted == False
    ).all()
    return batches

@router.get("/reservations")
def get_reservations(
    medicine_id: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(get_token_payload)
):
    # Phase 4 placeholder
    return []


@router.get("/medicines/{id}/movements", response_model=List[StockMovementResponse])
def list_medicine_movements(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    movements = db.query(StockMovement).filter(
        StockMovement.medicine_id == id,
        StockMovement.branch_id == scope.branch_id
    ).order_by(StockMovement.created_at.desc()).all()
    
    from models.sales import Sale
    for m in movements:
        if m.movement_type == "Sale" and m.reference_id:
            sale = db.query(Sale).filter(Sale.id == m.reference_id).first()
            if sale and sale.invoice_number:
                m.notes = f"{sale.invoice_number} - {m.notes or ''}"
                
    return movements


@router.post("/adjustments", response_model=StockMovementResponse)
def adjust_stock(
    payload: StockAdjustmentPayload,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("stock:adjust")),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(Batch).filter(
        Batch.id == payload.batch_id,
        Batch.medicine_id == payload.medicine_id,
        Batch.branch_id == scope.branch_id,
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
        branch_id=scope.branch_id,
        user_id=current_user.id,
        quantity_adjusted=qty_change,
        reason=payload.reason,
        tenant_id=scope.tenant_id,
        warehouse_id=payload.warehouse_id or batch.warehouse_id,
        rack_id=payload.rack_id or batch.rack_id,
        bin_id=payload.bin_id or batch.bin_id
    )
    db.add(adjustment)
    db.flush()

    movement = StockMovement(
        medicine_id=payload.medicine_id,
        batch_id=batch.id,
        branch_id=scope.branch_id,
        user_id=current_user.id,
        movement_type=f"Adjustment {payload.adjustment_type.capitalize()}",
        quantity_change=qty_change,
        balance_after=batch.current_quantity,
        reference_id=adjustment.id,
        notes=payload.reason,
        tenant_id=scope.tenant_id,
        warehouse_id=payload.warehouse_id or batch.warehouse_id,
        rack_id=payload.rack_id or batch.rack_id,
        bin_id=payload.bin_id or batch.bin_id
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

