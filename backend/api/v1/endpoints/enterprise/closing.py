from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import uuid

from database import get_db
from models.users import User
from models.accounts import FinancialClosing, JournalEntry, JournalEntryLine, Account, AccountCategory
from core.deps import get_current_user, requires_permission
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(tags=["Enterprise Closing"])

require_closing_manage = requires_permission("accounts:closing")

@router.post("/day")
def day_closing(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_closing_manage),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Perform a Day Close to lock down entries for that date."""
    target_date = data["date"] # format YYYY-MM-DD
    target_date_obj = datetime.strptime(target_date, "%Y-%m-%d").date()
    
    # Ensure not already closed
    existing = db.query(FinancialClosing).filter(
        FinancialClosing.branch_id == scope.branch_id,
        FinancialClosing.closing_type == "Daily",
        FinancialClosing.start_date == target_date_obj
    ).first()
    if existing:
        raise HTTPException(400, "Date is already closed.")
        
    # Calculate daily totals
    revenue = db.query(func.sum(JournalEntryLine.credit - JournalEntryLine.debit)).join(JournalEntry).join(Account).filter(
        JournalEntry.tenant_id == scope.tenant_id,
        JournalEntry.branch_id == scope.branch_id,
        Account.category == AccountCategory.REVENUE,
        func.date(JournalEntry.date) == target_date_obj
    ).scalar() or 0.0
    
    expense = db.query(func.sum(JournalEntryLine.debit - JournalEntryLine.credit)).join(JournalEntry).join(Account).filter(
        JournalEntry.tenant_id == scope.tenant_id,
        JournalEntry.branch_id == scope.branch_id,
        Account.category == AccountCategory.EXPENSE,
        func.date(JournalEntry.date) == target_date_obj
    ).scalar() or 0.0

    closing = FinancialClosing(
        id=str(uuid.uuid4()),
        branch_id=scope.branch_id,
        closing_type="Daily",
        start_date=target_date_obj,
        end_date=target_date_obj,
        total_revenue=revenue,
        total_expense=expense,
        net_profit=revenue - expense,
        closed_by=current_user.id,
        status="Completed",
        notes=data.get("notes")
    )
    db.add(closing)
    db.commit()
    db.refresh(closing)
    return closing

@router.get("/status/{date_str}")
def get_closing_status(
    date_str: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_closing_manage),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    target_date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    closing = db.query(FinancialClosing).filter(
        FinancialClosing.branch_id == scope.branch_id,
        FinancialClosing.closing_type == "Daily",
        FinancialClosing.start_date == target_date_obj
    ).first()
    
    if closing:
        return {"is_closed": True, "closing_id": closing.id, "net_profit": closing.net_profit}
    return {"is_closed": False}
