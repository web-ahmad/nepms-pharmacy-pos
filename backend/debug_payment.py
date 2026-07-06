from database import SessionLocal 
from models.sales import Sale 
db = SessionLocal() 
sales = db.query(Sale).all() 
for s in sales: print(s.id, s.invoice_number, s.customer_id, s.total_amount, s.amount_paid) 
