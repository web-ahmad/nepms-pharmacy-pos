from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class SubscriptionPlan(BaseModel):
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False, default=0)
    billing_cycle = Column(String(20), nullable=False, default="monthly") # monthly, yearly
    features_limits = Column(JSON, nullable=True) # e.g. {"max_branches": 5, "max_staff": 20}
    is_active = Column(Boolean, nullable=False, default=True)

class PharmacySubscription(BaseModel):
    __tablename__ = "pharmacy_subscriptions"

    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), nullable=False, unique=True)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String(50), nullable=False, default="trial") # active, trial, past_due, cancelled, suspended
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    
    gateway_customer_id = Column(String(100), nullable=True)
    gateway_subscription_id = Column(String(100), nullable=True)

    plan = relationship("SubscriptionPlan")
    pharmacy = relationship("Pharmacy", backref="subscription")

class PaymentTransaction(BaseModel):
    __tablename__ = "payment_transactions"

    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("pharmacy_subscriptions.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="PKR")
    gateway = Column(String(50), nullable=False) # stripe, jazzcash, easypaisa, manual
    gateway_transaction_id = Column(String(255), nullable=True, unique=True)
    status = Column(String(50), nullable=False, default="pending") # pending, success, failed, refunded
    raw_gateway_response = Column(JSON, nullable=True)
    
    pharmacy = relationship("Pharmacy")
    subscription = relationship("PharmacySubscription", backref="transactions")
