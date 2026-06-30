from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
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
    loyalty_tier = Column(String(50), default="Bronze")

class LoyaltyTransaction(BaseModel):
    __tablename__ = "loyalty_transactions"
    
    customer_id = Column(String(36), ForeignKey("customers.id"))
    sale_id = Column(String(36), ForeignKey("sales.id"), nullable=True)
    
    transaction_date = Column(DateTime)
    points = Column(Integer) # positive for earn, negative for redeem
    transaction_type = Column(String(50)) # Earn, Redeem, Adjust
    reason = Column(String(255))
