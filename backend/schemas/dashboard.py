from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SalesOverviewSchema(BaseModel):
    gross_sales: float
    discounts_given: float
    net_sales: float
    number_of_invoices: int
    average_basket_size: float

class InventoryOverviewSchema(BaseModel):
    total_medicines: int
    stock_valuation: float
    expired_stock_value: float
    near_expiry_value: float
    dead_stock_count: int

class ExpiryAlertSchema(BaseModel):
    medicine_id: str
    medicine_name: str
    batch_number: str
    expiry_date: str
    remaining_quantity: int
    stock_value: float

class LowStockAlertSchema(BaseModel):
    medicine_id: str
    medicine_name: str
    current_quantity: int
    minimum_level: int
    suggested_reorder: int

class PurchaseSummarySchema(BaseModel):
    pending_purchase_orders: int
    recent_grns_count: int
    supplier_payable_amount: float

class ChartDataPoint(BaseModel):
    date: str
    sales: float

class TopMedicinePoint(BaseModel):
    name: str
    quantity: int
    revenue: float

class CategorySalesPoint(BaseModel):
    category: str
    sales: float

class DashboardChartsSchema(BaseModel):
    sales_trend: List[ChartDataPoint]
    top_medicines: List[TopMedicinePoint]
    category_sales: List[CategorySalesPoint]
