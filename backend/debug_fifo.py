from database import SessionLocal 
from models.sales import Sale 
db = SessionLocal() 
unpaid = db.query(Sale).filter(Sale.customer_id == '482bc342-1502-4a13-b25a-a64ab6844499', Sale.amount_paid < Sale.total_amount).all() 
print(len(unpaid)) 
for u in unpaid: print(u.id, u.amount_paid, u.total_amount) 
