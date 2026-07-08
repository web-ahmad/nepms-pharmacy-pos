from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExpenseVoucherBase(BaseModel):
    amount: float
    payee: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    petty_cash_category_id: Optional[str] = None
    payment_method: str = "Cash"

class ExpenseVoucherCreate(ExpenseVoucherBase):
    date: Optional[datetime] = None

class ExpenseVoucherResponse(ExpenseVoucherBase):
    id: str
    reference: str
    date: datetime
    status: str
    attachment_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    
    # Optional field for joined account name and user name
    category_name: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True
