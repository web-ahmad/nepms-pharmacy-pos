from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text, JSON
from datetime import datetime
import uuid
from database import Base

class TenantSettings(Base):
    __tablename__ = "tenant_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True, unique=True)
    
    # Using JSON to dynamically store all settings configurations cleanly
    company_settings = Column(JSON, default={})
    branch_settings = Column(JSON, default={})
    tax_settings = Column(JSON, default={})
    currency_settings = Column(JSON, default={})
    invoice_settings = Column(JSON, default={})
    pos_settings = Column(JSON, default={})
    inventory_settings = Column(JSON, default={})
    crm_settings = Column(JSON, default={})
    prescription_settings = Column(JSON, default={})
    hr_settings = Column(JSON, default={})
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class InvoiceSettings(Base):
    __tablename__ = "invoice_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True, unique=True)
    
    show_currency_symbol = Column(Boolean, default=True)
    show_received_amount = Column(Boolean, default=True)
    show_change_amount = Column(Boolean, default=True)
    show_footer_text = Column(Boolean, default=True)
    show_logo = Column(Boolean, default=True)
    show_adjustments = Column(Boolean, default=True)
    show_tax = Column(Boolean, default=True)
    show_discount = Column(Boolean, default=True)
    show_cashier_name = Column(Boolean, default=True)
    show_customer_name = Column(Boolean, default=True)
    show_drug_license = Column(Boolean, default=True)
    
    footer_text = Column(String, default="Thank you for your business!")
    urdu_policy_text = Column(Text, default="خریداری کا شکریہ۔ فروخت شدہ ادویات واپس یا تبدیل نہیں ہوں گی۔")
    drug_license_number = Column(String, default="368-/NT/9/2015")
    
    print_mode = Column(String, default="Browser") # 'Browser', 'ESC_POS_RAW'
    paper_size = Column(String, default="80mm") # '58mm', '80mm'
    printer_interface = Column(String, default="USB") # 'USB', 'Network_IP'
    printer_ip = Column(String, nullable=True) # for Network_IP
    printer_usb_vendor = Column(String, nullable=True)
    printer_usb_product = Column(String, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemModule(Base):
    __tablename__ = "system_modules"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    module_key = Column(String)
    module_name = Column(String)
    category = Column(String)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
