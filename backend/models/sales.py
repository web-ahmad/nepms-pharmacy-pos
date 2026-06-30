from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel

class Sale(BaseModel):
    __tablename__ = "sales"

    invoice_number = Column(String(100), unique=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    cashier_id = Column(String(36), ForeignKey("users.id"))
    
    sale_date = Column(DateTime)
    
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    payment_method = Column(String(50))  # Cash, Card, Credit, Mixed
    amount_paid = Column(Float, default=0.0)
    change_due = Column(Float, default=0.0)
    adjustment_amount = Column(Float, default=0.0)
    
    status = Column(String(50), default="Completed")  # Held, Completed, Voided, Partially Returned, Fully Returned
    
    items = relationship("SaleItem", back_populates="sale", lazy="selectin")
    returns = relationship("SaleReturn", back_populates="sale", lazy="selectin")
    cashier = relationship("User", foreign_keys=[cashier_id], lazy="selectin")


class SaleItem(BaseModel):
    __tablename__ = "sale_items"
    
    sale_id = Column(String(36), ForeignKey("sales.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=True)
    
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    sale = relationship("Sale", back_populates="items")
    medicine = relationship("Medicine", lazy="selectin")
    return_items = relationship("SaleReturnItem", back_populates="sale_item", lazy="selectin")

    @property
    def medicine_name(self) -> str:
        return self.medicine.name if self.medicine else ""

    @property
    def quantity_returned_so_far(self) -> int:
        """Sum of all approved return quantities for this line item."""
        if not self.return_items:
            return 0
        return sum(ri.quantity_returned for ri in self.return_items)


class SaleReturn(BaseModel):
    __tablename__ = "sale_returns"
    
    return_number = Column(String(100), unique=True, index=True)
    sale_id = Column(String(36), ForeignKey("sales.id"))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    cashier_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    return_date = Column(DateTime)
    total_amount = Column(Float, default=0.0)
    payment_mode = Column(String(50), default="Cash")  # Cash, Store Credit
    reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="Completed")

    sale = relationship("Sale", back_populates="returns")
    cashier = relationship("User", foreign_keys=[cashier_id], lazy="selectin")
    items = relationship("SaleReturnItem", back_populates="sale_return", lazy="selectin")


class SaleReturnItem(BaseModel):
    __tablename__ = "sale_return_items"

    sale_return_id = Column(String(36), ForeignKey("sale_returns.id"))
    sale_item_id = Column(String(36), ForeignKey("sale_items.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))

    quantity_returned = Column(Integer, nullable=False, default=0)
    return_reason = Column(String(255), nullable=True)  # Wrong Medicine, Expired, Damaged, Customer Changed Mind
    stock_action = Column(String(50), default="Returned to Stock")  # Returned to Stock | Marked as Damaged
    unit_price = Column(Float, default=0.0)
    total_refund = Column(Float, default=0.0)

    sale_return = relationship("SaleReturn", back_populates="items")
    sale_item = relationship("SaleItem", back_populates="return_items")
    medicine = relationship("Medicine", lazy="selectin")


class CustomerPayment(BaseModel):
    __tablename__ = "customer_payments"
    
    customer_id = Column(String(36), ForeignKey("customers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    sale_id = Column(String(36), ForeignKey("sales.id"), nullable=True)
    
    payment_date = Column(DateTime)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50))  # Cash, Card, Bank Transfer
    reference_number = Column(String(100))
    notes = Column(Text)


class CustomerLedger(BaseModel):
    __tablename__ = "customer_ledger"
    
    customer_id = Column(String(36), ForeignKey("customers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    
    transaction_date = Column(DateTime)
    transaction_type = Column(String(50))  # Sale (Credit), Payment (Debit), Return
    reference_id = Column(String(100))
    
    debit = Column(Float, default=0.0)   # Increases amount customer owes us
    credit = Column(Float, default=0.0)  # Decreases amount customer owes us
    balance_after = Column(Float, nullable=False)
    
    notes = Column(Text)
