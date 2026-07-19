"""
api/v1/endpoints/enterprise/branch_config.py
──────────────────────────────────────────────
FastAPI router for Phase 3 — Enterprise Branch Operations & Configuration.

All routes are mounted under:
  /api/v1/enterprise/branches/{branch_id}/...

Covers 20 resource groups across the full branch configuration domain.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.deps import get_current_user, requires_permission, get_token_payload
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from database import get_db
from repositories.enterprise.branch_configuration import branch_config_repo
from services.enterprise.branch_configuration_service import branch_config_service
from schemas.enterprise.branch_configuration import (
    BranchConfigurationRead, BranchConfigurationUpdate,
    WorkingHoursCreate, WorkingHoursUpdate, WorkingHoursRead,
    HolidayCreate, HolidayUpdate, HolidayRead,
    WarehouseCreate, WarehouseUpdate, WarehouseRead,
    CounterCreate, CounterUpdate, CounterRead,
    PrinterCreate, PrinterUpdate, PrinterRead,
    DeviceCreate, DeviceUpdate, DeviceRead,
    DocumentSeriesCreate, DocumentSeriesUpdate, DocumentSeriesRead,
    TaxSettingCreate, TaxSettingUpdate, TaxSettingRead,
    PreferenceBulkSet, PreferenceRead,
    LicenseCreate, LicenseUpdate, LicenseRead,
    FinancialAccountCreate, FinancialAccountUpdate, FinancialAccountRead,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodRead,
    NotificationSettingUpdate, NotificationSettingRead, NotificationSettingsBulkRead,
    BrandingUpdate, BrandingRead,
    PosConfigUpdate, PosConfigRead,
    SecuritySettingUpdate, SecuritySettingRead,
    BackupSettingUpdate, BackupSettingRead,
    ConfigAuditLogRead, ConfigAuditLogList,
    BranchHealthRead,
    BranchSettingsOverview,
)

router = APIRouter()


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _pharmacy_id(scope: PharmacyScope) -> str:
    pid = scope.pharmacy_id or scope.tenant_id
    if not pid:
        pid = "system"
    return pid


def _actor_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ══════════════════════════════════════════════════════════════════════════════
#  1. Overview  (loads all settings in one request — for settings page)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/overview", response_model=BranchSettingsOverview, tags=["enterprise-branch-config"])
def get_settings_overview(
    branch_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    permissions = token_payload.get("permissions", [])
    is_sa = token_payload.get("is_super_admin", False)
    if not is_sa and "*" not in permissions and "branches:view" not in permissions and scope.branch_id != branch_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this branch")
    pid = _pharmacy_id(scope)
    return branch_config_service.get_overview(db, branch_id, pid)


# ══════════════════════════════════════════════════════════════════════════════
#  2. Health Dashboard
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/health", response_model=BranchHealthRead, tags=["enterprise-branch-config"])
def get_branch_health(
    branch_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("branches:view")),
):
    pid = _pharmacy_id(scope)
    return branch_config_service.get_health(db, branch_id, pid)


# ══════════════════════════════════════════════════════════════════════════════
#  3. Configuration (master settings)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/configuration", response_model=BranchConfigurationRead, tags=["enterprise-branch-config"])
def get_configuration(
    branch_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("branches:view")),
):
    return branch_config_service.get_configuration(db, branch_id, _pharmacy_id(scope))


@router.patch("/{branch_id}/configuration", response_model=BranchConfigurationRead, tags=["enterprise-branch-config"])
def update_configuration(
    branch_id: str,
    payload: BranchConfigurationUpdate,
    request: Request,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    pid = _pharmacy_id(scope)
    return branch_config_service.update_configuration(
        db, branch_id, pid,
        data=payload.model_dump(exclude_none=True),
        performed_by_id=current_user.get("id"),
        ip_address=_actor_ip(request),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  4. Working Hours
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/working-hours", response_model=List[WorkingHoursRead], tags=["enterprise-branch-config"])
def list_working_hours(
    branch_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("branches:view")),
):
    return branch_config_service.get_working_hours(db, branch_id, _pharmacy_id(scope))


@router.post("/{branch_id}/working-hours", response_model=WorkingHoursRead, status_code=201, tags=["enterprise-branch-config"])
def upsert_working_hours(
    branch_id: str,
    payload: WorkingHoursCreate,
    request: Request,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    pid = _pharmacy_id(scope)
    data = payload.model_dump(exclude_none=True)
    day  = data.pop("day_of_week")
    return branch_config_service.upsert_working_hours(
        db, branch_id, pid, day, data,
        performed_by_id=current_user.get("id"), ip_address=_actor_ip(request),
    )


@router.delete("/{branch_id}/working-hours/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_working_hours(
    branch_id: str, record_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    branch_config_service.delete_working_hours(
        db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id")
    )


# ══════════════════════════════════════════════════════════════════════════════
#  5. Holidays
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/holidays", response_model=List[HolidayRead], tags=["enterprise-branch-config"])
def list_holidays(
    branch_id: str,
    year: Optional[int] = Query(None),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    _: dict = Depends(requires_permission("branches:view")),
):
    return branch_config_service.list_holidays(db, branch_id, _pharmacy_id(scope), year)


@router.post("/{branch_id}/holidays", response_model=HolidayRead, status_code=201, tags=["enterprise-branch-config"])
def create_holiday(
    branch_id: str, payload: HolidayCreate, request: Request,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    pid = _pharmacy_id(scope)
    return branch_config_service.create_holiday(
        db, branch_id, pid, payload.model_dump(),
        performed_by_id=current_user.get("id"), ip_address=_actor_ip(request),
    )


@router.patch("/{branch_id}/holidays/{record_id}", response_model=HolidayRead, tags=["enterprise-branch-config"])
def update_holiday(
    branch_id: str, record_id: str, payload: HolidayUpdate, request: Request,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    return branch_config_service.update_holiday(
        db, branch_id, _pharmacy_id(scope), record_id,
        payload.model_dump(exclude_none=True),
        performed_by_id=current_user.get("id"), ip_address=_actor_ip(request),
    )


@router.delete("/{branch_id}/holidays/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_holiday(
    branch_id: str, record_id: str,
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(requires_permission("branches:edit")),
):
    branch_config_service.delete_holiday(
        db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id")
    )


# ══════════════════════════════════════════════════════════════════════════════
#  6. Warehouses
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/warehouses", response_model=List[WarehouseRead], tags=["enterprise-branch-config"])
def list_warehouses(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_warehouses(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/warehouses", response_model=WarehouseRead, status_code=201, tags=["enterprise-branch-config"])
def create_warehouse(branch_id: str, payload: WarehouseCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_warehouse(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/warehouses/{record_id}", response_model=WarehouseRead, tags=["enterprise-branch-config"])
def update_warehouse(branch_id: str, record_id: str, payload: WarehouseUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_warehouse(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.post("/{branch_id}/warehouses/{record_id}/set-default", response_model=WarehouseRead, tags=["enterprise-branch-config"])
def set_default_warehouse(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.set_default_warehouse(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))

@router.delete("/{branch_id}/warehouses/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_warehouse(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_warehouse(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  7. Counters
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/counters", response_model=List[CounterRead], tags=["enterprise-branch-config"])
def list_counters(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_counters(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/counters", response_model=CounterRead, status_code=201, tags=["enterprise-branch-config"])
def create_counter(branch_id: str, payload: CounterCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_counter(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/counters/{record_id}", response_model=CounterRead, tags=["enterprise-branch-config"])
def update_counter(branch_id: str, record_id: str, payload: CounterUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_counter(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.delete("/{branch_id}/counters/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_counter(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_counter(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  8. Printers
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/printers", response_model=List[PrinterRead], tags=["enterprise-branch-config"])
def list_printers(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_printers(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/printers", response_model=PrinterRead, status_code=201, tags=["enterprise-branch-config"])
def create_printer(branch_id: str, payload: PrinterCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_printer(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/printers/{record_id}", response_model=PrinterRead, tags=["enterprise-branch-config"])
def update_printer(branch_id: str, record_id: str, payload: PrinterUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_printer(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.post("/{branch_id}/printers/{record_id}/set-default", response_model=PrinterRead, tags=["enterprise-branch-config"])
def set_default_printer(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.set_default_printer(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))

@router.delete("/{branch_id}/printers/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_printer(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_printer(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  9. Devices
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/devices", response_model=List[DeviceRead], tags=["enterprise-branch-config"])
def list_devices(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_devices(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/devices", response_model=DeviceRead, status_code=201, tags=["enterprise-branch-config"])
def create_device(branch_id: str, payload: DeviceCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_device(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/devices/{record_id}", response_model=DeviceRead, tags=["enterprise-branch-config"])
def update_device(branch_id: str, record_id: str, payload: DeviceUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_device(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.delete("/{branch_id}/devices/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_device(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_device(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  10. Document Series
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/document-series", response_model=List[DocumentSeriesRead], tags=["enterprise-branch-config"])
def list_document_series(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_document_series(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/document-series", response_model=DocumentSeriesRead, status_code=201, tags=["enterprise-branch-config"])
def upsert_document_series(branch_id: str, payload: DocumentSeriesCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    data = payload.model_dump()
    doc_type = data.pop("document_type")
    return branch_config_service.upsert_document_series(db, branch_id, _pharmacy_id(scope), doc_type, data, performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.post("/{branch_id}/document-series/{record_id}/reset", response_model=DocumentSeriesRead, tags=["enterprise-branch-config"])
def reset_document_series(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.reset_document_series(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))

@router.get("/{branch_id}/document-series/next/{document_type}", tags=["enterprise-branch-config"])
def get_next_document_number(branch_id: str, document_type: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    num = branch_config_service.get_next_document_number(db, branch_id, _pharmacy_id(scope), document_type)
    return {"next_number": num}


# ══════════════════════════════════════════════════════════════════════════════
#  11. Tax Settings
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/tax-settings", response_model=List[TaxSettingRead], tags=["enterprise-branch-config"])
def list_tax_settings(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_tax_settings(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/tax-settings", response_model=TaxSettingRead, status_code=201, tags=["enterprise-branch-config"])
def create_tax_setting(branch_id: str, payload: TaxSettingCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_tax_setting(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/tax-settings/{record_id}", response_model=TaxSettingRead, tags=["enterprise-branch-config"])
def update_tax_setting(branch_id: str, record_id: str, payload: TaxSettingUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_tax_setting(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.delete("/{branch_id}/tax-settings/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_tax_setting(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_tax_setting(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  12. Preferences
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/preferences", response_model=List[PreferenceRead], tags=["enterprise-branch-config"])
def list_preferences(branch_id: str, category: Optional[str] = Query(None), scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_preferences(db, branch_id, _pharmacy_id(scope), category)

@router.post("/{branch_id}/preferences/bulk", response_model=List[PreferenceRead], tags=["enterprise-branch-config"])
def bulk_set_preferences(branch_id: str, payload: PreferenceBulkSet, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    prefs = [p.model_dump() for p in payload.preferences]
    return branch_config_service.bulk_set_preferences(db, branch_id, _pharmacy_id(scope), prefs, performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  13. Licenses
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/licenses", response_model=List[LicenseRead], tags=["enterprise-branch-config"])
def list_licenses(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_licenses(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/licenses", response_model=LicenseRead, status_code=201, tags=["enterprise-branch-config"])
def create_license(branch_id: str, payload: LicenseCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_license(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/licenses/{record_id}", response_model=LicenseRead, tags=["enterprise-branch-config"])
def update_license(branch_id: str, record_id: str, payload: LicenseUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_license(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.delete("/{branch_id}/licenses/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_license(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_license(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  14. Financial Accounts
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/financial-accounts", response_model=List[FinancialAccountRead], tags=["enterprise-branch-config"])
def list_financial_accounts(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_financial_accounts(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/financial-accounts", response_model=FinancialAccountRead, status_code=201, tags=["enterprise-branch-config"])
def create_financial_account(branch_id: str, payload: FinancialAccountCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_financial_account(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/financial-accounts/{record_id}", response_model=FinancialAccountRead, tags=["enterprise-branch-config"])
def update_financial_account(branch_id: str, record_id: str, payload: FinancialAccountUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_financial_account(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.post("/{branch_id}/financial-accounts/{record_id}/set-default", response_model=FinancialAccountRead, tags=["enterprise-branch-config"])
def set_default_financial_account(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.set_default_financial_account(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))

@router.delete("/{branch_id}/financial-accounts/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_financial_account(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_financial_account(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  15. Payment Methods
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/payment-methods", response_model=List[PaymentMethodRead], tags=["enterprise-branch-config"])
def list_payment_methods(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.list_payment_methods(db, branch_id, _pharmacy_id(scope))

@router.post("/{branch_id}/payment-methods", response_model=PaymentMethodRead, status_code=201, tags=["enterprise-branch-config"])
def create_payment_method(branch_id: str, payload: PaymentMethodCreate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.create_payment_method(db, branch_id, _pharmacy_id(scope), payload.model_dump(), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.patch("/{branch_id}/payment-methods/{record_id}", response_model=PaymentMethodRead, tags=["enterprise-branch-config"])
def update_payment_method(branch_id: str, record_id: str, payload: PaymentMethodUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_payment_method(db, branch_id, _pharmacy_id(scope), record_id, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))

@router.delete("/{branch_id}/payment-methods/{record_id}", status_code=204, tags=["enterprise-branch-config"])
def delete_payment_method(branch_id: str, record_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    branch_config_service.delete_payment_method(db, branch_id, _pharmacy_id(scope), record_id, performed_by_id=current_user.get("id"))


# ══════════════════════════════════════════════════════════════════════════════
#  16. Notification Settings
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/notification-settings", response_model=NotificationSettingsBulkRead, tags=["enterprise-branch-config"])
def list_notification_settings(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    settings = branch_config_service.list_notification_settings(db, branch_id, _pharmacy_id(scope))
    return {"settings": settings}

@router.patch("/{branch_id}/notification-settings/{event_type}", response_model=NotificationSettingRead, tags=["enterprise-branch-config"])
def update_notification_setting(branch_id: str, event_type: str, payload: NotificationSettingUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_notification_setting(db, branch_id, _pharmacy_id(scope), event_type, payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  17. Branding
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/branding", response_model=BrandingRead, tags=["enterprise-branch-config"])
def get_branding(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.get_branding(db, branch_id, _pharmacy_id(scope))

@router.patch("/{branch_id}/branding", response_model=BrandingRead, tags=["enterprise-branch-config"])
def update_branding(branch_id: str, payload: BrandingUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_branding(db, branch_id, _pharmacy_id(scope), payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  18. POS Config
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/pos-config", response_model=PosConfigRead, tags=["enterprise-branch-config"])
def get_pos_config(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.get_pos_config(db, branch_id, _pharmacy_id(scope))

@router.patch("/{branch_id}/pos-config", response_model=PosConfigRead, tags=["enterprise-branch-config"])
def update_pos_config(branch_id: str, payload: PosConfigUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_pos_config(db, branch_id, _pharmacy_id(scope), payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  19. Security Settings
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/security-settings", response_model=SecuritySettingRead, tags=["enterprise-branch-config"])
def get_security(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.get_security(db, branch_id, _pharmacy_id(scope))

@router.patch("/{branch_id}/security-settings", response_model=SecuritySettingRead, tags=["enterprise-branch-config"])
def update_security(branch_id: str, payload: SecuritySettingUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_security(db, branch_id, _pharmacy_id(scope), payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  20. Backup Settings
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/backup-settings", response_model=BackupSettingRead, tags=["enterprise-branch-config"])
def get_backup(branch_id: str, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), _: dict = Depends(requires_permission("branches:view"))):
    return branch_config_service.get_backup(db, branch_id, _pharmacy_id(scope))

@router.patch("/{branch_id}/backup-settings", response_model=BackupSettingRead, tags=["enterprise-branch-config"])
def update_backup(branch_id: str, payload: BackupSettingUpdate, request: Request, scope: PharmacyScope = Depends(get_pharmacy_scope), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), _: dict = Depends(requires_permission("branches:edit"))):
    return branch_config_service.update_backup(db, branch_id, _pharmacy_id(scope), payload.model_dump(exclude_none=True), performed_by_id=current_user.get("id"), ip_address=_actor_ip(request))


# ══════════════════════════════════════════════════════════════════════════════
#  21. Config Audit Log
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/{branch_id}/config-audit-log", response_model=ConfigAuditLogList, tags=["enterprise-branch-config"])
def list_audit_logs(
    branch_id: str,
    module: Optional[str]  = Query(None),
    search: Optional[str]  = Query(None),
    skip:   int            = Query(0, ge=0),
    limit:  int            = Query(50, ge=1, le=200),
    scope: PharmacyScope   = Depends(get_pharmacy_scope),
    db: Session            = Depends(get_db),
    _: dict                = Depends(requires_permission("branches:view")),
):
    items, total = branch_config_service.list_audit_logs(
        db, branch_id, _pharmacy_id(scope),
        module=module, search=search, skip=skip, limit=limit,
    )
    return {"items": items, "total": total}
