from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from database import get_db
from models.users import User
from models.inventory import Medicine, Batch
from models.sales import Sale, SaleItem
from models.crm import Customer
from models.enterprise.branch import PharmacyBranch
from api.v1.endpoints.auth import get_current_user
from services.analytics_service import AnalyticsService
from services.market_intelligence import MarketIntelligenceService
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
def get_expiry_radar(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    # Filter for items where expiry_date is between today and exactly 90 days from today.
    today = datetime.now().date()
    ninety_days_from_now = today + timedelta(days=90)
    
    q = db.query(Batch).join(Medicine).filter(
        Batch.tenant_id == scope.tenant_id,
        Batch.expiry_date >= today,
        Batch.expiry_date <= ninety_days_from_now
    )
    if scope.branch_id:
        q = q.filter(Batch.branch_id == scope.branch_id)
        
    batches = q.order_by(Batch.expiry_date.asc()).all()
    
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
def get_seasonal_trends(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    # Group the total quantity sold over the last 30 days by Medicine.season_type.
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    q = db.query(
        Medicine.season_type,
        func.sum(SaleItem.quantity).label("total_sales")
    ).join(SaleItem, SaleItem.medicine_id == Medicine.id)\
     .join(Sale, Sale.id == SaleItem.sale_id)\
     .filter(Sale.tenant_id == scope.tenant_id, Sale.sale_date >= thirty_days_ago)
     
    if scope.branch_id:
        q = q.filter(Sale.branch_id == scope.branch_id)
        
    trends = q.group_by(Medicine.season_type).all()
     
    data = [
        {"season_type": t.season_type or "ALL-SEASON", "total_sales": float(t.total_sales or 0)}
        for t in trends
    ]
    return {"status": "success", "data": data}

@router.get("/fraud-detection")
def get_fraud_detection(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    # Query cashiers with high rates of VOID transactions today
    today = datetime.now().date()
    
    q = db.query(
        Sale.cashier_id,
        User.full_name,
        func.count(Sale.id).label("total_transactions"),
        func.sum(case((Sale.status == 'Voided', 1), else_=0)).label("void_count")
    ).join(User, User.id == Sale.cashier_id)\
     .filter(Sale.tenant_id == scope.tenant_id, func.date(Sale.sale_date) == today)
     
    if scope.branch_id:
        q = q.filter(Sale.branch_id == scope.branch_id)
        
    void_counts = q.group_by(Sale.cashier_id, User.full_name).all()
     
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
def get_geospatial(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    # Group the total sales volume by Customer.area_zone, Branch.city, or Branch.name
    resolved_zone = func.coalesce(Customer.area_zone, PharmacyBranch.city, PharmacyBranch.name, "Unspecified Area")
    
    q1 = db.query(
        resolved_zone.label("area_zone"),
        func.count(func.distinct(Customer.id)).label("total_customers"),
        func.sum(Sale.total_amount).label("total_sales")
    ).select_from(Sale)\
     .outerjoin(Customer, Sale.customer_id == Customer.id)\
     .join(PharmacyBranch, Sale.branch_id == PharmacyBranch.id)\
     .filter(Sale.tenant_id == scope.tenant_id)
     
    if scope.branch_id:
        q1 = q1.filter(Sale.branch_id == scope.branch_id)
        
    geo_stats = q1.group_by(resolved_zone).all()
     
    data = []
    for stat in geo_stats:
        area_zone = stat.area_zone
        
        # Get top medicines for this specific area
        q2 = db.query(
            Medicine.name,
            func.sum(SaleItem.quantity).label("qty")
        ).select_from(SaleItem)\
         .join(Medicine, SaleItem.medicine_id == Medicine.id)\
         .join(Sale, Sale.id == SaleItem.sale_id)\
         .outerjoin(Customer, Customer.id == Sale.customer_id)\
         .join(PharmacyBranch, Sale.branch_id == PharmacyBranch.id)\
         .filter(
             Sale.tenant_id == scope.tenant_id,
             func.coalesce(Customer.area_zone, PharmacyBranch.city, PharmacyBranch.name, "Unspecified Area") == area_zone
         )
         
        if scope.branch_id:
            q2 = q2.filter(Sale.branch_id == scope.branch_id)
            
        top_meds = q2.group_by(Medicine.name)\
         .order_by(func.sum(SaleItem.quantity).desc())\
         .limit(3).all()

        data.append({
            "area_zone": area_zone,
            "total_customers": int(stat.total_customers or 0),
            "total_sales": float(stat.total_sales or 0),
            "top_medicines": [{"name": m.name, "qty": int(m.qty)} for m in top_meds]
        })
        
    # Generate predictive insights using Real-Time Market API Service
    market_service = MarketIntelligenceService()
    insights = market_service.generate_insights(data)

    return {"status": "success", "data": {"regions": data, "insights": insights}}
