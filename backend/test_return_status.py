import sqlite3

conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()

cursor.execute("SELECT id FROM tenants LIMIT 1")
tenant = cursor.fetchone()[0]

branch = None
cursor.execute("SELECT id FROM users LIMIT 1")
user = cursor.fetchone()[0]

import sys
sys.path.append('.')

from database import SessionLocal
from schemas.sales import CheckoutRequest, SaleItemCreate, SaleReturnRequest, SaleReturnItemCreate
from services.sales_service import SalesService

db = SessionLocal()

# Step 1: Create a sale
cursor.execute("SELECT medicine_id, id FROM batches WHERE current_quantity >= 2 LIMIT 1")
med_batch = cursor.fetchone()

if not med_batch:
    print("No medicine with stock available to test.")
    sys.exit(1)

medicine_id, batch_id = med_batch

checkout_req = CheckoutRequest(
    customer_id=None,
    items=[SaleItemCreate(
        medicine_id=medicine_id,
        batch_id=batch_id,
        quantity=2,
        unit_price=10.0,
        discount=0.0
    )],
    discount_amount=0.0,
    tax_amount=0.0,
    adjustment_amount=0.0,
    amount_paid=20.0,
    payment_method="Cash",
    hold_sale=False
)

try:
    sale = SalesService.checkout(db, checkout_req, tenant, branch, user)
    print("Created sale invoice_number:", sale.invoice_number, "| Initial Status:", sale.status)
    sale_id = sale.id
    sale_item_id = sale.items[0].id
    
    # Step 2: Return partial items
    return_req = SaleReturnRequest(
        sale_id=sale.id, # adding this to be safe if the schema needs it
        items=[SaleReturnItemCreate(
            sale_item_id=sale_item_id,
            quantity_returned=1,
            return_reason="Customer Changed Mind",
            stock_action="Returned to Stock"
        )],
        payment_mode="Cash",
        notes="Test partial return"
    )
    
    SalesService.process_return(db, return_req, tenant, branch, user)
    
    db.refresh(sale)
    print("After partial return, Sale Status:", sale.status)
    
except Exception as e:
    print("Failed:", e)
finally:
    db.close()
    conn.close()
