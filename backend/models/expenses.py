from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Date, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import BaseModel

class ExpenseCategory(BaseModel):
    __tablename__ = "expense_categories"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=True) # Linked GL Account
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

class ExpenseVoucher(BaseModel):
    __tablename__ = "expense_vouchers"

    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    reference = Column(String, index=True) # EXP-XXXXX
    date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, default=0.0)
    
    payee = Column(String, nullable=True)
    description = Column(String, nullable=True)
    
    category_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    petty_cash_category_id = Column(String(36), ForeignKey("petty_cash_categories.id"), nullable=True)
    
    payment_method = Column(String, default="Cash") # Cash/Bank
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id"), nullable=True)
    
    status = Column(String, default="Approved") # Pending, Approved, Rejected, Void
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    attachment_url = Column(String, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"))
    
    category = relationship("Account", foreign_keys=[category_id])
    petty_cash_category = relationship("PettyCashCategory", foreign_keys=[petty_cash_category_id])
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])

class PettyCashCategory(BaseModel):
    __tablename__ = "petty_cash_categories"

    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    name = Column(String)

class RecurringExpense(BaseModel):
    __tablename__ = "recurring_expenses"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    category_id = Column(String(36), ForeignKey("accounts.id"))
    
    reference_name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    
    frequency = Column(String(50), default="Monthly") # Weekly, Monthly, Yearly
    next_due_date = Column(Date, nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_by = Column(String(36), ForeignKey("users.id"))
