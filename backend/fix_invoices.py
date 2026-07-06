from database import SessionLocal 
from models.sales import Sale 
db = SessionLocal() 
s1 = db.query(Sale).filter(Sale.invoice_number == 'INV-1026').first() 
s1.amount_paid = 25.59 
s1.status = 'Paid' 
s2 = db.query(Sale).filter(Sale.invoice_number == 'INV-1027').first() 
s2.amount_paid = 230.0 
s2.status = 'Paid' 
db.commit() 
