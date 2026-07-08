from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from typing import Optional
from .base import BaseModel

class Supplier(BaseModel):
    __tablename__ = "suppliers"

    name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    region_name = Column(String(100), nullable=True)
    tax_number = Column(String(100))
    credit_limit = Column(Float, default=0.0)
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"
    
    order_number = Column(String(100), unique=True, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    
    expected_delivery_date = Column(Date)
    # Draft, Submitted, Approved, Partially Received, Completed, Cancelled
    status = Column(String(50), default="Draft")
    total_amount = Column(Float, default=0.0)
    
    items = relationship("POItem", back_populates="purchase_order")
    supplier = relationship("Supplier")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.name if self.supplier else None

class POItem(BaseModel):
    __tablename__ = "po_items"
    
    po_id = Column(String(36), ForeignKey("purchase_orders.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    medicine = relationship("Medicine", foreign_keys=[medicine_id], lazy="joined")

    @property
    def medicine_name(self) -> Optional[str]:
        return self.medicine.name if self.medicine else None


class GRN(BaseModel):
    __tablename__ = "grns"

    grn_number = Column(String(100), unique=True, index=True)
    po_id = Column(String(36), ForeignKey("purchase_orders.id"), nullable=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    
    received_date = Column(Date)
    status = Column(String(50), default="Draft") # Draft, Confirmed
    total_amount = Column(Float, default=0.0)
    
    supplier = relationship("Supplier")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.name if self.supplier else None
    
class PurchaseInvoice(BaseModel):
    __tablename__ = "purchase_invoices"

    invoice_number = Column(String(100), unique=True, index=True)
    grn_id = Column(String(36), ForeignKey("grns.id"))
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    
    invoice_date = Column(Date)
    due_date = Column(Date)
    total_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    
    status = Column(String(50), default="Unpaid") # Unpaid, Partial, Paid

class SupplierPayment(BaseModel):
    __tablename__ = "supplier_payments"
    
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    invoice_id = Column(String(36), ForeignKey("purchase_invoices.id"), nullable=True) # Optional if advance payment
    
    payment_date = Column(Date)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50)) # Cash, Bank Transfer, Cheque
    reference_number = Column(String(100))
    notes = Column(Text)

class PurchaseReturn(BaseModel):
    __tablename__ = "purchase_returns"
    
    return_number = Column(String(100), unique=True, index=True)
    po_id = Column(String(36), ForeignKey("purchase_orders.id"), nullable=True)
    grn_id = Column(String(36), ForeignKey("grns.id"), nullable=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    
    return_date = Column(Date)
    total_amount = Column(Float, default=0.0)
    reason = Column(String(255))
    status = Column(String(50), default="Draft") # Draft, Completed

    items = relationship("PurchaseReturnItem", back_populates="purchase_return")
    supplier = relationship("Supplier")

class PurchaseReturnItem(BaseModel):
    __tablename__ = "purchase_return_items"

    purchase_return_id = Column(String(36), ForeignKey("purchase_returns.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    
    quantity_returned = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, default=0.0)
    
    purchase_return = relationship("PurchaseReturn", back_populates="items")
    medicine = relationship("Medicine", foreign_keys=[medicine_id], lazy="joined")
    
    @property
    def medicine_name(self) -> Optional[str]:
        return self.medicine.name if self.medicine else None

class SupplierLedger(BaseModel):
    __tablename__ = "supplier_ledger"
    
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    
    transaction_date = Column(Date)
    transaction_type = Column(String(50)) # Invoice, Payment, Return
    reference_id = Column(String(100)) # ID of Invoice, Payment, Return
    
    debit = Column(Float, default=0.0) # Increases supplier balance (we owe them) -> Invoices
    credit = Column(Float, default=0.0) # Decreases supplier balance -> Payments, Returns
    balance_after = Column(Float, nullable=False)
    
    notes = Column(Text)

class SupplierMedicinePrice(BaseModel):
    __tablename__ = "supplier_medicine_prices"

    supplier_id = Column(String(36), ForeignKey("suppliers.id"), nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    
    trade_price = Column(Float, nullable=False, default=0.0)
    exclusive_discount_percentage = Column(Float, default=0.0)
    bonus_scheme_threshold = Column(Integer, default=0) # e.g. buy 10 get 1 free
    delivery_lead_time_days = Column(Integer, default=1)
    
    supplier = relationship("Supplier")
    medicine = relationship("Medicine")

