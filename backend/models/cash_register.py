from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel

class CashSession(BaseModel):
    """Tracks a cashier's open shift. Only one OPEN session per user/branch at a time."""
    __tablename__ = "cash_sessions"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False, index=True)
    drawer_id = Column(String(36), ForeignKey("cash_drawers.id"), nullable=True, index=True)

    status = Column(String(20), default="OPEN", nullable=False)  # OPEN | CLOSED

    opening_balance = Column(Float, default=0.0, nullable=False)
    closing_balance_expected = Column(Float, default=0.0)
    closing_balance_actual = Column(Float, nullable=True)
    discrepancy = Column(Float, nullable=True)       # positive = over, negative = short
    discrepancy_notes = Column(Text, nullable=True)

    opened_at = Column(DateTime, nullable=False)
    closed_at = Column(DateTime, nullable=True)

    # Relations
    # Relations
    cashier = relationship("User", foreign_keys=[user_id], lazy="selectin")
    drawer = relationship("CashDrawer", foreign_keys=[drawer_id], lazy="selectin")
    ledger_entries = relationship("CashLedgerEntry", back_populates="session", lazy="selectin")


class CashLedgerEntry(BaseModel):
    """Individual cash register entry — sale receipt, return, expense, or opening float."""
    __tablename__ = "cash_ledger_entries"

    session_id = Column(String(36), ForeignKey("cash_sessions.id"), nullable=False, index=True)
    sale_id = Column(String(36), ForeignKey("sales.id"), nullable=True)   # linked sale if type=SALE

    entry_type = Column(String(20), nullable=False)   # OPENING | SALE | RETURN | EXPENSE
    payment_mode = Column(String(30), default="Cash") # Cash | Card | Bank Transfer | Mixed
    amount = Column(Float, nullable=False)             # positive = in, negative = out (expense/return)
    notes = Column(Text, nullable=True)

    created_at_utc = Column(DateTime, nullable=True)   # explicit UTC stamp (created_at from base is fine too)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)

    session = relationship("CashSession", back_populates="ledger_entries")
    sale = relationship("Sale", foreign_keys=[sale_id], lazy="selectin")

# =====================================================================
# Enterprise Cash Management Models
# =====================================================================

class CashDrawer(BaseModel):
    __tablename__ = "cash_drawers"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True) # Linked GL Account
    
    name = Column(String(100), nullable=False)
    location = Column(String(200), nullable=True)
    
    current_balance = Column(Float, default=0.0)
    status = Column(String(50), default="Active") # Active, Maintenance, Retired
    is_active = Column(Boolean, default=True)

class PettyCashAccount(BaseModel):
    __tablename__ = "petty_cash_accounts"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True) # Linked GL Account
    
    name = Column(String(100), nullable=False)
    custodian_id = Column(String(36), ForeignKey("users.id"))
    
    max_limit = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

class CashAdjustment(BaseModel):
    __tablename__ = "cash_adjustments"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False)
    drawer_id = Column(String(36), ForeignKey("cash_drawers.id"), nullable=True)
    petty_cash_id = Column(String(36), ForeignKey("petty_cash_accounts.id"), nullable=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    date = Column(DateTime, default=DateTime)
    adjustment_type = Column(String(50)) # Deposit, Withdrawal, Discrepancy
    amount = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    
    adjusted_by = Column(String(36), ForeignKey("users.id"))
    status = Column(String(50), default="Approved") # Pending, Approved, Rejected
