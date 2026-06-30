from .base import BaseModel
from .users import Tenant, Branch, Role, User, UserBranch
from .inventory import Category, Medicine, Batch, StockAdjustment, StockMovement
from .purchase import Supplier, PurchaseOrder, POItem, GRN, PurchaseInvoice, SupplierPayment, PurchaseReturn, SupplierLedger
from .crm import Customer, LoyaltyTransaction
from .prescription import Prescription, PrescriptionItem
from .sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger
from .audit import AuditLog
from .accounts import Account, JournalEntry, JournalEntryLine
from .hr import Department, Designation, Employee, Shift, Attendance, LeaveRequest, PayrollRun, PayrollLine
from .settings import TenantSettings, SystemModule
from .system import Notification, BackupHistory, OCRQueue
from .cash_register import CashSession, CashLedgerEntry

# Expose all models for Alembic
__all__ = [
    "BaseModel",
    "Tenant", "Branch", "Role", "User", "UserBranch",
    "Category", "Medicine", "Batch", "StockAdjustment", "StockMovement",
    "Supplier", "PurchaseOrder", "POItem", "GRN", "PurchaseInvoice",
    "SupplierPayment", "PurchaseReturn", "SupplierLedger",
    "Customer", "Prescription", "PrescriptionItem",
    "Sale", "SaleItem", "CustomerPayment", "SaleReturn", "CustomerLedger",
    "AuditLog",
    "Account", "JournalEntry", "JournalEntryLine",
    "Department", "Designation", "Employee", "Shift", "Attendance", "LeaveRequest", "PayrollRun", "PayrollLine",
    "TenantSettings", "SystemModule",
    "Notification", "BackupHistory", "OCRQueue",
    "CashSession", "CashLedgerEntry"
]
