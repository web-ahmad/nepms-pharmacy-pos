from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, select
from datetime import datetime, time, timedelta
import zoneinfo
from models.sales import Sale, SaleItem
from models.inventory import Medicine, Batch
from models.purchase import PurchaseOrder, GRN
from models.users import Tenant
from schemas.dashboard import (
    SalesOverviewSchema, InventoryOverviewSchema, ExpiryAlertSchema,
    LowStockAlertSchema, PurchaseSummarySchema, DashboardChartsSchema,
    ChartDataPoint, TopMedicinePoint, CategorySalesPoint
)

def get_utc_bounds(date_str: str, tz_name: str, is_end_of_day: bool = False):
    """Convert local date string (YYYY-MM-DD) to UTC datetime boundary."""
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        tz = zoneinfo.ZoneInfo("UTC")
    
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    if is_end_of_day:
        local_dt = datetime.combine(dt, time.max).replace(tzinfo=tz)
    else:
        local_dt = datetime.combine(dt, time.min).replace(tzinfo=tz)
        
    return local_dt.astimezone(zoneinfo.ZoneInfo("UTC")).replace(tzinfo=None)

def get_sales_overview(db: Session, tenant_id: str, branch_id: str = None, cashier_id: str = None, from_date: str = None, to_date: str = None) -> SalesOverviewSchema:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    tz_name = tenant.timezone if tenant and tenant.timezone else "UTC"

    query = db.query(
        func.sum(Sale.total_amount).label('net_sales'),
        func.sum(Sale.discount_amount).label('discounts'),
        func.sum(Sale.total_amount + Sale.discount_amount).label('gross_sales'),
        func.count(Sale.id).label('invoice_count')
    ).filter(Sale.status == "Completed")

    if branch_id:
        query = query.filter(Sale.branch_id == branch_id)
    if cashier_id:
        query = query.filter(Sale.cashier_id == cashier_id)

    if from_date:
        utc_from = get_utc_bounds(from_date, tz_name, is_end_of_day=False)
        query = query.filter(Sale.sale_date >= utc_from)
    if to_date:
        utc_to = get_utc_bounds(to_date, tz_name, is_end_of_day=True)
        query = query.filter(Sale.sale_date <= utc_to)

    result = query.first()
    
    net_sales = result.net_sales or 0.0
    discounts = result.discounts or 0.0
    gross_sales = result.gross_sales or 0.0
    invoice_count = result.invoice_count or 0
    avg_basket = (net_sales / invoice_count) if invoice_count > 0 else 0.0

    return SalesOverviewSchema(
        gross_sales=gross_sales,
        discounts_given=discounts,
        net_sales=net_sales,
        number_of_invoices=invoice_count,
        average_basket_size=avg_basket
    )

def get_inventory_overview(db: Session, tenant_id: str, branch_id: str = None) -> InventoryOverviewSchema:
    med_query = db.query(Medicine).filter(Medicine.tenant_id == tenant_id)
    batch_query = db.query(Batch).join(Medicine).filter(Medicine.tenant_id == tenant_id)
    
    if branch_id:
        batch_query = batch_query.filter(Batch.branch_id == branch_id)

    total_medicines = med_query.count()
    
    # Calculate stock valuation (current_qty * purchase_price)
    valuation_result = db.query(func.sum(Batch.current_quantity * Batch.purchase_price)).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.status == 'Active'
    )
    if branch_id:
        valuation_result = valuation_result.filter(Batch.branch_id == branch_id)
    
    stock_valuation = valuation_result.scalar() or 0.0

    now = datetime.utcnow()
    near_expiry_threshold = now + timedelta(days=90) # 3 months

    # Expired valuation
    exp_val_query = db.query(func.sum(Batch.current_quantity * Batch.purchase_price)).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.expiry_date < now.date(),
        Batch.current_quantity > 0
    )
    if branch_id:
        exp_val_query = exp_val_query.filter(Batch.branch_id == branch_id)
    expired_stock_value = exp_val_query.scalar() or 0.0

    # Near expiry valuation
    near_exp_val_query = db.query(func.sum(Batch.current_quantity * Batch.purchase_price)).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.expiry_date >= now.date(),
        Batch.expiry_date <= near_expiry_threshold.date(),
        Batch.current_quantity > 0
    )
    if branch_id:
        near_exp_val_query = near_exp_val_query.filter(Batch.branch_id == branch_id)
    near_expiry_value = near_exp_val_query.scalar() or 0.0

    # Dead stock count (Active, but 0 available quantity across batches)
    # This is a bit complex in SQLite. Let's just find medicines with 0 total quantity.
    # Simple approx:
    meds_with_stock = db.query(Medicine.id).join(Batch).filter(Batch.current_quantity > 0)
    if branch_id:
        meds_with_stock = meds_with_stock.filter(Batch.branch_id == branch_id)
    
    dead_stock_count = db.query(Medicine).filter(Medicine.tenant_id == tenant_id, ~Medicine.id.in_(meds_with_stock)).count()

    return InventoryOverviewSchema(
        total_medicines=total_medicines,
        stock_valuation=stock_valuation,
        expired_stock_value=expired_stock_value,
        near_expiry_value=near_expiry_value,
        dead_stock_count=dead_stock_count
    )

