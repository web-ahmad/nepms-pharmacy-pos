from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc, Date, cast, String, extract
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional

from models.sales import Sale, SaleItem, SaleReturn
from models.inventory import Medicine, Batch, Category
from models.users import User
from models.crm import Customer, LoyaltyTransaction
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
            "sales_by_medicine": self._strategy_sales_by_medicine,
            "sales_best_sellers": self._strategy_sales_best_sellers,
            "sales_hourly": self._strategy_sales_hourly,
            "sales_monthly": self._strategy_sales_monthly,
            "sales_returns": self._strategy_sales_returns,
            "inventory_near_expiry": self._strategy_inventory_near_expiry,
            "inventory_expired": self._strategy_inventory_expired,
            "inventory_low_stock": self._strategy_inventory_low_stock,
            "inventory_velocity": self._strategy_inventory_velocity,
            "inventory_dead_stock": self._strategy_inventory_dead_stock,
            "inventory_batch_wise": self._strategy_inventory_batch_wise,
            "purchases_register": self._strategy_purchases_register,
            "supplier_ledger": self._strategy_supplier_ledger,
            "supplier_outstanding": self._strategy_supplier_outstanding,
            "supplier_master": self._strategy_supplier_master,
            "supplier_ranking": self._strategy_supplier_ranking,
            "supplier_payment_history": self._strategy_supplier_payment_history,
            "supplier_invoice_aging": self._strategy_supplier_invoice_aging,
            "supplier_grn_summary": self._strategy_supplier_grn_summary,
            "supplier_medicine_catalog": self._strategy_supplier_medicine_catalog,
            "purchases_returns": self._strategy_purchases_returns,
            "price_variation": self._strategy_price_variation,
            "cash_book": self._strategy_cash_book,
            "expenses_by_category": self._strategy_expenses_by_category,
            "tax_summary": self._strategy_tax_summary,
            "customer_master": self._strategy_customer_master,
            "customer_top_spenders": self._strategy_customer_top_spenders,
            "customer_credit_list": self._strategy_customer_credit_list,
            "customer_loyalty": self._strategy_customer_loyalty,
            "staff_sales": self._strategy_staff_sales,
            "staff_voids": self._strategy_staff_voids,
            "staff_discounts": self._strategy_staff_discounts,
            # Advanced Sales Analytics
            "sales_payment_methods": self._strategy_sales_payment_methods,
            "sales_by_generic": self._strategy_sales_by_generic,
            "high_value_transactions": self._strategy_high_value_transactions,
            "discount_impact": self._strategy_discount_impact,
            # Advanced Inventory Analytics
            "inventory_abc_analysis": self._strategy_inventory_abc_analysis,
            "inventory_reorder_suggestions": self._strategy_inventory_reorder_suggestions,
            "inventory_category_wise": self._strategy_inventory_category_wise,
            "inventory_turnover": self._strategy_inventory_turnover,
            "medicine_expiry_calendar": self._strategy_medicine_expiry_calendar,
            # Financial Analytics
            "gross_margin_analysis": self._strategy_gross_margin_analysis,
            "daily_closing_report": self._strategy_daily_closing_report,
            # Customer Analytics
            "customer_new_vs_returning": self._strategy_customer_new_vs_returning,
            "customer_rfm": self._strategy_customer_rfm,
            # Operations
            "po_status_tracker": self._strategy_po_status_tracker,
            "prescription_sales": self._strategy_prescription_sales,
            "refund_rate_analysis": self._strategy_refund_rate_analysis,
            # HR & Payroll
            "hr_employee_directory": self._strategy_hr_employee_directory,
            "hr_attendance_summary": self._strategy_hr_attendance_summary,
            "hr_leave_report": self._strategy_hr_leave_report,
            "hr_payroll_summary": self._strategy_hr_payroll_summary,
            "hr_advance_salary": self._strategy_hr_advance_salary,
            "hr_department_headcount": self._strategy_hr_department_headcount,
            # Audit & Security
            "audit_event_log": self._strategy_audit_event_log,
            "audit_by_event_type": self._strategy_audit_by_event_type,
            "audit_by_staff": self._strategy_audit_by_staff,
            "audit_alert_history": self._strategy_audit_alert_history,
            "audit_high_severity": self._strategy_audit_high_severity,
            # Cash Register
            "cash_session_report": self._strategy_cash_session_report,
        }

    def execute_report(self, report_id: str, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        if report_id not in self.strategies:
            raise ValueError(f"Report ID '{report_id}' is not implemented in the Dynamic Engine.")
            
        return self.strategies[report_id](tenant_id, params)

    # ── Shared filter helpers ─────────────────────────────────────────────────

    def _sale_filters(self, tenant_id: str, params: DateRangeParams, extra_status: str = 'Completed'):
        """Return base Sale filter list: tenant + status + optional branch + optional date range."""
        filters = [Sale.tenant_id == tenant_id]
        if extra_status:
            filters.append(Sale.status == extra_status)
        if params and params.branch_id:
            filters.append(Sale.branch_id == params.branch_id)
        if params and params.start_date:
            filters.append(func.date(Sale.created_at) >= params.start_date)
        if params and params.end_date:
            filters.append(func.date(Sale.created_at) <= params.end_date)
        return filters

    def _apply_branch_date(self, query, model, params: DateRangeParams, date_col=None):
        """Apply branch_id and date range filters to any query on a model that has branch_id."""
        if params and params.branch_id and hasattr(model, 'branch_id'):
            query = query.filter(model.branch_id == params.branch_id)
        if date_col is not None and params:
            if params.start_date:
                query = query.filter(func.date(date_col) >= params.start_date)
            if params.end_date:
                query = query.filter(func.date(date_col) <= params.end_date)
        return query

    def _resolve_pharmacy_id(self, tenant_id: str) -> Optional[str]:
        """
        AuditEvent/AlertHistory are scoped by `pharmacy_id` (the SaaS Pharmacy.id),
        not the legacy `tenant_id` that the rest of this engine filters by. Bridge
        the two via Pharmacy.tenant_id so audit reports scope to the right pharmacy.
        """
        from models.users import Pharmacy
        pharmacy = self.db.query(Pharmacy).filter(Pharmacy.tenant_id == tenant_id).first()
        return pharmacy.id if pharmacy else None

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
            *self._sale_filters(tenant_id, params)
        ).scalar() or 0
        
        # 2. Net Profit (Revenue - COGS)
        cogs = self.db.query(func.sum(SaleItem.quantity * Medicine.cost_per_base_unit))\
            .select_from(SaleItem).join(Sale).join(Medicine)\
            .filter(*self._sale_filters(tenant_id, params)).scalar() or 0
        net_profit = revenue - cogs
        
        # 3. Low Stock Items
        low_stock_count = self.db.query(func.count(Medicine.id)).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.current_stock <= Medicine.min_stock_level
        ).scalar() or 0
        
        # 4. Expiring Soon (Next 90 Days)
        threshold = date.today() + timedelta(days=90)
        expiring_count = self.db.query(func.count(Batch.id)).filter(
            Batch.tenant_id == tenant_id,
            Batch.expiry_date <= threshold,
            Batch.expiry_date >= date.today(),
            Batch.current_quantity > 0
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
            *self._sale_filters(tenant_id, params),
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
         .filter(*self._sale_filters(tenant_id, params))\
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
            .filter(Batch.tenant_id == tenant_id, Batch.expiry_date <= threshold, Batch.current_quantity > 0).limit(3).all()
            
        for row in expiring:
            days = (row.expiry_date - date.today()).days
            status = 'critical' if days <= 15 else 'warning'
            rows.append({
                "type": "Expiry",
                "message": f"{row.name} expiring in {days} days",
                "status": status
            })
            
        # Low Stock Alerts
        low_stock = self.db.query(Medicine.name, Medicine.current_stock, Medicine.min_stock_level)\
            .filter(Medicine.tenant_id == tenant_id, Medicine.current_stock <= Medicine.min_stock_level).limit(3).all()
            
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
            *self._sale_filters(tenant_id, params)
        ).scalar() or 0.0

        # Calculate COGS
        cogs = self.db.query(func.sum(SaleItem.cost_price * SaleItem.quantity)).join(Sale).filter(
            *self._sale_filters(tenant_id, params)
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


    def _strategy_sales_trend(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Returns 30-Day Revenue Trend for Line Chart"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Aggregate sales by date
        trend_query = self.db.query(
            func.date(Sale.created_at).label('date'),
            func.sum(Sale.total_amount).label('sales')
        ).filter(
            *self._sale_filters(tenant_id, params),
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
         .filter(*self._sale_filters(tenant_id, params))\
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
            .filter(Batch.tenant_id == tenant_id, Batch.expiry_date <= threshold, Batch.current_quantity > 0).limit(3).all()
            
        for row in expiring:
            days = (row.expiry_date - date.today()).days
            status = 'critical' if days <= 15 else 'warning'
            rows.append({
                "type": "Expiry",
                "message": f"{row.name} expiring in {days} days",
                "status": status
            })
            
        # Low Stock Alerts
        low_stock = self.db.query(Medicine.name, Medicine.current_stock, Medicine.min_stock_level)\
            .filter(Medicine.tenant_id == tenant_id, Medicine.current_stock <= Medicine.min_stock_level).limit(3).all()
            
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
            *self._sale_filters(tenant_id, params)
        ).scalar() or 0.0

        # Calculate COGS
        cogs = self.db.query(func.sum(SaleItem.cost_price * SaleItem.quantity)).join(Sale).filter(
            *self._sale_filters(tenant_id, params)
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
        ).filter(*self._sale_filters(tenant_id, params))\
         .group_by(func.date(Sale.created_at)).order_by(desc(func.date(Sale.created_at))).all()
        
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
         .filter(*self._sale_filters(tenant_id, params))\
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
         .filter(*self._sale_filters(tenant_id, params))\
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
            *self._sale_filters(tenant_id, params), Sale.discount_amount > 0
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
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Voided', *([Sale.branch_id == params.branch_id] if params and params.branch_id else []))\
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
            Batch.current_quantity.label('current_stock'),
            (Batch.current_quantity * Medicine.cost_per_base_unit).label('potential_loss')
        ).select_from(Batch).join(Medicine).filter(
            Batch.tenant_id == tenant_id,
            Batch.current_quantity > 0,
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
            Batch.current_quantity.label('current_stock'),
            (Batch.current_quantity * Medicine.cost_per_base_unit).label('financial_loss')
        ).select_from(Batch).join(Medicine).filter(
            Batch.tenant_id == tenant_id,
            Batch.current_quantity > 0,
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
            Medicine.min_stock_level,
            case((Medicine.current_stock == 0, 'Out of Stock'), else_='Low Stock').label('status')
        ).outerjoin(Category, Medicine.category_id == Category.id).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.current_stock <= Medicine.min_stock_level
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
            *self._sale_filters(tenant_id, params),
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
            *self._sale_filters(tenant_id, params)
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

    # --------------------------------------------------------------
    # SALES Ã¯Â¿Â½ Extended Strategies
    # --------------------------------------------------------------

    def _strategy_sales_by_medicine(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Medicine-wise Sales Report"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            func.sum(SaleItem.quantity).label('qty_sold'),
            func.sum(SaleItem.total).label('revenue'),
            func.sum(SaleItem.cost_price * SaleItem.quantity).label('cogs'),
            func.sum(SaleItem.gross_profit).label('gross_profit'),
        ).select_from(SaleItem).join(Sale).join(Medicine)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(Medicine.name, Category.name)\
         .order_by(desc('revenue')).all()

        return {
            "metadata": {
                "report_id": "sales_by_medicine",
                "title": "Medicine-wise Sales Report",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "qty_sold", "label": "Qty Sold", "type": "number"},
                    {"key": "revenue", "label": "Revenue", "type": "currency"},
                    {"key": "cogs", "label": "COGS", "type": "currency"},
                    {"key": "gross_profit", "label": "Gross Profit", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_best_sellers(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Best Selling Medicines Ã¯Â¿Â½ Top 50 by Quantity"""
        limit = int(getattr(params, 'limit', 50)) if params else 50
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Medicine.generic_name.label('generic_name'),
            func.sum(SaleItem.quantity).label('qty_sold'),
            func.sum(SaleItem.total).label('revenue'),
        ).select_from(SaleItem).join(Sale).join(Medicine)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(Medicine.name, Medicine.generic_name)\
         .order_by(desc('qty_sold')).limit(limit).all()

        return {
            "metadata": {
                "report_id": "sales_best_sellers",
                "title": f"Best Selling Medicines (Top {limit})",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "generic_name", "label": "Generic Name", "type": "string"},
                    {"key": "qty_sold", "label": "Qty Sold", "type": "number"},
                    {"key": "revenue", "label": "Total Revenue", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_hourly(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Hourly Sales Analysis Ã¯Â¿Â½ Identify peak hours"""
        query = self.db.query(
            extract('hour', Sale.created_at).label('hour'),
            func.count(Sale.id).label('transactions'),
            func.sum(Sale.total_amount).label('revenue'),
        ).filter(
            *self._sale_filters(tenant_id, params)
        ).group_by(extract('hour', Sale.created_at))\
         .order_by('hour').all()

        rows = []
        for r in query:
            hour = int(r.hour)
            label = f"{hour:02d}:00 - {hour:02d}:59"
            rows.append({
                "hour": label,
                "transactions": r.transactions,
                "revenue": r.revenue or 0
            })

        return {
            "metadata": {
                "report_id": "sales_hourly",
                "title": "Hourly Sales Analysis (Peak Hours)",
                "columns": [
                    {"key": "hour", "label": "Hour", "type": "string"},
                    {"key": "transactions", "label": "Transactions", "type": "number"},
                    {"key": "revenue", "label": "Revenue", "type": "currency"},
                ]
            },
            "rows": rows
        }

    def _strategy_sales_monthly(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Month-wise Sales Summary"""
        query = self.db.query(
            func.strftime('%Y-%m', Sale.created_at).label('month'),
            func.count(Sale.id).label('total_bills'),
            func.sum(Sale.total_amount).label('revenue'),
            func.sum(Sale.discount_amount).label('discounts'),
            func.sum(Sale.tax_amount).label('tax_collected'),
        ).filter(
            *self._sale_filters(tenant_id, params)
        ).group_by(func.strftime('%Y-%m', Sale.created_at))\
         .order_by(desc('month')).all()

        return {
            "metadata": {
                "report_id": "sales_monthly",
                "title": "Monthly Sales Summary",
                "columns": [
                    {"key": "month", "label": "Month", "type": "string"},
                    {"key": "total_bills", "label": "Total Bills", "type": "number"},
                    {"key": "revenue", "label": "Total Revenue", "type": "currency"},
                    {"key": "discounts", "label": "Discounts Given", "type": "currency"},
                    {"key": "tax_collected", "label": "Tax Collected", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_returns(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Sales Returns & Refunds Analysis"""
        query = self.db.query(
            SaleReturn.return_number,
            func.date(SaleReturn.created_at).label('return_date'),
            Sale.invoice_number.label('original_invoice'),
            SaleReturn.total_amount.label('refund_amount'),
            SaleReturn.reason,
            SaleReturn.status,
            User.full_name.label('cashier_name'),
        ).join(Sale, SaleReturn.sale_id == Sale.id)\
         .outerjoin(User, SaleReturn.cashier_id == User.id)\
         .filter(Sale.tenant_id == tenant_id)\
         .order_by(desc(SaleReturn.created_at)).all()

        return {
            "metadata": {
                "report_id": "sales_returns",
                "title": "Sales Returns & Refunds",
                "columns": [
                    {"key": "return_number", "label": "Return #", "type": "string"},
                    {"key": "return_date", "label": "Date", "type": "date"},
                    {"key": "original_invoice", "label": "Original Invoice", "type": "string"},
                    {"key": "refund_amount", "label": "Refund Amount", "type": "currency"},
                    {"key": "reason", "label": "Reason", "type": "string"},
                    {"key": "cashier_name", "label": "Processed By", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # --------------------------------------------------------------
    # INVENTORY Ã¯Â¿Â½ Extended Strategies
    # --------------------------------------------------------------

    def _strategy_inventory_dead_stock(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Dead Stock Ã¯Â¿Â½ Items with zero sales in the last 90 days"""
        cutoff_date = date.today() - timedelta(days=90)

        sold_ids = self.db.query(SaleItem.medicine_id)\
            .join(Sale)\
            .filter(*self._sale_filters(tenant_id, params), Sale.created_at >= cutoff_date)\
            .distinct().subquery()

        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            Medicine.current_stock.label('current_stock'),
            Medicine.cost_per_base_unit.label('unit_cost'),
            (Medicine.current_stock * Medicine.cost_per_base_unit).label('locked_value'),
        ).outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(
            Medicine.tenant_id == tenant_id,
            Medicine.current_stock > 0,
            ~Medicine.id.in_(sold_ids)
         ).order_by(desc('locked_value')).all()

        return {
            "metadata": {
                "report_id": "inventory_dead_stock",
                "title": "Dead Stock Report (No Sales in 90 Days)",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "current_stock", "label": "Stock Qty", "type": "number"},
                    {"key": "unit_cost", "label": "Unit Cost", "type": "currency"},
                    {"key": "locked_value", "label": "Locked Value", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_inventory_batch_wise(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Batch-wise Stock Report"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Batch.batch_number,
            Batch.expiry_date,
            Batch.current_quantity.label('current_stock'),
            Batch.purchase_price.label('unit_cost'),
            (Batch.current_quantity * Batch.purchase_price).label('batch_value'),
            Batch.status,
        ).select_from(Batch).join(Medicine)\
         .filter(Batch.tenant_id == tenant_id, Batch.current_quantity > 0)\
         .order_by(Batch.expiry_date).all()

        return {
            "metadata": {
                "report_id": "inventory_batch_wise",
                "title": "Batch-wise Stock Report",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "batch_number", "label": "Batch #", "type": "string"},
                    {"key": "expiry_date", "label": "Expiry Date", "type": "date"},
                    {"key": "current_stock", "label": "Qty Available", "type": "number"},
                    {"key": "unit_cost", "label": "Purchase Price", "type": "currency"},
                    {"key": "batch_value", "label": "Batch Value", "type": "currency"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # --------------------------------------------------------------
    # CUSTOMER Ã¯Â¿Â½ Strategies
    # --------------------------------------------------------------

    def _strategy_customer_master(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Customer Master List"""
        query = self.db.query(
            Customer.full_name,
            Customer.phone,
            Customer.email,
            Customer.loyalty_tier,
            Customer.loyalty_points,
            Customer.current_balance,
            Customer.total_orders,
            Customer.lifetime_value,
            Customer.is_active,
        ).filter(Customer.tenant_id == tenant_id)\
         .order_by(Customer.full_name).all()

        return {
            "metadata": {
                "report_id": "customer_master",
                "title": "Customer Master List",
                "columns": [
                    {"key": "full_name", "label": "Customer Name", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "email", "label": "Email", "type": "string"},
                    {"key": "loyalty_tier", "label": "Tier", "type": "badge"},
                    {"key": "loyalty_points", "label": "Points", "type": "number"},
                    {"key": "current_balance", "label": "Credit Balance", "type": "currency"},
                    {"key": "total_orders", "label": "Total Orders", "type": "number"},
                    {"key": "lifetime_value", "label": "Lifetime Value", "type": "currency"},
                    {"key": "is_active", "label": "Active", "type": "boolean"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_customer_top_spenders(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Top Customers by Lifetime Value"""
        query = self.db.query(
            Customer.full_name,
            Customer.phone,
            Customer.loyalty_tier,
            Customer.total_orders,
            Customer.lifetime_value,
            Customer.average_basket,
        ).filter(
            Customer.tenant_id == tenant_id,
            Customer.lifetime_value > 0
        ).order_by(desc(Customer.lifetime_value)).limit(100).all()

        return {
            "metadata": {
                "report_id": "customer_top_spenders",
                "title": "Top Customers by Lifetime Spend",
                "columns": [
                    {"key": "full_name", "label": "Customer Name", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "loyalty_tier", "label": "Tier", "type": "badge"},
                    {"key": "total_orders", "label": "Total Orders", "type": "number"},
                    {"key": "lifetime_value", "label": "Lifetime Value", "type": "currency"},
                    {"key": "average_basket", "label": "Avg Basket Size", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_customer_credit_list(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Credit Customers with Outstanding Balance"""
        query = self.db.query(
            Customer.full_name,
            Customer.phone,
            Customer.email,
            Customer.credit_limit,
            Customer.current_balance,
        ).filter(
            Customer.tenant_id == tenant_id,
            Customer.current_balance > 0
        ).order_by(desc(Customer.current_balance)).all()

        return {
            "metadata": {
                "report_id": "customer_credit_list",
                "title": "Credit Customers Ã¯Â¿Â½ Outstanding Balances",
                "columns": [
                    {"key": "full_name", "label": "Customer Name", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "email", "label": "Email", "type": "string"},
                    {"key": "credit_limit", "label": "Credit Limit", "type": "currency"},
                    {"key": "current_balance", "label": "Outstanding Balance", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_customer_loyalty(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Loyalty Points Report"""
        query = self.db.query(
            Customer.full_name,
            Customer.phone,
            Customer.loyalty_tier,
            Customer.loyalty_points,
            Customer.total_orders,
        ).filter(
            Customer.tenant_id == tenant_id,
            Customer.loyalty_points > 0
        ).order_by(desc(Customer.loyalty_points)).all()

        return {
            "metadata": {
                "report_id": "customer_loyalty",
                "title": "Customer Loyalty Points Report",
                "columns": [
                    {"key": "full_name", "label": "Customer Name", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "loyalty_tier", "label": "Tier", "type": "badge"},
                    {"key": "loyalty_points", "label": "Points Balance", "type": "number"},
                    {"key": "total_orders", "label": "Total Purchases", "type": "number"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # --------------------------------------------------------------
    # STAFF PERFORMANCE Ã¯Â¿Â½ Strategies
    # --------------------------------------------------------------

    def _strategy_staff_sales(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Sales by Staff Member"""
        query = self.db.query(
            User.full_name.label('staff_name'),
            User.role.label('role'),
            func.count(Sale.id).label('total_bills'),
            func.sum(Sale.total_amount).label('total_revenue'),
            func.avg(Sale.total_amount).label('avg_bill_value'),
        ).join(Sale, Sale.cashier_id == User.id)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(User.full_name, User.role)\
         .order_by(desc('total_revenue')).all()

        return {
            "metadata": {
                "report_id": "staff_sales",
                "title": "Sales Performance by Staff",
                "columns": [
                    {"key": "staff_name", "label": "Staff Name", "type": "string"},
                    {"key": "role", "label": "Role", "type": "badge"},
                    {"key": "total_bills", "label": "Bills Processed", "type": "number"},
                    {"key": "total_revenue", "label": "Total Revenue", "type": "currency"},
                    {"key": "avg_bill_value", "label": "Avg Bill Value", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_staff_voids(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Void/Cancelled Bills by Staff"""
        query = self.db.query(
            User.full_name.label('staff_name'),
            func.count(Sale.id).label('void_count'),
            func.sum(Sale.total_amount).label('voided_value'),
        ).join(Sale, Sale.cashier_id == User.id)\
         .filter(Sale.tenant_id == tenant_id, Sale.status == 'Voided', *([Sale.branch_id == params.branch_id] if params and params.branch_id else []))\
         .group_by(User.full_name)\
         .order_by(desc('void_count')).all()

        return {
            "metadata": {
                "report_id": "staff_voids",
                "title": "Voided Transactions by Staff",
                "columns": [
                    {"key": "staff_name", "label": "Staff Name", "type": "string"},
                    {"key": "void_count", "label": "Voids Count", "type": "number"},
                    {"key": "voided_value", "label": "Voided Amount", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_staff_discounts(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Discounts Granted by Staff"""
        query = self.db.query(
            User.full_name.label('staff_name'),
            func.count(Sale.id).label('bills_with_discount'),
            func.sum(Sale.discount_amount).label('total_discounts_given'),
            func.avg(Sale.discount_amount).label('avg_discount_per_bill'),
        ).join(Sale, Sale.cashier_id == User.id)\
         .filter(
            *self._sale_filters(tenant_id, params),
            Sale.discount_amount > 0
         ).group_by(User.full_name)\
          .order_by(desc('total_discounts_given')).all()

        return {
            "metadata": {
                "report_id": "staff_discounts",
                "title": "Discounts Given by Staff",
                "columns": [
                    {"key": "staff_name", "label": "Staff Name", "type": "string"},
                    {"key": "bills_with_discount", "label": "Bills w/ Discount", "type": "number"},
                    {"key": "total_discounts_given", "label": "Total Discounts", "type": "currency"},
                    {"key": "avg_discount_per_bill", "label": "Avg Discount/Bill", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # ----------------------------------------------------------------
    # SUPPLIER REPORTS
    # ----------------------------------------------------------------

    def _strategy_supplier_master(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Master List"""
        from models.purchase import Supplier
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            Supplier.contact_person,
            Supplier.phone,
            Supplier.email,
            Supplier.region_name,
            Supplier.credit_limit,
            Supplier.current_balance,
            Supplier.is_active,
        ).filter(Supplier.tenant_id == tenant_id)\
         .order_by(Supplier.name).all()

        return {
            "metadata": {
                "report_id": "supplier_master",
                "title": "Supplier Master List",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier Name", "type": "string"},
                    {"key": "contact_person", "label": "Contact Person", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "email", "label": "Email", "type": "string"},
                    {"key": "region_name", "label": "Region", "type": "string"},
                    {"key": "credit_limit", "label": "Credit Limit", "type": "currency"},
                    {"key": "current_balance", "label": "Current Balance", "type": "currency"},
                    {"key": "is_active", "label": "Active", "type": "boolean"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_ranking(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Ranking by Purchase Value"""
        from models.purchase import Supplier, PurchaseInvoice
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            Supplier.phone,
            func.count(PurchaseInvoice.id).label('total_invoices'),
            func.sum(PurchaseInvoice.total_amount).label('total_purchased'),
            func.sum(PurchaseInvoice.amount_paid).label('total_paid'),
            func.sum(PurchaseInvoice.total_amount - PurchaseInvoice.amount_paid).label('outstanding_balance'),
        ).select_from(PurchaseInvoice)\
         .join(Supplier, PurchaseInvoice.supplier_id == Supplier.id)\
         .filter(Supplier.tenant_id == tenant_id)\
         .group_by(Supplier.name, Supplier.phone)\
         .order_by(desc('total_purchased')).all()

        return {
            "metadata": {
                "report_id": "supplier_ranking",
                "title": "Supplier Ranking by Purchase Value",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "total_invoices", "label": "Total Invoices", "type": "number"},
                    {"key": "total_purchased", "label": "Total Purchased", "type": "currency"},
                    {"key": "total_paid", "label": "Amount Paid", "type": "currency"},
                    {"key": "outstanding_balance", "label": "Outstanding", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_payment_history(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """All Payments Made to Suppliers"""
        from models.purchase import Supplier, SupplierPayment
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            SupplierPayment.payment_date,
            SupplierPayment.amount,
            SupplierPayment.payment_method,
            SupplierPayment.reference_number,
            SupplierPayment.notes,
        ).select_from(SupplierPayment)\
         .join(Supplier, SupplierPayment.supplier_id == Supplier.id)\
         .filter(Supplier.tenant_id == tenant_id)\
         .order_by(desc(SupplierPayment.payment_date)).all()

        return {
            "metadata": {
                "report_id": "supplier_payment_history",
                "title": "Supplier Payment History",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "payment_date", "label": "Payment Date", "type": "date"},
                    {"key": "amount", "label": "Amount Paid", "type": "currency"},
                    {"key": "payment_method", "label": "Method", "type": "badge"},
                    {"key": "reference_number", "label": "Reference #", "type": "string"},
                    {"key": "notes", "label": "Notes", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_invoice_aging(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Invoice Aging Ã¢â‚¬â€ Overdue Payables"""
        from models.purchase import Supplier, PurchaseInvoice
        from datetime import date
        today = date.today()

        invoices = self.db.query(
            Supplier.name.label('supplier_name'),
            PurchaseInvoice.invoice_number,
            PurchaseInvoice.invoice_date,
            PurchaseInvoice.due_date,
            PurchaseInvoice.total_amount,
            PurchaseInvoice.amount_paid,
            (PurchaseInvoice.total_amount - PurchaseInvoice.amount_paid).label('balance_due'),
            PurchaseInvoice.status,
        ).select_from(PurchaseInvoice)\
         .join(Supplier, PurchaseInvoice.supplier_id == Supplier.id)\
         .filter(
            Supplier.tenant_id == tenant_id,
            PurchaseInvoice.status != 'Paid'
         ).order_by(PurchaseInvoice.due_date).all()

        rows = []
        for inv in invoices:
            row = dict(inv._mapping)
            if inv.due_date:
                overdue_days = (today - inv.due_date).days
                if overdue_days <= 0:
                    row['aging_bucket'] = 'Current'
                elif overdue_days <= 30:
                    row['aging_bucket'] = '1-30 Days'
                elif overdue_days <= 60:
                    row['aging_bucket'] = '31-60 Days'
                elif overdue_days <= 90:
                    row['aging_bucket'] = '61-90 Days'
                else:
                    row['aging_bucket'] = '>90 Days'
                row['overdue_days'] = max(0, overdue_days)
            else:
                row['aging_bucket'] = 'No Due Date'
                row['overdue_days'] = 0
            rows.append(row)

        return {
            "metadata": {
                "report_id": "supplier_invoice_aging",
                "title": "Supplier Invoice Aging Ã¢â‚¬â€ Overdue Payables",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "invoice_number", "label": "Invoice #", "type": "string"},
                    {"key": "invoice_date", "label": "Invoice Date", "type": "date"},
                    {"key": "due_date", "label": "Due Date", "type": "date"},
                    {"key": "total_amount", "label": "Invoice Amount", "type": "currency"},
                    {"key": "amount_paid", "label": "Paid", "type": "currency"},
                    {"key": "balance_due", "label": "Balance Due", "type": "currency"},
                    {"key": "overdue_days", "label": "Overdue Days", "type": "number"},
                    {"key": "aging_bucket", "label": "Aging", "type": "badge"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": rows
        }

    def _strategy_supplier_grn_summary(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Goods Received Note (GRN) Summary per Supplier"""
        from models.purchase import Supplier, GRN
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            GRN.grn_number,
            GRN.received_date,
            GRN.total_amount,
            GRN.status,
        ).select_from(GRN)\
         .join(Supplier, GRN.supplier_id == Supplier.id)\
         .filter(Supplier.tenant_id == tenant_id)\
         .order_by(desc(GRN.received_date)).all()

        return {
            "metadata": {
                "report_id": "supplier_grn_summary",
                "title": "Goods Received Notes (GRN) by Supplier",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "grn_number", "label": "GRN #", "type": "string"},
                    {"key": "received_date", "label": "Received Date", "type": "date"},
                    {"key": "total_amount", "label": "GRN Value", "type": "currency"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_supplier_medicine_catalog(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Supplier Medicine Price Catalog"""
        from models.purchase import Supplier, SupplierMedicinePrice
        query = self.db.query(
            Supplier.name.label('supplier_name'),
            Medicine.name.label('medicine_name'),
            SupplierMedicinePrice.trade_price,
            SupplierMedicinePrice.exclusive_discount_percentage.label('discount_pct'),
            SupplierMedicinePrice.bonus_scheme_threshold.label('bonus_on'),
            SupplierMedicinePrice.delivery_lead_time_days.label('lead_days'),
        ).select_from(SupplierMedicinePrice)\
         .join(Supplier, SupplierMedicinePrice.supplier_id == Supplier.id)\
         .join(Medicine, SupplierMedicinePrice.medicine_id == Medicine.id)\
         .filter(Supplier.tenant_id == tenant_id)\
         .order_by(Supplier.name, Medicine.name).all()

        return {
            "metadata": {
                "report_id": "supplier_medicine_catalog",
                "title": "Supplier Medicine Price Catalog",
                "columns": [
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "medicine_name", "label": "Medicine", "type": "string"},
                    {"key": "trade_price", "label": "Trade Price", "type": "currency"},
                    {"key": "discount_pct", "label": "Discount %", "type": "number"},
                    {"key": "bonus_on", "label": "Bonus On (Qty)", "type": "number"},
                    {"key": "lead_days", "label": "Lead Time (Days)", "type": "number"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # ================================================================
    # ADVANCED ANALYTICS STRATEGIES
    # ================================================================

    # --- Sales Analytics ---

    def _strategy_sales_payment_methods(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Revenue Breakdown by Payment Method"""
        query = self.db.query(
            Sale.payment_method,
            func.count(Sale.id).label('transactions'),
            func.sum(Sale.total_amount).label('revenue'),
            func.avg(Sale.total_amount).label('avg_bill'),
        ).filter(
            *self._sale_filters(tenant_id, params),
            Sale.payment_method != None,
        ).group_by(Sale.payment_method)\
         .order_by(desc('revenue')).all()

        return {
            "metadata": {
                "report_id": "sales_payment_methods",
                "title": "Sales by Payment Method",
                "columns": [
                    {"key": "payment_method", "label": "Payment Method", "type": "badge"},
                    {"key": "transactions", "label": "Transactions", "type": "number"},
                    {"key": "revenue", "label": "Total Revenue", "type": "currency"},
                    {"key": "avg_bill", "label": "Avg Bill Value", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_sales_by_generic(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Sales Grouped by Generic Name (Active Ingredient)"""
        query = self.db.query(
            Medicine.generic_name,
            func.count(func.distinct(Medicine.id)).label('brands_sold'),
            func.sum(SaleItem.quantity).label('total_qty'),
            func.sum(SaleItem.total).label('total_revenue'),
        ).select_from(SaleItem)\
         .join(Sale)\
         .join(Medicine)\
         .filter(
            *self._sale_filters(tenant_id, params),
            Medicine.generic_name != None,
         ).group_by(Medicine.generic_name)\
          .order_by(desc('total_revenue')).all()

        return {
            "metadata": {
                "report_id": "sales_by_generic",
                "title": "Sales by Generic Name (Active Ingredient)",
                "columns": [
                    {"key": "generic_name", "label": "Generic Name", "type": "string"},
                    {"key": "brands_sold", "label": "Brands Sold", "type": "number"},
                    {"key": "total_qty", "label": "Total Qty", "type": "number"},
                    {"key": "total_revenue", "label": "Total Revenue", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_high_value_transactions(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """High-Value Transactions (Top 100 by amount)"""
        query = self.db.query(
            Sale.invoice_number,
            func.date(Sale.created_at).label('date'),
            Sale.total_amount,
            Sale.discount_amount,
            Sale.tax_amount,
            Sale.payment_method,
            User.full_name.label('cashier_name'),
            Customer.full_name.label('customer_name'),
        ).outerjoin(User, Sale.cashier_id == User.id)\
         .outerjoin(Customer, Sale.customer_id == Customer.id)\
         .filter(*self._sale_filters(tenant_id, params))\
         .order_by(desc(Sale.total_amount))\
         .limit(100).all()

        return {
            "metadata": {
                "report_id": "high_value_transactions",
                "title": "High-Value Transactions (Top 100)",
                "columns": [
                    {"key": "invoice_number", "label": "Invoice #", "type": "string"},
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "customer_name", "label": "Customer", "type": "string"},
                    {"key": "cashier_name", "label": "Cashier", "type": "string"},
                    {"key": "total_amount", "label": "Total Amount", "type": "currency"},
                    {"key": "discount_amount", "label": "Discount", "type": "currency"},
                    {"key": "payment_method", "label": "Method", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_discount_impact(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Discount Impact Analysis - Daily revenue lost to discounts"""
        query = self.db.query(
            func.date(Sale.created_at).label('date'),
            func.count(Sale.id).label('discounted_bills'),
            func.sum(Sale.discount_amount).label('total_discount_given'),
            func.sum(Sale.total_amount).label('net_revenue'),
            func.sum(Sale.total_amount + Sale.discount_amount).label('gross_before_discount'),
        ).filter(
            *self._sale_filters(tenant_id, params),
            Sale.discount_amount > 0,
        ).group_by(func.date(Sale.created_at))\
         .order_by(desc('date')).all()

        rows = []
        for r in query:
            row = dict(r._mapping)
            if r.gross_before_discount and r.gross_before_discount > 0:
                row['discount_pct'] = round((r.total_discount_given / r.gross_before_discount) * 100, 2)
            else:
                row['discount_pct'] = 0.0
            rows.append(row)

        return {
            "metadata": {
                "report_id": "discount_impact",
                "title": "Discount Impact Analysis",
                "columns": [
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "discounted_bills", "label": "Discounted Bills", "type": "number"},
                    {"key": "total_discount_given", "label": "Discount Given", "type": "currency"},
                    {"key": "net_revenue", "label": "Net Revenue", "type": "currency"},
                    {"key": "gross_before_discount", "label": "Gross (Before Discount)", "type": "currency"},
                    {"key": "discount_pct", "label": "Discount %", "type": "number"},
                ]
            },
            "rows": rows
        }

    # --- Inventory Analytics ---

    def _strategy_inventory_abc_analysis(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """ABC Analysis - Classify medicines by sales value contribution"""
        all_meds = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            func.sum(SaleItem.total).label('revenue'),
        ).select_from(SaleItem)\
         .join(Sale)\
         .join(Medicine)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(Medicine.name, Category.name)\
         .order_by(desc('revenue')).all()

        total = sum(r.revenue or 0 for r in all_meds)
        rows, running = [], 0.0
        for r in all_meds:
            running += r.revenue or 0
            pct = round((running / total * 100), 2) if total > 0 else 0
            rows.append({
                "medicine_name": r.medicine_name,
                "category": r.category,
                "revenue": r.revenue or 0,
                "cumulative_pct": pct,
                "abc_class": "A" if pct <= 70 else ("B" if pct <= 90 else "C"),
            })

        return {
            "metadata": {
                "report_id": "inventory_abc_analysis",
                "title": "ABC Analysis (Sales Value Contribution)",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "revenue", "label": "Revenue", "type": "currency"},
                    {"key": "cumulative_pct", "label": "Cumulative %", "type": "number"},
                    {"key": "abc_class", "label": "Class", "type": "badge"},
                ]
            },
            "rows": rows
        }

    def _strategy_inventory_reorder_suggestions(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Reorder Suggestions - Items at or below reorder level"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            Medicine.current_stock,
            Medicine.min_stock_level.label('reorder_level'),
            Medicine.cost_per_base_unit.label('unit_cost'),
        ).outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(
            Medicine.tenant_id == tenant_id,
            Medicine.is_active == True,
            Medicine.current_stock <= Medicine.min_stock_level,
         ).order_by(Medicine.current_stock).all()

        rows = []
        for r in query:
            row = dict(r._mapping)
            reorder_qty = max(0, (r.reorder_level or 0) * 2 - (r.current_stock or 0))
            row['suggested_order_qty'] = reorder_qty
            row['estimated_cost'] = round(reorder_qty * (r.unit_cost or 0), 2)
            rows.append(row)

        return {
            "metadata": {
                "report_id": "inventory_reorder_suggestions",
                "title": "Reorder Suggestions",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "current_stock", "label": "Current Stock", "type": "number"},
                    {"key": "reorder_level", "label": "Reorder Level", "type": "number"},
                    {"key": "suggested_order_qty", "label": "Suggested Order Qty", "type": "number"},
                    {"key": "unit_cost", "label": "Unit Cost", "type": "currency"},
                    {"key": "estimated_cost", "label": "Est. Order Cost", "type": "currency"},
                ]
            },
            "rows": rows
        }

    def _strategy_inventory_category_wise(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Stock Valuation by Category"""
        query = self.db.query(
            Category.name.label('category'),
            func.count(Medicine.id).label('total_medicines'),
            func.sum(Medicine.current_stock).label('total_stock_qty'),
            func.sum(Medicine.current_stock * Medicine.cost_per_base_unit).label('stock_value'),
        ).select_from(Medicine)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(Medicine.tenant_id == tenant_id, Medicine.is_active == True)\
         .group_by(Category.name)\
         .order_by(desc('stock_value')).all()

        return {
            "metadata": {
                "report_id": "inventory_category_wise",
                "title": "Stock Valuation by Category",
                "columns": [
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "total_medicines", "label": "SKUs", "type": "number"},
                    {"key": "total_stock_qty", "label": "Total Qty", "type": "number"},
                    {"key": "stock_value", "label": "Stock Value", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_inventory_turnover(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Inventory Turnover Ratio per Medicine"""
        sold = self.db.query(
            SaleItem.medicine_id,
            func.sum(SaleItem.cost_price * SaleItem.quantity).label('cogs'),
        ).join(Sale)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(SaleItem.medicine_id).subquery()

        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Category.name.label('category'),
            Medicine.current_stock,
            Medicine.cost_per_base_unit.label('unit_cost'),
            (Medicine.current_stock * Medicine.cost_per_base_unit).label('stock_value'),
            sold.c.cogs,
        ).outerjoin(sold, sold.c.medicine_id == Medicine.id)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(Medicine.tenant_id == tenant_id)\
         .order_by(desc(sold.c.cogs)).all()

        rows = []
        for r in query:
            stock_val = (r.current_stock or 0) * (r.unit_cost or 0)
            cogs = r.cogs or 0
            turnover = round(cogs / stock_val, 2) if stock_val > 0 else 0
            rows.append({
                "medicine_name": r.medicine_name,
                "category": r.category,
                "current_stock": r.current_stock or 0,
                "stock_value": round(stock_val, 2),
                "cogs": round(cogs, 2),
                "turnover_ratio": turnover,
                "velocity": "Fast" if turnover >= 6 else ("Moderate" if turnover >= 2 else "Slow"),
            })

        return {
            "metadata": {
                "report_id": "inventory_turnover",
                "title": "Inventory Turnover Ratio",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "current_stock", "label": "Stock Qty", "type": "number"},
                    {"key": "stock_value", "label": "Stock Value", "type": "currency"},
                    {"key": "cogs", "label": "COGS (Sold)", "type": "currency"},
                    {"key": "turnover_ratio", "label": "Turnover Ratio", "type": "number"},
                    {"key": "velocity", "label": "Velocity", "type": "badge"},
                ]
            },
            "rows": rows
        }

    def _strategy_medicine_expiry_calendar(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Expiry Calendar - Medicines expiring grouped by month"""
        query = self.db.query(
            func.strftime('%Y-%m', Batch.expiry_date).label('expiry_month'),
            func.count(Batch.id).label('batch_count'),
            func.sum(Batch.current_quantity).label('total_qty'),
            func.sum(Batch.current_quantity * Batch.purchase_price).label('at_risk_value'),
        ).join(Medicine)\
         .filter(
            Batch.tenant_id == tenant_id,
            Batch.current_quantity > 0,
            Batch.expiry_date != None,
         ).group_by(func.strftime('%Y-%m', Batch.expiry_date))\
          .order_by('expiry_month').all()

        return {
            "metadata": {
                "report_id": "medicine_expiry_calendar",
                "title": "Medicine Expiry Calendar (by Month)",
                "columns": [
                    {"key": "expiry_month", "label": "Expiry Month", "type": "string"},
                    {"key": "batch_count", "label": "Batches", "type": "number"},
                    {"key": "total_qty", "label": "Units at Risk", "type": "number"},
                    {"key": "at_risk_value", "label": "Value at Risk", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # --- Financial Analytics ---

    def _strategy_gross_margin_analysis(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Gross Margin % by Category"""
        query = self.db.query(
            Category.name.label('category'),
            func.sum(SaleItem.total).label('revenue'),
            func.sum(SaleItem.cost_price * SaleItem.quantity).label('cogs'),
            func.sum(SaleItem.gross_profit).label('gross_profit'),
        ).select_from(SaleItem)\
         .join(Sale)\
         .join(Medicine)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(Category.name)\
         .order_by(desc('gross_profit')).all()

        rows = []
        for r in query:
            margin_pct = round((r.gross_profit / r.revenue * 100), 2) if r.revenue else 0
            rows.append({
                "category": r.category or "Uncategorized",
                "revenue": r.revenue or 0,
                "cogs": r.cogs or 0,
                "gross_profit": r.gross_profit or 0,
                "margin_pct": margin_pct,
            })
        rows.sort(key=lambda x: x['margin_pct'], reverse=True)

        return {
            "metadata": {
                "report_id": "gross_margin_analysis",
                "title": "Gross Margin Analysis by Category",
                "columns": [
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "revenue", "label": "Revenue", "type": "currency"},
                    {"key": "cogs", "label": "COGS", "type": "currency"},
                    {"key": "gross_profit", "label": "Gross Profit", "type": "currency"},
                    {"key": "margin_pct", "label": "Margin %", "type": "number"},
                ]
            },
            "rows": rows
        }

    def _strategy_daily_closing_report(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Daily Closing Summary - Sales, Returns, Net Cash"""
        from models.sales import SaleReturn as SR
        sales_q = self.db.query(
            func.date(Sale.created_at).label('date'),
            func.count(Sale.id).label('total_bills'),
            func.sum(Sale.total_amount).label('gross_sales'),
            func.sum(Sale.discount_amount).label('discounts'),
            func.sum(Sale.tax_amount).label('tax_collected'),
        ).filter(
            *self._sale_filters(tenant_id, params)
        ).group_by(func.date(Sale.created_at))

        returns_q = self.db.query(
            func.date(SR.created_at).label('date'),
            func.sum(SR.total_amount).label('returns'),
        ).join(Sale, SR.sale_id == Sale.id)\
         .filter(Sale.tenant_id == tenant_id)\
         .group_by(func.date(SR.created_at))

        sales_by_date = {r.date: r for r in sales_q.all()}
        returns_by_date = {r.date: r.returns for r in returns_q.all()}

        rows = []
        for d, s in sorted(sales_by_date.items(), reverse=True):
            returns = returns_by_date.get(d, 0) or 0
            net_sales = (s.gross_sales or 0) - returns
            rows.append({
                "date": str(d),
                "total_bills": s.total_bills,
                "gross_sales": s.gross_sales or 0,
                "returns": returns,
                "discounts": s.discounts or 0,
                "tax_collected": s.tax_collected or 0,
                "net_sales": round(net_sales, 2),
            })

        return {
            "metadata": {
                "report_id": "daily_closing_report",
                "title": "Daily Closing Report",
                "columns": [
                    {"key": "date", "label": "Date", "type": "date"},
                    {"key": "total_bills", "label": "Bills", "type": "number"},
                    {"key": "gross_sales", "label": "Gross Sales", "type": "currency"},
                    {"key": "returns", "label": "Returns", "type": "currency"},
                    {"key": "discounts", "label": "Discounts", "type": "currency"},
                    {"key": "tax_collected", "label": "Tax Collected", "type": "currency"},
                    {"key": "net_sales", "label": "Net Sales", "type": "currency"},
                ]
            },
            "rows": rows
        }

    # --- Customer Analytics ---

    def _strategy_customer_new_vs_returning(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """New vs Returning Customers per Month"""
        new_q = self.db.query(
            func.strftime('%Y-%m', Customer.created_at).label('month'),
            func.count(Customer.id).label('new_customers'),
        ).filter(Customer.tenant_id == tenant_id)\
         .group_by(func.strftime('%Y-%m', Customer.created_at))\
         .order_by(desc('month')).all()

        return_q = self.db.query(
            func.strftime('%Y-%m', Sale.created_at).label('month'),
            func.count(func.distinct(Sale.customer_id)).label('active_buyers'),
        ).filter(
            Sale.tenant_id == tenant_id,
            Sale.customer_id != None,
            Sale.status == 'Completed',
        ).group_by(func.strftime('%Y-%m', Sale.created_at))\
         .order_by(desc('month')).all()

        new_map = {r.month: r.new_customers for r in new_q}
        buy_map = {r.month: r.active_buyers for r in return_q}
        all_months = sorted(set(list(new_map.keys()) + list(buy_map.keys())), reverse=True)

        rows = [
            {
                "month": m,
                "new_customers": new_map.get(m, 0),
                "active_buyers": buy_map.get(m, 0),
                "returning_buyers": max(0, buy_map.get(m, 0) - new_map.get(m, 0)),
            }
            for m in all_months
        ]

        return {
            "metadata": {
                "report_id": "customer_new_vs_returning",
                "title": "New vs Returning Customers (Monthly)",
                "columns": [
                    {"key": "month", "label": "Month", "type": "string"},
                    {"key": "new_customers", "label": "New Customers", "type": "number"},
                    {"key": "active_buyers", "label": "Total Buyers", "type": "number"},
                    {"key": "returning_buyers", "label": "Returning Buyers", "type": "number"},
                ]
            },
            "rows": rows
        }

    def _strategy_customer_rfm(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """RFM Analysis - Recency, Frequency, Monetary scoring"""
        today = date.today()

        query = self.db.query(
            Customer.full_name,
            Customer.phone,
            Customer.loyalty_tier,
            func.max(func.date(Sale.created_at)).label('last_purchase'),
            func.count(Sale.id).label('frequency'),
            func.sum(Sale.total_amount).label('monetary'),
        ).join(Sale, Sale.customer_id == Customer.id)\
         .filter(
            Customer.tenant_id == tenant_id,
            Sale.status == 'Completed',
         ).group_by(Customer.full_name, Customer.phone, Customer.loyalty_tier)\
          .order_by(desc('monetary')).all()

        rows = []
        for r in query:
            last = r.last_purchase
            if isinstance(last, str):
                last = datetime.strptime(last, '%Y-%m-%d').date()
            recency_days = (today - last).days if last else 999

            r_score = 5 if recency_days <= 30 else (4 if recency_days <= 60 else (3 if recency_days <= 90 else (2 if recency_days <= 180 else 1)))
            f_score = 5 if r.frequency >= 20 else (4 if r.frequency >= 10 else (3 if r.frequency >= 5 else (2 if r.frequency >= 2 else 1)))
            m_score = 5 if r.monetary >= 50000 else (4 if r.monetary >= 20000 else (3 if r.monetary >= 10000 else (2 if r.monetary >= 5000 else 1)))
            total_score = r_score + f_score + m_score

            if total_score >= 13:
                segment = "Champions"
            elif total_score >= 10:
                segment = "Loyal"
            elif total_score >= 7:
                segment = "Promising"
            elif total_score >= 5:
                segment = "At Risk"
            else:
                segment = "Lost"

            rows.append({
                "full_name": r.full_name,
                "phone": r.phone,
                "loyalty_tier": r.loyalty_tier,
                "last_purchase": str(r.last_purchase),
                "recency_days": recency_days,
                "frequency": r.frequency,
                "monetary": round(r.monetary or 0, 2),
                "rfm_score": total_score,
                "segment": segment,
            })

        return {
            "metadata": {
                "report_id": "customer_rfm",
                "title": "Customer RFM Segmentation",
                "columns": [
                    {"key": "full_name", "label": "Customer", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "segment", "label": "Segment", "type": "badge"},
                    {"key": "recency_days", "label": "Days Since Last Buy", "type": "number"},
                    {"key": "frequency", "label": "Total Orders", "type": "number"},
                    {"key": "monetary", "label": "Total Spent", "type": "currency"},
                    {"key": "rfm_score", "label": "RFM Score", "type": "number"},
                ]
            },
            "rows": rows
        }

    # --- Operations ---

    def _strategy_po_status_tracker(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Purchase Order Status Tracker"""
        from models.purchase import PurchaseOrder as PO, Supplier as Sup
        query = self.db.query(
            PO.order_number,
            Sup.name.label('supplier_name'),
            PO.status,
            PO.approval_status,
            PO.delivery_status,
            PO.payment_status,
            PO.total_amount,
            PO.expected_delivery_date,
            PO.purchase_priority,
        ).join(Sup, PO.supplier_id == Sup.id)\
         .filter(PO.tenant_id == tenant_id)\
         .order_by(PO.expected_delivery_date).all()

        return {
            "metadata": {
                "report_id": "po_status_tracker",
                "title": "Purchase Order Status Tracker",
                "columns": [
                    {"key": "order_number", "label": "PO #", "type": "string"},
                    {"key": "supplier_name", "label": "Supplier", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                    {"key": "approval_status", "label": "Approval", "type": "badge"},
                    {"key": "delivery_status", "label": "Delivery", "type": "badge"},
                    {"key": "payment_status", "label": "Payment", "type": "badge"},
                    {"key": "total_amount", "label": "Order Value", "type": "currency"},
                    {"key": "expected_delivery_date", "label": "Expected Delivery", "type": "date"},
                    {"key": "purchase_priority", "label": "Priority", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_prescription_sales(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Prescription Medicines Sales Register"""
        query = self.db.query(
            Medicine.name.label('medicine_name'),
            Medicine.generic_name,
            Category.name.label('category'),
            func.sum(SaleItem.quantity).label('qty_dispensed'),
            func.sum(SaleItem.total).label('revenue'),
            func.count(func.distinct(Sale.id)).label('prescriptions'),
        ).select_from(SaleItem)\
         .join(Sale)\
         .join(Medicine)\
         .outerjoin(Category, Medicine.category_id == Category.id)\
         .filter(
            *self._sale_filters(tenant_id, params),
            Medicine.requires_prescription == True,
         ).group_by(Medicine.name, Medicine.generic_name, Category.name)\
          .order_by(desc('qty_dispensed')).all()

        return {
            "metadata": {
                "report_id": "prescription_sales",
                "title": "Prescription Medicines Sales Register",
                "columns": [
                    {"key": "medicine_name", "label": "Medicine Name", "type": "string"},
                    {"key": "generic_name", "label": "Generic Name", "type": "string"},
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "qty_dispensed", "label": "Qty Dispensed", "type": "number"},
                    {"key": "prescriptions", "label": "Prescriptions", "type": "number"},
                    {"key": "revenue", "label": "Revenue", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_refund_rate_analysis(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Refund Rate by Category"""
        from models.sales import SaleReturnItem
        sold = self.db.query(
            Medicine.category_id,
            func.sum(SaleItem.quantity).label('qty_sold'),
            func.sum(SaleItem.total).label('revenue_sold'),
        ).select_from(SaleItem)\
         .join(Sale)\
         .join(Medicine)\
         .filter(*self._sale_filters(tenant_id, params))\
         .group_by(Medicine.category_id).subquery()

        returned = self.db.query(
            Medicine.category_id,
            func.sum(SaleReturnItem.quantity_returned).label('qty_returned'),
            func.sum(SaleReturnItem.total_refund).label('refund_value'),
        ).select_from(SaleReturnItem)\
         .join(Medicine, SaleReturnItem.medicine_id == Medicine.id)\
         .group_by(Medicine.category_id).subquery()

        query = self.db.query(
            Category.name.label('category'),
            sold.c.qty_sold,
            sold.c.revenue_sold,
            returned.c.qty_returned,
            returned.c.refund_value,
        ).select_from(Category)\
         .outerjoin(sold, sold.c.category_id == Category.id)\
         .outerjoin(returned, returned.c.category_id == Category.id)\
         .filter(Category.tenant_id == tenant_id)\
         .order_by(desc(returned.c.refund_value)).all()

        rows = []
        for r in query:
            rate = round(((r.qty_returned or 0) / (r.qty_sold or 1)) * 100, 2)
            rows.append({
                "category": r.category,
                "qty_sold": r.qty_sold or 0,
                "revenue_sold": r.revenue_sold or 0,
                "qty_returned": r.qty_returned or 0,
                "refund_value": r.refund_value or 0,
                "refund_rate_pct": rate,
            })

        return {
            "metadata": {
                "report_id": "refund_rate_analysis",
                "title": "Refund Rate Analysis by Category",
                "columns": [
                    {"key": "category", "label": "Category", "type": "string"},
                    {"key": "qty_sold", "label": "Qty Sold", "type": "number"},
                    {"key": "revenue_sold", "label": "Revenue", "type": "currency"},
                    {"key": "qty_returned", "label": "Qty Returned", "type": "number"},
                    {"key": "refund_value", "label": "Refund Value", "type": "currency"},
                    {"key": "refund_rate_pct", "label": "Return Rate %", "type": "number"},
                ]
            },
            "rows": rows
        }

    # ================================================================
    # HR & PAYROLL REPORTS
    # ================================================================

    def _strategy_hr_employee_directory(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Complete Employee Directory"""
        from models.hr import Employee, Department, Designation
        query = self.db.query(
            Employee.employee_code,
            Employee.first_name,
            Employee.last_name,
            Employee.phone,
            Employee.email,
            Department.name.label('department'),
            Designation.name.label('designation'),
            Employee.join_date,
            Employee.employment_type,
            Employee.base_salary,
            Employee.is_active,
        ).outerjoin(Department, Employee.department_id == Department.id)\
         .outerjoin(Designation, Employee.designation_id == Designation.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .order_by(Employee.first_name).all()

        return {
            "metadata": {
                "report_id": "hr_employee_directory",
                "title": "Employee Directory",
                "columns": [
                    {"key": "employee_code", "label": "Employee ID", "type": "string"},
                    {"key": "first_name", "label": "First Name", "type": "string"},
                    {"key": "last_name", "label": "Last Name", "type": "string"},
                    {"key": "phone", "label": "Phone", "type": "string"},
                    {"key": "email", "label": "Email", "type": "string"},
                    {"key": "department", "label": "Department", "type": "string"},
                    {"key": "designation", "label": "Designation", "type": "string"},
                    {"key": "join_date", "label": "Join Date", "type": "date"},
                    {"key": "employment_type", "label": "Type", "type": "badge"},
                    {"key": "base_salary", "label": "Base Salary", "type": "currency"},
                    {"key": "is_active", "label": "Active", "type": "boolean"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_hr_attendance_summary(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Attendance Summary by Employee"""
        from models.hr import Employee, Attendance
        query = self.db.query(
            Employee.first_name,
            Employee.last_name,
            Employee.employee_code,
            func.count(Attendance.id).label('total_days'),
            func.sum(case((Attendance.status == 'Present', 1), else_=0)).label('present'),
            func.sum(case((Attendance.status == 'Late', 1), else_=0)).label('late'),
            func.sum(case((Attendance.status == 'Absent', 1), else_=0)).label('absent'),
            func.sum(case((Attendance.status == 'Half Day', 1), else_=0)).label('half_day'),
            func.sum(Attendance.overtime_minutes).label('total_overtime_mins'),
            func.sum(Attendance.late_minutes).label('total_late_mins'),
        ).join(Attendance, Attendance.employee_id == Employee.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .group_by(Employee.first_name, Employee.last_name, Employee.employee_code)\
         .order_by(Employee.first_name).all()

        return {
            "metadata": {
                "report_id": "hr_attendance_summary",
                "title": "Attendance Summary by Employee",
                "columns": [
                    {"key": "employee_code", "label": "Emp ID", "type": "string"},
                    {"key": "first_name", "label": "First Name", "type": "string"},
                    {"key": "last_name", "label": "Last Name", "type": "string"},
                    {"key": "total_days", "label": "Total Days", "type": "number"},
                    {"key": "present", "label": "Present", "type": "number"},
                    {"key": "late", "label": "Late", "type": "number"},
                    {"key": "absent", "label": "Absent", "type": "number"},
                    {"key": "half_day", "label": "Half Day", "type": "number"},
                    {"key": "total_overtime_mins", "label": "OT (mins)", "type": "number"},
                    {"key": "total_late_mins", "label": "Late (mins)", "type": "number"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_hr_leave_report(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Leave Requests Report"""
        from models.hr import Employee, LeaveRequest
        query = self.db.query(
            Employee.first_name,
            Employee.last_name,
            Employee.employee_code,
            LeaveRequest.leave_type,
            LeaveRequest.start_date,
            LeaveRequest.end_date,
            LeaveRequest.reason,
            LeaveRequest.status,
        ).join(Employee, LeaveRequest.employee_id == Employee.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .order_by(desc(LeaveRequest.start_date)).all()

        return {
            "metadata": {
                "report_id": "hr_leave_report",
                "title": "Leave Requests",
                "columns": [
                    {"key": "employee_code", "label": "Emp ID", "type": "string"},
                    {"key": "first_name", "label": "First Name", "type": "string"},
                    {"key": "last_name", "label": "Last Name", "type": "string"},
                    {"key": "leave_type", "label": "Leave Type", "type": "badge"},
                    {"key": "start_date", "label": "From", "type": "date"},
                    {"key": "end_date", "label": "To", "type": "date"},
                    {"key": "reason", "label": "Reason", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_hr_payroll_summary(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Payroll Summary by Run"""
        from models.hr import PayrollRun, PayrollLine, Employee
        query = self.db.query(
            Employee.employee_code,
            Employee.first_name,
            Employee.last_name,
            PayrollLine.base_salary,
            PayrollLine.allowances,
            PayrollLine.overtime,
            PayrollLine.bonuses,
            PayrollLine.deductions,
            PayrollLine.tax,
            PayrollLine.provident_fund,
            PayrollLine.net_pay,
            PayrollLine.payment_method,
        ).join(PayrollLine, PayrollLine.employee_id == Employee.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .order_by(desc(PayrollLine.net_pay)).all()

        return {
            "metadata": {
                "report_id": "hr_payroll_summary",
                "title": "Payroll Summary",
                "columns": [
                    {"key": "employee_code", "label": "Emp ID", "type": "string"},
                    {"key": "first_name", "label": "First Name", "type": "string"},
                    {"key": "last_name", "label": "Last Name", "type": "string"},
                    {"key": "base_salary", "label": "Base Salary", "type": "currency"},
                    {"key": "allowances", "label": "Allowances", "type": "currency"},
                    {"key": "overtime", "label": "Overtime", "type": "currency"},
                    {"key": "bonuses", "label": "Bonuses", "type": "currency"},
                    {"key": "deductions", "label": "Deductions", "type": "currency"},
                    {"key": "tax", "label": "Tax", "type": "currency"},
                    {"key": "provident_fund", "label": "PF", "type": "currency"},
                    {"key": "net_pay", "label": "Net Pay", "type": "currency"},
                    {"key": "payment_method", "label": "Method", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_hr_advance_salary(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Advance Salary Requests"""
        from models.hr import AdvanceSalary, Employee
        query = self.db.query(
            Employee.employee_code,
            Employee.first_name,
            Employee.last_name,
            AdvanceSalary.amount,
            AdvanceSalary.request_date,
            AdvanceSalary.deduction_month,
            AdvanceSalary.reason,
            AdvanceSalary.status,
        ).join(Employee, AdvanceSalary.employee_id == Employee.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .order_by(desc(AdvanceSalary.request_date)).all()

        return {
            "metadata": {
                "report_id": "hr_advance_salary",
                "title": "Advance Salary Requests",
                "columns": [
                    {"key": "employee_code", "label": "Emp ID", "type": "string"},
                    {"key": "first_name", "label": "First Name", "type": "string"},
                    {"key": "last_name", "label": "Last Name", "type": "string"},
                    {"key": "amount", "label": "Amount", "type": "currency"},
                    {"key": "request_date", "label": "Request Date", "type": "date"},
                    {"key": "deduction_month", "label": "Deduction Month", "type": "string"},
                    {"key": "reason", "label": "Reason", "type": "string"},
                    {"key": "status", "label": "Status", "type": "badge"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_hr_department_headcount(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Department-wise Headcount and Salary Cost"""
        from models.hr import Employee, Department
        query = self.db.query(
            Department.name.label('department'),
            func.count(Employee.id).label('headcount'),
            func.sum(case((Employee.is_active == True, 1), else_=0)).label('active'),
            func.sum(case((Employee.is_active == False, 1), else_=0)).label('inactive'),
            func.sum(Employee.base_salary).label('total_salary_cost'),
            func.avg(Employee.base_salary).label('avg_salary'),
        ).join(Department, Employee.department_id == Department.id)\
         .filter(Employee.tenant_id == tenant_id)\
         .group_by(Department.name)\
         .order_by(desc('headcount')).all()

        return {
            "metadata": {
                "report_id": "hr_department_headcount",
                "title": "Department Headcount & Salary Cost",
                "columns": [
                    {"key": "department", "label": "Department", "type": "string"},
                    {"key": "headcount", "label": "Headcount", "type": "number"},
                    {"key": "active", "label": "Active", "type": "number"},
                    {"key": "inactive", "label": "Inactive", "type": "number"},
                    {"key": "total_salary_cost", "label": "Total Salary", "type": "currency"},
                    {"key": "avg_salary", "label": "Avg Salary", "type": "currency"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # ================================================================
    # AUDIT & SECURITY REPORTS
    # ================================================================

    def _strategy_audit_event_log(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Full Audit Event Log"""
        from models.audit import AuditEvent
        query = self.db.query(
            AuditEvent.event_type,
            AuditEvent.severity,
            AuditEvent.staff_id,
            AuditEvent.transaction_id,
            AuditEvent.branch_id,
            AuditEvent.created_at,
        ).filter(AuditEvent.pharmacy_id == self._resolve_pharmacy_id(tenant_id))
        query = self._apply_branch_date(query, AuditEvent, params, date_col=AuditEvent.created_at)
        query = query.order_by(desc(AuditEvent.created_at)).limit(500).all()

        return {
            "metadata": {
                "report_id": "audit_event_log",
                "title": "Audit Event Log (Last 500)",
                "columns": [
                    {"key": "created_at", "label": "Timestamp", "type": "date"},
                    {"key": "event_type", "label": "Event Type", "type": "badge"},
                    {"key": "severity", "label": "Severity", "type": "badge"},
                    {"key": "staff_id", "label": "Staff ID", "type": "string"},
                    {"key": "transaction_id", "label": "Transaction ID", "type": "string"},
                    {"key": "branch_id", "label": "Branch ID", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_audit_by_event_type(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Audit Events Grouped by Type"""
        from models.audit import AuditEvent
        query = self.db.query(
            AuditEvent.event_type,
            func.count(AuditEvent.id).label('event_count'),
            func.sum(case((AuditEvent.severity == 'high', 1), else_=0)).label('high_severity'),
            func.sum(case((AuditEvent.severity == 'medium', 1), else_=0)).label('medium_severity'),
            func.sum(case((AuditEvent.severity == 'low', 1), else_=0)).label('low_severity'),
        ).filter(AuditEvent.pharmacy_id == self._resolve_pharmacy_id(tenant_id))
        query = self._apply_branch_date(query, AuditEvent, params, date_col=AuditEvent.created_at)
        query = query.group_by(AuditEvent.event_type)\
         .order_by(desc('event_count')).all()

        return {
            "metadata": {
                "report_id": "audit_by_event_type",
                "title": "Audit Events by Type",
                "columns": [
                    {"key": "event_type", "label": "Event Type", "type": "badge"},
                    {"key": "event_count", "label": "Total Events", "type": "number"},
                    {"key": "high_severity", "label": "High", "type": "number"},
                    {"key": "medium_severity", "label": "Medium", "type": "number"},
                    {"key": "low_severity", "label": "Low", "type": "number"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_audit_by_staff(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Audit Events per Staff Member"""
        from models.audit import AuditEvent
        query = self.db.query(
            AuditEvent.staff_id,
            func.count(AuditEvent.id).label('total_events'),
            func.sum(case((AuditEvent.severity == 'high', 1), else_=0)).label('high_severity'),
            func.min(AuditEvent.created_at).label('first_event'),
            func.max(AuditEvent.created_at).label('last_event'),
        ).filter(AuditEvent.pharmacy_id == self._resolve_pharmacy_id(tenant_id))
        query = self._apply_branch_date(query, AuditEvent, params, date_col=AuditEvent.created_at)
        query = query.group_by(AuditEvent.staff_id)\
         .order_by(desc('total_events')).all()

        return {
            "metadata": {
                "report_id": "audit_by_staff",
                "title": "Audit Events by Staff",
                "columns": [
                    {"key": "staff_id", "label": "Staff ID", "type": "string"},
                    {"key": "total_events", "label": "Total Events", "type": "number"},
                    {"key": "high_severity", "label": "High Severity", "type": "number"},
                    {"key": "first_event", "label": "First Event", "type": "date"},
                    {"key": "last_event", "label": "Last Event", "type": "date"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_audit_alert_history(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Alert Notification History"""
        from models.audit import AlertHistory, AuditEvent
        query = self.db.query(
            AlertHistory.sent_to,
            AlertHistory.channel,
            AlertHistory.status,
            AlertHistory.error_message,
            AlertHistory.sent_at,
        ).filter(AlertHistory.pharmacy_id == self._resolve_pharmacy_id(tenant_id))
        if params and params.branch_id:
            query = query.join(AuditEvent, AlertHistory.audit_event_id == AuditEvent.id)\
                         .filter(AuditEvent.branch_id == params.branch_id)
        if params and params.start_date:
            query = query.filter(func.date(AlertHistory.sent_at) >= params.start_date)
        if params and params.end_date:
            query = query.filter(func.date(AlertHistory.sent_at) <= params.end_date)
        query = query.order_by(desc(AlertHistory.sent_at)).limit(500).all()

        return {
            "metadata": {
                "report_id": "audit_alert_history",
                "title": "Alert Notification History",
                "columns": [
                    {"key": "sent_at", "label": "Sent At", "type": "date"},
                    {"key": "sent_to", "label": "Sent To", "type": "string"},
                    {"key": "channel", "label": "Channel", "type": "badge"},
                    {"key": "status", "label": "Status", "type": "badge"},
                    {"key": "error_message", "label": "Error", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    def _strategy_audit_high_severity(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """High Severity Audit Events"""
        from models.audit import AuditEvent
        query = self.db.query(
            AuditEvent.created_at,
            AuditEvent.event_type,
            AuditEvent.staff_id,
            AuditEvent.transaction_id,
            AuditEvent.branch_id,
        ).filter(AuditEvent.pharmacy_id == self._resolve_pharmacy_id(tenant_id), AuditEvent.severity == 'high')
        query = self._apply_branch_date(query, AuditEvent, params, date_col=AuditEvent.created_at)
        query = query.order_by(desc(AuditEvent.created_at)).limit(200).all()

        return {
            "metadata": {
                "report_id": "audit_high_severity",
                "title": "High Severity Events",
                "columns": [
                    {"key": "created_at", "label": "Timestamp", "type": "date"},
                    {"key": "event_type", "label": "Event Type", "type": "badge"},
                    {"key": "staff_id", "label": "Staff ID", "type": "string"},
                    {"key": "transaction_id", "label": "Transaction ID", "type": "string"},
                    {"key": "branch_id", "label": "Branch ID", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }

    # ================================================================
    # CASH REGISTER REPORTS
    # ================================================================

    def _strategy_cash_session_report(self, tenant_id: str, params: DateRangeParams) -> Dict[str, Any]:
        """Cash Sessions - Opening/Closing Balances & Discrepancies"""
        from models.cash_register import CashSession
        query = self.db.query(
            CashSession.opened_at,
            CashSession.closed_at,
            CashSession.status,
            CashSession.opening_balance,
            CashSession.closing_balance_expected,
            CashSession.closing_balance_actual,
            CashSession.discrepancy,
            CashSession.discrepancy_notes,
        ).filter(CashSession.tenant_id == tenant_id)\
         .order_by(desc(CashSession.opened_at)).all()

        return {
            "metadata": {
                "report_id": "cash_session_report",
                "title": "Cash Sessions Report",
                "columns": [
                    {"key": "opened_at", "label": "Opened At", "type": "date"},
                    {"key": "closed_at", "label": "Closed At", "type": "date"},
                    {"key": "status", "label": "Status", "type": "badge"},
                    {"key": "opening_balance", "label": "Opening", "type": "currency"},
                    {"key": "closing_balance_expected", "label": "Expected Close", "type": "currency"},
                    {"key": "closing_balance_actual", "label": "Actual Close", "type": "currency"},
                    {"key": "discrepancy", "label": "Discrepancy", "type": "currency"},
                    {"key": "discrepancy_notes", "label": "Notes", "type": "string"},
                ]
            },
            "rows": [dict(r._mapping) for r in query]
        }
