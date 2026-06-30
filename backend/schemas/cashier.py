from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OpenSessionRequest(BaseModel):
    opening_balance: float = 0.0


class CloseSessionRequest(BaseModel):
    closing_balance_actual: float
    discrepancy_notes: Optional[str] = None


class LogExpenseRequest(BaseModel):
    amount: float
    notes: str
    payment_mode: str = "Cash"


# ── Response Schemas ─────────────────────────────────────────────────────────

class LedgerEntryResponse(BaseModel):
    id: str
    entry_type: str
    payment_mode: str
    amount: float
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    sale_id: Optional[str] = None

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    """Aggregated totals for the active (or just-closed) session."""
    session_id: str
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    cashier_name: str

    opening_balance: float
    total_cash_in: float       # SALE (Cash) + OPENING
    total_card_in: float       # SALE (Card/Bank)
    total_expenses: float      # EXPENSE entries (absolute sum)
    total_returns: float       # RETURN entries (absolute sum)
    expected_drawer: float     # opening + cash_sales - expenses - cash_returns
    closing_balance_expected: float
    closing_balance_actual: Optional[float] = None
    discrepancy: Optional[float] = None
    discrepancy_notes: Optional[str] = None

    ledger_entries: List[LedgerEntryResponse] = []

    class Config:
        from_attributes = True
