from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from core.deps import get_db, get_current_user, get_tenant_context, TenantContext, requires_permission
from schemas.purchase import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, BulkDraftPORequest,
    GRNCreate, GRNResponse,
    PurchaseInvoiceCreate, PurchaseInvoiceResponse,
    SupplierPaymentCreate, SupplierPaymentResponse,
    PurchaseReturnCreate, PurchaseReturnResponse,
    SupplierLedgerResponse
)
from repositories.purchase import supplier_repo, po_repo, grn_repo, invoice_repo
from services.purchase_service import PurchaseService
from models.users import User

router = APIRouter()

# --- Suppliers ---
@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    return supplier_repo.create(db, obj_in=supplier_in, tenant_id=tenant.tenant_id)

@router.get("/suppliers", response_model=List[SupplierResponse])
def get_suppliers(
    region: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import Supplier
    query = db.query(Supplier).filter(Supplier.tenant_id == tenant.tenant_id, Supplier.is_deleted == False)
    if region:
        query = query.filter(Supplier.region_name == region)
    return query.offset(skip).limit(limit).all()

@router.get("/suppliers/{id}", response_model=SupplierResponse)
def get_supplier(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    supplier = supplier_repo.get(db, id=id, tenant_id=tenant.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/suppliers/{id}", response_model=SupplierResponse)
def update_supplier(
    id: str,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    supplier = supplier_repo.get(db, id=id, tenant_id=tenant.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier_repo.update(db, db_obj=supplier, obj_in=supplier_in)

@router.delete("/suppliers/{id}")
def delete_supplier(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    supplier = supplier_repo.get(db, id=id, tenant_id=tenant.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Soft delete
    supplier.is_deleted = True
    db.commit()
    return {"message": "Supplier deleted successfully"}

from schemas.purchase import SupplierMedicinePriceCreate, SupplierMedicinePriceResponse

@router.post("/suppliers/{id}/medicines", response_model=List[SupplierMedicinePriceResponse])
def upsert_supplier_medicines(
    id: str,
    medicines_in: List[SupplierMedicinePriceCreate],
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import SupplierMedicinePrice
    db.query(SupplierMedicinePrice).filter(SupplierMedicinePrice.supplier_id == id).delete()
    
    new_mappings = []
    for item in medicines_in:
        mapping = SupplierMedicinePrice(
            supplier_id=id,
            medicine_id=item.medicine_id,
            trade_price=item.trade_price,
            exclusive_discount_percentage=item.exclusive_discount_percentage,
            bonus_scheme_threshold=item.bonus_scheme_threshold,
            delivery_lead_time_days=item.delivery_lead_time_days
        )
        db.add(mapping)
        new_mappings.append(mapping)
        
    db.commit()
    for m in new_mappings:
        db.refresh(m)
    return new_mappings

@router.get("/suppliers/{id}/medicines", response_model=List[SupplierMedicinePriceResponse])
def get_supplier_medicines(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import SupplierMedicinePrice
    from models.inventory import Medicine
    
    results = db.query(
        SupplierMedicinePrice, 
        Medicine.name.label("medicine_name")
    ).join(
        Medicine, SupplierMedicinePrice.medicine_id == Medicine.id
    ).filter(
        SupplierMedicinePrice.supplier_id == id
    ).all()
    
    response = []
    for mapping, medicine_name in results:
        # Pydantic will pick up from_attributes, but we need to inject medicine_name
        # Since it's an object, we can construct a dict or just set it
        # Actually, using a dict is safer
        mapping_dict = {
            column.name: getattr(mapping, column.name)
            for column in mapping.__table__.columns
        }
        mapping_dict["medicine_name"] = medicine_name
        response.append(mapping_dict)
        
    return response

@router.get("/suppliers/{id}/ledger", response_model=List[SupplierLedgerResponse])
def get_supplier_ledger(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    """
    Get immutable ledger history (debits and credits) for a supplier.
    """
    return supplier_repo.get_ledger(db, tenant.tenant_id, id)

# --- Purchase Orders ---
@router.post("/orders", response_model=PurchaseOrderResponse)
def create_po(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.create_purchase_order(db, po_in, tenant.tenant_id, tenant.branch_id, current_user.id)

@router.post("/orders/bulk-draft", response_model=List[PurchaseOrderResponse])
def create_bulk_draft_pos(
    payload: BulkDraftPORequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Generate draft POs for multiple low-stock medicines, grouped by supplier.
    """
    return PurchaseService.bulk_draft_po(db, payload.medicine_ids, tenant.tenant_id, tenant.branch_id, current_user.id)


from pydantic import BaseModel

class GeneratePOItem(BaseModel):
    medicine_id: str
    supplier_id: str
    quantity: int
    unit_price: float

class GeneratePORequest(BaseModel):
    items: List[GeneratePOItem]

@router.get("/auto-suggest")
def auto_suggest_purchases(
    region: Optional[str] = Query(None, alias="region"),
    supplier_id: Optional[str] = None,
    strategy: Optional[str] = Query("low_stock", alias="strategy"),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    """
    Auto-calculates low-stock items and suggests order quantities based on multi-supplier matrix.
    """
    return PurchaseService.get_auto_suggest(db, tenant.tenant_id, tenant.branch_id, region, supplier_id, strategy)

@router.post("/generate-po", response_model=List[PurchaseOrderResponse])
def generate_auto_po(
    payload: GeneratePORequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Auto-Split Engine: Processes a batch array of items and automatically handles splitting into distinct Purchase Orders per supplier.
    """
    items_dict = [item.model_dump() for item in payload.items]
    return PurchaseService.generate_auto_split_po(db, items_dict, tenant.tenant_id, tenant.branch_id, current_user.id)

@router.post("/orders/{po_id}/approve", response_model=PurchaseOrderResponse)
def approve_po(
    po_id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    return PurchaseService.approve_po(db, po_id, tenant.tenant_id)


@router.post("/orders/{po_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_po(
    po_id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.cancel_po(db, po_id, tenant.tenant_id)


@router.get("/orders/{po_id}", response_model=PurchaseOrderResponse)
def get_po(
    po_id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    po = po_repo.get_with_items(db, tenant.tenant_id, id=po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po


@router.get("/orders", response_model=List[PurchaseOrderResponse])
def get_orders(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import PurchaseOrder
    return (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.tenant_id == tenant.tenant_id, PurchaseOrder.is_deleted == False)
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip).limit(limit).all()
    )

# --- GRNs ---
@router.post("/grn", response_model=GRNResponse)
def create_grn(
    grn_in: GRNCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Main inventory entry point. Automatically creates batches, stock movements, and updates inventory levels.
    """
    return PurchaseService.receive_grn(db, grn_in, tenant.tenant_id, tenant.branch_id, current_user.id)

@router.get("/grn", response_model=List[GRNResponse])
def get_grns(
    po_id: str = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    from models.purchase import GRN
    query = db.query(GRN).filter(GRN.tenant_id == tenant.tenant_id, GRN.is_deleted == False)
    if po_id:
        query = query.filter(GRN.po_id == po_id)
    return query.all()

# --- Invoices & Payments ---
def get_invoice_items_helper(db: Session, invoice) -> List[dict]:
    from models.inventory import StockMovement
    if not invoice or not invoice.grn_id:
        return []
    
    movements = db.query(StockMovement).filter(
        StockMovement.reference_id == invoice.grn_id,
        StockMovement.movement_type == "PURCHASE_RECEIPT",
        StockMovement.tenant_id == invoice.tenant_id
    ).all()
    
    items = []
    for m in movements:
        items.append({
            "medicine_id": m.medicine_id,
            "medicine_name": m.medicine.name if m.medicine else "Unknown",
            "batch_number": m.batch.batch_number if m.batch else "Unknown",
            "quantity": abs(m.quantity_change),
            "unit_price": m.batch.purchase_price if m.batch else 0.0,
            "total_price": abs(m.quantity_change) * (m.batch.purchase_price if m.batch else 0.0)
        })
    return items

@router.post("/invoices", response_model=PurchaseInvoiceResponse)
def create_invoice(
    invoice_in: PurchaseInvoiceCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    """
    Creates an invoice and credits the supplier balance.
    """
    invoice = PurchaseService.add_supplier_invoice(db, invoice_in, tenant.tenant_id)
    invoice.items = get_invoice_items_helper(db, invoice)
    return invoice

@router.get("/invoices/{id}", response_model=PurchaseInvoiceResponse)
def get_invoice(
    id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import PurchaseInvoice
    from sqlalchemy import or_
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.tenant_id == tenant.tenant_id,
        PurchaseInvoice.is_deleted == False
    ).filter(
        or_(PurchaseInvoice.id == id, PurchaseInvoice.invoice_number == id)
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.items = get_invoice_items_helper(db, invoice)
    return invoice

@router.get("/invoices", response_model=List[PurchaseInvoiceResponse])
def get_invoices(
    po_id: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    from models.purchase import PurchaseInvoice, GRN
    query = db.query(PurchaseInvoice).filter(PurchaseInvoice.tenant_id == tenant.tenant_id, PurchaseInvoice.is_deleted == False)
    if po_id:
        query = query.filter(PurchaseInvoice.grn_id.in_(
            db.query(GRN.id).filter(GRN.po_id == po_id)
        ))
    invoices = query.offset(skip).limit(limit).all()
    for invoice in invoices:
        invoice.items = get_invoice_items_helper(db, invoice)
    return invoices

@router.post("/payments", response_model=SupplierPaymentResponse)
def create_payment(
    payment_in: SupplierPaymentCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    """
    Logs payment, debits supplier balance, and updates invoice status.
    """
    return PurchaseService.add_supplier_payment(db, payment_in, tenant.tenant_id, tenant.branch_id)
