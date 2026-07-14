from sqlalchemy.orm import Session
from models.billing import PharmacySubscription, PaymentTransaction, SubscriptionPlan
from models.users import Pharmacy
from datetime import datetime
from typing import Dict, Any, Tuple
import uuid
from dateutil.relativedelta import relativedelta

class BillingService:
    @staticmethod
    def extend_subscription_period(current_end: datetime, billing_cycle: str) -> datetime:
        """Helper to extend subscription period based on cycle"""
        start_date = current_end if current_end and current_end > datetime.utcnow() else datetime.utcnow()
        if billing_cycle == "yearly":
            return start_date + relativedelta(years=1)
        else: # default monthly
            return start_date + relativedelta(months=1)

    @classmethod
    def handle_successful_payment(
        cls, 
        db: Session, 
        pharmacy_id: str, 
        amount: float, 
        gateway: str, 
        gateway_txn_id: str, 
        raw_response: Dict[str, Any]
    ) -> PaymentTransaction:
        """
        Idempotently log payment and extend subscription.
        """
        # Idempotency check
        existing_txn = db.query(PaymentTransaction).filter(
            PaymentTransaction.gateway == gateway,
            PaymentTransaction.gateway_transaction_id == gateway_txn_id,
            PaymentTransaction.status == "success"
        ).first()
        
        if existing_txn:
            return existing_txn

        subscription = db.query(PharmacySubscription).filter_by(pharmacy_id=pharmacy_id).first()
        if not subscription:
            raise ValueError(f"Subscription not found for pharmacy {pharmacy_id}")

        plan = db.query(SubscriptionPlan).filter_by(id=subscription.plan_id).first()

        # Update Subscription status
        subscription.status = "active"
        subscription.current_period_end = cls.extend_subscription_period(
            subscription.current_period_end, 
            plan.billing_cycle if plan else "monthly"
        )
        
        # Update Pharmacy status if it was suspended
        pharmacy = db.query(Pharmacy).filter_by(id=pharmacy_id).first()
        if pharmacy and pharmacy.subscription_status != "active":
            pharmacy.subscription_status = "active"

        # Record Transaction
        txn = PaymentTransaction(
            id=str(uuid.uuid4()),
            pharmacy_id=pharmacy_id,
            subscription_id=subscription.id,
            amount=amount,
            gateway=gateway,
            gateway_transaction_id=gateway_txn_id,
            status="success",
            raw_gateway_response=raw_response
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn

    @classmethod
    def record_manual_payment(cls, db: Session, pharmacy_id: str, amount: float, reference_note: str) -> PaymentTransaction:
        """
        Super Admin records an offline payment.
        """
        return cls.handle_successful_payment(
            db=db,
            pharmacy_id=pharmacy_id,
            amount=amount,
            gateway="manual",
            gateway_txn_id=f"manual_{uuid.uuid4().hex[:8]}",
            raw_response={"note": reference_note}
        )

    @classmethod
    def handle_failed_payment(
        cls, 
        db: Session, 
        pharmacy_id: str, 
        amount: float, 
        gateway: str, 
        gateway_txn_id: str, 
        raw_response: Dict[str, Any]
    ) -> PaymentTransaction:
        """
        Log failed payment, change subscription to past_due
        """
        subscription = db.query(PharmacySubscription).filter_by(pharmacy_id=pharmacy_id).first()
        if subscription and subscription.status == "active":
            subscription.status = "past_due"

        txn = PaymentTransaction(
            id=str(uuid.uuid4()),
            pharmacy_id=pharmacy_id,
            subscription_id=subscription.id if subscription else None,
            amount=amount,
            gateway=gateway,
            gateway_transaction_id=gateway_txn_id,
            status="failed",
            raw_gateway_response=raw_response
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
