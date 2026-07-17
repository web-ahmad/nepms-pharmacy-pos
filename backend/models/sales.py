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
    profit = Column(Float, default=0.0)
    
    payment_method = Column(String(50))  # Cash, Card, Credit, Mixed
    amount_paid = Column(Float, default=0.0)
    change_due = Column(Float, default=0.0)
    adjustment_amount = Column(Float, default=0.0)
    
    status = Column(String(50), default="Completed")  # Held, Completed, Voided, Partially Returned, Fully Returned
    notes = Column(Text, nullable=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=True)
    
    # Enterprise fields
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    counter_id = Column(String(36), ForeignKey("branch_counters.id"), nullable=True)
    shift_id = Column(String(36), ForeignKey("cash_sessions.id"), nullable=True)
    salesperson_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    delivery_type = Column(String(50), nullable=True)
    order_source = Column(String(50), nullable=True)
    loyalty_points_used = Column(Integer, default=0)
    loyalty_points_earned = Column(Integer, default=0)
    promotion_id = Column(String(36), ForeignKey("promotion_campaigns.id"), nullable=True)
    coupon_id = Column(String(36), ForeignKey("coupons.id"), nullable=True)
    approval_status = Column(String(50), nullable=True)
    hold_status = Column(String(50), nullable=True)
    payment_status = Column(String(50), nullable=True)
    price_level_id = Column(String(50), nullable=True)
    
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
    
    # Enterprise fields
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    promotion_discount = Column(Float, default=0.0)
    scheme_discount = Column(Float, default=0.0)
    manual_discount = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    gross_profit = Column(Float, default=0.0)
    margin_percentage = Column(Float, default=0.0)
    
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

# --- Enterprise Multi-Branch Extended Models ---

class PromotionCampaign(BaseModel):
    __tablename__ = "promotion_campaigns"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    discount_type = Column(String(50)) # Percentage, Fixed Amount, BOGO
    discount_value = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    # CRM Phase 9 Targeting
    target_customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    target_loyalty_tier = Column(String(50), nullable=True)
    target_segment_id = Column(String(50), nullable=True) # Logical string or FK
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)


class Coupon(BaseModel):
    __tablename__ = "coupons"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    code = Column(String(100), unique=True, index=True)
    discount_type = Column(String(50)) # Percentage, Fixed Amount
    discount_value = Column(Float, default=0.0)
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, default=0)
    expiry_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # CRM Phase 9 Extensions
    stacking_rules = Column(Text, nullable=True) # JSON or descriptive string
    max_usage_per_customer = Column(Integer, default=1)
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)


class GiftVoucher(BaseModel):
    __tablename__ = "gift_vouchers"
    
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    voucher_code = Column(String(100), unique=True, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    amount = Column(Float, nullable=False)
    balance = Column(Float, nullable=False)
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # CRM Phase 9 Extensions
    partial_usage_allowed = Column(Boolean, default=True)
    redemption_history = Column(Text, nullable=True) # JSON dump of redemptions
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)


class CustomerCredit(BaseModel):
    __tablename__ = "customer_credits"
    
    customer_id = Column(String(36), ForeignKey("customers.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    credit_limit = Column(Float, default=0.0)
    available_credit = Column(Float, default=0.0)
    total_due = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)


class SalesQuotation(BaseModel):
    __tablename__ = "sales_quotations"
    
    quotation_number = Column(String(100), unique=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    salesperson_id = Column(String(36), ForeignKey("users.id"))
    quotation_date = Column(DateTime)
    valid_until = Column(DateTime, nullable=True)
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Draft") # Draft, Sent, Accepted, Rejected, Expired
    notes = Column(Text, nullable=True)


class SalesOrder(BaseModel):
    __tablename__ = "sales_orders"
    
    order_number = Column(String(100), unique=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    salesperson_id = Column(String(36), ForeignKey("users.id"))
    quotation_id = Column(String(36), ForeignKey("sales_quotations.id"), nullable=True)
    order_date = Column(DateTime)
    expected_delivery_date = Column(DateTime, nullable=True)
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Pending") # Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
    notes = Column(Text, nullable=True)


class SalesDelivery(BaseModel):
    __tablename__ = "sales_deliveries"
    
    delivery_number = Column(String(100), unique=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    sale_id = Column(String(36), ForeignKey("sales.id"), nullable=True)
    order_id = Column(String(36), ForeignKey("sales_orders.id"), nullable=True)
    delivery_date = Column(DateTime)
    delivery_method = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    driver_name = Column(String(100), nullable=True)
    status = Column(String(50), default="Pending") # Pending, In Transit, Delivered, Failed
    notes = Column(Text, nullable=True)
