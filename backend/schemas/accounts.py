from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models.accounts import AccountCategory

class AccountBase(BaseModel):
    code: str
    name: str
    category: AccountCategory

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[AccountCategory] = None

class AccountResponse(AccountBase):
    id: str
    is_active: bool
    is_system: bool
    current_balance: float = 0.0
    
    class Config:
        from_attributes = True

class DashboardStatsResponse(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    total_assets: float
    cash_balance: float
    bank_balance: float
    ar_balance: float
    ap_balance: float

class JournalEntryLineBase(BaseModel):
    account_id: str
    branch_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    description: Optional[str] = None
    debit: float = Field(default=0.0, ge=0)
    credit: float = Field(default=0.0, ge=0)

class JournalEntryLineCreate(JournalEntryLineBase):
    pass

class JournalEntryLineResponse(JournalEntryLineBase):
    id: str
    
    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    reference: str
    description: str
    branch_id: Optional[str] = None
    source_module: Optional[str] = None
    source_id: Optional[str] = None
    date: Optional[datetime] = None

class JournalEntryCreate(JournalEntryBase):
    lines: List[JournalEntryLineCreate]

class JournalEntryResponse(JournalEntryBase):
    id: str
    status: str
    created_at: datetime
    lines: List[JournalEntryLineResponse]
    
    class Config:
        from_attributes = True

class LedgerRow(BaseModel):
    date: datetime
    reference: str
    journal_desc: Optional[str]
    line_desc: Optional[str]
    account_name: str
    debit: float
    credit: float
    balance: float
    status: Optional[str] = None
    source_id: Optional[str] = None
    created_by_name: Optional[str] = None

class LedgerResponse(BaseModel):
    account_name: Optional[str]
    rows: List[LedgerRow]
    total_debit: float
    total_credit: float
    closing_balance: float

class TrialBalanceRow(BaseModel):
    account_code: str
    account_name: str
    category: str
    debit: float
    credit: float

class TrialBalanceResponse(BaseModel):
    date: datetime
    rows: List[TrialBalanceRow]
    total_debit: float
    total_credit: float

class FinancialReportRow(BaseModel):
    account_name: str
    amount: float

class ProfitLossResponse(BaseModel):
    revenue: List[FinancialReportRow]
    expenses: List[FinancialReportRow]
    total_revenue: float
    total_expenses: float
    net_profit: float

class BalanceSheetResponse(BaseModel):
    assets: List[FinancialReportRow]
    liabilities: List[FinancialReportRow]
    equity: List[FinancialReportRow]
    total_assets: float
    total_liabilities: float
    total_equity: float
