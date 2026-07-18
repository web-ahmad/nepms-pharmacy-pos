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
    is_active: Optional[bool] = True
    preferred_branch_id: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    preferred_branch_id: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    credit_limit: Optional[float] = None
    is_active: Optional[bool] = None

class CustomerStatusUpdate(BaseModel):
    status: str

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

# ── Phase 9 CRM Extensions ────────────────────────────────────────────────────────

class WalletTransactionCreate(BaseModel):
    amount: float
    transaction_type: str # Credit, Debit, Refund
    notes: Optional[str] = None
    source_module: Optional[str] = None
    source_id: Optional[str] = None

class WalletTransactionResponse(BaseModel):
    id: str
    transaction_date: datetime
    amount: float
    transaction_type: str
    opening_balance: float
    closing_balance: float
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CustomerWalletResponse(BaseModel):
    id: str
    balance: float
    available_balance: float
    pending_balance: float
    currency: str
    last_transaction_at: Optional[datetime] = None
    transactions: List[WalletTransactionResponse] = []
    model_config = ConfigDict(from_attributes=True)

class TimelineItem(BaseModel):
    date: datetime
    type: str # Sale, Prescription, Loyalty, Wallet, Referral, Campaign
    title: str
    description: Optional[str] = None
    reference_id: Optional[str] = None
    amount: Optional[float] = None
    points: Optional[int] = None

class CustomerSegmentResponse(BaseModel):
    segment_name: str
    calculated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MarketingCampaignCreate(BaseModel):
    name: str
    channel: str # WhatsApp, SMS
    target_audience_type: str # Segment, Loyalty Tier, All
    target_segment: Optional[str] = None
    target_loyalty_tier: Optional[str] = None
    template_body: str
    schedule_date: Optional[datetime] = None
    status: Optional[str] = "Draft"

class MarketingCampaignResponse(MarketingCampaignCreate):
    id: str
    campaign_code: Optional[str] = None
    status: str
    estimated_reach: int
    sent_count: int
    delivered_count: int
    failed_count: int
    opened_count: int
    clicked_count: int
    conversion_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CustomerReferralResponse(BaseModel):
    id: str
    referral_code: str
    referred_id: Optional[str] = None
    status: str
    reward_issued: bool
    reward_date: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
