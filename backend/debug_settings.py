import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from services.settings_service import SettingsService
from schemas.settings import TenantSettingsResponse, SystemModuleResponse, InvoiceSettingsResponse

db = SessionLocal()
try:
    # Just get the first user to get a tenant_id
    from models.users import User
    user = db.query(User).first()
    if not user:
        print("No user found")
        sys.exit(1)
        
    tenant_id = user.tenant_id
    print(f"Testing with tenant_id: {tenant_id}")
    
    svc = SettingsService(db)
    
    print("Testing get_settings...")
    settings = svc.get_settings(tenant_id)
    TenantSettingsResponse.model_validate(settings)
    print("get_settings OK")
    
    print("Testing get_invoice_settings...")
    inv_settings = svc.get_invoice_settings(tenant_id)
    InvoiceSettingsResponse.model_validate(inv_settings)
    print("get_invoice_settings OK")
    
    print("Testing get_modules...")
    modules = svc.get_modules(tenant_id)
    for m in modules:
        SystemModuleResponse.model_validate(m)
    print("get_modules OK")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
