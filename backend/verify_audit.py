import sys
import traceback
from database import SessionLocal
from services import inventory_audit_service
from api.v1.endpoints.inventory_audit import _format_session_response

db = SessionLocal()
try:
    sessions = inventory_audit_service.get_audit_sessions(db, tenant_id="mock", branch_id="mock")
    print(f"Got {len(sessions)} sessions")
    res = [_format_session_response(s) for s in sessions]
    print("Formatted successfully:", res)
except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
finally:
    db.close()
