from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from core.deps import get_current_user
from models.users import User
from schemas.dashboard import (
    SalesOverviewSchema, InventoryOverviewSchema, ExpiryAlertSchema,
    LowStockAlertSchema, PurchaseSummarySchema, DashboardChartsSchema
)
import services.dashboard_service as dashboard_service
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(tags=["Dashboard"])

def get_dashboard_filters(user: User):
    """Determine branch_id and cashier_id filters based on user role."""
    branch_id = None
    cashier_id = None
    
    role_name = user.role.name if user.role else "Pharmacy Owner"
    
    if role_name == "Super Admin" or role_name == "Pharmacy Owner":
        # Full visibility, can optionally pass branch_id in query if we had one
        pass
    elif role_name == "Branch Manager":
        branch_id = user.branches[0].branch_id if user.branches else None
    elif role_name == "Cashier":
        branch_id = user.branches[0].branch_id if user.branches else None
        cashier_id = user.id
    elif role_name == "Inventory Manager":
        branch_id = user.branches[0].branch_id if user.branches else None
        
    return branch_id, cashier_id

@router.get("/overview", response_model=SalesOverviewSchema)
def get_sales_overview(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, cashier_id = get_dashboard_filters(current_user)
    return dashboard_service.get_sales_overview(
        db=db, 
        tenant_id=scope.tenant_id, 
        branch_id=branch_id, 
        cashier_id=cashier_id,
        from_date=from_date,
        to_date=to_date
    )

@router.get("/inventory", response_model=InventoryOverviewSchema)
def get_inventory_overview(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, _ = get_dashboard_filters(current_user)
    return dashboard_service.get_inventory_overview(db, scope.tenant_id, branch_id)

@router.get("/alerts/expiry", response_model=List[ExpiryAlertSchema])
def get_expiry_alerts(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, _ = get_dashboard_filters(current_user)
    return dashboard_service.get_expiry_alerts(db, scope.tenant_id, branch_id)

@router.get("/alerts/low-stock", response_model=List[LowStockAlertSchema])
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, _ = get_dashboard_filters(current_user)
    return dashboard_service.get_low_stock_alerts(db, scope.tenant_id, branch_id)

@router.get("/purchase-summary", response_model=PurchaseSummarySchema)
def get_purchase_summary(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, _ = get_dashboard_filters(current_user)
    return dashboard_service.get_purchase_summary(db, scope.tenant_id, branch_id)

@router.get("/charts", response_model=DashboardChartsSchema)
def get_charts(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    branch_id, cashier_id = get_dashboard_filters(current_user)
    return dashboard_service.get_charts_data(
        db=db, 
        tenant_id=scope.tenant_id, 
        branch_id=branch_id, 
        cashier_id=cashier_id,
        from_date=from_date,
        to_date=to_date
    )
