from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime

class DateRangeParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    branch_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    cashier_id: Optional[str] = None
    export_format: Optional[str] = None # csv, excel, pdf

class CustomReportFilter(BaseModel):
    column: str
    operator: str # 'eq', 'gt', 'lt', 'contains'
    value: Any

class CustomReportPayload(BaseModel):
    base_entity: str # 'sales', 'inventory', 'purchases'
    selected_columns: List[str]
    filters: Optional[List[CustomReportFilter]] = []
    group_by: Optional[str] = None

class ReportResponse(BaseModel):
    title: str
    headers: List[str]
    rows: List[Dict[str, Any]]
    summary: Optional[Dict[str, Any]] = None
    total_records: int = 0
    
class ReportTemplateCreate(BaseModel):
    name: str
    report_type: str
    columns: List[str]
    filters: Dict[str, Any]
    sorting: Dict[str, Any]
    grouping: Optional[str] = None
    chart_type: Optional[str] = None

class ReportTemplateResponse(ReportTemplateCreate):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReportExecutionHistoryResponse(BaseModel):
    id: str
    report_name: str
    status: str
    error_message: Optional[str] = None
    duration_ms: int
    export_format: Optional[str] = None
    executed_at: datetime
    
    class Config:
        from_attributes = True

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
