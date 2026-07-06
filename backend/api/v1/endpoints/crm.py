from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.crm import (
    CustomerResponse, CustomerCreate, CustomerUpdate, 
    CustomerLedgerResponse, CustomerPaymentCreate, 
    CustomerPaymentResponse, CustomerLoyaltyRedeemRequest,
    LoyaltyHistoryResponse, CustomerStatusUpdate
)
from schemas.sales import SaleResponse
from services.crm_service import CRMService
from core.deps import get_current_user
from models.users import User
from dependencies.module_guard import require_module

router = APIRouter(dependencies=[Depends(require_module("customers"))])

@router.get("/customers", response_model=List[CustomerResponse])
def get_customers(
    search: str = None, 
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.get_customers(search, skip, limit)

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.get_customer(customer_id)

@router.post("/customers", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.create_customer(customer, current_user.tenant_id)

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    customer: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.update_customer(customer_id, customer)

@router.patch("/customers/{customer_id}/status", response_model=CustomerResponse)
def update_customer_status(
    customer_id: str,
    status_update: CustomerStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    customer = service.get_customer(customer_id)
    if status_update.status.lower() == 'active':
        customer.is_active = True
    else:
        customer.is_active = False
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/customers/{customer_id}/ledger", response_model=List[CustomerLedgerResponse])
def get_customer_ledger(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.get_ledger(customer_id)

@router.get("/customers/{customer_id}/purchases", response_model=List[SaleResponse])
def get_customer_purchases(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.get_purchases(customer_id)

@router.get("/customers/{customer_id}/loyalty", response_model=List[LoyaltyHistoryResponse])
def get_customer_loyalty(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.get_loyalty_history(customer_id)

@router.post("/customers/payments", response_model=CustomerPaymentResponse)
def record_payment_global(
    payment: CustomerPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fallback endpoint if customer_id is inside payment request or ignored
    raise HTTPException(status_code=400, detail="Use /customers/{customer_id}/payments instead")

@router.post("/customers/{customer_id}/payments", response_model=CustomerPaymentResponse)
def record_customer_payment(
    customer_id: str,
    payment: CustomerPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    # Get branch_id from user's current session or first branch (simplified for now)
    branch_id = current_user.branches[0].branch_id if current_user.branches else None
    return service.record_payment(customer_id, payment, branch_id)

@router.post("/customers/{customer_id}/redeem")
def redeem_points(
    customer_id: str,
    request: CustomerLoyaltyRedeemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = CRMService(db)
    return service.redeem_loyalty_points(customer_id, request)
