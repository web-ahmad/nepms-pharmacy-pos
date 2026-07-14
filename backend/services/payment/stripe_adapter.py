import hmac
import hashlib
import time
from typing import Dict, Any, Tuple
from .base import PaymentGatewayAdapter

# Sandbox / Test Credentials (to be moved to .env later)
STRIPE_SECRET_KEY = "sk_test_placeholder"
STRIPE_WEBHOOK_SECRET = "whsec_placeholder"

class StripeAdapter(PaymentGatewayAdapter):
    def create_checkout_session(self, amount: float, currency: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        """
        Mock creating a Stripe checkout session.
        In reality, this would use stripe.checkout.Session.create(...)
        """
        # Mock response
        return {
            "redirect_url": "https://checkout.stripe.com/pay/cs_test_mock",
            "transaction_id": f"cs_test_{int(time.time())}"
        }

    def verify_webhook_signature(self, payload: str, signature: str, **kwargs) -> bool:
        """
        Stripe signature verification:
        signature header: t=...,v1=...
        """
        # Since this is a mock and we don't have the stripe pip library installed yet,
        # we will do a basic dummy check or return True for the sake of the mock.
        return True

    def process_webhook(self, payload: Dict[str, Any], signature: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Processes Stripe Webhook.
        """
        if not self.verify_webhook_signature(str(payload), signature):
            raise Exception("Invalid Stripe signature")

        event_type = payload.get("type")
        data_object = payload.get("data", {}).get("object", {})
        
        transaction_id = data_object.get("id", "unknown_id")
        
        if event_type == "checkout.session.completed":
            # Payment successful
            return True, transaction_id, payload
        elif event_type == "invoice.payment_failed":
            return False, transaction_id, payload
            
        # Ignore other events
        return False, transaction_id, payload
