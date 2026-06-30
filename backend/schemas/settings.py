from pydantic import BaseModel
from typing import Dict, Any, Optional

class TenantSettingsBase(BaseModel):
    company_settings: Optional[Dict[str, Any]] = None
    branch_settings: Optional[Dict[str, Any]] = None
    tax_settings: Optional[Dict[str, Any]] = None
    currency_settings: Optional[Dict[str, Any]] = None
    invoice_settings: Optional[Dict[str, Any]] = None
    pos_settings: Optional[Dict[str, Any]] = None
    inventory_settings: Optional[Dict[str, Any]] = None
    crm_settings: Optional[Dict[str, Any]] = None
    prescription_settings: Optional[Dict[str, Any]] = None
    hr_settings: Optional[Dict[str, Any]] = None

class TenantSettingsUpdate(TenantSettingsBase):
    pass

class TenantSettingsResponse(TenantSettingsBase):
    id: str
    class Config:
        from_attributes = True

class SystemModuleBase(BaseModel):
    module_key: str
    module_name: str
    category: str
    is_enabled: bool

class SystemModuleUpdate(BaseModel):
    is_enabled: bool

class SystemModuleResponse(SystemModuleBase):
    id: str
    class Config:
        from_attributes = True

class InvoiceSettingsBase(BaseModel):
    show_currency_symbol: bool = True
    show_received_amount: bool = True
    show_change_amount: bool = True
    show_footer_text: bool = True
    show_logo: bool = True
    show_adjustments: bool = True
    show_tax: bool = True
    show_discount: bool = True
    show_cashier_name: bool = True
    show_customer_name: bool = True
    show_payment_method: bool = True
    
    footer_text: str = "Thank you for your business!"
    urdu_policy_text: str = "خریداری کا شکریہ۔ فروخت شدہ ادویات واپس یا تبدیل نہیں ہوں گی۔"
    
    print_mode: str = "Browser"
    paper_size: str = "80mm"
    printer_interface: str = "USB"
    printer_ip: Optional[str] = None
    printer_usb_vendor: Optional[str] = None
    printer_usb_product: Optional[str] = None

class InvoiceSettingsUpdate(InvoiceSettingsBase):
    pass

class InvoiceSettingsResponse(InvoiceSettingsBase):
    id: str
    tenant_id: str
    class Config:
        from_attributes = True
