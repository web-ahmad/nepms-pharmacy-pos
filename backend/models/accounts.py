from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Enum, text, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from .base import BaseModel

class AccountCategory(str, enum.Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    EQUITY = "Equity"
    REVENUE = "Revenue"
    EXPENSE = "Expense"

class Account(BaseModel):
    __tablename__ = "accounts"
    
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True, index=True) # None means global
    
    code = Column(String, index=True)
    name = Column(String)
    category = Column(Enum(AccountCategory))
    
    # E.g., COGS, Inventory, Bank, Cash, Tax, Discount, Receivable, Payable
    account_type = Column(String(50), nullable=True, index=True)
    
    # Unlimited hierarchy
    parent_id = Column(String, ForeignKey("accounts.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False) # True if it's a default account that can't be deleted
    current_balance = Column(Float, default=0.0)
    
    # Relationships
    parent = relationship("Account", remote_side="[Account.id]", backref="sub_accounts")
    journal_lines = relationship("JournalEntryLine", back_populates="account")
    bank_accounts = relationship("BankAccount", back_populates="account")
    fixed_assets = relationship("FixedAsset", back_populates="account")

class JournalEntry(BaseModel):
    __tablename__ = "journal_entries"
    
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True, index=True)
    
    reference = Column(String, index=True) # e.g. INV-123, PO-456, JV-001
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String)
    status = Column(String, default="Draft") # Draft, Approved, Voided, Reversed
    
    # Integration tracking
    source_module = Column(String(50), nullable=True) # Sale, Purchase, Inventory, Cash, Bank, Expense, Manual
    source_id = Column(String(36), nullable=True)
    
    created_by = Column(String, ForeignKey("users.id"))
    
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")

class JournalEntryLine(BaseModel):
    __tablename__ = "journal_entry_lines"
    
    journal_entry_id = Column(String, ForeignKey("journal_entries.id", ondelete="CASCADE"), index=True)
    account_id = Column(String, ForeignKey("accounts.id"), index=True)
    
    description = Column(String, nullable=True)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    # Tracking dimension
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")

# =====================================================================
# Enterprise Banking Models
# =====================================================================

class BankAccount(BaseModel):
    __tablename__ = "bank_accounts"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), unique=True) # Linked GL Account
    
    bank_name = Column(String(100), nullable=False)
    account_number = Column(String(100), nullable=False, unique=True)
    account_name = Column(String(100), nullable=False)
    branch_name = Column(String(100), nullable=True)
    routing_number = Column(String(100), nullable=True)
    
    current_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    account = relationship("Account", back_populates="bank_accounts")

class BankTransaction(BaseModel):
    __tablename__ = "bank_transactions"
    
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id"), index=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    transaction_date = Column(DateTime, default=datetime.utcnow)
    transaction_type = Column(String(50)) # Deposit, Withdrawal, Transfer, Charge, Interest
    amount = Column(Float, nullable=False) # Positive = Deposit, Negative = Withdrawal
    reference = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Cleared") # Pending, Cleared, Reconciled
    
    bank_account = relationship("BankAccount")

class BankTransfer(BaseModel):
    __tablename__ = "bank_transfers"
    
    from_bank_id = Column(String(36), ForeignKey("bank_accounts.id"))
    to_bank_id = Column(String(36), ForeignKey("bank_accounts.id"))
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    transfer_date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, nullable=False)
    reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="Completed") # Draft, Completed, Void
    
    from_bank = relationship("BankAccount", foreign_keys=[from_bank_id])
    to_bank = relationship("BankAccount", foreign_keys=[to_bank_id])

class Cheque(BaseModel):
    __tablename__ = "cheques"
    
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id"))
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    cheque_number = Column(String(100), index=True)
    cheque_type = Column(String(50)) # Issued, Received
    payee_name = Column(String(200))
    amount = Column(Float, nullable=False)
    
    issue_date = Column(Date, nullable=False)
    clearance_date = Column(Date, nullable=True)
    status = Column(String(50), default="Pending") # Pending, Cleared, Bounced, Cancelled
    notes = Column(Text, nullable=True)

class BankReconciliation(BaseModel):
    __tablename__ = "bank_reconciliations"
    
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id"))
    reconciled_by = Column(String(36), ForeignKey("users.id"))
    
    statement_date = Column(Date, nullable=False)
    statement_balance = Column(Float, nullable=False)
    system_balance = Column(Float, nullable=False)
    difference = Column(Float, default=0.0)
    
    status = Column(String(50), default="Draft") # Draft, Completed
    notes = Column(Text, nullable=True)

# =====================================================================
# Enterprise Fixed Assets
# =====================================================================

class FixedAsset(BaseModel):
    __tablename__ = "fixed_assets"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    account_id = Column(String(36), ForeignKey("accounts.id")) # Linked GL Account
    
    asset_code = Column(String(100), unique=True, index=True)
    asset_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    purchase_date = Column(Date, nullable=False)
    purchase_cost = Column(Float, nullable=False)
    
    depreciation_method = Column(String(50), default="Straight Line")
    depreciation_rate = Column(Float, default=0.0) # Percentage per year
    accumulated_depreciation = Column(Float, default=0.0)
    net_book_value = Column(Float, nullable=False)
    
    status = Column(String(50), default="Active") # Active, Disposed, Written Off, Transferred
    
    account = relationship("Account", back_populates="fixed_assets")
    depreciations = relationship("AssetDepreciation", back_populates="asset")

class AssetDepreciation(BaseModel):
    __tablename__ = "asset_depreciations"
    
    asset_id = Column(String(36), ForeignKey("fixed_assets.id"))
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"))
    
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    
    asset = relationship("FixedAsset", back_populates="depreciations")

# =====================================================================
# Taxation Rules
# =====================================================================

class TaxRule(BaseModel):
    __tablename__ = "tax_rules"
    
    name = Column(String(100), nullable=False) # GST, VAT
    tax_type = Column(String(50)) # Sales Tax, Purchase Tax, Withholding Tax
    rate_percentage = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True) # Liability account

# =====================================================================
# Financial Closing
# =====================================================================

class FinancialClosing(BaseModel):
    __tablename__ = "financial_closings"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    closing_type = Column(String(50)) # Daily, Monthly, Yearly
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    total_revenue = Column(Float, default=0.0)
    total_expense = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    
    closed_by = Column(String(36), ForeignKey("users.id"))
    status = Column(String(50), default="Completed")
    notes = Column(Text, nullable=True)
