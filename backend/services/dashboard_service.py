from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, select
from datetime import datetime, time, timedelta
import zoneinfo
from models.sales import Sale, SaleItem
from models.inventory import Medicine, Batch
from models.purchase import PurchaseOrder, GRN
from models.users import Tenant, User
from schemas.dashboard import (
    SalesOverviewSchema, InventoryOverviewSchema, ExpiryAlertSchema,
    LowStockAlertSchema, PurchaseSummarySchema, DashboardChartsSchema,
    PaymentMethodPoint, HourlySalesPoint, SalesmanLeaderboardPoint
)
from models.purchase import PurchaseRequest, PurchaseApproval

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
    ).filter(Sale.status == "Completed", Sale.tenant_id == tenant_id)

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

    # Calculate COGS (Cost of Goods Sold)
    cogs_query = db.query(
        func.sum(SaleItem.quantity * Batch.purchase_price)
    ).select_from(SaleItem).join(Sale).join(Batch, SaleItem.batch_id == Batch.id).filter(
        Sale.status == "Completed",
        Sale.tenant_id == tenant_id
    )
    if branch_id:
        cogs_query = cogs_query.filter(Sale.branch_id == branch_id)
    if cashier_id:
        cogs_query = cogs_query.filter(Sale.cashier_id == cashier_id)
    if from_date:
        utc_from = get_utc_bounds(from_date, tz_name, is_end_of_day=False)
        cogs_query = cogs_query.filter(Sale.sale_date >= utc_from)
    if to_date:
        utc_to = get_utc_bounds(to_date, tz_name, is_end_of_day=True)
        cogs_query = cogs_query.filter(Sale.sale_date <= utc_to)
        
    cogs = cogs_query.scalar() or 0.0
    net_profit = net_sales - cogs
    profit_margin_percent = (net_profit / net_sales * 100) if net_sales > 0 else 0.0

    # Expiry Risk 90 Days Value
    now = datetime.utcnow()
    near_expiry_threshold = now + timedelta(days=90)
    expiry_val_query = db.query(func.sum(Batch.current_quantity * Batch.purchase_price)).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.expiry_date >= now.date(),
        Batch.expiry_date <= near_expiry_threshold.date(),
        Batch.current_quantity > 0
    )
    if branch_id:
        expiry_val_query = expiry_val_query.filter(Batch.branch_id == branch_id)
    expiry_risk_90_days_value = expiry_val_query.scalar() or 0.0

    # Dead Stock Capital (no sales in last 60 days)
    sixty_days_ago = now - timedelta(days=60)
    active_meds = db.query(SaleItem.medicine_id).join(Sale).filter(Sale.sale_date >= sixty_days_ago, Sale.tenant_id == tenant_id).distinct()
    dead_stock_query = db.query(func.sum(Batch.current_quantity * Batch.purchase_price)).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.current_quantity > 0,
        ~Medicine.id.in_(active_meds)
    )
    if branch_id:
        dead_stock_query = dead_stock_query.filter(Batch.branch_id == branch_id)
    dead_stock_capital = dead_stock_query.scalar() or 0.0

    # Today's Cash Drawer (only Cash payment method)
    today_utc_from = get_utc_bounds(now.strftime("%Y-%m-%d"), tz_name, is_end_of_day=False)
    cash_drawer_query = db.query(func.sum(Sale.amount_paid - Sale.change_due)).filter(
        Sale.status == "Completed",
        Sale.payment_method == "Cash",
        Sale.sale_date >= today_utc_from,
        Sale.tenant_id == tenant_id
    )
    if branch_id:
        cash_drawer_query = cash_drawer_query.filter(Sale.branch_id == branch_id)
    todays_cash_drawer = cash_drawer_query.scalar() or 0.0

    return SalesOverviewSchema(
        gross_sales=gross_sales,
        discounts_given=discounts,
        net_sales=net_sales,
        number_of_invoices=invoice_count,
        average_basket_size=avg_basket,
        net_profit=net_profit,
        profit_margin_percent=profit_margin_percent,
        expiry_risk_90_days_value=expiry_risk_90_days_value,
        dead_stock_capital=dead_stock_capital,
        todays_cash_drawer=todays_cash_drawer
    )

