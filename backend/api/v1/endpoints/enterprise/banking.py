from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid

from database import get_db
from models.users import User
from models.accounts import BankAccount, BankTransaction, BankTransfer, BankReconciliation, Account
from core.deps import get_current_user, requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(tags=["Enterprise Banking"])

require_banking_view = requires_permission("accounts:view")
require_banking_manage = requires_permission("accounts:manage_bank")

@router.get("/banks")
def list_bank_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_banking_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Retrieve all explicit bank accounts linked to GL accounts."""
    banks = db.query(BankAccount).join(Account, Account.id == BankAccount.account_id)\
            .filter(Account.tenant_id == scope.tenant_id).all()
    return banks

@router.post("/banks")
def create_bank_account(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_banking_manage),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Register a new bank account and optionally link or create a GL account."""
    gl_account_id = data.get("account_id")
    if not gl_account_id:
        from schemas.accounts import AccountCreate
        from models.accounts import AccountCategory
        from services.accounts_service import AccountsService
        # Auto-create GL account
        svc = AccountsService(db)
        code = f"101-{uuid.uuid4().hex[:4].upper()}"
        gl_acc = svc.create_account(scope.tenant_id, AccountCreate(
            code=code,
            name=f"Bank - {data.get('bank_name')} ({data.get('account_number')})",
            category=AccountCategory.ASSET
        ))
        gl_account_id = gl_acc.id

    bank = BankAccount(
        id=str(uuid.uuid4()),
        branch_id=scope.branch_id,
        account_id=gl_account_id,
        bank_name=data.get("bank_name"),
        account_number=data.get("account_number"),
        account_name=data.get("account_name"),
        branch_name=data.get("branch_name"),
        routing_number=data.get("routing_number")
    )
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank

@router.post("/transfers")
def record_bank_transfer(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_banking_manage),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Transfer funds between two bank accounts (Contra Entry)."""
    from_bank = db.query(BankAccount).filter(BankAccount.id == data["from_bank_id"]).first()
    to_bank = db.query(BankAccount).filter(BankAccount.id == data["to_bank_id"]).first()
    amount = data["amount"]

    if not from_bank or not to_bank:
        raise HTTPException(404, "Bank account not found.")

    from services.auto_posting_service import AutoPostingService
    from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate
    from services.accounts_service import AccountsService
    
    svc = AccountsService(db)
    
    entry = JournalEntryCreate(
        branch_id=scope.branch_id,
        source_module="Banking",
        reference=data.get("reference", f"TRF-{uuid.uuid4().hex[:6].upper()}"),
        description=data.get("notes", "Bank Transfer"),
        lines=[
            JournalEntryLineCreate(account_id=from_bank.account_id, debit=0, credit=amount),
            JournalEntryLineCreate(account_id=to_bank.account_id, debit=amount, credit=0)
        ]
    )
    je = svc.create_journal_entry(scope.tenant_id, current_user.id, entry)

    transfer = BankTransfer(
        id=str(uuid.uuid4()),
        from_bank_id=from_bank.id,
        to_bank_id=to_bank.id,
        journal_entry_id=je.id,
        amount=amount,
        reference=data.get("reference"),
        notes=data.get("notes")
    )
    db.add(transfer)
    db.commit()
    return transfer

@router.post("/reconcile")
def reconcile_bank_statement(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_banking_manage),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Reconcile bank account balance with physical statement."""
    bank_id = data["bank_account_id"]
    statement_balance = data["statement_balance"]
    statement_date = data["statement_date"]

    bank = db.query(BankAccount).filter(BankAccount.id == bank_id).first()
    if not bank:
         raise HTTPException(404, "Bank account not found.")

    from services.accounts_service import AccountsService
    svc = AccountsService(db)
    td, tc = svc.repo.get_account_balance(bank.account_id)
    sys_bal = td - tc # Normal Asset Balance

    difference = statement_balance - sys_bal

    recon = BankReconciliation(
        id=str(uuid.uuid4()),
        bank_account_id=bank_id,
        reconciled_by=current_user.id,
        statement_date=statement_date,
        statement_balance=statement_balance,
        system_balance=sys_bal,
        difference=difference,
        notes=data.get("notes", "")
    )
    db.add(recon)
    db.commit()
    db.refresh(recon)
    return recon
