import sys
import os
sys.path.append(os.path.abspath('backend'))
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from models.inventory import Medicine, Batch
from models.purchase import Supplier, SupplierMedicinePrice

engine = create_engine('sqlite:///backend/pharmacy.db')
Session = sessionmaker(bind=engine)
db = Session()

meds = db.query(Medicine).all()
print('Medicines:', len(meds))
for m in meds:
    stock = db.query(func.sum(Batch.current_quantity)).filter(Batch.medicine_id == m.id).scalar() or 0
    print(f' - {m.name} | stock: {stock} | reorder: {m.reorder_level}')

sups = db.query(Supplier).all()
print('\nSuppliers:', len(sups))
for s in sups:
    print(f' - {s.name} | region: {s.region_name} | active: {s.is_active}')

prices = db.query(SupplierMedicinePrice).all()
print('\nSupplier Mappings:', len(prices))
for p in prices:
    print(f' - med_id: {p.medicine_id} | sup_id: {p.supplier_id} | price: {p.trade_price}')
