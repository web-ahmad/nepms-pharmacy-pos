from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from uuid import uuid4
from repositories.crm import CustomerRepository
from schemas.crm import CustomerCreate, CustomerUpdate, CustomerLoyaltyRedeemRequest, CustomerPaymentCreate
from models.sales import CustomerLedger, CustomerPayment

class CRMService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomerRepository(db)

    def get_customers(self, search: str = None, skip: int = 0, limit: int = 100):
        return self.repo.get_all(search, skip, limit)

    def get_customer(self, customer_id: str):
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    def create_customer(self, customer_in: CustomerCreate, tenant_id: str):
        customer = self.repo.create(customer_in, tenant_id)
        self.db.commit()
        return customer

    def update_customer(self, customer_id: str, customer_in: CustomerUpdate):
        customer = self.get_customer(customer_id)
        updated = self.repo.update(customer, customer_in)
        self.db.commit()
        return updated

    def get_ledger(self, customer_id: str):
        # Validate existence
        self.get_customer(customer_id)
        return self.repo.get_ledger(customer_id)

    def get_purchases(self, customer_id: str):
        # Validate existence
        self.get_customer(customer_id)
        return self.repo.get_purchases(customer_id)

    def record_payment(self, customer_id: str, payment_in: CustomerPaymentCreate, branch_id: str):
        customer = self.get_customer(customer_id)
        
        if payment_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

        # Create Payment
        payment_id = str(uuid4())
        payment = CustomerPayment(
            id=payment_id,
            customer_id=customer_id,
            branch_id=branch_id,
            sale_id=payment_in.sale_id,
            payment_date=datetime.utcnow(),
            amount=payment_in.amount,
            payment_method=payment_in.payment_method,
            reference_number=payment_in.reference_number,
            notes=payment_in.notes
        )
        self.repo.add_payment(payment)

        # Update Customer Balance (Credit reduces amount owed)
        customer.current_balance -= payment_in.amount

        # Add Ledger Entry
        ledger_entry = CustomerLedger(
            id=str(uuid4()),
            customer_id=customer_id,
            branch_id=branch_id,
            transaction_date=datetime.utcnow(),
            transaction_type="Payment",
            reference_id=payment_id,
            debit=0.0,
            credit=payment_in.amount,
            balance_after=customer.current_balance,
            notes=payment_in.notes
        )
        self.repo.add_ledger_entry(ledger_entry)

        self.db.commit()
        return payment

    def get_loyalty_history(self, customer_id: str):
        self.get_customer(customer_id)
        return self.repo.get_loyalty_history(customer_id)

    def redeem_loyalty_points(self, customer_id: str, request: CustomerLoyaltyRedeemRequest):
        customer = self.get_customer(customer_id)
        
        if request.points_to_redeem <= 0:
            raise HTTPException(status_code=400, detail="Points to redeem must be greater than zero")
            
        if customer.loyalty_points < request.points_to_redeem:
            raise HTTPException(status_code=400, detail="Insufficient loyalty points")
            
        customer.loyalty_points -= request.points_to_redeem
        
        # Create Loyalty Transaction
        from models.crm import LoyaltyTransaction
        tx = LoyaltyTransaction(
            id=str(uuid4()),
            customer_id=customer_id,
            transaction_date=datetime.utcnow(),
            points=-request.points_to_redeem,
            transaction_type="Redeem",
            reason=request.reason
        )
        self.db.add(tx)
        
        self.db.commit()
        return {"success": True, "remaining_points": customer.loyalty_points}
