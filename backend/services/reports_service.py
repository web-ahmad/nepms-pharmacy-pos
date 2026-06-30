from sqlalchemy.orm import Session
from schemas.reports import DateRangeParams, ReportResponse
from repositories.reports import ReportsRepository
from services.export_service import ExportService
from fastapi import HTTPException

class ReportsService:
    def __init__(self, db: Session):
        self.repo = ReportsRepository(db)

    def _handle_response(self, title: str, headers: list, rows: list, export_format: str = None, summary: dict = None) -> any:
        if export_format:
            return ExportService.dispatch_export(export_format, title, headers, rows)
        
        return ReportResponse(
            title=title,
            headers=headers,
            rows=rows,
            summary=summary,
            total_records=len(rows)
        )

    # ----------------- SALES REPORTS -----------------
    def get_sales_summary(self, tenant_id: str, params: DateRangeParams, period: str = 'day'):
        rows = self.repo.get_sales_summary(tenant_id, params, period)
        headers = ['period', 'invoice_count', 'gross_sales', 'tax_collected', 'discounts', 'net_sales', 'amount_paid']
        
        # Calculate summary
        summary = {
            "Total Invoices": sum(r['invoice_count'] for r in rows),
            "Total Net Sales": sum(r['net_sales'] for r in rows)
        }
        
        return self._handle_response(f"Sales Summary ({period.title()})", headers, rows, params.export_format, summary)

    def get_sales_by_medicine(self, tenant_id: str, params: DateRangeParams):
        rows = self.repo.get_sales_by_medicine(tenant_id, params)
        headers = ['medicine_name', 'category', 'qty_sold', 'gross_revenue', 'discount_given', 'net_revenue']
        return self._handle_response("Sales By Medicine", headers, rows, params.export_format)

    def get_sales_by_category(self, tenant_id: str, params: DateRangeParams):
        rows = self.repo.get_sales_by_category(tenant_id, params)
        headers = ['category', 'qty_sold', 'net_revenue']
        return self._handle_response("Sales By Category", headers, rows, params.export_format)

    # ----------------- INVENTORY REPORTS -----------------
    def get_inventory_valuation(self, tenant_id: str, export_format: str = None):
        rows = self.repo.get_current_stock_valuation(tenant_id)
        headers = ['medicine_name', 'category', 'batch_number', 'stock_quantity', 'unit_cost', 'unit_price', 'total_cost_value', 'total_retail_value']
        
        summary = {
            "Total Cost Value": sum(r['total_cost_value'] for r in rows),
            "Total Retail Value": sum(r['total_retail_value'] for r in rows),
            "Potential Profit": sum(r['total_retail_value'] for r in rows) - sum(r['total_cost_value'] for r in rows)
        }
        return self._handle_response("Inventory Valuation", headers, rows, export_format, summary)

    def get_low_stock(self, tenant_id: str, export_format: str = None):
        rows = self.repo.get_low_stock_report(tenant_id)
        headers = ['medicine_name', 'stock_quantity', 'min_stock_level', 'supplier']
        return self._handle_response("Low Stock Report", headers, rows, export_format)

    def get_expiry(self, tenant_id: str, expired: bool, export_format: str = None):
        rows = self.repo.get_expiry_report(tenant_id, expired)
        headers = ['medicine_name', 'batch_number', 'expiry_date', 'stock_quantity']
        title = "Expired Medicines" if expired else "Near Expiry Medicines"
        return self._handle_response(title, headers, rows, export_format)

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
