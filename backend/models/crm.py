from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel

class Customer(BaseModel):
    __tablename__ = "customers"

    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), index=True)
    cnic = Column(String(50), index=True, unique=True)
    whatsapp = Column(String(50))
    email = Column(String(255))
    dob = Column(Date)
    gender = Column(String(20))
    address = Column(Text)
    
    blood_group = Column(String(10))
    medical_history = Column(Text)
    allergies = Column(Text)
    
    credit_limit = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    loyalty_tier = Column(String(50), default="Bronze", index=True)
    area_zone = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    # CRM Phase 9 Enterprise Fields
    preferred_branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    preferred_language = Column(String(50), default="en")
    marketing_opt_in = Column(Boolean, default=True)
    whatsapp_opt_in = Column(Boolean, default=True)
    email_opt_in = Column(Boolean, default=True)
    sms_opt_in = Column(Boolean, default=True)
    anniversary = Column(Date, nullable=True)
    occupation = Column(String(100), nullable=True)
    risk_score = Column(Float, default=0.0)
    last_visit = Column(DateTime, nullable=True)
    lifetime_value = Column(Float, default=0.0)
    average_basket = Column(Float, default=0.0)
    total_orders = Column(Integer, default=0)
    total_returns = Column(Integer, default=0)

    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    
    # Relationships
    wallet = relationship("CustomerWallet", back_populates="customer", uselist=False, lazy="selectin")
    segments = relationship("CustomerSegment", back_populates="customer", lazy="selectin")
    referrals_made = relationship("CustomerReferral", foreign_keys="[CustomerReferral.referrer_id]", back_populates="referrer", lazy="selectin")
    referrals_received = relationship("CustomerReferral", foreign_keys="[CustomerReferral.referred_id]", back_populates="referred", lazy="selectin")

class LoyaltyTransaction(BaseModel):
    __tablename__ = "loyalty_transactions"
    
    customer_id = Column(String(36), ForeignKey("customers.id"))
    sale_id = Column(String(36), ForeignKey("sales.id"), nullable=True)
    
    transaction_date = Column(DateTime)
    points = Column(Integer) # positive for earn, negative for redeem
    transaction_type = Column(String(50)) # Earn, Redeem, Adjust
    reason = Column(String(255))
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)

# ── Phase 9 CRM Extensions ────────────────────────────────────────────────────────

class CustomerWallet(BaseModel):
    __tablename__ = "customer_wallets"
    
    customer_id = Column(String(36), ForeignKey("customers.id"), unique=True, index=True)
    balance = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    pending_balance = Column(Float, default=0.0)
    currency = Column(String(10), default="PKR")
    last_transaction_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    
    customer = relationship("Customer", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", lazy="selectin")

class WalletTransaction(BaseModel):
    __tablename__ = "wallet_transactions"
    
    wallet_id = Column(String(36), ForeignKey("customer_wallets.id"), index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), index=True, nullable=True)
    transaction_date = Column(DateTime, default=datetime.utcnow, index=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(50)) # Credit, Debit, Refund
    
    source_module = Column(String(100), nullable=True)
    source_id = Column(String(100), nullable=True)
    performed_by = Column(String(36), nullable=True)
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=True)
    
    reference_id = Column(String(100), nullable=True) # e.g. return_number or sale_number
    notes = Column(Text, nullable=True)
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    
    wallet = relationship("CustomerWallet", back_populates="transactions")

class CustomerReferral(BaseModel):
    __tablename__ = "customer_referrals"
    
    referrer_id = Column(String(36), ForeignKey("customers.id"), index=True)
    referred_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    referral_code = Column(String(50), index=True)
    status = Column(String(50), default="Pending") # Pending, Converted
    reward_issued = Column(Boolean, default=False)
    
    referral_reward_points = Column(Integer, default=0)
    referee_reward_points = Column(Integer, default=0)
    reward_date = Column(DateTime, nullable=True)
    converted_sale_id = Column(String(36), nullable=True)
    
    branch_id = Column(String(36), ForeignKey("branches.id"), index=True, nullable=True)
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    
    referrer = relationship("Customer", foreign_keys=[referrer_id], back_populates="referrals_made")
    referred = relationship("Customer", foreign_keys=[referred_id], back_populates="referrals_received")

class CustomerSegment(BaseModel):
    __tablename__ = "customer_segments"
    # Transitory tracking table populated by the Scheduler
    segment_name = Column(String(100), index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), index=True)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    branch_id = Column(String(36), ForeignKey("branches.id"), index=True, nullable=True)
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    
    customer = relationship("Customer", back_populates="segments")

class LoyaltyRule(BaseModel):
    __tablename__ = "loyalty_rules"
    
    name = Column(String(100))
    branch_id = Column(String(36), ForeignKey("branches.id"), index=True, nullable=True) # Null means Global
    tier = Column(String(50)) # Bronze, Silver, Gold
    tier_priority = Column(Integer, default=1)
    earn_multiplier = Column(Float, default=1.0)
    redeem_multiplier = Column(Float, default=1.0)
    
    minimum_purchase = Column(Float, default=0.0)
    maximum_points_per_transaction = Column(Integer, nullable=True)
    expiry_days = Column(Integer, nullable=True)
    applicable_branches = Column(Text, nullable=True)
    applicable_customer_segments = Column(Text, nullable=True)
    applicable_price_levels = Column(Text, nullable=True)
    
    effective_from = Column(DateTime, nullable=True)
    effective_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)

class MarketingCampaign(BaseModel):
    __tablename__ = "marketing_campaigns"
    
    campaign_code = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(200), nullable=False)
    branch_id = Column(String(36), ForeignKey("branches.id"), index=True, nullable=True)
    
    status = Column(String(50), default="Draft") # Draft, Scheduled, Running, Completed, Cancelled
    channel = Column(String(50)) # WhatsApp, SMS, Email, Push Notification
    
    target_audience_type = Column(String(50), nullable=True)
    target_segment = Column(String(100), nullable=True) # VIP, Inactive, etc
    target_loyalty_tier = Column(String(50), nullable=True)
    
    template_body = Column(Text, nullable=True)
    schedule_date = Column(DateTime, nullable=True)
    
    estimated_reach = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    conversion_count = Column(Integer, default=0)
    
    # Simple JSON string for metrics (kept for extended arbitrary tracking)
    metrics_summary = Column(Text, nullable=True)
    
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    approved_by = Column(String(36), nullable=True)
