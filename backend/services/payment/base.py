from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple

class PaymentGatewayAdapter(ABC):
    """
    Abstract base class for all payment gateways to ensure a consistent API.
    """
    
    @abstractmethod
    def create_checkout_session(self, amount: float, currency: str, metadata: Dict[str, str]) -> Dict[str, Any]:
        """
        Creates a hosted checkout session or redirect URL.
        Returns a dict containing at least the `redirect_url` and `transaction_id`.
        """
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: str, signature: str, **kwargs) -> bool:
        """
        Verifies the cryptographic signature of the webhook payload.
        """
        pass

    @abstractmethod
    def process_webhook(self, payload: Dict[str, Any], signature: str, **kwargs) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Processes a webhook and returns:
        (is_successful_payment, transaction_id, raw_data_to_store)
        """
        pass