def get_expiry_alerts(db: Session, tenant_id: str, branch_id: str = None) -> list[ExpiryAlertSchema]:
    now = datetime.utcnow()
    near_expiry_threshold = now + timedelta(days=90)

    query = db.query(Batch, Medicine).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.current_quantity > 0,
        Batch.expiry_date <= near_expiry_threshold.date()
    )
    if branch_id:
        query = query.filter(Batch.branch_id == branch_id)
        
    query = query.order_by(Batch.expiry_date.asc()).limit(50)
    
    results = []
    for batch, medicine in query.all():
        results.append(ExpiryAlertSchema(
            medicine_id=medicine.id,
            medicine_name=medicine.name,
            batch_number=batch.batch_number,
            expiry_date=batch.expiry_date.strftime("%Y-%m-%d"),
            remaining_quantity=batch.current_quantity,
            stock_value=batch.current_quantity * batch.purchase_price
        ))
    return results

def get_low_stock_alerts(db: Session, tenant_id: str, branch_id: str = None) -> list[LowStockAlertSchema]:
    # Sum current quantities for medicines
    # SQLite doesn't have easy group_by with full relations in ORM sometimes, but let's do it cleanly
    meds = db.query(Medicine).filter(Medicine.tenant_id == tenant_id).all()
    
    results = []
    for med in meds:
        batch_query = db.query(func.sum(Batch.current_quantity)).filter(Batch.medicine_id == med.id)
        if branch_id:
            batch_query = batch_query.filter(Batch.branch_id == branch_id)
            
        total_qty = batch_query.scalar() or 0
        
        # We need a reorder_level on Medicine, if it doesn't exist we assume 10 for demonstration
        # Checking if reorder_level exists (it should per phase 1)
        min_level = getattr(med, 'reorder_level', 10) or 10
        
        if total_qty < min_level:
            results.append(LowStockAlertSchema(
                medicine_id=med.id,
                medicine_name=med.name,
                current_quantity=total_qty,
                minimum_level=min_level,
                suggested_reorder=min_level * 2 - total_qty
            ))
            
    # Sort by how critical they are
    results.sort(key=lambda x: x.current_quantity - x.minimum_level)
    return results[:50]

def get_purchase_summary(db: Session, tenant_id: str, branch_id: str = None) -> PurchaseSummarySchema:
    po_query = db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == tenant_id, PurchaseOrder.status.in_(['Draft', 'Submitted', 'Approved', 'Partially Received']))
    if branch_id:
        po_query = po_query.filter(PurchaseOrder.branch_id == branch_id)
        
    pending_pos = po_query.count()
    
    # Recent GRNs in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    grn_query = db.query(GRN).filter(GRN.tenant_id == tenant_id, GRN.created_at >= seven_days_ago)
    if branch_id:
        grn_query = grn_query.filter(GRN.branch_id == branch_id)
        
    recent_grns = grn_query.count()
    
    # We would need a SupplierPayment/PurchaseInvoice logic to calculate payable amount.
    # For now, placeholder query based on unpaid invoices
    payable_amount = 0.0 # Implement actual payable logic based on DB structure
    
    return PurchaseSummarySchema(
        pending_purchase_orders=pending_pos,
        recent_grns_count=recent_grns,
        supplier_payable_amount=payable_amount
    )

def get_charts_data(db: Session, tenant_id: str, branch_id: str = None, cashier_id: str = None, from_date: str = None, to_date: str = None) -> DashboardChartsSchema:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    tz_name = tenant.timezone if tenant and tenant.timezone else "UTC"

    # Setup base sale query
    sale_query = db.query(Sale).filter(Sale.status == "Completed")
    if branch_id:
        sale_query = sale_query.filter(Sale.branch_id == branch_id)
    if cashier_id:
        sale_query = sale_query.filter(Sale.cashier_id == cashier_id)
        
    if from_date:
        utc_from = get_utc_bounds(from_date, tz_name, is_end_of_day=False)
        sale_query = sale_query.filter(Sale.sale_date >= utc_from)
    if to_date:
        utc_to = get_utc_bounds(to_date, tz_name, is_end_of_day=True)
        sale_query = sale_query.filter(Sale.sale_date <= utc_to)
        
    sales = sale_query.all()
    
    # 1. Sales Trend
    trend_dict = {}
    for s in sales:
        # Convert sale_date back to tenant local time to group by date
        local_dt = s.sale_date.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(zoneinfo.ZoneInfo(tz_name))
        date_str = local_dt.strftime("%Y-%m-%d")
        trend_dict[date_str] = trend_dict.get(date_str, 0.0) + s.total_amount
        
    sales_trend = [ChartDataPoint(date=k, sales=v) for k, v in sorted(trend_dict.items())]
    
    # 2. Top Medicines
    # We need SaleItem joined with Sale
    item_query = db.query(
        Medicine.name,
        func.sum(SaleItem.quantity).label('qty'),
        func.sum(SaleItem.total).label('rev')
    ).select_from(SaleItem).join(Sale).join(Medicine).filter(Sale.status == "Completed", Medicine.tenant_id == tenant_id)
    
    if branch_id:
        item_query = item_query.filter(Sale.branch_id == branch_id)
    if cashier_id:
        item_query = item_query.filter(Sale.cashier_id == cashier_id)
        
    if from_date:
        item_query = item_query.filter(Sale.sale_date >= utc_from)
    if to_date:
        item_query = item_query.filter(Sale.sale_date <= utc_to)
        
    item_query = item_query.group_by(Medicine.name).order_by(desc('qty')).limit(10)
    top_items = item_query.all()
    top_medicines = [TopMedicinePoint(name=r.name, quantity=r.qty, revenue=r.rev) for r in top_items]
    
    # 3. Category Distribution
    # Assuming Medicine has category_id. We'll group by category name if available.
    # For now, let's just create a dummy or simplified version if category isn't directly easily joinable in one go.
    category_sales = [] # Left blank or implement later if category model is present
    
    return DashboardChartsSchema(
        sales_trend=sales_trend,
        top_medicines=top_medicines,
        category_sales=category_sales
    )
