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
    LedgerResponse,
    DashboardStatsResponse
)
from services.accounts_service import AccountsService
from services.auto_posting_service import AutoPostingService

router = APIRouter(dependencies=[Depends(require_module("journals"))])

def require_accounts_view(current_user: User = Depends(get_current_user)):
    if current_user.is_super_admin or (current_user.role and current_user.role.name in ["Super Admin", "Admin"]):
        return current_user
    if "accounts.view" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_accounts_create(current_user: User = Depends(get_current_user)):
    if current_user.is_super_admin or (current_user.role and current_user.role.name in ["Super Admin", "Admin"]):
        return current_user
    if "accounts.create" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_accounts_approve(current_user: User = Depends(get_current_user)):
    if current_user.is_super_admin or (current_user.role and current_user.role.name in ["Super Admin", "Admin"]):
        return current_user
    if "accounts.approve" not in current_user.permissions:
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

@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_view)
):
    service = AccountsService(db)
    return service.get_dashboard_stats(current_user.tenant_id)


@router.post("/force-rebuild")
def force_rebuild_accounting(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accounts_create)
):
    """
    Nuclear rebuild:
    1. Seed COA if missing.
    2. Migrate ALL unsynced Sales, Expenses, Payroll into Journal Entries.
    3. Hard-recalculate current_balance on EVERY account from scratch (sum of journal lines).
    """
    from sqlalchemy import func
    from models.accounts import Account, JournalEntry, JournalEntryLine, AccountCategory
    from models.sales import Sale
    from models.cash_register import CashLedgerEntry
    from models.hr import PayrollRun
    import time

    tenant_id = current_user.tenant_id
    user_id = current_user.id

    # ── Step 1: Ensure default COA exists ───────────────────────────────────
    service = AccountsService(db)
    service.seed_default_chart(tenant_id)
    db.flush()

    auto_post = AutoPostingService(db)
    synced = {"sales": 0, "expenses": 0, "payroll": 0, "errors": []}

    # ── Step 2a: Migrate unsynced Sales ─────────────────────────────────────
    sales = db.query(Sale).filter(
        Sale.tenant_id == tenant_id,
        Sale.journal_entry_id == None,
        Sale.status.in_(["Completed", "Partially Paid"])
    ).all()

    for sale in sales:
        try:
            je = None
            if sale.payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                if sale.amount_paid >= sale.total_amount:
                    je = auto_post.post_cash_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount)
                else:
                    je = auto_post.post_credit_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount)
                    if (sale.amount_paid or 0) > 0:
                        auto_post.post_customer_payment(tenant_id, user_id, f"PAY-{sale.invoice_number}", sale.amount_paid)
            else:
                je = auto_post.post_cash_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount)
            if je:
                sale.journal_entry_id = je.id
                synced["sales"] += 1
        except Exception as e:
            synced["errors"].append(f"Sale {sale.invoice_number}: {e}")

    # ── Step 2b: Migrate unsynced Expenses ──────────────────────────────────
    expenses = db.query(CashLedgerEntry).filter(
        CashLedgerEntry.entry_type == "EXPENSE",
        CashLedgerEntry.journal_entry_id == None
    ).all()

    for exp in expenses:
        try:
            # Only process if it belongs to this tenant (via session)
            ref = f"EXP-{exp.id[-8:]}"
            je = auto_post.post_expense(
                tenant_id, user_id, ref,
                abs(exp.amount or 0),
                description=exp.notes or "Auto Post: Expense"
            )
            if je:
                exp.journal_entry_id = je.id
                synced["expenses"] += 1
        except Exception as e:
            synced["errors"].append(f"Expense {exp.id}: {e}")

    # ── Step 2c: Migrate unsynced Payroll ───────────────────────────────────
    payrolls = db.query(PayrollRun).filter(
        PayrollRun.tenant_id == tenant_id,
        PayrollRun.journal_entry_id == None,
        PayrollRun.status == "Paid"
    ).all()

    for run in payrolls:
        try:
            if (run.total_net or 0) > 0:
                je = auto_post.post_payroll(
                    tenant_id, user_id,
                    f"PAYROLL-{run.month}-{run.year}",
                    run.total_net,
                    description=f"Auto Post: Payroll {run.month}/{run.year}"
                )
                if je:
                    run.journal_entry_id = je.id
                    synced["payroll"] += 1
        except Exception as e:
            synced["errors"].append(f"Payroll {run.id}: {e}")

    db.flush()

    # ── Step 3: Hard-recalculate balances from scratch ──────────────────────
    # Reset all balances to zero first
    accounts = db.query(Account).filter(Account.tenant_id == tenant_id).all()
    for acc in accounts:
        acc.current_balance = 0.0
    db.flush()

    # Aggregate each account's balance from journal lines (Approved entries only)
    rows = (
        db.query(
            JournalEntryLine.account_id,
            func.sum(JournalEntryLine.debit).label("total_debit"),
            func.sum(JournalEntryLine.credit).label("total_credit"),
        )
        .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
        .filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved")
        .group_by(JournalEntryLine.account_id)
        .all()
    )

    account_map = {acc.id: acc for acc in accounts}
    recalculated = 0
    for row in rows:
        acc = account_map.get(row.account_id)
        if not acc:
            continue
        td = row.total_debit or 0.0
        tc = row.total_credit or 0.0
        if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
            acc.current_balance = round(td - tc, 4)
        else:  # LIABILITY, EQUITY, REVENUE
            acc.current_balance = round(tc - td, 4)
        recalculated += 1

    db.commit()

    return {
        "message": "Force rebuild complete.",
        "synced": synced,
        "accounts_recalculated": recalculated,
    }

