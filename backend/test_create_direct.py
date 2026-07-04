from database import SessionLocal
from schemas.inventory import MedicineCreate, InitialBatch, PackagingLevelCreate
from api.v1.endpoints.inventory import create_medicine
from models.users import User
from core.deps import TenantContext
from datetime import date, timedelta
import json

db = SessionLocal()
tenant = TenantContext(tenant_id="test_tenant", branch_id="test_branch")
class MockUser:
    id = "user1"
current_user = MockUser()
token_payload = {"role": "Owner", "permissions": ["*"]}

try:
    med_create = MedicineCreate(
        name="Panadol Advance 500mg",
        generic_name="Paracetamol",
        base_unit="Tablet",
        cost_per_base_unit=2.0,
        margin_percent=15.0,
        packaging_levels=[
            PackagingLevelCreate(level_name="Tablet", conversion_qty=1.0, is_sale_unit=True, is_purchase_unit=False),
            PackagingLevelCreate(level_name="Strip", conversion_qty=10.0, is_sale_unit=True, is_purchase_unit=False, is_default_pos_unit=True),
            PackagingLevelCreate(level_name="Box", conversion_qty=100.0, is_sale_unit=True, is_purchase_unit=True)
        ],
        initial_batch=InitialBatch(
            batch_number="B-001",
            expiry_date=date.today() + timedelta(days=365),
            current_stock=1000
        )
    )
    
    resp = create_medicine(med_create, db, tenant, current_user, token_payload)
    print("Medicine created successfully!")
    print(resp.model_dump_json(indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
