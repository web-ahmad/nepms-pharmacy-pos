from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SalesOverviewSchema(BaseModel):
    gross_sales: float
    discounts_given: float
    net_sales: float
    number_of_invoices: int
    average_basket_size: float
    # New Executive Metrics
    net_profit: float
    profit_margin_percent: float
    expiry_risk_90_days_value: float
    dead_stock_capital: float
    todays_cash_drawer: float

class InventoryOverviewSchema(BaseModel):
    total_medicines: int
    stock_valuation: float
    available_value: float = 0.0
    reserved_value: float = 0.0
    inventory_turnover: float = 0.0
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
    pending_purchase_requests: int = 0
    pending_approvals: int = 0

class ChartDataPoint(BaseModel):
    date: str
    sales: float
    profit: Optional[float] = 0.0

class TopMedicinePoint(BaseModel):
    name: str
    quantity: int
    revenue: float

class CategorySalesPoint(BaseModel):
    category: str
    sales: float

class PaymentMethodPoint(BaseModel):
    method: str
    amount: float

class HourlySalesPoint(BaseModel):
    hour: str
    sales: float

class SalesmanLeaderboardPoint(BaseModel):
    cashier_name: str
    total_revenue: float
    commissionable_sales: float

class DashboardChartsSchema(BaseModel):
    sales_trend: List[ChartDataPoint]
    top_medicines: List[TopMedicinePoint]
    category_sales: List[CategorySalesPoint]
    payment_methods: List[PaymentMethodPoint] = []
    hourly_sales: List[HourlySalesPoint] = []
    salesman_leaderboard: List[SalesmanLeaderboardPoint] = []
