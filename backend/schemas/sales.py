from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# ---------------------------------------------------------------------------
# Common
# ---------------------------------------------------------------------------
class PaginatedResponse(BaseModel):
    total: int
    items: List[dict]


# ---------------------------------------------------------------------------
# Cart & Checkout
# ---------------------------------------------------------------------------
class SaleItemCreate(BaseModel):
    medicine_id: str
    batch_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    quantity: int
    unit_price: float
    discount: float = 0.0
    promotion_discount: float = 0.0
    scheme_discount: float = 0.0
    manual_discount: float = 0.0


class CheckoutRequest(BaseModel):
    customer_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    counter_id: Optional[str] = None
    shift_id: Optional[str] = None
    salesperson_id: Optional[str] = None
    delivery_type: Optional[str] = None
    order_source: Optional[str] = None
    loyalty_points_used: int = 0
    promotion_id: Optional[str] = None
    coupon_id: Optional[str] = None
    price_level_id: Optional[str] = None
    
    items: List[SaleItemCreate]
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    adjustment_amount: float = 0.0
    amount_paid: float
    payment_method: str = "Cash"
    hold_sale: bool = False  # If True → status becomes Held and no stock is deducted

class VoidSaleRequest(BaseModel):
    voided_by: Optional[str] = None
    void_reason: Optional[str] = None
    webcam_image_base64: Optional[str] = None
    screenshot_base64: Optional[str] = None



# ---------------------------------------------------------------------------
# Sale History / List
# ---------------------------------------------------------------------------
class SaleItemResponse(BaseModel):
    id: str
    medicine_id: str
    medicine_name: Optional[str] = None
    batch_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    quantity: int
    unit_price: float
    discount: float = 0.0
    total: float
    quantity_returned_so_far: int = 0
    model_config = ConfigDict(from_attributes=True)


class SaleResponse(BaseModel):
    id: str
    invoice_number: str
    customer_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    counter_id: Optional[str] = None
    shift_id: Optional[str] = None
    salesperson_id: Optional[str] = None
    loyalty_points_used: int = 0
    loyalty_points_earned: int = 0
    promotion_id: Optional[str] = None
    coupon_id: Optional[str] = None
    cashier_id: str
    cashier_name: Optional[str] = None
    sale_date: datetime
    subtotal: float
    discount_amount: float
    tax_amount: float = 0.0
    adjustment_amount: float = 0.0
    total_amount: float
    payment_method: str
    amount_paid: float
    change_due: float
    status: str
    items: List[SaleItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


class SaleListResponse(BaseModel):
    total: int
    items: List[SaleResponse]


# ---------------------------------------------------------------------------
# Sale Returns — Request Schemas
# ---------------------------------------------------------------------------
class SaleReturnItemCreate(BaseModel):
    sale_item_id: str
    quantity_returned: int
    return_reason: Optional[str] = None       # Wrong Medicine | Expired | Damaged | Customer Changed Mind
    stock_action: str = "Returned to Stock"   # Returned to Stock | Marked as Damaged


class SaleReturnCreateRequest(BaseModel):
    """New item-level return endpoint payload."""
    items: List[SaleReturnItemCreate]
    payment_mode: str = "Cash"   # Cash | Store Credit
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Sale Returns — Legacy Schema (kept for backwards compat)
# ---------------------------------------------------------------------------
class SaleReturnItemRequest(BaseModel):
    sale_item_id: str
    quantity_returned: int
    reason: Optional[str] = None


class SaleReturnRequest(BaseModel):
    sale_id: str
    items: List[SaleReturnItemRequest]
    refund_amount: float


# ---------------------------------------------------------------------------
# Sale Returns — Response Schemas
# ---------------------------------------------------------------------------
class SaleReturnItemResponse(BaseModel):
    id: str
    sale_item_id: str
    medicine_id: str
    medicine_name: Optional[str] = None
    quantity_returned: int
    return_reason: Optional[str] = None
    stock_action: str
    unit_price: float
    total_refund: float
    model_config = ConfigDict(from_attributes=True)


class SaleReturnResponse(BaseModel):
    id: str
    return_number: str
    sale_id: str
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    return_date: datetime
    total_amount: float
    payment_mode: str = "Cash"
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str
    items: List[SaleReturnItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Return Logs (Audit Stream)
# ---------------------------------------------------------------------------
class ReturnLogItemResponse(BaseModel):
    id: str
    medicine_id: str
    medicine_name: str
    quantity_returned: int
    unit_price: float
    total_refund: float
    return_reason: Optional[str] = None
    stock_action: str
    model_config = ConfigDict(from_attributes=True)


class ReturnLogResponse(BaseModel):
    id: str
    return_number: str
    invoice_number: str
    cashier_name: str
    return_date: datetime
    total_amount: float
    payment_mode: str
    items_summary: str  # "3 items returned"
    notes: Optional[str] = None
    items: List[ReturnLogItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Held Sale Resume
# ---------------------------------------------------------------------------
class ResumeHeldSaleRequest(BaseModel):
    amount_paid: float
    payment_method: str


class VerifyCompleteRequest(BaseModel):
    amount_paid: float
    payment_method: str = "Cash"


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------
class CustomerPaymentRequest(BaseModel):
    customer_id: str
    sale_id: Optional[str] = None
    amount: float
    payment_method: str


class SplitPaymentItem(BaseModel):
    amount: float
    payment_method: str

class SplitPaymentRequest(BaseModel):
    payments: List[SplitPaymentItem]

class ShiftActionRequest(BaseModel):
    opening_balance: Optional[float] = 0.0
    closing_balance_actual: Optional[float] = None
    discrepancy_notes: Optional[str] = None


class CustomerPaymentResponse(BaseModel):
    id: str
    customer_id: str
    amount: float
    payment_method: str
    payment_date: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Ledger
# ---------------------------------------------------------------------------
class CustomerLedgerResponse(BaseModel):
    id: str
    transaction_date: datetime
    transaction_type: str
    reference_id: str
    debit: float
    credit: float
    balance_after: float
    model_config = ConfigDict(from_attributes=True)
