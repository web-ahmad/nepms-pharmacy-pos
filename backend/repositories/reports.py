from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from models.sales import Sale, SaleItem, CustomerLedger
from models.inventory import Medicine, Category, Batch
from models.purchase import PurchaseOrder, POItem, Supplier
from models.crm import Customer, LoyaltyTransaction
from models.users import User
from models.prescription import Prescription
from schemas.reports import DateRangeParams
from typing import List, Dict, Any
from datetime import datetime

class ReportsRepository:
    def __init__(self, db: Session):
        self.db = db

    def _apply_date_filters(self, query, date_column, params: DateRangeParams):
        return query.filter(
            func.date(date_column) >= params.start_date,
            func.date(date_column) <= params.end_date
        )

    def _apply_scope_filters(self, query, model, params: DateRangeParams):
        if params.branch_id:
            query = query.filter(model.branch_id == params.branch_id)
        if params.warehouse_id and hasattr(model, 'warehouse_id'):
            query = query.filter(model.warehouse_id == params.warehouse_id)
        return query

    # ------------------- SALES REPORTS -------------------
    def get_sales_summary(self, tenant_id: str, params: DateRangeParams, group_by_period: str = 'day'):
        """Daily, Weekly, Monthly, Yearly Sales depending on group_by_period ('day', 'month', 'year')"""
        dialect = self.db.bind.dialect.name
        if group_by_period == 'day':
            date_expr = func.date(Sale.created_at)
        elif group_by_period == 'month':
            date_expr = func.strftime('%Y-%m', Sale.created_at) if dialect == 'sqlite' else func.to_char(Sale.created_at, 'YYYY-MM')
        else: # year
            date_expr = func.strftime('%Y', Sale.created_at) if dialect == 'sqlite' else func.to_char(Sale.created_at, 'YYYY')

        query = self.db.query(
            date_expr.label('period'),
            func.count(Sale.id).label('invoice_count'),
            func.sum(Sale.subtotal).label('gross_sales'),
            func.sum(Sale.tax_amount).label('tax_collected'),
            func.sum(Sale.discount_amount).label('discounts'),
            func.sum(Sale.total_amount).label('net_sales'),
            func.sum(Sale.amount_paid).label('amount_paid')
        ).filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')
        
        with open("debug_reports.log", "a") as f:
            f.write(f"Querying for tenant {tenant_id}, params: start={params.start_date}, end={params.end_date}, branch={params.branch_id}\\n")
        
        query = self._apply_date_filters(query, Sale.created_at, params)
        query = self._apply_scope_filters(query, Sale, params)

        if params.cashier_id:
            query = query.filter(Sale.cashier_id == params.cashier_id)
            
        results = query.group_by('period').order_by('period').all()
        ret = [dict(r._mapping) for r in results]
        
        with open("debug_reports.log", "a") as f:
            f.write(f"Results: {ret}\\n")
            
        return ret

    def get_sales_by_medicine(self, tenant_id: str, params: DateRangeParams):
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            func.coalesce(Category.name, 'Uncategorized').label('category'),
            func.sum(SaleItem.quantity).label('qty_sold'),
            func.sum(SaleItem.subtotal).label('gross_revenue'),
            func.sum(SaleItem.discount).label('discount_given'),
            func.sum(SaleItem.subtotal - SaleItem.discount).label('net_revenue')
        ).select_from(SaleItem).join(Sale, Sale.id == SaleItem.sale_id)\
         .join(Medicine, Medicine.id == SaleItem.medicine_id)\
         .outerjoin(Category, Category.id == Medicine.category_id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')
         
        query = self._apply_date_filters(query, Sale.created_at, params)
        query = self._apply_scope_filters(query, Sale, params)
        results = query.group_by(Medicine.name, Category.name).order_by(desc('qty_sold')).all()
        return [dict(r._mapping) for r in results]

    def get_sales_by_category(self, tenant_id: str, params: DateRangeParams):
        query = self.db.query(
            func.coalesce(Category.name, 'Uncategorized').label('category'),
            func.sum(SaleItem.quantity).label('qty_sold'),
            func.sum(SaleItem.subtotal - SaleItem.discount).label('net_revenue')
        ).select_from(SaleItem).join(Sale, Sale.id == SaleItem.sale_id)\
         .join(Medicine, Medicine.id == SaleItem.medicine_id)\
         .outerjoin(Category, Category.id == Medicine.category_id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')
         
        query = self._apply_date_filters(query, Sale.created_at, params)
        query = self._apply_scope_filters(query, Sale, params)
        results = query.group_by(Category.name).order_by(desc('qty_sold')).all()
        return [dict(r._mapping) for r in results]

    # ------------------- INVENTORY REPORTS -------------------
    def get_current_stock_valuation(self, tenant_id: str):
        from models.inventory import Category, Batch
        
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            func.sum(Batch.current_quantity).label('stock_quantity'),
            func.avg(func.coalesce(Batch.purchase_price, Medicine.cost_per_base_unit)).label('unit_cost'),
            func.avg(func.coalesce(Batch.unit_selling_price, Medicine.unit_retail_price)).label('unit_price'),
            func.sum(Batch.current_quantity * func.coalesce(Batch.purchase_price, Medicine.cost_per_base_unit)).label('total_cost_value'),
            func.sum(Batch.current_quantity * func.coalesce(Batch.unit_selling_price, Medicine.unit_retail_price)).label('total_retail_value')
        ).outerjoin(Category, Medicine.category_id == Category.id)\
         .join(Batch, Batch.medicine_id == Medicine.id)\
         .filter(Medicine.tenant_id == tenant_id, Batch.status == 'Active', Batch.current_quantity > 0)
        
        results = query.group_by(Medicine.name, Category.name).order_by(desc('total_cost_value')).all()
        return [dict(r._mapping) for r in results]

    def get_low_stock_report(self, tenant_id: str):
        from models.inventory import Batch
        
        subq = self.db.query(
            Batch.medicine_id,
            func.sum(Batch.current_quantity).label('total_qty')
        ).filter(Batch.status == 'Active').group_by(Batch.medicine_id).subquery()

        query = self.db.query(
            Medicine.name.label('medicine_name'),
            func.coalesce(subq.c.total_qty, 0).label('stock_quantity'),
            Medicine.min_stock_level.label('min_stock_level'),
            Medicine.manufacturer.label('manufacturer'),
            func.coalesce(Medicine.min_stock_level - func.coalesce(subq.c.total_qty, 0), Medicine.min_stock_level).label('reorder_quantity'),
            (func.coalesce(Medicine.min_stock_level - func.coalesce(subq.c.total_qty, 0), Medicine.min_stock_level) * Medicine.cost_per_base_unit).label('reorder_cost')
        ).outerjoin(subq, Medicine.id == subq.c.medicine_id)\
         .filter(Medicine.tenant_id == tenant_id, func.coalesce(subq.c.total_qty, 0) <= Medicine.min_stock_level, Medicine.is_active == True)
        
        results = query.order_by('stock_quantity').all()
        return [dict(r._mapping) for r in results]

    def get_expiry_report(self, tenant_id: str, expired: bool = False):
        from models.inventory import Batch
        import datetime as dt
        from datetime import timedelta
        
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Batch.batch_number.label('batch_number'),
            Batch.expiry_date.label('expiry_date'),
            Batch.current_quantity.label('stock_quantity'),
            (Batch.current_quantity * func.coalesce(Batch.purchase_price, Medicine.cost_per_base_unit)).label('cost_value')
        ).join(Batch, Batch.medicine_id == Medicine.id)\
         .filter(Medicine.tenant_id == tenant_id, Batch.current_quantity > 0, Batch.status == 'Active')
        
        today = dt.datetime.now().date()
        
        if expired:
            query = query.filter(Batch.expiry_date < today)
        else:
            ninety_days_from_now = today + timedelta(days=90)
            query = query.filter(
                Batch.expiry_date >= today,
                Batch.expiry_date <= ninety_days_from_now
            )
            
        results = query.order_by(Batch.expiry_date).all()
        return [dict(r._mapping) for r in results]

    # ------------------- PURCHASE REPORTS -------------------
    def get_purchase_summary(self, tenant_id: str, params: DateRangeParams):
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            func.count(PurchaseOrder.id).label('po_count'),
            func.sum(PurchaseOrder.total_amount).label('total_purchased'),
            func.sum(case((PurchaseOrder.status == 'Completed', PurchaseOrder.total_amount), else_=0)).label('completed_amount')
        ).select_from(PurchaseOrder).join(Supplier, Supplier.id == PurchaseOrder.supplier_id)\
         .filter(PurchaseOrder.tenant_id == tenant_id)
        
        query = self._apply_date_filters(query, PurchaseOrder.created_at, params)
        query = self._apply_scope_filters(query, PurchaseOrder, params)
        results = query.group_by(Supplier.name).order_by(desc('total_purchased')).all()
        return [dict(r._mapping) for r in results]

    # ------------------- CRM REPORTS -------------------
    def get_customer_summary(self, tenant_id: str):
        query = self.db.query(
            Customer.full_name.label('customer_name'),
            Customer.phone.label('phone'),
            Customer.loyalty_points.label('loyalty_points'),
            Customer.current_balance.label('outstanding_balance')
        ).filter(Customer.tenant_id == tenant_id)
        
        results = query.order_by(desc('outstanding_balance')).all()
        return [dict(r._mapping) for r in results]

    # ------------------- PRESCRIPTION REPORTS -------------------
    def get_prescription_report(self, tenant_id: str, params: DateRangeParams):
        query = self.db.query(
            Prescription.doctor_name.label('doctor_name'),
            func.count(Prescription.id).label('total_prescriptions'),
            func.sum(case((Prescription.status == 'Active', 1), else_=0)).label('active'),
            func.sum(case((Prescription.status == 'Expired', 1), else_=0)).label('expired')
        ).filter(Prescription.tenant_id == tenant_id)
        
        query = self._apply_date_filters(query, Prescription.created_at, params)
        query = self._apply_scope_filters(query, Prescription, params)
        results = query.group_by(Prescription.doctor_name).order_by(desc('total_prescriptions')).all()
        return [dict(r._mapping) for r in results]

    # ------------------- FINANCIAL REPORTS -------------------
    def get_profit_and_loss(self, tenant_id: str, params: DateRangeParams):
        # Calculate Revenue
        sales_query = self.db.query(
            func.sum(Sale.total_amount).label('total_revenue'),
            func.sum(Sale.tax_amount).label('total_tax')
        ).filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')
        sales_query = self._apply_date_filters(sales_query, Sale.created_at, params)
        sales_query = self._apply_scope_filters(sales_query, Sale, params)
        sales_data = sales_query.first()
        
        # COGS (Cost of Goods Sold) approximation using Medicine cost_per_base_unit * sold qty
        cogs_query = self.db.query(
            func.sum(SaleItem.quantity * Medicine.cost_per_base_unit).label('cogs')
        ).select_from(SaleItem).join(Sale, Sale.id == SaleItem.sale_id)\
         .join(Medicine, Medicine.id == SaleItem.medicine_id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')
        cogs_query = self._apply_date_filters(cogs_query, Sale.created_at, params)
        cogs_query = self._apply_scope_filters(cogs_query, Sale, params)
        cogs_data = cogs_query.first()

        revenue = sales_data.total_revenue or 0
        tax = sales_data.total_tax or 0
        cogs = cogs_data.cogs or 0
        gross_profit = revenue - tax - cogs
        
        return {
            "Gross Revenue": round(revenue, 2),
            "Tax Collected": round(tax, 2),
            "Net Revenue": round(revenue - tax, 2),
            "Cost of Goods Sold (COGS)": round(cogs, 2),
            "Gross Profit": round(gross_profit, 2),
            "Gross Margin %": round((gross_profit / (revenue - tax)) * 100, 2) if (revenue - tax) > 0 else 0
        }
