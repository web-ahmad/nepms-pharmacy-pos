from sqlalchemy.orm import Session
from models.settings import TenantSettings, SystemModule
from schemas.settings import TenantSettingsUpdate, SystemModuleUpdate

class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_settings(self, tenant_id: str):
        settings = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not settings:
            settings = TenantSettings(tenant_id=tenant_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_settings(self, tenant_id: str, obj_in: TenantSettingsUpdate):
        settings = self.get_settings(tenant_id)
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
            
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_invoice_settings(self, tenant_id: str):
        from models.settings import InvoiceSettings
        settings = self.db.query(InvoiceSettings).filter(InvoiceSettings.tenant_id == tenant_id).first()
        if not settings:
            settings = InvoiceSettings(tenant_id=tenant_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_invoice_settings(self, tenant_id: str, obj_in):
        settings = self.get_invoice_settings(tenant_id)
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_modules(self, tenant_id: str):
        # Automatically seed default modules if empty
        modules = self.db.query(SystemModule).filter(SystemModule.tenant_id == tenant_id).all()
        if not modules:
            default_modules = [
                SystemModule(tenant_id=tenant_id, module_key="dashboard", module_name="Dashboard", category="Core"),
                SystemModule(tenant_id=tenant_id, module_key="reports", module_name="Reports", category="Core"),
                SystemModule(tenant_id=tenant_id, module_key="analytics", module_name="Analytics", category="Core"),
                SystemModule(tenant_id=tenant_id, module_key="audit", module_name="Audit Center", category="Core"),
                SystemModule(tenant_id=tenant_id, module_key="medicines", module_name="Medicines", category="Inventory"),
                SystemModule(tenant_id=tenant_id, module_key="inventory", module_name="Inventory", category="Inventory"),
                SystemModule(tenant_id=tenant_id, module_key="batches", module_name="Batches", category="Inventory"),
                SystemModule(tenant_id=tenant_id, module_key="stock_adjustments", module_name="Stock Adjustments", category="Inventory"),
                SystemModule(tenant_id=tenant_id, module_key="suppliers", module_name="Suppliers", category="Purchase"),
                SystemModule(tenant_id=tenant_id, module_key="purchase_orders", module_name="Purchase Orders", category="Purchase"),
                SystemModule(tenant_id=tenant_id, module_key="grn", module_name="GRN", category="Purchase"),
                SystemModule(tenant_id=tenant_id, module_key="purchase_invoices", module_name="Purchase Invoices", category="Purchase"),
                SystemModule(tenant_id=tenant_id, module_key="supplier_payments", module_name="Supplier Payments", category="Purchase"),
                SystemModule(tenant_id=tenant_id, module_key="pos", module_name="POS", category="Sales"),
                SystemModule(tenant_id=tenant_id, module_key="sales", module_name="Sales", category="Sales"),
                SystemModule(tenant_id=tenant_id, module_key="returns", module_name="Returns", category="Sales"),
                SystemModule(tenant_id=tenant_id, module_key="customers", module_name="Customers", category="CRM"),
                SystemModule(tenant_id=tenant_id, module_key="loyalty", module_name="Loyalty", category="CRM"),
                SystemModule(tenant_id=tenant_id, module_key="customer_ledger", module_name="Customer Ledger", category="CRM"),
                SystemModule(tenant_id=tenant_id, module_key="digital_rx", module_name="Digital Rx", category="Prescription"),
                SystemModule(tenant_id=tenant_id, module_key="prescription_uploads", module_name="Prescription Uploads", category="Prescription"),
                SystemModule(tenant_id=tenant_id, module_key="ocr_processing", module_name="OCR Processing", category="Prescription"),
                SystemModule(tenant_id=tenant_id, module_key="chart_of_accounts", module_name="Chart Of Accounts", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="journals", module_name="Journals", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="ledger", module_name="Ledger", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="trial_balance", module_name="Trial Balance", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="profit_loss", module_name="Profit & Loss", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="balance_sheet", module_name="Balance Sheet", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="cash_book", module_name="Cash Book", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="bank_book", module_name="Bank Book", category="Accounting"),
                SystemModule(tenant_id=tenant_id, module_key="employees", module_name="Employees", category="HR"),
                SystemModule(tenant_id=tenant_id, module_key="attendance", module_name="Attendance", category="HR"),
                SystemModule(tenant_id=tenant_id, module_key="leaves", module_name="Leaves", category="HR"),
                SystemModule(tenant_id=tenant_id, module_key="payroll", module_name="Payroll", category="HR"),
            ]
            self.db.add_all(default_modules)
            self.db.commit()
            modules = self.db.query(SystemModule).filter(SystemModule.tenant_id == tenant_id).all()
        return modules

    def update_module(self, tenant_id: str, module_id: str, obj_in: SystemModuleUpdate):
        mod = self.db.query(SystemModule).filter(SystemModule.tenant_id == tenant_id, SystemModule.id == module_id).first()
        if mod:
            mod.is_enabled = obj_in.is_enabled
            self.db.commit()
            self.db.refresh(mod)
        return mod
