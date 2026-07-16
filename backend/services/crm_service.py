from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from uuid import uuid4
from repositories.crm import CustomerRepository
from schemas.crm import (
    CustomerCreate, CustomerUpdate, CustomerLoyaltyRedeemRequest, CustomerPaymentCreate,
    WalletTransactionCreate, MarketingCampaignCreate
)
from models.sales import CustomerLedger, CustomerPayment, Sale
from models.crm import (
    CustomerWallet, WalletTransaction, LoyaltyTransaction, LoyaltyRule,
    MarketingCampaign, CustomerReferral, CustomerSegment
)

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

        # Update Invoice Status if sale_id exists, else Auto-Allocate (FIFO)
        from models.sales import Sale
        if payment_in.sale_id:
            sale = self.db.query(Sale).filter(Sale.id == payment_in.sale_id).first()
            if sale:
                sale.amount_paid += payment_in.amount
                if sale.amount_paid >= sale.total_amount:
                    sale.status = "Paid"
                elif sale.amount_paid > 0:
                    sale.status = "Partially Paid"
                else:
                    sale.status = "Unpaid"
        else:
            remaining_payment = payment_in.amount
            unpaid_sales = self.db.query(Sale).filter(
                Sale.customer_id == customer_id,
                Sale.amount_paid < Sale.total_amount
            ).order_by(Sale.sale_date.asc()).all()

            for sale in unpaid_sales:
                if remaining_payment <= 0:
                    break
                balance_owed = sale.total_amount - sale.amount_paid
                if balance_owed > 0:
                    allocate = min(balance_owed, remaining_payment)
                    sale.amount_paid += allocate
                    remaining_payment -= allocate

                    if sale.amount_paid >= sale.total_amount:
                        sale.status = "Paid"
                    elif sale.amount_paid > 0:
                        sale.status = "Partially Paid"

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

    # ── Phase 9 CRM Extensions ────────────────────────────────────────────────

    # 1. Wallet Engine
    def get_wallet(self, customer_id: str):
        self.get_customer(customer_id)
        wallet = self.db.query(CustomerWallet).filter(CustomerWallet.customer_id == customer_id).first()
        if not wallet:
            wallet = CustomerWallet(id=str(uuid4()), customer_id=customer_id)
            self.db.add(wallet)
            self.db.commit()
            self.db.refresh(wallet)
        return wallet

    def process_wallet_transaction(
        self, customer_id: str, tx_in: WalletTransactionCreate, branch_id: str, performed_by: str = None
    ):
        wallet = self.get_wallet(customer_id)
        
        opening_balance = wallet.balance
        
        if tx_in.transaction_type == "Debit":
            if wallet.balance < tx_in.amount:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance")
            wallet.balance -= tx_in.amount
        else: # Credit or Refund
            wallet.balance += tx_in.amount
            
        wallet.last_transaction_at = datetime.utcnow()

        tx = WalletTransaction(
            id=str(uuid4()),
            wallet_id=wallet.id,
            branch_id=branch_id,
            amount=tx_in.amount,
            transaction_type=tx_in.transaction_type,
            source_module=tx_in.source_module,
            source_id=tx_in.source_id,
            performed_by=performed_by,
            opening_balance=opening_balance,
            closing_balance=wallet.balance,
            notes=tx_in.notes
        )
        self.db.add(tx)
        self.db.commit()
        self.db.refresh(tx)
        return tx

    # 2. Timeline API
    def get_timeline(self, customer_id: str):
        self.get_customer(customer_id)
        timeline = []
        
        # Sales
        sales = self.db.query(Sale).filter(Sale.customer_id == customer_id).all()
        for s in sales:
            timeline.append({
                "date": s.sale_date, "type": "Sale", "title": f"Purchase {s.receipt_number}",
                "amount": s.total_amount, "reference_id": s.id
            })
            
        # Wallet Tx
        wallet = self.db.query(CustomerWallet).filter(CustomerWallet.customer_id == customer_id).first()
        if wallet:
            wtxs = self.db.query(WalletTransaction).filter(WalletTransaction.wallet_id == wallet.id).all()
            for w in wtxs:
                timeline.append({
                    "date": w.transaction_date, "type": "Wallet", "title": f"Wallet {w.transaction_type}",
                    "amount": w.amount, "reference_id": w.id
                })

        # Loyalty
        ltxs = self.db.query(LoyaltyTransaction).filter(LoyaltyTransaction.customer_id == customer_id).all()
        for l in ltxs:
            timeline.append({
                "date": l.transaction_date, "type": "Loyalty", "title": f"Loyalty {l.transaction_type}",
                "points": l.points, "reference_id": l.id, "description": l.reason
            })
            
        # Sort desc
        timeline.sort(key=lambda x: x["date"], reverse=True)
        return timeline

    # 3. Marketing Engine
    def get_campaigns(self, skip: int = 0, limit: int = 100):
        return self.db.query(MarketingCampaign).order_by(MarketingCampaign.created_at.desc()).offset(skip).limit(limit).all()
        
    def create_campaign(self, campaign_in: MarketingCampaignCreate, branch_id: str = None, created_by: str = None):
        c = MarketingCampaign(
            id=str(uuid4()),
            name=campaign_in.name,
            channel=campaign_in.channel,
            target_audience_type=campaign_in.target_audience_type,
            target_segment=campaign_in.target_segment,
            target_loyalty_tier=campaign_in.target_loyalty_tier,
            template_body=campaign_in.template_body,
            schedule_date=campaign_in.schedule_date,
            status=campaign_in.status,
            branch_id=branch_id,
            created_by=created_by
        )
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    # 4. Referrals
    def get_referrals(self, customer_id: str):
        return self.db.query(CustomerReferral).filter(CustomerReferral.referrer_id == customer_id).all()

    # 5. Segments
    def get_segments(self, customer_id: str):
        return self.db.query(CustomerSegment).filter(CustomerSegment.customer_id == customer_id).all()
