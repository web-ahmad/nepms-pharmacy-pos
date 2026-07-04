from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date

class DateRangeParams(BaseModel):
    start_date: date
    end_date: date
    branch_id: Optional[str] = None
    cashier_id: Optional[str] = None
    export_format: Optional[str] = None # csv, excel, pdf

class ReportResponse(BaseModel):
    title: str
    headers: List[str]
    rows: List[Dict[str, Any]]
    summary: Optional[Dict[str, Any]] = None
    total_records: int

class AnalyticsKPIs(BaseModel):
    today_revenue: float
    today_profit: float
    mtd_revenue: float
    mtd_profit: float
    ytd_revenue: float
    ytd_profit: float
    receivables: float
    payables: float
    inventory_value: float
    low_stock_count: int
    near_expiry_count: int
    active_customers: int
    active_prescriptions: int
    profit_margin_percent: float = 0.0
    expiry_risk_90_days_value: float = 0.0
    dead_stock_capital: float = 0.0
    todays_cash_drawer: float = 0.0

class BranchPerformance(BaseModel):
    branch_name: str
    revenue: float
    profit: float
    inventory_value: float
    customer_count: int
    prescription_count: int
    growth_percentage: float

class SystemHealth(BaseModel):
    total_users: int
    active_sessions: int
    database_size_mb: float
    api_calls_today: int
    error_count_today: int
    storage_usage_mb: float
    daily_transaction_volume: int
