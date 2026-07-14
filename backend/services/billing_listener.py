import asyncio
import logging
from datetime import datetime
from database import SessionLocal
from models.billing import PharmacySubscription
from models.users import Pharmacy
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

async def start_billing_enforcement_loop():
    """
    Background loop that periodically checks for subscriptions
    that have exceeded their grace period and suspends the pharmacy.
    """
    logger.info("Starting billing enforcement loop...")
    
    # 3 Days Grace Period
    GRACE_PERIOD_DAYS = 3
    
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            
            # Find all past_due subscriptions
            past_due_subs = db.query(PharmacySubscription).filter(
                PharmacySubscription.status == "past_due"
            ).all()
            
            for sub in past_due_subs:
                # Calculate expiration + grace
                if sub.current_period_end:
                    grace_end = sub.current_period_end + relativedelta(days=GRACE_PERIOD_DAYS)
                    
                    if now > grace_end:
                        # Grace period exceeded! Suspend pharmacy.
                        pharmacy = db.query(Pharmacy).filter_by(id=sub.pharmacy_id).first()
                        if pharmacy and pharmacy.subscription_status != "suspended":
                            logger.info(f"Suspending pharmacy {pharmacy.name} due to unpaid past_due subscription.")
                            pharmacy.subscription_status = "suspended"
                            sub.status = "suspended"
            
            db.commit()
            db.close()
            
        except Exception as e:
            logger.error(f"Error in billing enforcement loop: {e}")
            
        # Check once an hour
        await asyncio.sleep(3600)
