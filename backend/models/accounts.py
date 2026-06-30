from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Enum, text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from database import Base

class AccountCategory(str, enum.Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    EQUITY = "Equity"
    REVENUE = "Revenue"
    EXPENSE = "Expense"

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    code = Column(String, index=True)
    name = Column(String)
    category = Column(Enum(AccountCategory))
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False) # True if it's a default account that can't be deleted
    created_at = Column(DateTime, default=datetime.utcnow)
    
    journal_lines = relationship("JournalEntryLine", back_populates="account")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    reference = Column(String, index=True) # e.g. INV-123, PO-456
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String)
    status = Column(String, default="Draft") # Draft, Approved, Voided
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")

class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    journal_entry_id = Column(String, ForeignKey("journal_entries.id", ondelete="CASCADE"), index=True)
    account_id = Column(String, ForeignKey("accounts.id"), index=True)
    description = Column(String, nullable=True)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")
