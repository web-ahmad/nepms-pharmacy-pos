import traceback
from datetime import date
from database import SessionLocal
from services.audit_service import AuditService
from schemas.reports import DateRangeParams

db = SessionLocal()
try:
    service = AuditService(db)
    params = DateRangeParams(start_date=date(2026, 6, 20), end_date=date(2026, 6, 30))
    
    logs = service.get_audit_logs(
        tenant_id="12345",  # any string
        params=params,
        entity_types=["Medicine", "Batch", "Supplier", "Category", "System"],
        severity=None,
        user_id=None
    )
    
    print(f"Got {len(logs)} logs")
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
finally:
    db.close()
