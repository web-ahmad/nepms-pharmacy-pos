from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from core.deps import get_db, get_current_user, requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from models.users import User
from models.inventory import (
    WarehouseRack, WarehouseBin, StockTransfer, StockTransferItem,
    InventoryCycleCount, InventoryCycleCountItem, Batch, StockMovement
)
from schemas.inventory import (
    WarehouseRackCreate, WarehouseRackResponse,
    WarehouseBinCreate, WarehouseBinResponse,
    StockTransferCreate, StockTransferResponse,
    InventoryCycleCountCreate, InventoryCycleCountResponse
)
import uuid

router = APIRouter()

# RACKS

@router.get("/warehouses/{warehouse_id}/racks", response_model=List[WarehouseRackResponse])
def list_racks(
    warehouse_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    # Tenant verification is implied through warehouse, assuming warehouse belongs to branch/tenant
    return db.query(WarehouseRack).filter(
        WarehouseRack.warehouse_id == warehouse_id,
        WarehouseRack.is_deleted == False
    ).all()

@router.post("/warehouses/{warehouse_id}/racks", response_model=WarehouseRackResponse)
def create_rack(
    warehouse_id: str,
    rack_in: WarehouseRackCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    rack = WarehouseRack(**rack_in.model_dump(), tenant_id=scope.tenant_id)
    rack.warehouse_id = warehouse_id
    db.add(rack)
    db.commit()
    db.refresh(rack)
    return rack

# BINS

@router.get("/racks/{rack_id}/bins", response_model=List[WarehouseBinResponse])
def list_bins(
    rack_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return db.query(WarehouseBin).filter(
        WarehouseBin.rack_id == rack_id,
        WarehouseBin.is_deleted == False
    ).all()

@router.post("/racks/{rack_id}/bins", response_model=WarehouseBinResponse)
def create_bin(
    rack_id: str,
    bin_in: WarehouseBinCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    bin_obj = WarehouseBin(**bin_in.model_dump(), tenant_id=scope.tenant_id)
    bin_obj.rack_id = rack_id
    db.add(bin_obj)
    db.commit()
    db.refresh(bin_obj)
    return bin_obj

# TRANSFERS

@router.get("/transfers", response_model=List[StockTransferResponse])
def list_transfers(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    q = db.query(StockTransfer).options(joinedload(StockTransfer.items)).filter(
        (StockTransfer.source_branch_id == scope.branch_id) | (StockTransfer.destination_branch_id == scope.branch_id),
        StockTransfer.tenant_id == scope.tenant_id,
        StockTransfer.is_deleted == False
    )
    if status:
        q = q.filter(StockTransfer.status == status)
    return q.order_by(StockTransfer.created_at.desc()).all()

@router.post("/transfers", response_model=StockTransferResponse)
def create_transfer(
    transfer_in: StockTransferCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:transfer"))
):
    data = transfer_in.model_dump(exclude={"items"})
    transfer = StockTransfer(
        **data,
        tenant_id=scope.tenant_id,
        requested_by=token_payload.get("user_id"),
        reference_no=f"TRF-{uuid.uuid4().hex[:8].upper()}"
    )
    db.add(transfer)
    db.flush()
    
    for item_in in transfer_in.items:
        item = StockTransferItem(
            **item_in.model_dump(),
            tenant_id=scope.tenant_id,
            transfer_id=transfer.id
        )
        db.add(item)
        
    db.commit()
    db.refresh(transfer)
    return transfer

# CYCLE COUNTS

@router.get("/cycle-counts", response_model=List[InventoryCycleCountResponse])
def list_cycle_counts(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return db.query(InventoryCycleCount).options(joinedload(InventoryCycleCount.items)).filter(
        InventoryCycleCount.branch_id == scope.branch_id,
        InventoryCycleCount.tenant_id == scope.tenant_id,
        InventoryCycleCount.is_deleted == False
    ).order_by(InventoryCycleCount.created_at.desc()).all()

@router.post("/cycle-counts", response_model=InventoryCycleCountResponse)
def create_cycle_count(
    cc_in: InventoryCycleCountCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("inventory:manage"))
):
    data = cc_in.model_dump(exclude={"items"})
    cc = InventoryCycleCount(
        **data,
        tenant_id=scope.tenant_id,
        created_by=token_payload.get("user_id")
    )
    db.add(cc)
    db.flush()
    
    for item_in in cc_in.items:
        item = InventoryCycleCountItem(
            **item_in.model_dump(),
            tenant_id=scope.tenant_id,
            cycle_count_id=cc.id
        )
        db.add(item)
        
    db.commit()
    db.refresh(cc)
    return cc
