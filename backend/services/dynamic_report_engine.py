from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc, Date, cast, String
from datetime import datetime, timedelta, date
from typing import Dict, Any, List

from models.sales import Sale, SaleItem
from models.inventory import Medicine, Batch, Category
from models.users import User
from models.crm import Customer
from models.purchase import Supplier, PurchaseInvoice, SupplierLedger, PurchaseReturn, PurchaseOrder, POItem
from models.cash_register import CashLedgerEntry
from models.expenses import ExpenseVoucher, ExpenseCategory
from schemas.reports import DateRangeParams, CustomReportPayload

class DynamicReportEngine:
    """
    Universal Dynamic Reporting Engine utilizing the Strategy Pattern.
    Maps a `report_id` to a highly-optimized SQLAlchemy strategy function.
    """
    def __init__(self, db: Session, current_user):
        self.db = db
        self.current_user = current_user
        
        # Strategy Registry
        self.strategies = {
            "executive_kpis": self._strategy_executive_kpis,
            "sales_trend": self._strategy_sales_trend,
            "top_medicines": self._strategy_top_medicines,
            "recent_alerts": self._strategy_recent_alerts,
            "inventory_valuation": self._strategy_inventory_valuation,
            "profit_and_loss": self._strategy_profit_and_loss,
            "sales_daily": self._strategy_sales_daily,
            "sales_category": self._strategy_sales_category,
            "sales_cashier": self._strategy_sales_cashier,
            "sales_discounts": self._strategy_sales_discounts,
            "sales_voided": self._strategy_sales_voided,
            "inventory_near_expiry": self._strategy_inventory_near_expiry,
            "inventory_expired": self._strategy_inventory_expired,
            "inventory_low_stock": self._strategy_inventory_low_stock,
            "inventory_velocity": self._strategy_inventory_velocity,
            "purchases_register": self._strategy_purchases_register,
            "supplier_ledger": self._strategy_supplier_ledger,
            "supplier_outstanding": self._strategy_supplier_outstanding,
            "purchases_returns": self._strategy_purchases_returns,
            "price_variation": self._strategy_price_variation,
            "cash_book": self._strategy_cash_book,
            "expenses_by_category": self._strategy_expenses_by_category,
            "tax_summary": self._strategy_tax_summary
        }

    def execute_report(self, report_id: str, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        if report_id not in self.strategies:
            raise ValueError(f"Report ID '{report_id}' is not implemented in the Dynamic Engine.")
            
        return self.strategies[report_id](tenant_id, params)

    def execute_custom_report(self, payload: CustomReportPayload, tenant_id: str) -> Dict[str, Any]:
        """Dynamically constructs a SQLAlchemy query based on the CustomReportPayload"""
        
        # 1. Base Entity Map
        entity_map = {
            "sales": Sale,
            "inventory": Medicine,
            "purchases": PurchaseInvoice
        }
        
        base_model = entity_map.get(payload.base_entity)
        if not base_model:
            raise ValueError(f"Invalid base_entity: {payload.base_entity}")

        # 2. Dynamic Columns and Joins
        query_columns = []
        needs_user_join = False
        needs_supplier_join = False
        
        for col in payload.selected_columns:
            if col == "cashier_name":
                query_columns.append(User.full_name.label("cashier_name"))
                needs_user_join = True
            elif col == "supplier_name":
                query_columns.append(Supplier.name.label("supplier_name"))
                needs_supplier_join = True
            elif hasattr(base_model, col):
                col_attr = getattr(base_model, col)
                if payload.group_by and col != payload.group_by:
                    # In a group by, wrap non-grouped numeric columns in func.sum()
                    if str(col_attr.type) in ['FLOAT', 'INTEGER', 'NUMERIC', 'Float', 'Integer']:
                        query_columns.append(func.sum(col_attr).label(col))
                    else:
                        query_columns.append(func.max(col_attr).label(col)) # Fallback
                else:
                    query_columns.append(col_attr.label(col))
            else:
                raise ValueError(f"Column {col} not found on entity {payload.base_entity}")
                
        # 3. Base Query
        query = self.db.query(*query_columns)
        
        if needs_user_join and payload.base_entity == "sales":
            query = query.outerjoin(User, Sale.cashier_id == User.id)
                
        if needs_supplier_join and payload.base_entity == "purchases":
            query = query.outerjoin(Supplier, PurchaseInvoice.supplier_id == Supplier.id)
                
        query = query.filter(base_model.tenant_id == tenant_id)
        
        # 4. Filters
        if payload.filters:
            for f in payload.filters:
                col_attr = getattr(base_model, f.column, None)
                if not col_attr:
                    continue
                if f.operator == "eq":
                    query = query.filter(col_attr == f.value)
                elif f.operator == "gt":
                    query = query.filter(col_attr > f.value)
                elif f.operator == "lt":
                    query = query.filter(col_attr < f.value)
                elif f.operator == "contains":
                    query = query.filter(col_attr.ilike(f"%{f.value}%"))
                
        # 5. Group By
        if payload.group_by:
            group_attr = getattr(base_model, payload.group_by, None)
            if group_attr:
                query = query.group_by(group_attr)

        results = query.all()
        
        # 6. Format Output
        columns_meta = []
        for col in payload.selected_columns:
            col_type = "string"
            if col in ["total_amount", "subtotal", "cost_price", "discount_amount", "tax_amount", "amount_paid", "current_stock"]:
                col_type = "currency" if "stock" not in col else "number"
            elif col in ["sale_date", "invoice_date", "created_at"]:
                col_type = "date"
            elif col in ["quantity", "current_stock", "reorder_level"]:
                col_type = "number"
                
            columns_meta.append({
                "key": col,
                "label": col.replace("_", " ").title(),
                "type": col_type
            })

        return {
            "metadata": {
                "report_id": "custom",
                "title": f"Custom Report: {payload.base_entity.title()}",
                "columns": columns_meta
            },
            "rows": [dict(r._mapping) for r in results]
        }
        
    # ---------------------------------------------------------
    # STRATEGIES
    # ---------------------------------------------------------

    def _strategy_executive_kpis(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Returns top-level KPIs for the Executive Dashboard"""
        # 1. Total Revenue
        revenue = self.db.query(func.sum(Sale.total_amount)).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed'
        ).scalar() or 0
        
        # 2. Net Profit (Revenue - COGS)
        cogs = self.db.query(func.sum(SaleItem.quantity * Medicine.cost_per_base_unit))\
            .select_from(SaleItem).join(Sale).join(Medicine)\
            .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed').scalar() or 0
        net_profit = revenue - cogs
        
        # 3. Low Stock Items
        low_stock_count = self.db.query(func.count(Medicine.id)).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.current_stock <= Medicine.reorder_level
        ).scalar() or 0
        
        # 4. Expiring Soon (Next 90 Days)
        threshold = date.today() + timedelta(days=90)
        expiring_count = self.db.query(func.count(Batch.id)).filter(
            Batch.tenant_id == tenant_id,
            Batch.expiry_date <= threshold,
            Batch.expiry_date >= date.today(),
            Batch.quantity > 0
        ).scalar() or 0

        # Note: We can add historical comparison logic here for the 'change' percentage later.
        
        return {
            "metadata": {
                "report_id": "executive_kpis",
                "title": "Executive KPIs",
                "columns": [
                    {"key": "title", "label": "Title", "type": "string"},
                    {"key": "value", "label": "Value", "type": "string"},
                    {"key": "change", "label": "Change", "type": "string"},
                    {"key": "trend", "label": "Trend", "type": "string"},
                    {"key": "critical", "label": "Critical", "type": "boolean"},
                ]
            },
            "rows": [
                {"title": "Total Revenue", "value": f"Rs {revenue:,.0f}", "change": "+0.0%", "trend": "up", "critical": False},
                {"title": "Net Profit", "value": f"Rs {net_profit:,.0f}", "change": "+0.0%", "trend": "up", "critical": False},
                {"title": "Low Stock Items", "value": str(low_stock_count), "change": "0", "trend": "down", "critical": False},
                {"title": "Expiring Soon", "value": str(expiring_count), "change": "0", "trend": "up", "critical": expiring_count > 0},
            ]
        }

    def _strategy_sales_trend(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Returns 30-Day Revenue Trend for Line Chart"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Aggregate sales by date
        trend_query = self.db.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.total_amount).label('sales')
        ).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == 'Completed',
            Sale.created_at >= start_date
        ).group_by(func.date(Sale.created_at)).order_by(func.date(Sale.created_at)).all()

        rows = []
        for row in trend_query:
            rows.append({
                "date": row.date.strftime("%b %d"),
                "sales": float(row.sales)
            })

        return {
            "metadata": {
                "report_id": "sales_trend",
                "title": "30-Day Revenue Trend",
                "columns": [
                    {"key": "date", "label": "Date", "type": "string"},
                    {"key": "sales", "label": "Sales", "type": "currency"},
                ]
            },
            "rows": rows
        }

    def _strategy_top_medicines(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Returns Top 5 Selling Medicines for Bar Chart"""
        query = self.db.query(
            Medicine.name.label('name'),
            func.sum(SaleItem.quantity).label('qty')
        ).select_from(SaleItem).join(Sale).join(Medicine)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')\
         .group_by(Medicine.name).order_by(desc('qty')).limit(5).all()

        return {
            "metadata": {
                "report_id": "top_medicines",
                "title": "Top Selling Medicines",
                "columns": [
                    {"key": "name", "label": "Medicine Name", "type": "string"},
                    {"key": "qty", "label": "Quantity Sold", "type": "number"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_recent_alerts(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Returns recent critical business alerts (Expiry, Low Stock)"""
        rows = []
        
        # Expiry Alerts
        threshold = date.today() + timedelta(days=30)
        expiring = self.db.query(Medicine.name, Batch.expiry_date).select_from(Batch).join(Medicine)\
            .filter(Batch.tenant_id == tenant_id, Batch.expiry_date <= threshold, Batch.quantity > 0).limit(3).all()
            
        for row in expiring:
            days = (row.expiry_date - date.today()).days
            status = 'critical' if days <= 15 else 'warning'
            rows.append({
                "type": "Expiry",
                "message": f"{row.name} expiring in {days} days",
                "status": status
            })
            
        # Low Stock Alerts
        low_stock = self.db.query(Medicine.name, Medicine.current_stock, Medicine.reorder_level)\
            .filter(Medicine.tenant_id == tenant_id, Medicine.current_stock <= Medicine.reorder_level).limit(3).all()
            
        for row in low_stock:
            rows.append({
                "type": "Stock",
                "message": f"{row.name} stock below reorder level ({row.current_stock} left)",
                "status": "warning"
            })

        return {
            "metadata": {
                "report_id": "recent_alerts",
                "title": "Critical Business Alerts",
                "columns": [
                    {"key": "type", "label": "Alert Type", "type": "string"},
                    {"key": "message", "label": "Description", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": rows
        }

    def _strategy_inventory_valuation(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Standard Inventory Valuation Report for UniversalDataTable"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            Medicine.current_stock.label('current_stock'),
            Medicine.cost_per_base_unit.label('unit_cost'),
            (Medicine.current_stock * Medicine.cost_per_base_unit).label('total_value')
        ).outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(Medicine.tenant_id == tenant_id, Medicine.current_stock > 0)\
         .order_by(desc('total_value')).all()
         
        return {
            "metadata": {
                "report_id": "inventory_valuation",
                "title": "Inventory Valuation",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "current_stock", "label": "Stock Qty", "type": "number"},
                    {"key": "unit_cost", "label": "Unit Cost", "type": "currency"},
                    {"key": "total_value", "label": "Total Value", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_profit_and_loss(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Standard P&L Report"""
        # Calculate Total Revenue
        sales_rev = self.db.query(func.sum(Sale.total_amount)).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed'
        ).scalar() or 0.0

        # Calculate COGS
        cogs = self.db.query(func.sum(SaleItem.cost_price * SaleItem.quantity)).join(Sale).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed'
        ).scalar() or 0.0

        # Calculate Total Expenses
        expenses = self.db.query(func.sum(ExpenseVoucher.amount)).filter(
            ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.status == 'Approved'
        ).scalar() or 0.0

        gross_profit = sales_rev - cogs
        net_profit = gross_profit - expenses

        return {
            "metadata": {
                "report_id": "profit_and_loss",
                "title": "Profit & Loss (P&L) Statement",
                "columns": [
                    {"key": "metric", "label": "Financial Metric", "type": "string"},
                    {"key": "amount", "label": "Amount", "type": "currency"}
                ]
            },
            "rows": [
                {"metric": "Total Sales Revenue", "amount": sales_rev},
                {"metric": "Cost of Goods Sold (COGS)", "amount": cogs},
                {"metric": "Gross Profit", "amount": gross_profit},
                {"metric": "Total Operational Expenses", "amount": expenses},
                {"metric": "Net Profit", "amount": net_profit}
            ]
        }

    def _strategy_sales_daily(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Daily Sales (Total, Cash, Credit)"""
        query = self.db.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.total_amount).label('total_revenue'),
            func.sum(case((Sale.payment_method == 'Cash', Sale.total_amount), else_=0)).label('cash_sales'),
            func.sum(case((Sale.payment_method == 'Credit', Sale.total_amount), else_=0)).label('credit_sales'),
        ).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed'
        ).group_by(func.date(Sale.created_at)).order_by(desc(func.date(Sale.created_at))).all()
        
        return {
            "metadata": {
                "report_id": "sales_daily",
                "title": "Daily Sales Report",
                "columns": [
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "total_revenue", "label": "Total Revenue", "type": "currency"},
                    {"key": "cash_sales", "label": "Cash Sales", "type": "currency"},
                    {"key": "credit_sales", "label": "Credit Sales", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_category(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Category Wise Sales"""
        query = self.db.query(
            Category.name.label('category'),
            func.sum(SaleItem.quantity).label('volume'),
            func.sum(SaleItem.total).label('revenue')
        ).select_from(SaleItem).join(Sale).join(Medicine).outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')\
         .group_by(Category.name).order_by(desc('revenue')).all()

        return {
            "metadata": {
                "report_id": "sales_category",
                "title": "Category-wise Sales",
                "columns": [
                    {"key": "category", "label": "Category Name", "type": "string"},
                    {"key": "volume", "label": "Total Volume Sold", "type": "number"},
                    {"key": "revenue", "label": "Total Revenue", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_cashier(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """User / Cashier Wise Sales"""
        query = self.db.query(
            User.full_name.label('cashier_name'),
            func.count(Sale.id).label('total_invoices'),
            func.sum(Sale.total_amount).label('total_revenue')
        ).join(User, Sale.cashier_id == User.id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Completed')\
         .group_by(User.full_name).order_by(desc('total_revenue')).all()

        return {
            "metadata": {
                "report_id": "sales_cashier",
                "title": "Cashier Performance",
                "columns": [
                    {"key": "cashier_name", "label": "Employee Name", "type": "string"},
                    {"key": "total_invoices", "label": "Bills Processed", "type": "number"},
                    {"key": "total_revenue", "label": "Total Revenue Collected", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_discounts(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Discount & Margins Report"""
        query = self.db.query(
            Sale.invoice_number.label('invoice_number'),
            func.date(Sale.created_at).label('date'),
            Sale.subtotal.label('subtotal'),
            Sale.discount_amount.label('discount_amount'),
            Sale.total_amount.label('total_amount')
        ).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed', Sale.discount_amount > 0
        ).order_by(desc(Sale.created_at)).limit(100).all()

        return {
            "metadata": {
                "report_id": "sales_discounts",
                "title": "Discounts Given",
                "columns": [
                    {"key": "invoice_number", "label": "Invoice #", "type": "string"},
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "subtotal", "label": "Subtotal", "type": "currency"},
                    {"key": "discount_amount", "label": "Discount Amount", "type": "currency"},
                    {"key": "total_amount", "label": "Final Amount", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_voided(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Cancelled / Void Bills Report"""
        query = self.db.query(
            Sale.invoice_number.label('invoice_number'),
            func.date(Sale.created_at).label('date'),
            Sale.total_amount.label('total_amount'),
            User.full_name.label('cashier_name'),
            Sale.notes.label('notes')
        ).outerjoin(User, Sale.cashier_id == User.id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Voided')\
         .order_by(desc(Sale.created_at)).all()

        return {
            "metadata": {
                "report_id": "sales_voided",
                "title": "Cancelled / Voided Bills",
                "columns": [
                    {"key": "invoice_number", "label": "Invoice #", "type": "string"},
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "total_amount", "label": "Amount", "type": "currency"},
                    {"key": "cashier_name", "label": "Voided By", "type": "string"},
                    {"key": "notes", "label": "Reason / Notes", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }
    def _strategy_inventory_near_expiry(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Near Expiry Alerts (Next 90 Days)"""
        threshold = date.today() + timedelta(days=90)
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Batch.batch_number,
            Batch.expiry_date,
            Batch.quantity.label('current_stock'),
            (Batch.quantity * Medicine.cost_per_base_unit).label('potential_loss')
        ).select_from(Batch).join(Medicine).filter(
            Batch.tenant_id == tenant_id,
            Batch.quantity > 0,
            Batch.expiry_date >= date.today(),
            Batch.expiry_date <= threshold
        ).order_by(Batch.expiry_date).all()

        return {
            "metadata": {
                "report_id": "inventory_near_expiry",
                "title": "Near Expiry Alerts (Next 90 Days)",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "batch_number", "label": "Batch Number", "type": "string"},
                    {"key": "expiry_date", "label": "Expiry Date", "type": "date"},
                    {"key": "current_stock", "label": "Remaining Qty", "type": "number"},
                    {"key": "potential_loss", "label": "Potential Value Loss", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_inventory_expired(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Expired Stock"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Batch.batch_number,
            Batch.expiry_date,
            Batch.quantity.label('current_stock'),
            (Batch.quantity * Medicine.cost_per_base_unit).label('financial_loss')
        ).select_from(Batch).join(Medicine).filter(
            Batch.tenant_id == tenant_id,
            Batch.quantity > 0,
            Batch.expiry_date < date.today()
        ).order_by(Batch.expiry_date).all()

        return {
            "metadata": {
                "report_id": "inventory_expired",
                "title": "Expired Dead Stock",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "batch_number", "label": "Batch Number", "type": "string"},
                    {"key": "expiry_date", "label": "Expired On", "type": "date"},
                    {"key": "current_stock", "label": "Dead Qty", "type": "number"},
                    {"key": "financial_loss", "label": "Financial Loss", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_inventory_low_stock(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Low Stock / Reorder Level"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            Medicine.current_stock,
            Medicine.reorder_level,
            case((Medicine.current_stock == 0, 'Out of Stock'), else_='Low Stock').label('status')
        ).outerjoin(Category, Medicine.category_id == Category.id).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.current_stock <= Medicine.reorder_level
        ).order_by(Medicine.current_stock).all()

        return {
            "metadata": {
                "report_id": "inventory_low_stock",
                "title": "Low Stock & Reorder Suggestions",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "current_stock", "label": "Current Stock", "type": "number"},
                    {"key": "reorder_level", "label": "Reorder Level", "type": "number"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_inventory_velocity(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Fast vs Slow Moving Stock (30 Days)"""
        start_date = date.today() - timedelta(days=30)
        
        # Subquery to aggregate sales in last 30 days
        sales_subq = self.db.query(
            SaleItem.medicine_id,
            func.sum(SaleItem.quantity).label('qty_sold')
        ).join(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == 'Completed',
            Sale.created_at >= start_date
        ).group_by(SaleItem.medicine_id).subquery()
        
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Medicine.current_stock,
            func.coalesce(sales_subq.c.qty_sold, 0).label('velocity'),
            case((func.coalesce(sales_subq.c.qty_sold, 0) == 0, 'Dead'),
                 (func.coalesce(sales_subq.c.qty_sold, 0) < 10, 'Slow'),
                 else_='Fast').label('movement')
        ).outerjoin(sales_subq, Medicine.id == sales_subq.c.medicine_id).filter(
            Medicine.tenant_id == tenant_id
        ).order_by(desc('velocity')).all()

        return {
            "metadata": {
                "report_id": "inventory_velocity",
                "title": "Stock Velocity (Last 30 Days)",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "current_stock", "label": "Current Stock", "type": "number"},
                    {"key": "velocity", "label": "30-Day Sales Vol.", "type": "number"},
                    {"key": "movement", "label": "Movement Speed", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }
    def _strategy_purchases_register(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Purchase Register"""
        query = self.db.query(
            PurchaseInvoice.invoice_number,
            PurchaseInvoice.invoice_date,
            Supplier.name.label('supplier_name'),
            PurchaseInvoice.total_amount,
            PurchaseInvoice.amount_paid,
            PurchaseInvoice.status
        ).join(Supplier, PurchaseInvoice.supplier_id == Supplier.id).filter(
            PurchaseInvoice.tenant_id == tenant_id
        ).order_by(desc(PurchaseInvoice.invoice_date)).all()

        return {
            "metadata": {
                "report_id": "purchases_register",
                "title": "Detailed Purchase Register",
                "columns": [
                    {"key": "invoice_number", "label": "Invoice #", "type": "string"},
                    {"key": "invoice_date", "label": "Date", "type": "date"},
                    {"key": "supplier_name", "label": "Supplier Name", "type": "string"},
                    {"key": "total_amount", "label": "Total Amount", "type": "currency"},
                    {"key": "amount_paid", "label": "Amount Paid", "type": "currency"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_ledger(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Ledger"""
        query = self.db.query(
            SupplierLedger.transaction_date,
            Supplier.name.label('supplier_name'),
            SupplierLedger.transaction_type,
            SupplierLedger.reference_id,
            SupplierLedger.debit,
            SupplierLedger.credit,
            SupplierLedger.balance_after
        ).join(Supplier, SupplierLedger.supplier_id == Supplier.id).filter(
            SupplierLedger.tenant_id == tenant_id
        ).order_by(desc(SupplierLedger.transaction_date)).all()

        return {
            "metadata": {
                "report_id": "supplier_ledger",
                "title": "Complete Supplier Ledger",
                "columns": [
                    {"key": "transaction_date", "label": "Date", "type": "date"},
                    {"key": "supplier_name", "label": "Supplier Name", "type": "string"},
                    {"key": "transaction_type", "label": "Type", "type": "badge"},
                    {"key": "reference_id", "label": "Ref #", "type": "string"},
                    {"key": "debit", "label": "Debit (+)", "type": "currency"},
                    {"key": "credit", "label": "Credit (-)", "type": "currency"},
                    {"key": "balance_after", "label": "Balance", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_outstanding(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Outstanding (Payables)"""
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            Supplier.contact_person,
            Supplier.phone,
            Supplier.current_balance
        ).filter(
            Supplier.tenant_id == tenant_id,
            Supplier.current_balance > 0
        ).order_by(desc(Supplier.current_balance)).all()

        return {
            "metadata": {
                "report_id": "supplier_outstanding",
                "title": "Outstanding Payables",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier Name", "type": "string"},
                    {"key": "contact_person", "label": "Contact Person", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "current_balance", "label": "Pending Amount", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_purchases_returns(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Purchase Returns"""
        query = self.db.query(
            PurchaseReturn.return_number,
            PurchaseReturn.return_date,
            Supplier.name.label('supplier_name'),
            PurchaseReturn.total_amount,
            PurchaseReturn.reason,
            PurchaseReturn.status
        ).join(Supplier, PurchaseReturn.supplier_id == Supplier.id).filter(
            PurchaseReturn.tenant_id == tenant_id
        ).order_by(desc(PurchaseReturn.return_date)).all()

        return {
            "metadata": {
                "report_id": "purchases_returns",
                "title": "Purchase Returns & Debits",
                "columns": [
                    {"key": "return_number", "label": "Return #", "type": "string"},
                    {"key": "return_date", "label": "Date", "type": "date"},
                    {"key": "supplier_name", "label": "Supplier Name", "type": "string"},
                    {"key": "total_amount", "label": "Amount Returned", "type": "currency"},
                    {"key": "reason", "label": "Reason", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_price_variation(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Price Variation Report"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            func.min(POItem.unit_price).label('min_price'),
            func.max(POItem.unit_price).label('max_price'),
            func.avg(POItem.unit_price).label('avg_price')
        ).select_from(POItem).join(Medicine).join(PurchaseOrder).filter(
            PurchaseOrder.tenant_id == tenant_id
        ).group_by(Medicine.name).having(func.max(POItem.unit_price) > func.min(POItem.unit_price)).all()

        return {
            "metadata": {
                "report_id": "price_variation",
                "title": "Purchase Price Variations",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "min_price", "label": "Lowest Price", "type": "currency"},
                    {"key": "max_price", "label": "Highest Price", "type": "currency"},
                    {"key": "avg_price", "label": "Average Price", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_cash_book(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Cash Book (Daybook)"""
        query = self.db.query(
            func.date(CashLedgerEntry.created_at).label('date'),
            CashLedgerEntry.entry_type,
            CashLedgerEntry.payment_mode,
            CashLedgerEntry.amount,
            CashLedgerEntry.notes
        ).filter(CashLedgerEntry.tenant_id == tenant_id).order_by(desc(CashLedgerEntry.created_at)).all()

        return {
            "metadata": {
                "report_id": "cash_book",
                "title": "Cash Book (Daybook)",
                "columns": [
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "entry_type", "label": "Transaction Type", "type": "badge"},
                    {"key": "payment_mode", "label": "Payment Mode", "type": "string"},
                    {"key": "amount", "label": "Amount (+ In / - Out)", "type": "currency"},
                    {"key": "notes", "label": "Notes", "type": "string"}
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_expenses_by_category(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Expense Report"""
        query = self.db.query(
            ExpenseCategory.name.label('category_name'),
            func.sum(ExpenseVoucher.amount).label('total_amount'),
            func.count(ExpenseVoucher.id).label('voucher_count')
        ).select_from(ExpenseVoucher).join(ExpenseCategory, ExpenseVoucher.category_id == ExpenseCategory.id).filter(
            ExpenseVoucher.tenant_id == tenant_id,
            ExpenseVoucher.status == 'Approved'
        ).group_by(ExpenseCategory.name).order_by(desc('total_amount')).all()

        return {
            "metadata": {
                "report_id": "expenses_by_category",
                "title": "Expenses by Category",
                "columns": [
                    {"key": "category_name", "label": "Expense Category", "type": "string"},
                    {"key": "voucher_count", "label": "Total Vouchers", "type": "number"},
                    {"key": "total_amount", "label": "Total Amount Spent", "type": "currency"}
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_tax_summary(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Tax Summary (GST)"""
        output_tax = self.db.query(func.sum(Sale.tax_amount)).filter(
            Sale.tenant_id == tenant_id, Sale.status == 'Completed'
        ).scalar() or 0.0

        input_tax = self.db.query(func.sum(PurchaseInvoice.tax_amount)).filter(
            PurchaseInvoice.tenant_id == tenant_id
        ).scalar() or 0.0

        return {
            "metadata": {
                "report_id": "tax_summary",
                "title": "Tax Summary (Output vs Input)",
                "columns": [
                    {"key": "tax_type", "label": "Tax Metric", "type": "string"},
                    {"key": "amount", "label": "Amount", "type": "currency"}
                ]
            },
            "rows": [
                {"tax_type": "Output Tax (Tax Collected on Sales)", "amount": output_tax},
                {"tax_type": "Input Tax (Tax Paid on Purchases)", "amount": input_tax},
                {"tax_type": "Net Tax Liability (Output - Input)", "amount": output_tax - input_tax}
            ]
        }
