import sys
import os
import random
from datetime import datetime, timedelta
import json
import uuid

# Setup Python path to find backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from core.security import get_password_hash
from core.audit_context import current_user_id, current_tenant_id, current_branch_id

# Models
from models.users import Tenant, Branch, Role, User, UserBranch
from models.inventory import Category, Medicine, Batch, StockMovement, StockAdjustment
from models.purchase import Supplier, PurchaseOrder, POItem, GRN, PurchaseInvoice, SupplierPayment, SupplierLedger
from models.crm import Customer, LoyaltyTransaction
from models.sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger

fake = Faker()

def gen_id():
    return str(uuid.uuid4())

def main():
    print("Dropping existing tables to ensure clean state...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_data(db)
        db.commit()
        print("Demo data seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def seed_data(db: Session):
    print("Seeding Tenant and Branches...")
    tenant = Tenant(id=gen_id(), name="MediCare Pharmacy Group", subdomain="medicare", timezone="UTC", is_active=True)
    db.add(tenant)
    db.flush()
    current_tenant_id.set(tenant.id)

    branches_data = [
        {"name": "Main Branch", "code": "BR-MAIN", "is_main": True},
        {"name": "Lahore Branch", "code": "BR-LHR", "is_main": False},
        {"name": "Islamabad Branch", "code": "BR-ISB", "is_main": False},
        {"name": "Karachi Branch", "code": "BR-KHI", "is_main": False},
    ]
    branches = []
    for b in branches_data:
        branch = Branch(id=gen_id(), name=b["name"], code=b["code"], is_main=b["is_main"], tenant_id=tenant.id, address=fake.address(), phone=fake.phone_number())
        db.add(branch)
        branches.append(branch)
    db.flush()
    main_branch = branches[0]
    current_branch_id.set(main_branch.id)

    print("Seeding Roles and Users...")
    from scripts.seed_rbac import seed_rbac_permissions_and_roles
    roles = seed_rbac_permissions_and_roles(db)

    pwd = get_password_hash("Demo@123")
    
    users_to_create = [
        {"email": "owner@demo.com", "username": "owner", "role": "Owner", "name": "Pharmacy Owner", "super": True},
        {"email": "manager@demo.com", "username": "manager", "role": "Branch Manager", "name": "Branch Manager", "super": False},
        {"email": "senior@demo.com", "username": "senior", "role": "Senior Pharmacist", "name": "Dr. Sarah", "super": False},
        {"email": "junior@demo.com", "username": "junior", "role": "Junior Pharmacist", "name": "Dr. Ali", "super": False},
        {"email": "cashier@demo.com", "username": "cashier", "role": "Cashier", "name": "John Doe", "super": False},
        {"email": "inventory@demo.com", "username": "inventory", "role": "Inventory Manager", "name": "Jane Smith", "super": False},
        {"email": "accounts@demo.com", "username": "accounts", "role": "Accounts Manager", "name": "Mike Johnson", "super": False},
        {"email": "auditor@demo.com", "username": "auditor", "role": "Auditor", "name": "Robert Clark", "super": False},
    ]

    users = []
    for u in users_to_create:
        user = User(
            id=gen_id(), username=u["username"], email=u["email"], hashed_password=pwd,
            full_name=u["name"], role_id=roles[u["role"]].id, tenant_id=tenant.id, is_super_admin=u["super"]
        )
        db.add(user)
        users.append(user)
        db.add(UserBranch(id=gen_id(), user_id=user.id, branch_id=main_branch.id))
    db.flush()
    
    owner = users[0]
    sa = SuperAdmin(id=gen_id(), auth_user_id=owner.id, name=owner.full_name, is_active=True, tenant_id=tenant.id)
    db.add(sa)
    db.flush()

    current_user_id.set(owner.id)

    print("Seeding Categories...")
    cat_names = [
        "Antibiotics", "Pain Relief", "Diabetes", "Cardiology", 
        "Gastroenterology", "Dermatology", "Vitamins", 
        "Pediatrics", "Respiratory", "Surgical", "OTC"
    ]
    categories = {}
    for c in cat_names:
        cat = Category(id=gen_id(), name=c)
        db.add(cat)
        categories[c] = cat
    db.flush()

    print("Seeding Suppliers...")
    supplier_names = [
        "Getz Pharma", "Hilton Pharma", "Sami Pharma", "Highnoon", "Martin Dow",
        "Pfizer", "GSK", "Abbott", "Ferozsons", "AGP", "Bayer", "Novartis", "Sanofi",
        "Merck", "Bosch Pharma", "Searle", "CCL Pharma", "Genix", "PharmEvo", "Scilife",
        "Werrick", "Atco", "Platinum", "Brookes", "Macter", "Zafa", "Shaigan", "Efroze"
    ]
    suppliers = []
    for sn in supplier_names:
        sup = Supplier(
            id=gen_id(), name=sn, contact_person=fake.name(),
            phone=fake.phone_number(), email=fake.company_email(),
            address=fake.address(), tax_number=str(fake.random_number(digits=7)), tenant_id=tenant.id
        )
        db.add(sup)
        suppliers.append(sup)
    db.flush()

    print("Seeding Medicines...")
    base_meds = [
        ("Amoxicillin", "Antibiotics", "GSK"), ("Azithromycin", "Antibiotics", "Pfizer"), ("Cefixime", "Antibiotics", "Getz Pharma"), 
        ("Ciprofloxacin", "Antibiotics", "Bayer"), ("Levofloxacin", "Antibiotics", "Sanofi"), ("Clarithromycin", "Antibiotics", "Abbott"),
        ("Paracetamol", "Pain Relief", "GSK"), ("Panadol Extra", "Pain Relief", "GSK"), ("Ibuprofen", "Pain Relief", "Abbott"),
        ("Diclofenac", "Pain Relief", "Novartis"), ("Naproxen", "Pain Relief", "Bayer"), ("Tramadol", "Pain Relief", "Searle"),
        ("Metformin", "Diabetes", "Martin Dow"), ("Glimepiride", "Diabetes", "Sanofi"), ("Sitagliptin", "Diabetes", "MSD"),
        ("Insulin Glargine", "Diabetes", "Sanofi"), ("Empagliflozin", "Diabetes", "Boehringer"), ("Pioglitazone", "Diabetes", "Takeda"),
        ("Amlodipine", "Cardiology", "Pfizer"), ("Losartan", "Cardiology", "MSD"), ("Atorvastatin", "Cardiology", "Pfizer"),
        ("Rosuvastatin", "Cardiology", "AstraZeneca"), ("Bisoprolol", "Cardiology", "Merck"), ("Clopidogrel", "Cardiology", "Sanofi"),
        ("Omeprazole", "Gastroenterology", "AstraZeneca"), ("Esomeprazole", "Gastroenterology", "AstraZeneca"), 
        ("Pantoprazole", "Gastroenterology", "Takeda"), ("Domperidone", "Gastroenterology", "Janssen"),
        ("Betamethasone", "Dermatology", "GSK"), ("Clotrimazole", "Dermatology", "Bayer"), ("Isotretinoin", "Dermatology", "Roche"),
        ("Vitamin D3", "Vitamins", "Abbott"), ("Multivitamin", "Vitamins", "Centrum"), ("Vitamin C", "Vitamins", "GSK"),
        ("Iron Supplement", "Vitamins", "Vifor"), ("Zinc Sulfate", "Vitamins", "AGP"),
        ("Salbutamol", "Respiratory", "GSK"), ("Montelukast", "Respiratory", "MSD"), ("Fluticasone", "Respiratory", "GSK"),
        ("Cetirizine", "Respiratory", "GSK"), ("Levocetirizine", "Respiratory", "Sanofi"),
    ]
    
    dosages = [("10mg", 10, 15), ("20mg", 15, 25), ("50mg", 30, 45), ("250mg", 50, 75), ("500mg", 80, 120), ("1000mg", 150, 220)]
    medicines = []
    for med, cat, mfg in base_meds:
        for _ in range(random.randint(3, 5)):
            dosage, pp, sp = random.choice(dosages)
            m = Medicine(
                id=gen_id(), name=f"{med} {dosage}", generic_name=med, brand_name=med,
                manufacturer=mfg, category_id=categories[cat].id, dosage_form=random.choice(["Tablet", "Capsule", "Syrup", "Injection"]),
                packaging_unit="Box", units_per_pack=random.choice([10, 20, 30, 50]), barcode=str(fake.random_number(digits=13, fix_len=True)),
                purchase_price=pp, sale_price=sp, mrp=sp + 5, min_stock_level=random.randint(20, 100), max_stock_level=random.randint(200, 500),
                tenant_id=tenant.id
            )
            db.add(m)
            medicines.append(m)
    db.flush()
    print(f"Created {len(medicines)} Medicines.")

    print("Seeding Customers...")
    customers = []
    customers.append(Customer(id=gen_id(), full_name="Walk-In Customer", phone="0000000000", tenant_id=tenant.id))
    db.add(customers[0])
    
    for _ in range(499):
        c = Customer(
            id=gen_id(), full_name=fake.name(), phone=fake.phone_number()[:20], email=fake.email(), address=fake.address(),
            loyalty_points=random.randint(0, 500), current_balance=random.choice([0, 0, 0, random.randint(100, 5000)]), tenant_id=tenant.id
        )
        db.add(c)
        customers.append(c)
    db.flush()
    print(f"Created {len(customers)} Customers.")

    print("Seeding Purchase Orders and Batches...")
    batches = []
    now = datetime.utcnow()
    
    for i in range(100):
        days_ago = random.randint(1, 365)
        po_date = now - timedelta(days=days_ago)
        sup = random.choice(suppliers)
        po_status = random.choice(["Completed", "Completed", "Completed", "Approved", "Partially Received", "Draft"])
        po_meds = random.sample(medicines, random.randint(5, 10))
        total_amount = sum(m.purchase_price * random.randint(50, 200) for m in po_meds)
        
        po = PurchaseOrder(
            id=gen_id(), tenant_id=tenant.id, branch_id=main_branch.id, supplier_id=sup.id,
            order_number=f"PO-{1000+i}", created_at=po_date, expected_delivery_date=po_date + timedelta(days=5),
            status=po_status, total_amount=total_amount
        )
        db.add(po)
        db.flush()
        
        if po_status in ["Completed", "Partially Received"]:
            grn = GRN(
                id=gen_id(), tenant_id=tenant.id, branch_id=main_branch.id, po_id=po.id,
                supplier_id=sup.id, grn_number=f"GRN-{po.order_number}", received_date=po_date + timedelta(days=random.randint(1, 4)),
                status="Confirmed", total_amount=total_amount
            )
            db.add(grn)
            db.flush()
        
        for m in po_meds:
            qty = random.randint(50, 200)
            recv_qty = qty if po_status == "Completed" else (qty // 2 if po_status == "Partially Received" else 0)
            
            poi = POItem(
                id=gen_id(), po_id=po.id, medicine_id=m.id,
                quantity_ordered=qty, quantity_received=recv_qty, unit_price=m.purchase_price
            )
            db.add(poi)
            
            if po_status in ["Completed", "Partially Received"]:
                exp_choice = random.random()
                if exp_choice < 0.05:
                    expiry_date = now - timedelta(days=random.randint(1, 30))
                elif exp_choice < 0.10:
                    expiry_date = now + timedelta(days=random.randint(1, 30))
                elif exp_choice < 0.20:
                    expiry_date = now + timedelta(days=random.randint(31, 90))
                else:
                    expiry_date = now + timedelta(days=random.randint(180, 730))
                
                batch = Batch(
                    id=gen_id(), batch_number=f"B-{grn.grn_number[-4:]}-{m.id[:4]}", medicine_id=m.id, branch_id=main_branch.id,
                    expiry_date=expiry_date, purchase_price=m.purchase_price, current_quantity=recv_qty,
                    supplier_id=sup.id, status="Expired" if expiry_date < now else "Active"
                )
                db.add(batch)
                batches.append(batch)
                db.flush()
                
                sm = StockMovement(
                    id=gen_id(), medicine_id=m.id, batch_id=batch.id, branch_id=main_branch.id, user_id=owner.id,
                    movement_type="Purchase", quantity_change=recv_qty, balance_after=recv_qty, reference_id=grn.id
                )
                db.add(sm)
        
        if po_status == "Completed":
            inv = PurchaseInvoice(
                id=gen_id(), tenant_id=tenant.id, grn_id=grn.id, supplier_id=sup.id,
                invoice_number=f"INV-{po.order_number}", invoice_date=po_date, due_date=po_date + timedelta(days=30),
                total_amount=total_amount, status="Paid"
            )
            db.add(inv)
            db.flush()
            
            pmt = SupplierPayment(
                id=gen_id(), tenant_id=tenant.id, branch_id=main_branch.id, supplier_id=sup.id, invoice_id=inv.id,
                payment_date=po_date + timedelta(days=5), amount=total_amount, payment_method="Bank Transfer",
                reference_number=f"TRX-{fake.random_number(digits=8)}"
            )
            db.add(pmt)
            
            ledg1 = SupplierLedger(id=gen_id(), tenant_id=tenant.id, supplier_id=sup.id, transaction_date=po_date, transaction_type="Invoice", reference_id=inv.id, debit=0, credit=total_amount, balance_after=total_amount)
            db.add(ledg1)
            ledg2 = SupplierLedger(id=gen_id(), tenant_id=tenant.id, supplier_id=sup.id, transaction_date=po_date + timedelta(days=5), transaction_type="Payment", reference_id=pmt.id, debit=total_amount, credit=0, balance_after=0)
            db.add(ledg2)
            
    db.flush()
    print(f"Created 100 POs and {len(batches)} Batches.")

    print("Seeding Sales (1000+)...")
    active_batches = [b for b in batches if b.current_quantity > 0]
    sales_count = 0
    
    for i in range(1200):
        rand_pct = random.random()
        if rand_pct < 0.05:
            sale_date = now - timedelta(hours=random.randint(1, 10))
        elif rand_pct < 0.20:
            sale_date = now - timedelta(days=random.randint(1, 30))
        elif rand_pct < 0.40:
            sale_date = now - timedelta(days=random.randint(31, 90))
        else:
            sale_date = now - timedelta(days=random.randint(91, 365))
            
        sale_cust = random.choice(customers)
        is_credit = random.random() < 0.1 
        
        sale = Sale(
            id=gen_id(), invoice_number=f"SAL-{20000+i}", branch_id=main_branch.id,
            customer_id=sale_cust.id if sale_cust.full_name != "Walk-In Customer" else None,
            cashier_id=users[4].id, sale_date=sale_date, payment_method="Credit" if is_credit else random.choice(["Cash", "Card"]),
            status="Completed"
        )
        db.add(sale)
        db.flush()
        
        sale_total = 0
        for _ in range(random.randint(1, 4)):
            if not active_batches:
                break
            b = random.choice(active_batches)
            if b.current_quantity <= 0:
                continue
                
            qty = random.randint(1, min(5, b.current_quantity))
            b.current_quantity -= qty
            
            med = b.medicine
            item_total = qty * med.sale_price
            sale_total += item_total
            
            si = SaleItem(
                id=gen_id(), sale_id=sale.id, medicine_id=med.id, batch_id=b.id,
                quantity=qty, unit_price=med.sale_price, total=item_total
            )
            db.add(si)
            
            sm = StockMovement(
                id=gen_id(), medicine_id=med.id, batch_id=b.id, branch_id=main_branch.id,
                user_id=users[4].id, movement_type="Sale", quantity_change=-qty, balance_after=b.current_quantity, reference_id=sale.id
            )
            db.add(sm)
        
        sale.subtotal = sale_total
        sale.total_amount = sale_total
        sale.amount_paid = 0 if is_credit else sale_total
        
        if sale_total > 0:
            sales_count += 1
            if not is_credit and sale.customer_id:
                cp = CustomerPayment(
                    id=gen_id(), customer_id=sale.customer_id, branch_id=main_branch.id, sale_id=sale.id,
                    payment_date=sale_date, amount=sale_total, payment_method=sale.payment_method
                )
                db.add(cp)
    
    db.flush()
    print(f"Created {sales_count} Sales.")
    print("--------------------------------------------------")
    print(f"Total Medicines created: {len(medicines)}")
    print(f"Total Suppliers created: {len(suppliers)}")
    print(f"Total Customers created: {len(customers)}")
    print(f"Total Batches created: {len(batches)}")
    print(f"Total Purchase Orders created: 100")
    print(f"Total Sales created: {sales_count}")

if __name__ == "__main__":
    main()
