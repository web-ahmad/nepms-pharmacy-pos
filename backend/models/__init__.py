from .base import BaseModel
from .users import Tenant, Branch, Role, User, UserBranch
from .inventory import Category, Medicine, Batch, StockAdjustment, StockMovement
from .packaging import PackagingLevel
from .purchase import Supplier, PurchaseOrder, POItem, GRN, PurchaseInvoice, SupplierPayment, PurchaseReturn, SupplierLedger
from .crm import Customer, LoyaltyTransaction
from .prescription import Prescription, PrescriptionItem
from .sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger

from .accounts import Account, JournalEntry, JournalEntryLine
from .hr import Department, Designation, Employee, Shift, Attendance, LeaveRequest, PayrollRun, PayrollLine
from .settings import TenantSettings, SystemModule
from .system import Notification, BackupHistory, OCRQueue
from .cash_register import CashSession, CashLedgerEntry
from .expenses import ExpenseVoucher
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
    "Supplier", "PurchaseOrder", "POItem", "GRN", "PurchaseInvoice",
    "SupplierPayment", "PurchaseReturn", "SupplierLedger",
    "Customer", "Prescription", "PrescriptionItem",
    "Sale", "SaleItem", "CustomerPayment", "SaleReturn", "CustomerLedger",
    "Account", "JournalEntry", "JournalEntryLine",
    "Department", "Designation", "Employee", "Shift", "Attendance", "LeaveRequest", "PayrollRun", "PayrollLine",
    "TenantSettings", "SystemModule",
    "Notification", "BackupHistory", "OCRQueue",
    "CashSession", "CashLedgerEntry",
    "ExpenseVoucher",
    "MasterGeneric", "MasterBrand", "MasterCategory", "MasterManufacturer",
    "MasterDosageForm", "MasterStrength", "MasterStrengthUnit", "MasterRoute",
    "MasterStorageCondition", "MasterTaxRule", "MasterPackaging", "MasterUnit",
    "MasterPrescriptionType", "MasterFlavor", "MasterAgeGroup", "MasterSupplier",
    "MasterWarehouse", "MasterRack", "MasterShelf", "MasterBin",
    "MedicineMaster", "MedicineTemplate", "MedicinePackaging", "MedicineConversionRule",
    "MedicinePricing", "MedicineSupplierMapping", "MedicineBarcode", "MedicineImage",
    "MedicineDocument", "MedicineAuditLog", "MedicineVersion", "MedicineCustomField",
    "MedicineAiTag"
]
