from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from models.crm import Customer, LoyaltyTransaction
from models.sales import CustomerLedger, CustomerPayment, Sale
from schemas.crm import CustomerCreate, CustomerUpdate

class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, customer_id: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_all(self, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Customer]:
        query = self.db.query(Customer)
        if search:
            query = query.filter(
                or_(
                    Customer.full_name.ilike(f"%{search}%"),
                    Customer.phone.ilike(f"%{search}%"),
                    Customer.cnic.ilike(f"%{search}%"),
                    Customer.id.ilike(f"%{search}%")
                )
            )
        return query.order_by(Customer.full_name).offset(skip).limit(limit).all()

    def create(self, customer: CustomerCreate, tenant_id: str) -> Customer:
        db_customer = Customer(
            **customer.model_dump(),
            tenant_id=tenant_id
        )
        self.db.add(db_customer)
        self.db.flush()
        return db_customer

    def update(self, db_customer: Customer, customer_update: CustomerUpdate) -> Customer:
        update_data = customer_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_customer, key, value)
        self.db.flush()
        return db_customer

    def get_ledger(self, customer_id: str) -> List[CustomerLedger]:
        return self.db.query(CustomerLedger).filter(
            CustomerLedger.customer_id == customer_id
        ).order_by(CustomerLedger.transaction_date.desc()).all()

    def get_purchases(self, customer_id: str) -> List[Sale]:
        return self.db.query(Sale).filter(
            Sale.customer_id == customer_id
        ).order_by(Sale.sale_date.desc()).all()

    def get_loyalty_history(self, customer_id: str) -> List[LoyaltyTransaction]:
        return self.db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.customer_id == customer_id
        ).order_by(LoyaltyTransaction.transaction_date.desc()).all()

    def add_ledger_entry(self, entry: CustomerLedger):
        self.db.add(entry)
        self.db.flush()

    def add_payment(self, payment: CustomerPayment):
        self.db.add(payment)
        self.db.flush()
