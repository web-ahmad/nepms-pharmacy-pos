from typing import Dict, Any, Tuple
from .base import PaymentGatewayAdapter
import time

EASYPAISA_STORE_ID = "test_store_id"
EASYPAISA_HASH_KEY = "test_hash_key"

class EasypaisaAdapter(PaymentGatewayAdapter):
    def create_checkout_session(self, amount: float, currency: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        """
        Mock generating the redirect URL and payload for Easypaisa hosted checkout.
        """
        txn_ref = f"ep_test_{int(time.time())}"
        
        return {
            "redirect_url": "https://easypay.easypaisa.com.pk/easypay/Index.jsf",
            "transaction_id": txn_ref,
            "payload": {
                "storeId": EASYPAISA_STORE_ID,
                "amount": str(amount),
                "orderRefNum": txn_ref,
            }
        }

    def verify_webhook_signature(self, payload: str, signature: str, **kwargs) -> bool:
        """
        Easypaisa signs callbacks with a Hash Key.
        """
        # Mocking validation
        return True

    def process_webhook(self, payload: Dict[str, Any], signature: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process the server-to-server callback from Easypaisa.
        """
        if not self.verify_webhook_signature(str(payload), signature):
            raise Exception("Invalid Easypaisa hash signature")

        transaction_status = payload.get("transactionStatus")
        transaction_id = payload.get("orderRefNum", "unknown_id")
        
        is_success = transaction_status == "PAID"
        
        return is_success, transaction_id, payload
