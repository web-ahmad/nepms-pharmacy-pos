from fastapi import APIRouter
from api.v1.endpoints import (
    auth, inventory, purchase, sales, crm, prescription, dashboard, reports, inventory_audit, analytics, accounts, hr,
    settings, admin, notifications, system, cashier, print, master_data, medicine_master, hr_payroll_settings, audit
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(purchase.router, prefix="/purchase", tags=["purchase"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(prescription.router, prefix="/prescriptions", tags=["prescriptions"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(inventory_audit.router, prefix="/inventory-audit", tags=["inventory-audit"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(hr.router, prefix="/hr", tags=["hr"])
api_router.include_router(hr_payroll_settings.router, prefix="/hr/payroll-settings", tags=["hr-payroll-settings"])

# Phase 3.4
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(system.router, prefix="/system", tags=["system"])

# Cash Register / Cashier Portal
api_router.include_router(cashier.router, prefix="/cashier", tags=["cashier"])
api_router.include_router(print.router, prefix="/print", tags=["print"])

# Expenses
from api.v1.endpoints import expenses, petty_cash_categories
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(petty_cash_categories.router, prefix="/petty-cash-categories", tags=["petty-cash-categories"])

# Master Data & Medicine
api_router.include_router(master_data.router)
api_router.include_router(medicine_master.router)

# Audit
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])

