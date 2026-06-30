from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from api.v1.endpoints.auth import get_current_user
from services.analytics_service import AnalyticsService

router = APIRouter()

def require_analytics_view(current_user: User = Depends(get_current_user)):
    if "analytics.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("/dashboard")
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_view)
):
    service = AnalyticsService(db)
    return service.get_dashboard_kpis(current_user.tenant_id)
