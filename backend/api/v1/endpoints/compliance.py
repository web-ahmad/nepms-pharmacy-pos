from fastapi import APIRouter, Depends, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import io

from database import get_db
from core.deps import requires_permission
from services.compliance_service import ComplianceService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()


class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.branch_id = payload.get("branch_id")
        self.payload = payload


def require_compliance_view(token_payload: dict = Depends(requires_permission("compliance:view"))):
    return PayloadUser(token_payload)


def require_compliance_export(token_payload: dict = Depends(requires_permission("compliance:export"))):
    return PayloadUser(token_payload)


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get("/overview", summary="Compliance KPIs")
def get_overview(
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    svc = ComplianceService(db)
    return {
        "kpis": svc.overview(scope.tenant_id, scope.pharmacy_id),
        "severity": svc.severity_breakdown(scope.pharmacy_id),
        "event_types": svc.event_type_breakdown(scope.pharmacy_id),
        "timeline": svc.activity_timeline(scope.pharmacy_id),
    }


@router.get("/security-signals", summary="Derived compliance warnings")
def get_security_signals(
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).security_signals(scope.tenant_id)


# ── Audit trail ───────────────────────────────────────────────────────────────

@router.get("/audit-trail", summary="Filterable audit trail")
def get_audit_trail(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    days: Optional[int] = Query(None, ge=1, le=365),
    sensitive_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).audit_trail(
        scope.pharmacy_id, search=search, severity=severity, event_type=event_type,
        days=days, sensitive_only=sensitive_only, limit=limit, offset=offset,
    )


@router.get("/audit-trail/export", summary="Download the audit trail as CSV")
def export_audit_trail(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    days: Optional[int] = Query(None, ge=1, le=365),
    sensitive_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_export),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    csv_text = ComplianceService(db).export_audit_csv(
        scope.pharmacy_id, search=search, severity=severity,
        event_type=event_type, days=days, sensitive_only=sensitive_only,
    )
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        io.StringIO(csv_text),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="audit_trail_{stamp}.csv"'},
    )


# Kept for the existing Sensitive Actions page — same trail, pre-filtered.
@router.get("/sensitive-actions", summary="High-risk actions only")
def get_sensitive_actions(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).audit_trail(scope.pharmacy_id, sensitive_only=True, limit=limit)


# ── Login history ─────────────────────────────────────────────────────────────

@router.get("/login-history", summary="Sign-in attempts with device and IP")
def get_login_history(
    limit: int = Query(100, ge=1, le=200),
    only_failed: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).login_history(scope.tenant_id, limit=limit, only_failed=only_failed)


# ── Retention ─────────────────────────────────────────────────────────────────

@router.get("/retention", summary="Data retention policy")
def get_retention(
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).get_retention(scope.tenant_id)


@router.put("/retention", summary="Update data retention policy")
def update_retention(
    body: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return ComplianceService(db).update_retention(scope.tenant_id, body)


@router.post("/retention/purge", summary="Delete records past their retention window")
def purge_expired(
    db: Session = Depends(get_db),
    current_user: PayloadUser = Depends(require_compliance_export),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    return {"results": ComplianceService(db).purge_expired(scope.tenant_id)}
