from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from core.deps import get_db, get_current_user, requires_permission, get_token_payload
from schemas.sales import (
    CheckoutRequest,
    SaleResponse,
    SaleReturnRequest,
    SaleReturnResponse,
    CustomerPaymentRequest,
    CustomerPaymentResponse,
    CustomerLedgerResponse,
    SaleListResponse,
    SaleReturnCreateRequest,
    ReturnLogResponse,
    VerifyCompleteRequest,
    VoidSaleRequest
)
from services.sales_service import SalesService
from repositories.sales import sale_repo, customer_ledger_repo, sale_return_repo
from models.users import User
from models.sales import Sale
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

def map_sale_to_response(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "invoice_number": sale.invoice_number,
        "customer_id": sale.customer_id,
        "cashier_id": sale.cashier_id,
        "cashier_name": (sale.cashier.full_name or sale.cashier.username) if sale.cashier else "Unknown",
        "sale_date": sale.sale_date,
        "subtotal": sale.subtotal,
        "discount_amount": sale.discount_amount,
        "tax_amount": sale.tax_amount,
        "adjustment_amount": getattr(sale, "adjustment_amount", 0.0),
        "total_amount": sale.total_amount,
        "payment_method": sale.payment_method,
        "amount_paid": sale.amount_paid,
        "change_due": getattr(sale, "change_due", 0.0),
        "status": sale.status,
        "items": [
            {
                "id": item.id,
                "medicine_id": item.medicine_id,
                "medicine_name": item.medicine.name if item.medicine else "Unknown",
                "batch_id": item.batch_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount": item.discount,
                "total": item.total,
                "quantity_returned_so_far": item.quantity_returned_so_far
            } for item in sale.items
        ]
    }

def map_return_to_response(sale_return) -> dict:
    return {
        "id": sale_return.id,
        "return_number": sale_return.return_number,
        "sale_id": sale_return.sale_id,
        "cashier_id": sale_return.cashier_id,
        "cashier_name": sale_return.cashier.username if sale_return.cashier else "Unknown",
        "return_date": sale_return.return_date,
        "total_amount": sale_return.total_amount,
        "payment_mode": sale_return.payment_mode,
        "reason": sale_return.reason,
        "notes": sale_return.notes,
        "status": sale_return.status,
        "items": [
            {
                "id": item.id,
                "sale_item_id": item.sale_item_id,
                "medicine_id": item.medicine_id,
                "medicine_name": item.medicine.name if item.medicine else "Unknown",
                "quantity_returned": item.quantity_returned,
                "return_reason": item.return_reason,
                "stock_action": item.stock_action,
                "unit_price": item.unit_price,
                "total_refund": item.total_refund
            } for item in sale_return.items
        ]
    }

