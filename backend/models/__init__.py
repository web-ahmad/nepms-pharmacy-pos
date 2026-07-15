from .base import BaseModel
from .users import Tenant, Branch, Role, User, UserBranch
from .inventory import (
    Category, Medicine, Batch, StockAdjustment, StockMovement,
    WarehouseRack, WarehouseBin, StockTransfer, StockTransferItem,
    InventoryReservation, InventoryCycleCount, InventoryCycleCountItem
)
from .packaging import PackagingLevel
from .purchase import Supplier, PurchaseOrder, POItem, GRN, PurchaseInvoice, SupplierPayment, PurchaseReturn, SupplierLedger
from .crm import Customer, LoyaltyTransaction
from .prescription import Prescription, PrescriptionItem
from .sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger

from .accounts import (
    AccountCategory, Account, JournalEntry, JournalEntryLine, 
    BankAccount, BankTransaction, BankTransfer, Cheque, BankReconciliation, 
    FixedAsset, AssetDepreciation, TaxRule, FinancialClosing
)
from .hr import Department, Designation, Employee, Shift, Attendance, LeaveRequest, PayrollRun, PayrollLine
from .settings import TenantSettings, SystemModule
from .system import Notification, BackupHistory, OCRQueue
from .cash_register import CashSession, CashLedgerEntry, CashDrawer, PettyCashAccount, CashAdjustment
from .expenses import ExpenseCategory, ExpenseVoucher, PettyCashCategory, RecurringExpense
from .audit import AuditEvent, AlertHistory, CameraSnapshot, AlertConfig
from .master_data import (
    MasterGeneric, MasterBrand, MasterCategory, MasterManufacturer,
    MasterDosageForm, MasterStrength, MasterStrengthUnit, MasterRoute,
    MasterStorageCondition, MasterTaxRule, MasterPackaging, MasterUnit,
    MasterPrescriptionType, MasterFlavor, MasterAgeGroup, MasterSupplier,
    MasterWarehouse, MasterRack, MasterShelf, MasterBin
)
from .medicine_master import (
    MedicineMaster, MedicineTemplate, MedicinePackaging, MedicineConversionRule,
    MedicinePricing, MedicineSupplierMapping, MedicineBarcode, MedicineImage,
    MedicineDocument, MedicineAuditLog, MedicineVersion, MedicineCustomField,
    MedicineAiTag
)

# Expose all models for Alembic
__all__ = [
    "BaseModel",
    "Tenant", "Branch", "Role", "User", "UserBranch",
    "Category", "Medicine", "Batch", "StockAdjustment", "StockMovement", "PackagingLevel",
    "WarehouseRack", "WarehouseBin", "StockTransfer", "StockTransferItem",
    "InventoryReservation", "InventoryCycleCount", "InventoryCycleCountItem",
    "Supplier", "PurchaseOrder", "POItem", "GRN", "PurchaseInvoice",
    "SupplierPayment", "PurchaseReturn", "SupplierLedger",
    "Customer", "Prescription", "PrescriptionItem",
    "Sale", "SaleItem", "CustomerPayment", "SaleReturn", "CustomerLedger",
    "Account", "JournalEntry", "JournalEntryLine",
    "BankAccount", "BankTransaction", "BankTransfer", "Cheque", "BankReconciliation",
    "FixedAsset", "AssetDepreciation", "TaxRule", "FinancialClosing",
    "Department", "Designation", "Employee", "Shift", "Attendance", "LeaveRequest", "PayrollRun", "PayrollLine",
    "TenantSettings", "SystemModule",
    "Notification", "BackupHistory", "OCRQueue",
    "CashSession", "CashLedgerEntry", "CashDrawer", "PettyCashAccount", "CashAdjustment",
    "ExpenseCategory", "ExpenseVoucher", "PettyCashCategory", "RecurringExpense",
    "MasterGeneric", "MasterBrand", "MasterCategory", "MasterManufacturer",
    "MasterDosageForm", "MasterStrength", "MasterStrengthUnit", "MasterRoute",
    "MasterStorageCondition", "MasterTaxRule", "MasterPackaging", "MasterUnit",
    "MasterPrescriptionType", "MasterFlavor", "MasterAgeGroup", "MasterSupplier",
    "MasterWarehouse", "MasterRack", "MasterShelf", "MasterBin",
    "MedicineMaster", "MedicineTemplate", "MedicinePackaging", "MedicineConversionRule",
    "MedicinePricing", "MedicineSupplierMapping", "MedicineBarcode", "MedicineImage",
    "MedicineDocument", "MedicineAuditLog", "MedicineVersion", "MedicineCustomField",
    "MedicineAiTag",
    # Enterprise — Phase 1
    "PharmacyBranch", "BranchStaffAssignment",
    # Enterprise — Phase 2
    "EnterpriseUser", "EnterpriseRole", "EnterprisePermission", "EnterpriseRolePermission",
    "BranchUserAssignment", "UserSession", "UserTrustedDevice",
    "UserLoginHistory", "UserActivityLog", "UserApprovalRequest",
    # Enterprise — Phase 3 (Branch Operations & Configuration)
    "BranchConfiguration", "BranchWorkingHours", "BranchHoliday",
    "BranchWarehouse", "BranchCounter", "BranchPrinter", "BranchDevice",
    "BranchDocumentSeries", "BranchTaxSetting", "BranchPreference",
    "BranchLicense", "BranchFinancialAccount", "BranchPaymentMethod",
    "BranchNotificationSetting", "BranchBranding", "BranchPosConfig",
    "BranchSecuritySetting", "BranchBackupSetting",
    "BranchConfigAuditLog", "BranchHealthSnapshot",
]

from .billing import SubscriptionPlan, PharmacySubscription, PaymentTransaction


# Enterprise models — imported once here, enterprise/__init__ re-exports the same objects
from .enterprise.branch import PharmacyBranch, BranchStaffAssignment
from .enterprise.user import (
    EnterpriseUser, EnterpriseRole, EnterprisePermission, EnterpriseRolePermission,
    BranchUserAssignment, UserSession, UserTrustedDevice,
    UserLoginHistory, UserActivityLog, UserApprovalRequest,
)
# Phase 3 — Branch Operations & Configuration
from .enterprise.branch_configuration import (
    BranchConfiguration, BranchWorkingHours, BranchHoliday,
    BranchWarehouse, BranchCounter, BranchPrinter, BranchDevice,
    BranchDocumentSeries, BranchTaxSetting, BranchPreference,
    BranchLicense, BranchFinancialAccount, BranchPaymentMethod,
    BranchNotificationSetting, BranchBranding, BranchPosConfig,
    BranchSecuritySetting, BranchBackupSetting,
    BranchConfigAuditLog, BranchHealthSnapshot,
)
