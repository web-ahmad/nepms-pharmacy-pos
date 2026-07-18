from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from core.deps import get_db, get_current_user, requires_permission
from schemas.purchase import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, BulkDraftPORequest,
    GRNCreate, GRNResponse,
    PurchaseInvoiceCreate, PurchaseInvoiceResponse,
    SupplierPaymentCreate, SupplierPaymentResponse,
    PurchaseReturnCreate, PurchaseReturnResponse,
    SupplierLedgerResponse,
    PurchaseRequestCreate, PurchaseRequestResponse,
    PurchaseQuotationCreate, PurchaseQuotationResponse,
    PurchaseApprovalCreate, PurchaseApprovalResponse,
    PurchaseReceivingCreate, PurchaseReceivingResponse
)
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from repositories.purchase import supplier_repo, po_repo, grn_repo, invoice_repo
from services.purchase_service import PurchaseService
from models.users import User

router = APIRouter()

# --- Suppliers ---
@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    return supplier_repo.create(db, obj_in=supplier_in, tenant_id=scope.tenant_id)

@router.get("/suppliers", response_model=List[SupplierResponse])
def get_suppliers(
    region: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from models.purchase import Supplier
    query = db.query(Supplier).filter(Supplier.tenant_id == scope.tenant_id, Supplier.is_deleted == False)
    if region:
        query = query.filter(Supplier.region_name == region)
    return query.offset(skip).limit(limit).all()

@router.get("/suppliers/{id}", response_model=SupplierResponse)
def get_supplier(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    supplier = supplier_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/suppliers/{id}", response_model=SupplierResponse)
def update_supplier(
    id: str,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    supplier = supplier_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier_repo.update(db, db_obj=supplier, obj_in=supplier_in)

@router.delete("/suppliers/{id}")
def delete_supplier(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    supplier = supplier_repo.get(db, id=id, tenant_id=scope.tenant_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    from models.purchase import PurchaseOrder
    has_history = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_id == id,
        PurchaseOrder.tenant_id == scope.tenant_id
    ).first()
    
    if has_history:
        supplier.is_deleted = True
        db.commit()
        return {"message": "Supplier soft-deleted because purchase history exists."}
    else:
        db.delete(supplier)
        db.commit()
        return {"message": "Supplier permanently deleted."}

from schemas.purchase import SupplierMedicinePriceCreate, SupplierMedicinePriceResponse

@router.post("/suppliers/{id}/medicines", response_model=List[SupplierMedicinePriceResponse])
def upsert_supplier_medicines(
    id: str,
    medicines_in: List[SupplierMedicinePriceCreate],
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Get immutable ledger history (debits and credits) for a supplier.
    """
    return supplier_repo.get_ledger(db, scope.tenant_id, id)

# --- Purchase Orders ---
@router.post("/orders", response_model=PurchaseOrderResponse)
def create_po(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.create_purchase_order(db, po_in, scope.tenant_id, scope.branch_id, current_user.id)

@router.post("/orders/bulk-draft", response_model=List[PurchaseOrderResponse])
def create_bulk_draft_pos(
    payload: BulkDraftPORequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Generate draft POs for multiple low-stock medicines, grouped by supplier.
    """
    return PurchaseService.bulk_draft_po(db, payload.medicine_ids, scope.tenant_id, scope.branch_id, current_user.id)


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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Auto-calculates low-stock items and suggests order quantities based on multi-supplier matrix.
    """
    return PurchaseService.get_auto_suggest(db, scope.tenant_id, scope.branch_id, region, supplier_id, strategy)

@router.post("/generate-po", response_model=List[PurchaseOrderResponse])
def generate_auto_po(
    payload: GeneratePORequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Auto-Split Engine: Processes a batch array of items and automatically handles splitting into distinct Purchase Orders per supplier.
    """
    items_dict = [item.model_dump() for item in payload.items]
    return PurchaseService.generate_auto_split_po(db, items_dict, scope.tenant_id, scope.branch_id, current_user.id)

@router.post("/orders/{po_id}/approve", response_model=PurchaseOrderResponse)
def approve_po(
    po_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("purchase:manage"))
):
    return PurchaseService.approve_po(db, po_id, scope.tenant_id)


@router.post("/orders/{po_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_po(
    po_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.cancel_po(db, po_id, scope.tenant_id)


@router.get("/orders/{po_id}", response_model=PurchaseOrderResponse)
def get_po(
    po_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    po = po_repo.get_with_items(db, scope.tenant_id, id=po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po


@router.get("/orders", response_model=List[PurchaseOrderResponse])
def get_orders(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from models.purchase import PurchaseOrder
    return (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.tenant_id == scope.tenant_id, PurchaseOrder.is_deleted == False)
        .order_by(PurchaseOrder.created_at.desc())
        .offset(skip).limit(limit).all()
    )

# --- GRNs ---
@router.post("/grn", response_model=GRNResponse)
def create_grn(
    grn_in: GRNCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Main inventory entry point. Automatically creates batches, stock movements, and updates inventory levels.
    """
    return PurchaseService.receive_grn(db, grn_in, scope.tenant_id, scope.branch_id, current_user.id)

@router.get("/grn", response_model=List[GRNResponse])
def get_grns(
    po_id: str = None,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    from models.purchase import GRN
    query = db.query(GRN).filter(GRN.tenant_id == scope.tenant_id, GRN.is_deleted == False)
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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Creates an invoice and credits the supplier balance.
    """
    invoice = PurchaseService.add_supplier_invoice(db, invoice_in, scope.tenant_id)
    invoice.items = get_invoice_items_helper(db, invoice)
    return invoice

@router.get("/invoices/{id}", response_model=PurchaseInvoiceResponse)
def get_invoice(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from models.purchase import PurchaseInvoice
    from sqlalchemy import or_
    invoice = db.query(PurchaseInvoice).filter(
        PurchaseInvoice.tenant_id == scope.tenant_id,
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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from models.purchase import PurchaseInvoice, GRN
    query = db.query(PurchaseInvoice).filter(PurchaseInvoice.tenant_id == scope.tenant_id, PurchaseInvoice.is_deleted == False)
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
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Logs payment, debits supplier balance, and updates invoice status.
    """
    return PurchaseService.add_supplier_payment(db, payment_in, scope.tenant_id, scope.branch_id)

# --- Purchase Returns ---
from schemas.purchase import PurchaseReturnResponse, PurchaseReturnCreate
from models.purchase import PurchaseReturn, PurchaseReturnItem
from sqlalchemy.orm import joinedload

@router.post("/returns", response_model=PurchaseReturnResponse)
def create_purchase_return(
    return_in: PurchaseReturnCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.create_purchase_return(db, return_in, scope.tenant_id, scope.branch_id, current_user.id)

@router.get("/returns", response_model=List[PurchaseReturnResponse])
def get_purchase_returns(
    po_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    query = db.query(PurchaseReturn).options(
        joinedload(PurchaseReturn.items).joinedload(PurchaseReturnItem.medicine),
        joinedload(PurchaseReturn.supplier)
    ).filter(
        PurchaseReturn.tenant_id == scope.tenant_id,
        PurchaseReturn.is_deleted == False
    )
    if po_id:
        query = query.filter(PurchaseReturn.po_id == po_id)
        
    returns = query.order_by(PurchaseReturn.return_date.desc()).offset(skip).limit(limit).all()
    
    # Hydrate supplier name
    for r in returns:
        r.supplier_name = r.supplier.name if r.supplier else None
        for item in r.items:
            # We already have medicine via joinedload, but need to map it for the response model if it's dynamic
            pass
            
    return returns

# =====================================================================
# Enterprise Endpoints
# =====================================================================

@router.post("/requests", response_model=PurchaseRequestResponse)
def create_purchase_request(
    req_in: PurchaseRequestCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    result = PurchaseService.create_purchase_request(db, req_in, scope.tenant_id, scope.branch_id, current_user.id)
    return PurchaseService._enrich_request(db, result)

@router.post("/quotations", response_model=PurchaseQuotationResponse)
def create_purchase_quotation(
    quot_in: PurchaseQuotationCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return PurchaseService.create_purchase_quotation(db, quot_in, scope.tenant_id, scope.branch_id)

@router.post("/approvals", response_model=PurchaseApprovalResponse)
def add_po_approval(
    approval_in: PurchaseApprovalCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.add_po_approval(db, approval_in, scope.tenant_id, current_user.id)

@router.post("/receiving", response_model=PurchaseReceivingResponse)
def receive_enterprise_grn(
    rec_in: PurchaseReceivingCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    return PurchaseService.receive_enterprise_grn(db, rec_in, scope.tenant_id, scope.branch_id, current_user.id)



@router.get("/requests", response_model=List[PurchaseRequestResponse])
def get_purchase_requests(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return PurchaseService.get_purchase_requests(db, scope.tenant_id, scope.branch_id, skip, limit)

@router.get("/requests/{id}", response_model=PurchaseRequestResponse)
def get_purchase_request(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    req = PurchaseService.get_purchase_request(db, id, scope.tenant_id)
    if not req:
        raise HTTPException(status_code=404, detail="Purchase Request not found")
    return req

@router.get("/quotations", response_model=List[PurchaseQuotationResponse])
def get_purchase_quotations(
    request_id: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return PurchaseService.get_purchase_quotations(db, scope.tenant_id, request_id, skip, limit)

@router.get("/quotations/{id}", response_model=PurchaseQuotationResponse)
def get_purchase_quotation(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    quot = PurchaseService.get_purchase_quotation(db, id, scope.tenant_id)
    if not quot:
        raise HTTPException(status_code=404, detail="Purchase Quotation not found")
    return quot

@router.get("/approvals", response_model=List[PurchaseApprovalResponse])
def get_po_approvals(
    po_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return PurchaseService.get_po_approvals(db, po_id, scope.tenant_id)

@router.get("/receiving", response_model=List[PurchaseReceivingResponse])
def get_purchase_receivings(
    po_id: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return PurchaseService.get_purchase_receivings(db, scope.tenant_id, po_id, skip, limit)

@router.get("/receiving/{id}", response_model=PurchaseReceivingResponse)
def get_purchase_receiving(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    recv = PurchaseService.get_purchase_receiving(db, id, scope.tenant_id)
    if not recv:
        raise HTTPException(status_code=404, detail="Purchase Receiving not found")
    return recv


# =====================================================================
# Enterprise Procurement Workflow Endpoints
# =====================================================================

from schemas.purchase import (
    PurchaseApprovalMatrixCreate, PurchaseApprovalMatrixResponse,
    PurchaseTimelineResponse, PurchaseApprovalRequest
)

@router.post("/matrix", response_model=PurchaseApprovalMatrixResponse)
def create_approval_matrix(
    matrix_in: PurchaseApprovalMatrixCreate,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    token_payload: dict = Depends(requires_permission("purchase:matrix:manage"))
):
    from models.purchase import PurchaseApprovalMatrix
    db_matrix = PurchaseApprovalMatrix(
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        level=matrix_in.level,
        role_name=matrix_in.role_name,
        amount_threshold=matrix_in.amount_threshold
    )
    db.add(db_matrix)
    db.commit()
    db.refresh(db_matrix)
    return db_matrix

@router.get("/matrix", response_model=List[PurchaseApprovalMatrixResponse])
def get_approval_matrix(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    from models.purchase import PurchaseApprovalMatrix
    return db.query(PurchaseApprovalMatrix).filter(
        PurchaseApprovalMatrix.tenant_id == scope.tenant_id,
        PurchaseApprovalMatrix.is_deleted == False
    ).order_by(PurchaseApprovalMatrix.level.asc()).all()

@router.get("/requests/{id}/timeline", response_model=List[PurchaseTimelineResponse])
def get_purchase_timeline(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    from models.purchase import PurchaseTimeline
    return db.query(PurchaseTimeline).filter(
        PurchaseTimeline.tenant_id == scope.tenant_id,
        PurchaseTimeline.reference_id == id,
        PurchaseTimeline.is_deleted == False
    ).order_by(PurchaseTimeline.timestamp.asc()).all()

@router.post("/requests/{id}/approve", response_model=PurchaseRequestResponse)
def approve_purchase_request(
    id: str,
    req_in: PurchaseApprovalRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("purchase:request:approve"))
):
    # Determine role (for simplicity, using a mock role or parsing token)
    user_role = current_user.role if current_user.role else "Super Admin" # Fallback if undefined
    result = PurchaseService.approve_purchase_request(
        db=db,
        request_id=id,
        tenant_id=scope.tenant_id,
        user_id=current_user.id,
        user_role=user_role,
        status=req_in.status,
        remarks=req_in.remarks
    )
    return PurchaseService._enrich_request(db, result)

@router.post("/requests/{id}/convert", response_model=PurchaseOrderResponse)
def convert_request_to_po(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("purchase:request:approve"))
):
    return PurchaseService.convert_request_to_po(
        db=db,
        request_id=id,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        user_id=current_user.id
    )

@router.post("/quotations/{id}/convert", response_model=PurchaseOrderResponse)
def convert_quotation_to_po(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("purchase:order:create"))
):
    return PurchaseService.convert_quotation_to_po(
        db=db,
        quotation_id=id,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        user_id=current_user.id
    )

@router.get("/requests/{id}/quotations/compare", response_model=List[PurchaseQuotationResponse])
def compare_quotations(
    id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    # This acts as a specialized query or we can just reuse get_purchase_quotations
    return PurchaseService.get_purchase_quotations(db, tenant_id=scope.tenant_id, request_id=id)

