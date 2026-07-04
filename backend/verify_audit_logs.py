import traceback
from database import SessionLocal
from services.audit_service import AuditService
from schemas.reports import DateRangeParams
from datetime import datetime, timedelta

db = SessionLocal()
try:
    service = AuditService(db)
    
    start = datetime.now() - timedelta(days=7)
    end = datetime.now()
    params = DateRangeParams(start_date=start, end_date=end)
    
    logs = service.get_audit_logs(
        tenant_id="mock",
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
