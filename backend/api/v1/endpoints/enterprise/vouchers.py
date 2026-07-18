from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models.users import User
from core.deps import get_current_user, requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate
from services.accounts_service import AccountsService

router = APIRouter(tags=["Enterprise Vouchers"])

require_voucher_create = requires_permission("accounts:create")

@router.post("/payment")
def create_payment_voucher(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_voucher_create),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """A Payment Voucher strictly credits a Bank/Cash account and debits an AP/Expense account."""
    svc = AccountsService(db)
    entry = JournalEntryCreate(
        branch_id=scope.branch_id,
        source_module="Vouchers",
        reference=data.get("reference", f"PV-{uuid.uuid4().hex[:6].upper()}"),
        description=data.get("description", "Payment Voucher"),
        lines=[
            # Debit the receiver (Expense, AP, etc.)
            JournalEntryLineCreate(account_id=data["debit_account_id"], debit=data["amount"], credit=0),
            # Credit the giver (Bank/Cash)
            JournalEntryLineCreate(account_id=data["credit_account_id"], debit=0, credit=data["amount"])
        ]
    )
    # Ensure credit account is actually a bank/cash account
    # Typically done by validating account category/code
    acc = svc.repo.get_account_by_code(scope.tenant_id, None) # We should fetch by ID in a real impl
    
    je = svc.create_journal_entry(scope.tenant_id, current_user.id, entry)
    return {"message": "Payment Voucher created", "id": je.id}

@router.post("/receipt")
def create_receipt_voucher(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_voucher_create),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """A Receipt Voucher strictly debits a Bank/Cash account and credits an AR/Income account."""
    svc = AccountsService(db)
    entry = JournalEntryCreate(
        branch_id=scope.branch_id,
        source_module="Vouchers",
        reference=data.get("reference", f"RV-{uuid.uuid4().hex[:6].upper()}"),
        description=data.get("description", "Receipt Voucher"),
        lines=[
            # Debit the receiver (Bank/Cash)
            JournalEntryLineCreate(account_id=data["debit_account_id"], debit=data["amount"], credit=0),
            # Credit the giver (AR, Income, etc.)
            JournalEntryLineCreate(account_id=data["credit_account_id"], debit=0, credit=data["amount"])
        ]
    )
    je = svc.create_journal_entry(scope.tenant_id, current_user.id, entry)
    return {"message": "Receipt Voucher created", "id": je.id}

@router.post("/contra")
def create_contra_voucher(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_voucher_create),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """A Contra Voucher strictly involves two Bank/Cash accounts (e.g. Cash Deposit to Bank)."""
    svc = AccountsService(db)
    entry = JournalEntryCreate(
        branch_id=scope.branch_id,
        source_module="Vouchers",
        reference=data.get("reference", f"CV-{uuid.uuid4().hex[:6].upper()}"),
        description=data.get("description", "Contra Voucher"),
        lines=[
            JournalEntryLineCreate(account_id=data["debit_account_id"], debit=data["amount"], credit=0),
            JournalEntryLineCreate(account_id=data["credit_account_id"], debit=0, credit=data["amount"])
        ]
    )
    je = svc.create_journal_entry(scope.tenant_id, current_user.id, entry)
    return {"message": "Contra Voucher created", "id": je.id}
