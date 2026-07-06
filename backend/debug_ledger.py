from database import SessionLocal 
from models.sales import CustomerLedger 
db = SessionLocal() 
ledgers = db.query(CustomerLedger).filter(CustomerLedger.credit > 0).all() 
for l in ledgers: print(l.reference_id, l.credit) 
