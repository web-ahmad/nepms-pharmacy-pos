import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.inventory import Medicine, Batch

client = TestClient(app)

# Login
login_res = client.post('/api/v1/auth/login', json={"username": "owner", "password": "Demo@123"})
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

db = SessionLocal()
med = db.query(Medicine).join(Batch).filter(Batch.current_quantity > 0).first()
db.close()

if not med:
    print("No medicine found with stock.")
    sys.exit(1)

# Exact payload reproducing: Amount Paid < Total (219 < 220), No customer, Cash payment
payload = {
    "customer_id": None,
    "items": [
        {
            "medicine_id": med.id,
            "quantity": 1,
            "unit_price": 220.0,
            "discount": 0.0
        }
    ],
    "discount_amount": 0.0,
    "tax_amount": 0.0,
    "amount_paid": 219.0,
    "payment_method": "Cash",
    "hold_sale": False
}

print("Running checkout call...")
try:
    res = client.post('/api/v1/sales/checkout', json=payload, headers=headers)
    print("Status code:", res.status_code)
    print("Response detail:", res.text)
except Exception as e:
    traceback.print_exc()
