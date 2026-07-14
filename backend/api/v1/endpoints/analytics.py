from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from database import get_db
from models.users import User
from models.inventory import Medicine, Batch
from models.sales import Sale, SaleItem
from models.crm import Customer
from api.v1.endpoints.auth import get_current_user
from services.analytics_service import AnalyticsService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

def require_analytics_view(current_user: User = Depends(get_current_user)):
    if "analytics.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("/dashboard")
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_view)
):
    service = AnalyticsService(db)
    return service.get_dashboard_kpis(scope.tenant_id)

@router.get("/expiry-radar")
def get_expiry_radar(db: Session = Depends(get_db)):
    # Filter for items where expiry_date is between today and exactly 90 days from today.
    today = datetime.now().date()
    ninety_days_from_now = today + timedelta(days=90)
    
    batches = db.query(Batch).join(Medicine).filter(
        Batch.expiry_date >= today,
        Batch.expiry_date <= ninety_days_from_now
    ).order_by(Batch.expiry_date.asc()).all()
    
    result = []
    for b in batches:
        days_left = (b.expiry_date - today).days
        result.append({
            "id": b.id,
            "name": b.medicine.name if b.medicine else "Unknown",
            "batch": b.batch_number,
            "current_stock": b.current_quantity,
            "expiry_date": str(b.expiry_date),
            "days_left": days_left
        })
        
    return {"status": "success", "data": result}

@router.get("/seasonal-trends")
def get_seasonal_trends(db: Session = Depends(get_db)):
    # Group the total quantity sold over the last 30 days by Medicine.season_type.
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    trends = db.query(
        Medicine.season_type,
        func.sum(SaleItem.quantity).label("total_sales")
    ).join(SaleItem, SaleItem.medicine_id == Medicine.id)\
     .join(Sale, Sale.id == SaleItem.sale_id)\
     .filter(Sale.sale_date >= thirty_days_ago)\
     .group_by(Medicine.season_type).all()
     
    data = [
        {"season_type": t.season_type or "ALL-SEASON", "total_sales": float(t.total_sales or 0)}
        for t in trends
    ]
    return {"status": "success", "data": data}

@router.get("/fraud-detection")
def get_fraud_detection(db: Session = Depends(get_db)):
    # Query cashiers with high rates of VOID transactions today
    today = datetime.now().date()
    
    void_counts = db.query(
        Sale.cashier_id,
        User.full_name,
        func.count(Sale.id).label("total_transactions"),
        func.sum(case((Sale.status == 'Voided', 1), else_=0)).label("void_count")
    ).join(User, User.id == Sale.cashier_id)\
     .filter(func.date(Sale.sale_date) == today)\
     .group_by(Sale.cashier_id, User.full_name).all()
     
    data = []
    for vc in void_counts:
        v_count = int(vc.void_count or 0)
        t_count = int(vc.total_transactions or 0)
        void_rate = f"{(v_count / t_count * 100):.1f}%" if t_count > 0 else "0%"
        data.append({
            "cashier_id": vc.cashier_id,
            "name": vc.full_name,
            "void_count": v_count,
            "total_transactions": t_count,
            "void_rate": void_rate,
            "is_suspicious": v_count > 3
        })
    return {"status": "success", "data": data}

@router.get("/geospatial")
def get_geospatial(db: Session = Depends(get_db)):
    # Group the total sales volume by Customer.area_zone
    geo_stats = db.query(
        Customer.area_zone,
        func.count(Customer.id).label("total_customers"),
        func.sum(Sale.total_amount).label("total_sales")
    ).join(Sale, Sale.customer_id == Customer.id)\
     .group_by(Customer.area_zone).all()
     
    data = []
    for stat in geo_stats:
        data.append({
            "area_zone": stat.area_zone or "Unknown",
            "total_customers": int(stat.total_customers or 0),
            "total_sales": float(stat.total_sales or 0)
        })
    return {"status": "success", "data": data}
