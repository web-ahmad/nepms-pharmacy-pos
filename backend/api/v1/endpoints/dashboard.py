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

from fastapi import HTTPException, status

def get_dashboard_filters(user: User, scope: PharmacyScope, query_branch_id: Optional[str] = None):
    """Determine branch_id and cashier_id filters based on scope and role."""
    # Use explicit query param if provided (e.g. for HQ viewing a specific branch), 
    # otherwise fallback to the active session's branch_id
    branch_id = query_branch_id or scope.branch_id
    
    if not branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch context required. Please select an active branch."
        )
        
    cashier_id = None
    role_name = user.role.name if user.role else "Pharmacy Owner"
    if role_name == "Cashier":
        cashier_id = user.id
        
    return branch_id, cashier_id

@router.get("/overview", response_model=SalesOverviewSchema)
def get_sales_overview(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, cashier_id = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_sales_overview(
        db=db, 
        tenant_id=scope.tenant_id, 
        branch_id=resolved_branch_id, 
        cashier_id=cashier_id,
        from_date=from_date,
        to_date=to_date
    )

@router.get("/inventory", response_model=InventoryOverviewSchema)
def get_inventory_overview(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, _ = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_inventory_overview(db, scope.tenant_id, resolved_branch_id)

@router.get("/alerts/expiry", response_model=List[ExpiryAlertSchema])
def get_expiry_alerts(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, _ = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_expiry_alerts(db, scope.tenant_id, resolved_branch_id)

@router.get("/alerts/low-stock", response_model=List[LowStockAlertSchema])
def get_low_stock_alerts(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, _ = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_low_stock_alerts(db, scope.tenant_id, resolved_branch_id)

@router.get("/purchase-summary", response_model=PurchaseSummarySchema)
def get_purchase_summary(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, _ = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_purchase_summary(db, current_user.tenant_id, resolved_branch_id)

@router.get("/charts", response_model=DashboardChartsSchema)
def get_charts(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user: User = Depends(get_current_user)
):
    resolved_branch_id, cashier_id = get_dashboard_filters(current_user, scope, branch_id)
    return dashboard_service.get_charts_data(
        db=db, 
        tenant_id=scope.tenant_id, 
        branch_id=resolved_branch_id, 
        cashier_id=cashier_id,
        from_date=from_date,
        to_date=to_date
    )
