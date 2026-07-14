from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from core.deps import get_db, get_current_user, get_tenant_context, TenantContext
from models.users import User
from schemas.cashier import (
    OpenSessionRequest, CloseSessionRequest, LogExpenseRequest,
    SessionSummary, LedgerEntryResponse
)
from services.cashier_service import CashierService

router = APIRouter()


@router.post("/session/open", summary="Open a cashier shift / cash register session")
def open_session(
    body: OpenSessionRequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Start a new shift for the current user.
    Requires an opening cash float (can be 0).
    Returns 409 if a session is already open.
    """
    session = CashierService.open_session(
        db=db,
        user_id=current_user.id,
        branch_id=tenant.branch_id,
        tenant_id=tenant.tenant_id,
        opening_balance=body.opening_balance
    )
    return {
        "session_id": session.id,
        "status": session.status,
        "opening_balance": session.opening_balance,
        "opened_at": session.opened_at,
        "cashier": current_user.username
    }


@router.post("/session/close", summary="Close / end the current cashier shift")
def close_session(
    body: CloseSessionRequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Close the active session for the current user.
    Calculates expected vs actual cash and records discrepancy.
    """
    session = CashierService.close_session(
        db=db,
        user_id=current_user.id,
        branch_id=tenant.branch_id,
        closing_balance_actual=body.closing_balance_actual,
        discrepancy_notes=body.discrepancy_notes
    )
    discrepancy = session.discrepancy or 0.0
    label = "Balanced"
    if discrepancy > 0:
        label = f"OVER by Rs {discrepancy:.2f}"
    elif discrepancy < 0:
        label = f"SHORT by Rs {abs(discrepancy):.2f}"

    transactions = []
    for e in session.ledger_entries:
        transactions.append({
            "id": e.id,
            "created_at": getattr(e, "created_at_utc", None) or getattr(e, "created_at", None),
            "invoice_number": e.sale.invoice_number if getattr(e, "sale", None) else None,
            "type": e.entry_type,
            "amount": e.amount,
            "notes": e.notes,
            "payment_mode": e.payment_mode,
            "status": e.sale.status if getattr(e, "sale", None) else None
        })

    return {
        "session_id": session.id,
        "status": session.status,
        "opening_balance": session.opening_balance,
        "closing_balance_expected": session.closing_balance_expected,
        "closing_balance_actual": session.closing_balance_actual,
        "discrepancy": session.discrepancy,
        "discrepancy_label": label,
        "discrepancy_notes": session.discrepancy_notes,
        "opened_at": session.opened_at,
        "closed_at": session.closed_at,
        "cashier": current_user.username,
        "transactions": transactions
    }


@router.get("/session/current", response_model=SessionSummary, summary="Live session totals for the active shift")
def get_current_session(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real-time aggregated totals for the cashier's active session:
    cash in, card in, expenses, expected drawer balance, and full ledger rows.
    """
    summary = CashierService.get_session_summary(
        db=db,
        user_id=current_user.id,
        branch_id=tenant.branch_id
    )
    return summary


@router.post("/expense", response_model=LedgerEntryResponse, summary="Log a petty cash counter expense")
def log_expense(
    body: LogExpenseRequest,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Deduct an expense from the current session's expected cash drawer.
    E.g. stationery, courier, packaging etc.
    """
    entry = CashierService.log_expense(
        db=db,
        user_id=current_user.id,
        branch_id=tenant.branch_id,
        tenant_id=tenant.tenant_id,
        amount=body.amount,
        notes=body.notes,
        payment_mode=body.payment_mode
    )
    return {
        "id": entry.id,
        "entry_type": entry.entry_type,
        "payment_mode": entry.payment_mode,
        "amount": entry.amount,
        "notes": entry.notes,
        "created_at": entry.created_at,
        "sale_id": entry.sale_id
    }


@router.get("/session/check", summary="Check if the current user has an open session")
def check_session(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    current_user: User = Depends(get_current_user)
):
    """
    Lightweight check — returns has_open_session bool + session_id if open.
    Used by the frontend Shift Guard UI.
    """
    session = CashierService.get_open_session(db, current_user.id, tenant.branch_id)
    if session:
        return {
            "has_open_session": True,
            "session_id": session.id,
            "opening_balance": session.opening_balance,
            "opened_at": session.opened_at
        }
    return {"has_open_session": False, "session_id": None}
