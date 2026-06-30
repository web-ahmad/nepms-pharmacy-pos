from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date, datetime

class CustomerBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    cnic: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    credit_limit: float = 0.0

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    credit_limit: Optional[float] = None

class CustomerResponse(CustomerBase):
    id: str
    current_balance: float
    loyalty_points: int
    loyalty_tier: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CustomerLoyaltyRedeemRequest(BaseModel):
    points_to_redeem: int
    reason: Optional[str] = "Manual Redemption"

class LoyaltyHistoryResponse(BaseModel):
    id: str
    customer_id: str
    sale_id: Optional[str] = None
    transaction_date: datetime
    points: int
    transaction_type: str
    reason: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CustomerPaymentCreate(BaseModel):
    amount: float
    payment_method: str = "Cash"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    sale_id: Optional[str] = None

class CustomerPaymentResponse(BaseModel):
    id: str
    customer_id: str
    amount: float
    payment_method: str
    payment_date: datetime
    model_config = ConfigDict(from_attributes=True)

class CustomerLedgerResponse(BaseModel):
    id: str
    transaction_date: datetime
    transaction_type: str
    reference_id: str
    debit: float
    credit: float
    balance_after: float
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
