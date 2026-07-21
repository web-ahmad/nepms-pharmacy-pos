from sqlalchemy.orm import Session
from schemas.reports import DateRangeParams, ReportResponse
from repositories.reports import ReportsRepository
from services.export_service import ExportService
from services.cache_service import CacheService
from fastapi import HTTPException
from models.users import User

class ReportsService:
    def __init__(self, db: Session, current_user: User = None):
        self.repo = ReportsRepository(db)
        self.db = db
        self.current_user = current_user

    def _handle_response(self, title: str, headers: list, rows: list, export_format: str = None, summary: dict = None, branch_id: str = None) -> any:
        if export_format:
            # Note: For audits, we try to pass IP address as well, but for now we pass None for ip_address
            return ExportService.dispatch_export(
                export_format, title, headers, rows, 
                db=self.db, user=self.current_user, branch_id=branch_id
            )
        
        return ReportResponse(
            title=title,
            headers=headers,
            rows=rows,
            summary=summary,
            total_records=len(rows)
        )

    # ----------------- SALES REPORTS -----------------
    def get_sales_summary(self, tenant_id: str, params: DateRangeParams, period: str = 'day'):
        cache_key = CacheService.build_key(f"reports:sales_summary", tenant=tenant_id, start=params.start_date, end=params.end_date, period=period, branch=params.branch_id, warehouse=params.warehouse_id)
        cached_data = CacheService.get(cache_key) if not params.export_format else None
        
        if cached_data:
            rows, summary = cached_data
        else:
            rows = self.repo.get_sales_summary(tenant_id, params, period)
            summary = {
                "Total Invoices": sum(r['invoice_count'] for r in rows),
                "Total Net Sales": sum(r['net_sales'] for r in rows)
            }
            CacheService.set(cache_key, (rows, summary), 300)

        headers = ['period', 'invoice_count', 'gross_sales', 'tax_collected', 'discounts', 'net_sales', 'amount_paid']
        return self._handle_response(f"Sales Summary ({period.title()})", headers, rows, params.export_format, summary, params.branch_id)

    def get_sales_by_medicine(self, tenant_id: str, params: DateRangeParams):
        cache_key = CacheService.build_key(f"reports:sales_by_medicine", tenant=tenant_id, start=params.start_date, end=params.end_date, branch=params.branch_id)
        rows = CacheService.get(cache_key) if not params.export_format else None
        if not rows:
            rows = self.repo.get_sales_by_medicine(tenant_id, params)
            CacheService.set(cache_key, rows, 300)
            
        headers = ['medicine_name', 'category', 'qty_sold', 'gross_revenue', 'discount_given', 'net_revenue']
        return self._handle_response("Sales By Medicine", headers, rows, params.export_format, branch_id=params.branch_id)

    def get_sales_by_category(self, tenant_id: str, params: DateRangeParams):
        cache_key = CacheService.build_key(f"reports:sales_by_category", tenant=tenant_id, start=params.start_date, end=params.end_date, branch=params.branch_id)
        rows = CacheService.get(cache_key) if not params.export_format else None
        if not rows:
            rows = self.repo.get_sales_by_category(tenant_id, params)
            CacheService.set(cache_key, rows, 300)
            
        headers = ['category', 'qty_sold', 'net_revenue']
        return self._handle_response("Sales By Category", headers, rows, params.export_format, branch_id=params.branch_id)

    # ----------------- INVENTORY REPORTS -----------------
    def get_inventory_valuation(self, tenant_id: str, params: DateRangeParams = None):
        cache_key = CacheService.build_key(f"reports:inv_valuation", tenant=tenant_id, branch=params.branch_id if params else None)
        cached_data = CacheService.get(cache_key) if not (params and params.export_format) else None
        
        if cached_data:
            rows, summary = cached_data
        else:
            # We use params implicitly if repo is updated, for now just pass tenant
            rows = self.repo.get_current_stock_valuation(tenant_id)
            summary = {
                "Total Cost Value": sum(r['total_cost_value'] for r in rows),
                "Total Retail Value": sum(r['total_retail_value'] for r in rows),
                "Potential Profit": sum(r['total_retail_value'] for r in rows) - sum(r['total_cost_value'] for r in rows)
            }
            CacheService.set(cache_key, (rows, summary), 300)
            
        headers = ['medicine_name', 'category', 'batch_number', 'stock_quantity', 'unit_cost', 'unit_price', 'total_cost_value', 'total_retail_value']
        export_fmt = params.export_format if params else None
        branch_id = params.branch_id if params else None
        return self._handle_response("Inventory Valuation", headers, rows, export_fmt, summary, branch_id)

    def get_low_stock(self, tenant_id: str, params: DateRangeParams = None):
        rows = self.repo.get_low_stock_report(tenant_id)
        headers = ['medicine_name', 'stock_quantity', 'min_stock_level', 'manufacturer', 'reorder_quantity', 'reorder_cost']
        summary = {
            "Items Low Stock": len(rows),
            "Total Reorder Qty": sum(r['reorder_quantity'] for r in rows if r.get('reorder_quantity')),
            "Est. Reorder Cost": sum(r['reorder_cost'] for r in rows if r.get('reorder_cost'))
        }
        export_fmt = params.export_format if params else None
        branch_id = params.branch_id if params else None
        return self._handle_response("Low Stock Report", headers, rows, export_fmt, summary, branch_id)

    def get_expiry(self, tenant_id: str, expired: bool, params: DateRangeParams = None):
        rows = self.repo.get_expiry_report(tenant_id, expired)
        headers = ['medicine_name', 'batch_number', 'expiry_date', 'stock_quantity', 'cost_value']
        title = "Expired Medicines" if expired else "Near Expiry Medicines"
        summary = {
            "Total Items": len(rows),
            "Total Stock Qty": sum(r['stock_quantity'] for r in rows if r.get('stock_quantity')),
            "Financial Impact": sum(r['cost_value'] for r in rows if r.get('cost_value'))
        }
        export_fmt = params.export_format if params else None
        branch_id = params.branch_id if params else None
        return self._handle_response(title, headers, rows, export_fmt, summary, branch_id)

    # ----------------- PURCHASE REPORTS -----------------
    def get_purchase_summary(self, tenant_id: str, params: DateRangeParams):
        rows = self.repo.get_purchase_summary(tenant_id, params)
        headers = ['supplier_name', 'po_count', 'total_purchased', 'completed_amount']
        return self._handle_response("Purchase Summary By Supplier", headers, rows, params.export_format)

    # ----------------- CRM REPORTS -----------------
    def get_customer_summary(self, tenant_id: str, export_format: str = None):
        rows = self.repo.get_customer_summary(tenant_id)
        headers = ['customer_name', 'phone', 'loyalty_points', 'outstanding_balance']
        return self._handle_response("Customer Summary", headers, rows, export_format)

    # ----------------- PRESCRIPTION REPORTS -----------------
    def get_prescription_report(self, tenant_id: str, params: DateRangeParams):
        rows = self.repo.get_prescription_report(tenant_id, params)
        headers = ['doctor_name', 'total_prescriptions', 'active', 'expired']
        return self._handle_response("Prescriptions By Doctor", headers, rows, params.export_format)

    # ----------------- FINANCIAL REPORTS -----------------
    def get_profit_and_loss(self, tenant_id: str, params: DateRangeParams):
        data = self.repo.get_profit_and_loss(tenant_id, params)
        headers = ['Metric', 'Amount']
        rows = [{"Metric": k, "Amount": v} for k, v in data.items()]
        return self._handle_response("Profit & Loss Report", headers, rows, params.export_format)