def get_inventory_overview(db: Session, tenant_id: str, branch_id: str = None) -> InventoryOverviewSchema:
    med_query = db.query(Medicine).filter(Medicine.tenant_id == tenant_id)
    batch_query = db.query(Batch).join(Medicine).filter(Medicine.tenant_id == tenant_id)
    
    if branch_id:
        batch_query = batch_query.filter(Batch.branch_id == branch_id)
        med_query = med_query.filter(Medicine.batches.any(and_(Batch.branch_id == branch_id, Batch.is_deleted == False)))

    total_medicines = med_query.count()
    
    valuation_result = db.query(
        func.sum(Batch.current_quantity * Batch.purchase_price).label("stock_val"),
        func.sum(Batch.reserved_quantity * Batch.purchase_price).label("reserved_val")
    ).select_from(Batch).join(Medicine).filter(
        Medicine.tenant_id == tenant_id,
        Batch.status == 'Active'
    )
    if branch_id:
        valuation_result = valuation_result.filter(Batch.branch_id == branch_id)
    
    val_res = valuation_result.first()
    stock_valuation = val_res.stock_val or 0.0
    reserved_value = val_res.reserved_val or 0.0
    available_value = stock_valuation - reserved_value

    # Placeholder for turnover (Cost of Goods Sold / Average Inventory)
    # For Phase 4, assuming a fixed metric or calculated from COGS vs Valuation
    inventory_turnover = 0.0
    if stock_valuation > 0:
        # Approximate COGS as 10% for example, or compute actual COGS over a period
        # Using a dummy value for the dashboard mockup
        inventory_turnover = 1.2 

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
        available_value=available_value,
        reserved_value=reserved_value,
        inventory_turnover=inventory_turnover,
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
    from models.purchase import PurchaseInvoice
    payable_query = db.query(func.sum(PurchaseInvoice.total_amount - PurchaseInvoice.amount_paid)).filter(
        PurchaseInvoice.tenant_id == tenant_id,
        PurchaseInvoice.status.in_(['Unpaid', 'Partially Paid'])
    )
    if branch_id:
        payable_query = payable_query.join(GRN, PurchaseInvoice.grn_id == GRN.id).filter(GRN.branch_id == branch_id)
    
    payable_amount = payable_query.scalar() or 0.0

    # Enterprise KPIs
    pr_query = db.query(PurchaseRequest).filter(PurchaseRequest.tenant_id == tenant_id, PurchaseRequest.status == 'Pending')
    if branch_id:
        pr_query = pr_query.filter(PurchaseRequest.branch_id == branch_id)
    pending_purchase_requests = pr_query.count()

    approval_query = db.query(PurchaseApproval).filter(PurchaseApproval.tenant_id == tenant_id, PurchaseApproval.status == 'Pending')
    # Can filter by branch_id if we join PurchaseOrder, but tenant_id is fine for now
    pending_approvals = approval_query.count()
    
    return PurchaseSummarySchema(
        pending_purchase_orders=pending_pos,
        recent_grns_count=recent_grns,
        supplier_payable_amount=payable_amount,
        pending_purchase_requests=pending_purchase_requests,
        pending_approvals=pending_approvals
    )

