from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
from models.users import User
from api.v1.endpoints.auth import get_current_user
from dependencies.module_guard import require_module
from schemas.accounts import (
    AccountCreate, 
    AccountResponse, 
    JournalEntryCreate, 
    JournalEntryResponse,
    TrialBalanceResponse,
    ProfitLossResponse,
    BalanceSheetResponse,
    LedgerResponse
)
from services.accounts_service import AccountsService
from services.auto_posting_service import AutoPostingService

router = APIRouter(dependencies=[Depends(require_module("journals"))])

def require_accounts_view(current_user: User = Depends(get_current_user)):
    if "accounts.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_accounts_create(current_user: User = Depends(get_current_user)):
    if "accounts.create" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_accounts_approve(current_user: User = Depends(get_current_user)):
    if "accounts.approve" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


@router.post("/seed")
def seed_chart_of_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_create)
):
    service = AccountsService(db)
    service.seed_default_chart(current_user.tenant_id)
    return {"message": "Default Chart of Accounts seeded successfully."}

@router.get("/chart", response_model=List[AccountResponse])
def get_chart_of_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_chart_of_accounts(current_user.tenant_id)

@router.post("/chart", response_model=AccountResponse)
def create_account(
    account_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_create)
):
    service = AccountsService(db)
    return service.create_account(current_user.tenant_id, account_in)

@router.post("/journals")
def create_journal_entry(
    journal_in: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_create)
):
    service = AccountsService(db)
    # Require separate approval if strictly enforcing separation of duties
    status = "Draft" if "accounts.approve" not in current_user.permissions and current_user.role != "Super Admin" else "Approved"
    
    entry = service.create_journal_entry(current_user.tenant_id, current_user.id, journal_in, status)
    return {"message": "Journal Entry Created", "id": entry.id, "status": entry.status}

@router.get("/reports/trial-balance", response_model=TrialBalanceResponse)
def get_trial_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_trial_balance(current_user.tenant_id)

@router.get("/reports/profit-loss", response_model=ProfitLossResponse)
def get_profit_and_loss(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_profit_and_loss(current_user.tenant_id)

@router.get("/reports/balance-sheet", response_model=BalanceSheetResponse)
def get_balance_sheet(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_balance_sheet(current_user.tenant_id)

@router.get("/ledger", response_model=LedgerResponse)
def get_ledger(
    account_id: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_ledger(current_user.tenant_id, account_id, start_date, end_date)

@router.get("/journals", response_model=List[JournalEntryResponse])
def get_journal_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_journal_entries(current_user.tenant_id)
