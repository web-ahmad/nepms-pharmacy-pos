from .base import PaymentGatewayAdapter
from .stripe_adapter import StripeAdapter
from .jazzcash_adapter import JazzCashAdapter
from .easypaisa_adapter import EasypaisaAdapter

# Factory for easy access
def get_payment_adapter(gateway: str) -> PaymentGatewayAdapter:
    if gateway == "stripe":
        return StripeAdapter()
    elif gateway == "jazzcash":
        return JazzCashAdapter()
    elif gateway == "easypaisa":
        return EasypaisaAdapter()
    else:
        raise ValueError(f"Unknown payment gateway: {gateway}")
