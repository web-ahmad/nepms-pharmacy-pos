from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date

# Supplier
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    region_name: Optional[str] = None
    tax_number: Optional[str] = None
    credit_limit: float = 0.0
    opening_balance: float = 0.0
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    region_name: Optional[str] = None
    tax_number: Optional[str] = None
    credit_limit: Optional[float] = None
    opening_balance: Optional[float] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: str
    tenant_id: str
    current_balance: float
    model_config = ConfigDict(from_attributes=True)

# PO Item
class POItemBase(BaseModel):
    medicine_id: str
    quantity_ordered: int
    unit_price: float = 0.0

class POItemCreate(POItemBase):
    pass

class POItemResponse(POItemBase):
    id: str
    quantity_received: int
    medicine_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Purchase Order
class PurchaseOrderBase(BaseModel):
    supplier_id: str
    expected_delivery_date: Optional[date] = None
    total_amount: float = 0.0

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[POItemCreate]

class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    order_number: str
    branch_id: Optional[str] = None
    status: str
    supplier_name: Optional[str] = None
    items: List[POItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class BulkDraftPORequest(BaseModel):
    medicine_ids: List[str]

# GRN
class GRNBase(BaseModel):
    po_id: str
    supplier_id: str
    received_date: Optional[date] = None
    total_amount: float = 0.0

class GRNItemCreate(BaseModel):
    po_item_id: str
    medicine_id: str
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    purchase_price: float
    selling_price: float
    quantity_received: int
    apply_to_old_stock: bool = False

class GRNCreate(GRNBase):
    items: List[GRNItemCreate]

class GRNResponse(GRNBase):
    id: str
    grn_number: str
    branch_id: Optional[str] = None
    status: str
    supplier_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Purchase Invoice
class InvoiceItemResponse(BaseModel):
    medicine_id: str
    medicine_name: str
    batch_number: str
    quantity: int
    unit_price: float
    total_price: float

class PurchaseInvoiceBase(BaseModel):
    grn_id: str
    supplier_id: str
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: float = 0.0
    tax_amount: float = 0.0
    amount_paid: float = 0.0

class PurchaseInvoiceCreate(PurchaseInvoiceBase):
    pass

class PurchaseInvoiceResponse(PurchaseInvoiceBase):
    id: str
    invoice_number: Optional[str] = None
    status: str
    items: List[InvoiceItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Supplier Payment
class SupplierPaymentBase(BaseModel):
    supplier_id: str
    invoice_id: Optional[str] = None
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class SupplierPaymentCreate(SupplierPaymentBase):
    pass

class SupplierPaymentResponse(SupplierPaymentBase):
    id: str
    payment_date: date
    model_config = ConfigDict(from_attributes=True)

# Purchase Return
class PurchaseReturnBase(BaseModel):
    po_id: Optional[str] = None
    grn_id: Optional[str] = None
    supplier_id: str
    total_amount: float
    reason: Optional[str] = None

class PurchaseReturnItemCreate(BaseModel):
    medicine_id: str
    quantity_returned: int
    unit_price: float = 0.0

class PurchaseReturnCreate(PurchaseReturnBase):
    items: List[PurchaseReturnItemCreate]

class PurchaseReturnItemResponse(BaseModel):
    id: str
    medicine_id: str
    medicine_name: Optional[str] = None
    quantity_returned: int
    unit_price: float
    model_config = ConfigDict(from_attributes=True)

class PurchaseReturnResponse(PurchaseReturnBase):
    id: str
    return_number: str
    return_date: date
    status: str
    items: List[PurchaseReturnItemResponse] = []
    supplier_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Supplier Ledger
class SupplierLedgerResponse(BaseModel):
    id: str
    transaction_date: date
    transaction_type: str
    reference_id: str
    debit: float
    credit: float
    balance_after: float
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Supplier Medicine Matrix
class SupplierMedicinePriceBase(BaseModel):
    supplier_id: str
    medicine_id: str
    trade_price: float
    exclusive_discount_percentage: float = 0.0
    bonus_scheme_threshold: int = 0
    delivery_lead_time_days: int = 1

class SupplierMedicinePriceCreate(SupplierMedicinePriceBase):
    pass

class SupplierMedicinePriceResponse(SupplierMedicinePriceBase):
    id: str
    supplier_name: Optional[str] = None
    medicine_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

