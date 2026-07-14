import hmac
import hashlib
from typing import Dict, Any, Tuple
from .base import PaymentGatewayAdapter
import time

JAZZCASH_MERCHANT_ID = "test_merchant"
JAZZCASH_PASSWORD = "test_password"
JAZZCASH_INTEGRITY_SALT = "test_salt"

class JazzCashAdapter(PaymentGatewayAdapter):
    def create_checkout_session(self, amount: float, currency: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        """
        Mock generating the redirect URL and payload for JazzCash hosted checkout.
        """
        txn_ref = f"jc_test_{int(time.time())}"
        
        return {
            "redirect_url": "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform",
            "transaction_id": txn_ref,
            "payload": {
                "pp_MerchantID": JAZZCASH_MERCHANT_ID,
                "pp_Amount": str(int(amount * 100)), # typically in paisas
                "pp_TxnRefNo": txn_ref,
                # ... other required fields
            }
        }

    def verify_webhook_signature(self, payload: str, signature: str, **kwargs) -> bool:
        """
        JazzCash typically signs responses by concatenating the fields in alphabetical order
        and then hashing with the Integrity Salt.
        """
        # Mocking validation
        return True

    def process_webhook(self, payload: Dict[str, Any], signature: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process the server-to-server callback from JazzCash.
        """
        if not self.verify_webhook_signature(str(payload), signature):
            raise Exception("Invalid JazzCash hash signature")

        response_code = payload.get("pp_ResponseCode")
        transaction_id = payload.get("pp_TxnRefNo", "unknown_id")
        
        # '000' usually means success
        is_success = response_code == "000"
        
        return is_success, transaction_id, payload