@router.post("/checkout", response_model=SaleResponse)
def checkout(
    checkout_in: CheckoutRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Main POS checkout API. Handles atomic allocation, inventory updates, loyalty points, and invoicing.
    """
    sale = SalesService.checkout(db, checkout_in, scope.tenant_id, scope.branch_id, current_user.id)
    return map_sale_to_response(sale)

@router.get("/workflow-mode")
def get_workflow_mode(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    from core.config import settings
    from services.settings_service import SettingsService
    try:
        db_settings = SettingsService(db).get_settings(scope.tenant_id)
        if db_settings and db_settings.pos_settings and db_settings.pos_settings.get("workflow_mode"):
            return {"mode": db_settings.pos_settings.get("workflow_mode")}
    except Exception:
        pass
    return {"mode": settings.POS_WORKFLOW_MODE}

@router.get("/pending-verification", response_model=List[SaleResponse])
def get_pending_verification_sales(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve sales pending cashier verification.
    """
    pending_sales = sale_repo.get_pending_verification_sales(db, scope.tenant_id, scope.branch_id)
    return [map_sale_to_response(s) for s in pending_sales]

@router.get("/pending", response_model=List[SaleResponse])
def get_pending_sales_alias(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Alias for /pending-verification. Returns all sales awaiting cashier payment collection.
    """
    pending_sales = sale_repo.get_pending_verification_sales(db, scope.tenant_id, scope.branch_id)
    return [map_sale_to_response(s) for s in pending_sales]

@router.post("/{sale_id}/verify-complete", response_model=SaleResponse)
def verify_complete_sale(
    sale_id: str,
    payload: VerifyCompleteRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Complete payment collection and verify stock for a pending verification sale.
    """
    sale = SalesService.verify_complete_sale(
        db=db,
        sale_id=sale_id,
        amount_paid=payload.amount_paid,
        payment_method=payload.payment_method,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        user_id=current_user.id
    )
    return map_sale_to_response(sale)

@router.post("/{sale_id}/void", response_model=SaleResponse)
def void_sale(
    sale_id: str,
    payload: VoidSaleRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_token_payload)
):
    """
    Void an entire sale/invoice, reverting all stock and cash entry.
    Requires 'pos:void_sale' permission, or 'Cashier' role.
    """
    permissions = token_payload.get("permissions", [])
    role = token_payload.get("role", "")
    
    if "Owner" not in role and role not in ["Super Admin", "Cashier"] and "pos:void_sale" not in permissions and "*" not in permissions:
        raise HTTPException(status_code=403, detail="Missing required permission: pos:void_sale")
        
    sale = SalesService.void_sale(
        db=db,
        sale_id=sale_id,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        user_id=current_user.id,
        void_reason=payload.void_reason,
        voided_by=payload.voided_by or current_user.username,
        webcam_image_base64=payload.webcam_image_base64,
        screenshot_base64=payload.screenshot_base64
    )
    return map_sale_to_response(sale)

@router.get("/held", response_model=List[SaleResponse])
def get_held_sales(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Retrieve sales that were parked/held.
    """
    held_sales = sale_repo.get_held_sales(db, scope.tenant_id, scope.branch_id)
    return [map_sale_to_response(s) for s in held_sales]

@router.post("/returns", response_model=SaleReturnResponse)
def process_return(
    return_in: SaleReturnRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("pos:approve_refund"))
):
    """
    Legacy return endpoint. Restores batch quantities, triggers Stock Movement, and credits customer ledger.
    """
    sale_return = SalesService.process_return(db, return_in, scope.tenant_id, scope.branch_id, current_user.id)
    return map_return_to_response(sale_return)

@router.get("/customers/{customer_id}/ledger", response_model=List[CustomerLedgerResponse])
def get_customer_ledger(
    customer_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return customer_ledger_repo.get_ledger(db, scope.tenant_id, customer_id)

# ---------------------------------------------------------------------------
# NEW SALES HISTORY & SALE RETURN ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("", response_model=SaleListResponse)
def get_sales_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    invoice_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    cashier_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a paginated list of sales with advanced filters.
    """
    sales, total = sale_repo.get_sales_history(
        db=db,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        start_date=start_date,
        end_date=end_date,
        invoice_id=invoice_id,
        customer_id=customer_id,
        cashier_id=cashier_id,
        skip=skip,
        limit=limit
    )
    return {
        "total": total,
        "items": [map_sale_to_response(sale) for sale in sales]
    }

@router.get("/returns/logs", response_model=List[ReturnLogResponse])
def get_return_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    cashier_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a log timeline of all processed returns.
    """
    returns, total = sale_return_repo.get_return_logs(
        db=db,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        start_date=start_date,
        end_date=end_date,
        cashier_id=cashier_id,
        skip=skip,
        limit=limit
    )

    res_items = []
    for r in returns:
        invoice_num = r.sale.invoice_number if r.sale else "Unknown"
        cashier_name = r.cashier.username if r.cashier else "System"
        items_summary = f"{sum(item.quantity_returned for item in r.items)} items returned"
        res_items.append({
            "id": r.id,
            "return_number": r.return_number,
            "invoice_number": invoice_num,
            "cashier_name": cashier_name,
            "return_date": r.return_date,
            "total_amount": r.total_amount,
            "payment_mode": r.payment_mode,
            "items_summary": items_summary,
            "notes": r.notes,
            "items": [
                {
                    "id": item.id,
                    "medicine_id": item.medicine_id,
                    "medicine_name": item.medicine.name if item.medicine else "Unknown",
                    "quantity_returned": item.quantity_returned,
                    "unit_price": item.unit_price,
                    "total_refund": item.total_refund,
                    "return_reason": item.return_reason,
                    "stock_action": item.stock_action
                } for item in r.items
            ]
        })
    return res_items

@router.delete("/{sale_id}")
def delete_held_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a parked/held sale so it can be resumed.
    """
    sale = sale_repo.get(db, id=sale_id, tenant_id=scope.tenant_id)
    if not sale or (scope.branch_id and sale.branch_id != scope.branch_id):
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.status not in ("Held", "Pending Verification"):
        raise HTTPException(status_code=400, detail="Only held or pending sales can be deleted")
    
    sale.is_deleted = True
    db.commit()
    return {"status": "success"}

@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale_detail(
    sale_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full details of a specific sale.
    """
    import uuid
    from models.sales import Sale
    
    sale = None
    
    try:
        # Validate if sale_id is a valid UUID
        uuid.UUID(sale_id)
        sale = sale_repo.get(db, id=sale_id, tenant_id=scope.tenant_id)
    except ValueError:
        pass
        
    # Fallback to search by invoice_number in case sale_id is an invoice string (e.g. from view_id URL param)
    if not sale:
        sale = db.query(Sale).filter(
            Sale.invoice_number == sale_id,
            Sale.tenant_id == scope.tenant_id,
            Sale.is_deleted == False
        ).first()

    if not sale or (scope.branch_id and sale.branch_id != scope.branch_id):
        raise HTTPException(status_code=404, detail=f"Sale not found for ID: {sale_id}")
    return map_sale_to_response(sale)

@router.post("/{sale_id}/return", response_model=SaleReturnResponse)
def process_item_wise_return(
    sale_id: str,
    payload: SaleReturnCreateRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(requires_permission("pos:approve_refund"))
):
    """
    Process an item-wise partial or full return for a sale.
    """
    sale_return = SalesService.process_item_wise_return(
        db=db,
        sale_id=sale_id,
        payload=payload,
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        user_id=current_user.id
    )
    return map_return_to_response(sale_return)

# ---------------------------------------------------------------------------
# ENTERPRISE SALES & POS EXTENDED ENDPOINTS
# ---------------------------------------------------------------------------

@router.post("/hold", response_model=SaleResponse)
def hold_sale(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Explicit endpoint to park/hold a sale.
    """
    payload.hold_sale = True
    sale = SalesService.checkout(db, payload, scope.tenant_id, scope.branch_id, current_user.id)
    return map_sale_to_response(sale)

@router.post("/{sale_id}/resume", response_model=SaleResponse)
def resume_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """
    Resume a held sale.
    """
    sale = sale_repo.get(db, id=sale_id, tenant_id=scope.tenant_id)
    if not sale or (scope.branch_id and sale.branch_id != scope.branch_id):
        raise HTTPException(status_code=404, detail="Sale not found")
    return map_sale_to_response(sale)

@router.post("/split-payment")
def split_payment_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for checkout with split payment.
    """
    payload.payment_method = "Split"
    sale = SalesService.checkout(db, payload, scope.tenant_id, scope.branch_id, current_user.id)
    return map_sale_to_response(sale)

@router.post("/loyalty/redeem")
def redeem_loyalty(customer_id: str, points: int):
    return {"status": "success", "redeemed": points}

@router.post("/coupons/apply")
def apply_coupon(code: str):
    return {"status": "success", "code": code}

@router.post("/promotions/apply")
def apply_promotion(promo_id: str):
    return {"status": "success", "promo_id": promo_id}

@router.post("/credit")
def process_credit_sale(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    """
    Explicit endpoint for Credit sales.
    """
    payload.payment_method = "Credit"
    sale = SalesService.checkout(db, payload, scope.tenant_id, scope.branch_id, current_user.id)
    return map_sale_to_response(sale)

@router.post("/shift/open")
def open_shift(payload: dict):
    return {"status": "success", "message": "Shift opened"}

@router.post("/shift/close")
def close_shift(payload: dict):
    return {"status": "success", "message": "Shift closed"}

@router.post("/drawer/open")
def open_drawer():
    return {"status": "success", "message": "Drawer opened"}

@router.post("/drawer/close")
def close_drawer():
    return {"status": "success", "message": "Drawer closed"}
