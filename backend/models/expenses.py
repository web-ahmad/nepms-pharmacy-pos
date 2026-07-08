from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class ExpenseVoucher(Base):
    __tablename__ = "expense_vouchers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    reference = Column(String, index=True) # EXP-XXXXX
    date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, default=0.0)
    payee = Column(String, nullable=True)
    description = Column(String, nullable=True)
    category_id = Column(String, ForeignKey("accounts.id"), nullable=True)
    petty_cash_category_id = Column(String, ForeignKey("petty_cash_categories.id"), nullable=True)
    payment_method = Column(String, default="Cash") # Cash/Bank
    status = Column(String, default="Approved") # Pending, Approved, Void
    attachment_url = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Account", foreign_keys=[category_id])
    petty_cash_category = relationship("PettyCashCategory", foreign_keys=[petty_cash_category_id])
    creator = relationship("User", foreign_keys=[created_by])

class PettyCashCategory(Base):
    __tablename__ = "petty_cash_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    name = Column(String)
