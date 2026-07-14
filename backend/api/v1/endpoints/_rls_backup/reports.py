from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from database import get_db
from models.users import User
from api.v1.endpoints.auth import get_current_user
from schemas.reports import DateRangeParams
from services.reports_service import ReportsService

router = APIRouter()

def get_reports_service(db: Session = Depends(get_db)):
    return ReportsService(db)

def require_reports_view(current_user: User = Depends(get_current_user)):
    if "reports.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def require_reports_export(current_user: User = Depends(get_current_user)):
    if "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("/sales/summary")
def get_sales_summary(
    start_date: date,
    end_date: date,
    period: str = 'day',
    cashier_id: Optional[str] = None,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, cashier_id=cashier_id, export_format=export)
    return service.get_sales_summary(current_user.tenant_id, params, period)

@router.get("/sales/by-medicine")
def get_sales_by_medicine(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_sales_by_medicine(current_user.tenant_id, params)

@router.get("/sales/by-category")
def get_sales_by_category(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_sales_by_category(current_user.tenant_id, params)

@router.get("/inventory/valuation")
def get_inventory_valuation(
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    return service.get_inventory_valuation(current_user.tenant_id, export)

@router.get("/inventory/low-stock")
def get_low_stock(
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    return service.get_low_stock(current_user.tenant_id, export)

@router.get("/inventory/expiry")
def get_expiry(
    expired: bool = False,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    return service.get_expiry(current_user.tenant_id, expired, export)

@router.get("/purchases/summary")
def get_purchase_summary(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_purchase_summary(current_user.tenant_id, params)

@router.get("/crm/summary")
def get_customer_summary(
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    return service.get_customer_summary(current_user.tenant_id, export)

@router.get("/prescriptions/summary")
def get_prescription_report(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reports_view)
):
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_prescription_report(current_user.tenant_id, params)

@router.get("/financial/profit-and-loss")
def get_profit_and_loss(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Uses financial.view
    if "financial.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if export and "reports.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = ReportsService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_profit_and_loss(current_user.tenant_id, params)
