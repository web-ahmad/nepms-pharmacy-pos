import os
import sys
from datetime import datetime, timedelta
import random
import uuid

# Setup paths for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.users import User, Role, Tenant
from models.inventory import Medicine, Batch
from models.crm import Customer
from models.sales import Sale, SaleItem

def seed():
    # Drop all existing tables to apply new schema changes
    Base.metadata.drop_all(bind=engine)
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Create Tenant
    tenant_id = "tenant-" + str(uuid.uuid4())[:8]
    tenant = Tenant(id=tenant_id, name="Test Tenant", subdomain=tenant_id)
    db.add(tenant)
    db.commit()

    # Create Role
    role_id = str(uuid.uuid4())
    role = Role(id=role_id, name="Cashier", tenant_id=tenant_id)
    db.add(role)
    db.commit()

    # Create Cashiers
    cashiers = []
    for i in range(3):
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            username=f"cashier{i}_{random.randint(100, 999)}",
            email=f"cashier{i}_{random.randint(100, 999)}@example.com",
            hashed_password="fake",
            full_name=f"Cashier {i}",
            role_id=role_id,
            tenant_id=tenant_id
        )
        db.add(user)
        cashiers.append(user)
    db.commit()

    # Create Customers with areas
    areas = ['DHA Phase 5', 'Gulberg', 'Model Town', 'Johar Town']
    customers = []
    for i in range(10):
        cust_id = str(uuid.uuid4())
        cust = Customer(
            id=cust_id,
            full_name=f"Customer {i}",
            area_zone=random.choice(areas),
            tenant_id=tenant_id
        )
        db.add(cust)
        customers.append(cust)
    db.commit()

    # Create Medicines with seasons
    seasons = ['SUMMER', 'WINTER', 'MONSOON', 'ALL-SEASON']
    medicines = []
    for i in range(12):
        med_id = str(uuid.uuid4())
        med = Medicine(
            id=med_id,
            name=f"Medicine {i}",
            season_type=random.choice(seasons),
            unit_retail_price=random.randint(10, 100),
            tenant_id=tenant_id
        )
        db.add(med)
        medicines.append(med)
    db.commit()

    # Critical Expiry (15, 30, 45 days)
    today = datetime.now()
    for idx, days in enumerate([15, 30, 45]):
        batch_id = str(uuid.uuid4())
        batch = Batch(
            id=batch_id,
            medicine_id=medicines[idx].id,
            batch_number=f"BATCH-{days}",
            initial_quantity=100,
            current_quantity=100,
            expiry_date=today + timedelta(days=days),
            tenant_id=tenant_id
        )
        db.add(batch)
    db.commit()

    # Sales & Fraud
    # Insert 15 completed sales
    fraud_cashier = cashiers[0]
    normal_cashier = cashiers[1]

    for i in range(15):
        sale_id = str(uuid.uuid4())
        sale = Sale(
            id=sale_id,
            invoice_number=f"INV-COMP-{uuid.uuid4()}",
            cashier_id=normal_cashier.id,
            customer_id=random.choice(customers).id,
            sale_date=today - timedelta(days=random.randint(0, 20)),
            total_amount=random.uniform(50, 500),
            status="Completed",
            tenant_id=tenant_id
        )
        db.add(sale)
        
        # Sale item to trigger seasonal
        sale_item = SaleItem(
            id=str(uuid.uuid4()),
            sale_id=sale_id,
            medicine_id=random.choice(medicines).id,
            quantity=random.randint(1, 5),
            unit_price=10.0,
            total=50.0,
            tenant_id=tenant_id
        )
        db.add(sale_item)
        
    # 5 VOID sales for fraud cashier today
    for i in range(5):
        sale_id = str(uuid.uuid4())
        sale = Sale(
            id=sale_id,
            invoice_number=f"INV-VOID-{uuid.uuid4()}",
            cashier_id=fraud_cashier.id,
            customer_id=random.choice(customers).id,
            sale_date=today,
            total_amount=random.uniform(50, 500),
            status="Voided",
            tenant_id=tenant_id
        )
        db.add(sale)
        
        # Total transactions for fraud cashier to calculate rate
        sale2_id = str(uuid.uuid4())
        sale2 = Sale(
            id=sale2_id,
            invoice_number=f"INV-COMP-F-{uuid.uuid4()}",
            cashier_id=fraud_cashier.id,
            customer_id=random.choice(customers).id,
            sale_date=today,
            total_amount=random.uniform(50, 500),
            status="Completed",
            tenant_id=tenant_id
        )
        db.add(sale2)
        
    db.commit()
    db.close()

    print("Database seeded successfully with AI testing data.")

if __name__ == "__main__":
    seed()
