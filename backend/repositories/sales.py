from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Tuple, Optional
from datetime import datetime
from repositories.base import CRUDBase
from models.sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger, SaleReturnItem
from schemas.sales import CheckoutRequest

class CRUDSale(CRUDBase[Sale, CheckoutRequest, CheckoutRequest]):
    def get_held_sales(self, db: Session, tenant_id: str, branch_id: str) -> List[Sale]:
        return db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.branch_id == branch_id,
            Sale.status == "Held",
            Sale.is_deleted == False
        ).order_by(Sale.created_at.desc()).all()

    def get_pending_verification_sales(self, db: Session, tenant_id: str, branch_id: str) -> List[Sale]:
        return db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.branch_id == branch_id,
            Sale.status == "Pending Verification",
            Sale.is_deleted == False
        ).order_by(Sale.created_at.desc()).all()

    def get_sales_history(
        self,
        db: Session,
        tenant_id: str,
        branch_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        invoice_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        cashier_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Sale], int]:
        query = db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.branch_id == branch_id,
            Sale.is_deleted == False
        )

        if start_date:
            query = query.filter(Sale.sale_date >= start_date)
        if end_date:
            if end_date.hour == 0 and end_date.minute == 0 and end_date.second == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.filter(Sale.sale_date <= end_date)
        if invoice_id:
            query = query.filter(Sale.invoice_number.ilike(f"%{invoice_id}%"))
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        if cashier_id:
            query = query.filter(Sale.cashier_id == cashier_id)

        total = query.count()
        items = query.order_by(desc(Sale.sale_date)).offset(skip).limit(limit).all()
        return items, total

sale_repo = CRUDSale(Sale)

class CRUDSaleReturn(CRUDBase[SaleReturn, None, None]):
    def get_return_logs(
        self,
        db: Session,
        tenant_id: str,
        branch_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        cashier_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[SaleReturn], int]:
        query = db.query(SaleReturn).filter(
            SaleReturn.tenant_id == tenant_id,
            SaleReturn.branch_id == branch_id,
            SaleReturn.is_deleted == False
        )

        if start_date:
            query = query.filter(SaleReturn.return_date >= start_date)
        if end_date:
            query = query.filter(SaleReturn.return_date <= end_date)
        if cashier_id:
            query = query.filter(SaleReturn.cashier_id == cashier_id)

        total = query.count()
        items = query.order_by(desc(SaleReturn.return_date)).offset(skip).limit(limit).all()
        return items, total

sale_return_repo = CRUDSaleReturn(SaleReturn)

class CRUDCustomerLedger(CRUDBase[CustomerLedger, None, None]):
    def get_ledger(self, db: Session, tenant_id: str, customer_id: str) -> List[CustomerLedger]:
        return db.query(CustomerLedger).filter(
            CustomerLedger.tenant_id == tenant_id,
            CustomerLedger.customer_id == customer_id,
            CustomerLedger.is_deleted == False
        ).order_by(CustomerLedger.transaction_date.asc(), CustomerLedger.id.asc()).all()

customer_ledger_repo = CRUDCustomerLedger(CustomerLedger)
