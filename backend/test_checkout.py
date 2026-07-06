import sqlite3

conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()

# Get a tenant, branch, customer and user
cursor.execute("SELECT id FROM tenants LIMIT 1")
tenant = cursor.fetchone()[0]

cursor.execute("SELECT id FROM branches LIMIT 1")
branch = cursor.fetchone()[0]

cursor.execute("SELECT id FROM users LIMIT 1")
user = cursor.fetchone()[0]

cursor.execute("SELECT id FROM customers LIMIT 1")
customer = cursor.fetchone()
customer_id = customer[0] if customer else None

import sys
sys.path.append('.')

from database import SessionLocal
from schemas.sales import CheckoutRequest, SaleItemCreate
from services.sales_service import SalesService

db = SessionLocal()

# Get a medicine with stock
cursor.execute("SELECT medicine_id, batch_id FROM batches WHERE current_quantity > 0 LIMIT 1")
med_batch = cursor.fetchone()

if not med_batch:
    print("No medicine with stock available to test.")
    sys.exit(1)

medicine_id, batch_id = med_batch

checkout_req = CheckoutRequest(
    customer_id=customer_id,
    items=[SaleItemCreate(
        medicine_id=medicine_id,
        batch_id=batch_id,
        quantity=1,
        unit_price=10.0,
        discount=0.0
    )],
    discount_amount=0.0,
    tax_amount=0.0,
    adjustment_amount=0.0,
    amount_paid=10.0,
    payment_method="Cash",
    hold_sale=False
)

try:
    sale = SalesService.checkout(db, checkout_req, tenant, branch, user)
    print("Created sale invoice_number:", sale.invoice_number)
except Exception as e:
    print("Failed:", e)
finally:
    db.close()
    conn.close()