def get_charts_data(db: Session, tenant_id: str, branch_id: str = None, cashier_id: str = None, from_date: str = None, to_date: str = None) -> DashboardChartsSchema:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    tz_name = tenant.timezone if tenant and tenant.timezone else "UTC"

    # Setup base sale query
    sale_query = db.query(Sale).filter(Sale.status == "Completed", Sale.tenant_id == tenant_id)
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
    
    # Pre-fetch COGS for all relevant sales to calculate profit trend
    cogs_query = db.query(
        Sale.id,
        func.sum(SaleItem.quantity * Batch.purchase_price).label('cogs')
    ).select_from(SaleItem).join(Sale).join(Batch, SaleItem.batch_id == Batch.id).filter(
        Sale.status == "Completed",
        Sale.tenant_id == tenant_id
    )
    if branch_id:
        cogs_query = cogs_query.filter(Sale.branch_id == branch_id)
    if cashier_id:
        cogs_query = cogs_query.filter(Sale.cashier_id == cashier_id)
    if from_date:
        utc_from_chart = get_utc_bounds(from_date, tz_name, is_end_of_day=False)
        cogs_query = cogs_query.filter(Sale.sale_date >= utc_from_chart)
    if to_date:
        utc_to_chart = get_utc_bounds(to_date, tz_name, is_end_of_day=True)
        cogs_query = cogs_query.filter(Sale.sale_date <= utc_to_chart)
    cogs_query = cogs_query.group_by(Sale.id)
    cogs_map = {r.id: (r.cogs or 0.0) for r in cogs_query.all()}
    
    # 1. Sales & Profit Trend, and Hourly Sales
    trend_dict = {}
    hourly_dict = {}
    payment_dict = {}
    
    for s in sales:
        local_dt = s.sale_date.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(zoneinfo.ZoneInfo(tz_name))
        date_str = local_dt.strftime("%Y-%m-%d")
        hour_str = local_dt.strftime("%H:00")
        
        # Trend
        if date_str not in trend_dict:
            trend_dict[date_str] = {"sales": 0.0, "profit": 0.0}
        trend_dict[date_str]["sales"] += s.total_amount
        trend_dict[date_str]["profit"] += (s.total_amount - cogs_map.get(s.id, 0.0))
        
        # Hourly
        hourly_dict[hour_str] = hourly_dict.get(hour_str, 0.0) + s.total_amount
        
        # Payment Methods
        pm = s.payment_method or "Unknown"
        payment_dict[pm] = payment_dict.get(pm, 0.0) + s.total_amount
        
    sales_trend = [ChartDataPoint(date=k, sales=v["sales"], profit=v["profit"]) for k, v in sorted(trend_dict.items())]
    hourly_sales = [HourlySalesPoint(hour=k, sales=v) for k, v in sorted(hourly_dict.items())]
    payment_methods = [PaymentMethodPoint(method=k, amount=v) for k, v in sorted(payment_dict.items(), key=lambda x: x[1], reverse=True)]
    
    # 2. Top Medicines
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
        item_query = item_query.filter(Sale.sale_date >= get_utc_bounds(from_date, tz_name, is_end_of_day=False))
    if to_date:
        item_query = item_query.filter(Sale.sale_date <= get_utc_bounds(to_date, tz_name, is_end_of_day=True))
        
    item_query = item_query.group_by(Medicine.name).order_by(desc('rev')).limit(5)
    top_items = item_query.all()
    top_medicines = [TopMedicinePoint(name=r.name, quantity=r.qty, revenue=r.rev) for r in top_items]
    
    # 3. Category Distribution
    category_sales = []
    
    # 4. Salesman Leaderboard
    leaderboard_query = db.query(
        User.full_name.label("cashier_name"),
        func.sum(Sale.total_amount).label('total_rev')
    ).join(User, Sale.cashier_id == User.id).filter(Sale.status == "Completed", Sale.tenant_id == tenant_id)
    if branch_id:
        leaderboard_query = leaderboard_query.filter(Sale.branch_id == branch_id)
    if from_date:
        leaderboard_query = leaderboard_query.filter(Sale.sale_date >= get_utc_bounds(from_date, tz_name, is_end_of_day=False))
    if to_date:
        leaderboard_query = leaderboard_query.filter(Sale.sale_date <= get_utc_bounds(to_date, tz_name, is_end_of_day=True))
    
    leaderboard_query = leaderboard_query.group_by(User.full_name).order_by(desc('total_rev')).limit(10)
    leaderboard_results = leaderboard_query.all()
    
    salesman_leaderboard = [
        SalesmanLeaderboardPoint(
            cashier_name=r.cashier_name or "Unknown",
            total_revenue=r.total_rev,
            commissionable_sales=r.total_rev * 0.8  # Dummy approximation for commissionable sales
        ) for r in leaderboard_results
    ]
    
    return DashboardChartsSchema(
        sales_trend=sales_trend,
        top_medicines=top_medicines,
        category_sales=category_sales,
        payment_methods=payment_methods,
        hourly_sales=hourly_sales,
        salesman_leaderboard=salesman_leaderboard
    )
