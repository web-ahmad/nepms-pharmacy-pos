"""
services/enterprise/branch_configuration_service.py
──────────────────────────────────────────────────────
Business logic for Phase 3 — Enterprise Branch Operations & Configuration.

All mutation methods:
  1. Validate business rules
  2. Delegate to the repository
  3. Write a BranchConfigAuditLog entry
  4. Return the updated/created record

Never bypass the service — callers (API endpoints) must use service methods.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from repositories.enterprise.branch_configuration import branch_config_repo


# ── Helpers ───────────────────────────────────────────────────────────────────

def _time_to_minutes(t: str) -> int:
    """Convert 'HH:MM' to total minutes."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _log(
    db: Session, branch_id: str, pharmacy_id: str,
    module: str, action: str, summary: str,
    record_id: Optional[str] = None,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    performed_by_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    branch_config_repo.write_audit_log(
        db, branch_id=branch_id, pharmacy_id=pharmacy_id,
        module=module, action=action, record_id=record_id,
        field_name=field_name, old_value=old_value, new_value=new_value,
        performed_by_id=performed_by_id, ip_address=ip_address,
        summary=summary,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  BranchConfigurationService
# ══════════════════════════════════════════════════════════════════════════════

class BranchConfigurationService:

    # ── Configuration ─────────────────────────────────────────────────────────

    def get_configuration(self, db: Session, branch_id: str, pharmacy_id: str):
        return branch_config_repo.get_or_create_config(db, branch_id, pharmacy_id)

    def update_configuration(
        self, db: Session, branch_id: str, pharmacy_id: str,
        data: Dict[str, Any], performed_by_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        result = branch_config_repo.update_config(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "configuration", "updated",
             "Branch configuration updated.", performed_by_id=performed_by_id,
             ip_address=ip_address)
        return result

    # ── Working Hours ─────────────────────────────────────────────────────────

    def get_working_hours(self, db: Session, branch_id: str, pharmacy_id: str):
        return branch_config_repo.list_working_hours(db, branch_id, pharmacy_id)

    def upsert_working_hours(
        self, db: Session, branch_id: str, pharmacy_id: str,
        day_of_week: str, data: Dict[str, Any],
        performed_by_id: Optional[str] = None, ip_address: Optional[str] = None,
    ):
        # Business rule: close must be after open (unless is_closed)
        if not data.get("is_closed"):
            open_t  = data.get("open_time")
            close_t = data.get("close_time")
            if open_t and close_t:
                if _time_to_minutes(close_t) <= _time_to_minutes(open_t):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Close time must be after open time.",
                    )
            # Break validation
            break_s = data.get("break_start")
            break_e = data.get("break_end")
            if break_s and break_e:
                if _time_to_minutes(break_e) <= _time_to_minutes(break_s):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Break end must be after break start.",
                    )

        result = branch_config_repo.upsert_working_hours(
            db, branch_id, pharmacy_id, day_of_week, data
        )
        _log(db, branch_id, pharmacy_id, "working_hours", "updated",
             f"Working hours for {day_of_week} updated.",
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_working_hours(
        self, db: Session, branch_id: str, pharmacy_id: str, record_id: str,
        performed_by_id: Optional[str] = None,
    ):
        ok = branch_config_repo.delete_working_hours(db, branch_id, pharmacy_id, record_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Working hours record not found.")
        _log(db, branch_id, pharmacy_id, "working_hours", "deleted",
             "Working hours record deleted.", record_id=record_id,
             performed_by_id=performed_by_id)

    # ── Holidays ─────────────────────────────────────────────────────────────

    def list_holidays(self, db, branch_id, pharmacy_id, year=None):
        return branch_config_repo.list_holidays(db, branch_id, pharmacy_id, year)

    def create_holiday(
        self, db: Session, branch_id: str, pharmacy_id: str,
        data: Dict[str, Any], performed_by_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        # Unique date per branch (unless recurring)
        existing = branch_config_repo.list_holidays(db, branch_id, pharmacy_id)
        for h in existing:
            if str(h.holiday_date) == str(data.get("holiday_date")) and not data.get("is_recurring"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A holiday already exists on {data['holiday_date']}.",
                )
        result = branch_config_repo.create_holiday(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "holidays", "created",
             f"Holiday '{result.name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_holiday(
        self, db, branch_id, pharmacy_id, record_id, data,
        performed_by_id=None, ip_address=None,
    ):
        result = branch_config_repo.update_holiday(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Holiday not found.")
        _log(db, branch_id, pharmacy_id, "holidays", "updated",
             f"Holiday '{result.name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_holiday(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_holiday(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Holiday not found.")
        _log(db, branch_id, pharmacy_id, "holidays", "deleted",
             "Holiday deleted.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Warehouses ────────────────────────────────────────────────────────────

    def list_warehouses(self, db, branch_id, pharmacy_id):
        objs = branch_config_repo.list_warehouses(db, branch_id, pharmacy_id)
        # Compute utilization
        for w in objs:
            if w.capacity_units and w.capacity_units > 0:
                w.utilization_percent = round((w.current_units or 0) / w.capacity_units * 100, 1)  # type: ignore
            else:
                w.utilization_percent = None  # type: ignore
        return objs

    def create_warehouse(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_warehouse(db, branch_id, pharmacy_id, data)
        if data.get("is_default"):
            branch_config_repo.set_default_warehouse(db, result.id, branch_id, pharmacy_id)
        _log(db, branch_id, pharmacy_id, "warehouses", "created",
             f"Warehouse '{result.name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_warehouse(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_warehouse(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Warehouse not found.")
        _log(db, branch_id, pharmacy_id, "warehouses", "updated",
             f"Warehouse '{result.name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_warehouse(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_warehouse(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Warehouse not found.")
        _log(db, branch_id, pharmacy_id, "warehouses", "deleted",
             "Warehouse deleted.", record_id=record_id, performed_by_id=performed_by_id)

    def set_default_warehouse(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        result = branch_config_repo.set_default_warehouse(db, record_id, branch_id, pharmacy_id)
        if not result:
            raise HTTPException(status_code=404, detail="Warehouse not found.")
        _log(db, branch_id, pharmacy_id, "warehouses", "updated",
             f"Warehouse '{result.name}' set as default.", record_id=record_id,
             performed_by_id=performed_by_id)
        return result

    # ── Counters ──────────────────────────────────────────────────────────────

    def list_counters(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_counters(db, branch_id, pharmacy_id)

    def create_counter(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        if branch_config_repo.code_exists_counter(db, branch_id, pharmacy_id, data.get("code", "")):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Counter with code '{data['code']}' already exists for this branch.",
            )
        result = branch_config_repo.create_counter(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "counters", "created",
             f"Counter '{result.name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_counter(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_counter(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Counter not found.")
        _log(db, branch_id, pharmacy_id, "counters", "updated",
             f"Counter '{result.name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_counter(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_counter(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Counter not found.")
        _log(db, branch_id, pharmacy_id, "counters", "deleted",
             "Counter deleted.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Printers ──────────────────────────────────────────────────────────────

    def list_printers(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_printers(db, branch_id, pharmacy_id)

    def create_printer(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_printer(db, branch_id, pharmacy_id, data)
        if data.get("is_default"):
            branch_config_repo.set_default_printer(db, result.id, branch_id, pharmacy_id)
        _log(db, branch_id, pharmacy_id, "printers", "created",
             f"Printer '{result.name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_printer(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_printer(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Printer not found.")
        _log(db, branch_id, pharmacy_id, "printers", "updated",
             f"Printer '{result.name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_printer(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_printer(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Printer not found.")
        _log(db, branch_id, pharmacy_id, "printers", "deleted",
             "Printer deleted.", record_id=record_id, performed_by_id=performed_by_id)

    def set_default_printer(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        result = branch_config_repo.set_default_printer(db, record_id, branch_id, pharmacy_id)
        if not result:
            raise HTTPException(status_code=404, detail="Printer not found.")
        _log(db, branch_id, pharmacy_id, "printers", "updated",
             f"Printer '{result.name}' set as default.", record_id=record_id,
             performed_by_id=performed_by_id)
        return result

    # ── Devices ───────────────────────────────────────────────────────────────

    def list_devices(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_devices(db, branch_id, pharmacy_id)

    def create_device(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_device(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "devices", "created",
             f"Device '{result.device_name}' registered.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_device(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_device(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Device not found.")
        _log(db, branch_id, pharmacy_id, "devices", "updated",
             f"Device '{result.device_name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_device(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_device(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Device not found.")
        _log(db, branch_id, pharmacy_id, "devices", "deleted",
             "Device removed.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Document Series ───────────────────────────────────────────────────────

    def list_document_series(self, db, branch_id, pharmacy_id):
        series = branch_config_repo.list_document_series(db, branch_id, pharmacy_id)
        # Compute preview number
        for s in series:
            s.preview_number = self._format_number(s)  # type: ignore
        return series

    def _format_number(self, series, override_number: Optional[int] = None) -> str:
        num = override_number if override_number is not None else series.next_number
        num_str = str(num).zfill(series.padding or 5)
        template = series.format_template or "{prefix}{number}{suffix}"
        return template.format(
            prefix=series.prefix or "",
            suffix=series.suffix or "",
            number=num_str,
            year=datetime.utcnow().year,
        )

    def upsert_document_series(
        self, db, branch_id, pharmacy_id, document_type, data,
        performed_by_id=None, ip_address=None,
    ):
        result = branch_config_repo.upsert_document_series(
            db, branch_id, pharmacy_id, document_type, data
        )
        result.preview_number = self._format_number(result)  # type: ignore
        _log(db, branch_id, pharmacy_id, "document_series", "updated",
             f"Document series for '{document_type}' saved.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def reset_document_series(
        self, db, branch_id, pharmacy_id, record_id, performed_by_id=None
    ):
        result = branch_config_repo.reset_document_series(db, record_id, branch_id, pharmacy_id)
        if not result:
            raise HTTPException(status_code=404, detail="Document series not found.")
        _log(db, branch_id, pharmacy_id, "document_series", "updated",
             f"Document series for '{result.document_type}' reset to 1.",
             record_id=record_id, performed_by_id=performed_by_id)
        return result

    def get_next_document_number(
        self, db, branch_id, pharmacy_id, document_type
    ) -> str:
        series, allocated = branch_config_repo.increment_document_number(
            db, branch_id, pharmacy_id, document_type
        )
        return self._format_number(series, override_number=allocated)

    # ── Tax Settings ──────────────────────────────────────────────────────────

    def list_tax_settings(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_tax_settings(db, branch_id, pharmacy_id)

    def create_tax_setting(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        if data.get("rate", 0) < 0:
            raise HTTPException(status_code=422, detail="Tax rate cannot be negative.")
        result = branch_config_repo.create_tax_setting(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "tax_settings", "created",
             f"Tax setting '{result.tax_name}' ({result.rate}%) created.",
             record_id=result.id, performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_tax_setting(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        if data.get("rate") is not None and data["rate"] < 0:
            raise HTTPException(status_code=422, detail="Tax rate cannot be negative.")
        result = branch_config_repo.update_tax_setting(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Tax setting not found.")
        _log(db, branch_id, pharmacy_id, "tax_settings", "updated",
             f"Tax setting '{result.tax_name}' updated.",
             record_id=record_id, performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_tax_setting(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_tax_setting(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Tax setting not found.")
        _log(db, branch_id, pharmacy_id, "tax_settings", "deleted",
             "Tax setting deleted.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Preferences ───────────────────────────────────────────────────────────

    def list_preferences(self, db, branch_id, pharmacy_id, category=None):
        return branch_config_repo.list_preferences(db, branch_id, pharmacy_id, category)

    def bulk_set_preferences(self, db, branch_id, pharmacy_id, prefs, performed_by_id=None, ip_address=None):
        data = [p.copy() for p in prefs]
        result = branch_config_repo.bulk_set_preferences(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "preferences", "updated",
             f"{len(result)} preference(s) updated.",
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── Licenses ──────────────────────────────────────────────────────────────

    def list_licenses(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_licenses(db, branch_id, pharmacy_id)

    def create_license(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_license(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "licenses", "created",
             f"License '{result.license_name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_license(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_license(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="License not found.")
        _log(db, branch_id, pharmacy_id, "licenses", "updated",
             f"License '{result.license_name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_license(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_license(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="License not found.")
        _log(db, branch_id, pharmacy_id, "licenses", "deleted",
             "License deleted.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Financial Accounts ────────────────────────────────────────────────────

    def list_financial_accounts(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_financial_accounts(db, branch_id, pharmacy_id)

    def create_financial_account(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_financial_account(db, branch_id, pharmacy_id, data)
        if data.get("is_default"):
            branch_config_repo.set_default_financial_account(db, result.id, branch_id, pharmacy_id)
        _log(db, branch_id, pharmacy_id, "financial_accounts", "created",
             f"Financial account '{result.account_name}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_financial_account(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_financial_account(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Financial account not found.")
        _log(db, branch_id, pharmacy_id, "financial_accounts", "updated",
             f"Financial account '{result.account_name}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_financial_account(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_financial_account(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Financial account not found.")
        _log(db, branch_id, pharmacy_id, "financial_accounts", "deleted",
             "Financial account deleted.", record_id=record_id, performed_by_id=performed_by_id)

    def set_default_financial_account(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        result = branch_config_repo.set_default_financial_account(db, record_id, branch_id, pharmacy_id)
        if not result:
            raise HTTPException(status_code=404, detail="Financial account not found.")
        _log(db, branch_id, pharmacy_id, "financial_accounts", "updated",
             f"Financial account '{result.account_name}' set as default.", record_id=record_id,
             performed_by_id=performed_by_id)
        return result

    # ── Payment Methods ───────────────────────────────────────────────────────

    def list_payment_methods(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_payment_methods(db, branch_id, pharmacy_id)

    def create_payment_method(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.create_payment_method(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "payment_methods", "created",
             f"Payment method '{result.method_type}' created.", record_id=result.id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def update_payment_method(self, db, branch_id, pharmacy_id, record_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_payment_method(db, record_id, branch_id, pharmacy_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="Payment method not found.")
        _log(db, branch_id, pharmacy_id, "payment_methods", "updated",
             f"Payment method '{result.method_type}' updated.", record_id=record_id,
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    def delete_payment_method(self, db, branch_id, pharmacy_id, record_id, performed_by_id=None):
        ok = branch_config_repo.delete_payment_method(db, record_id, branch_id, pharmacy_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Payment method not found.")
        _log(db, branch_id, pharmacy_id, "payment_methods", "deleted",
             "Payment method deleted.", record_id=record_id, performed_by_id=performed_by_id)

    # ── Notification Settings ─────────────────────────────────────────────────

    def list_notification_settings(self, db, branch_id, pharmacy_id):
        return branch_config_repo.list_notification_settings(db, branch_id, pharmacy_id)

    def update_notification_setting(
        self, db, branch_id, pharmacy_id, event_type, data,
        performed_by_id=None, ip_address=None,
    ):
        result = branch_config_repo.update_notification_setting(
            db, branch_id, pharmacy_id, event_type, data
        )
        _log(db, branch_id, pharmacy_id, "notifications", "updated",
             f"Notification setting for '{event_type}' updated.",
             performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── Branding ──────────────────────────────────────────────────────────────

    def get_branding(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_or_create_branding(db, branch_id, pharmacy_id)

    def update_branding(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_branding(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "branding", "updated",
             "Branch branding updated.", performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── POS Config ────────────────────────────────────────────────────────────

    def get_pos_config(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_or_create_pos_config(db, branch_id, pharmacy_id)

    def update_pos_config(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        if data.get("discount_limit_percent") is not None:
            if not (0 <= data["discount_limit_percent"] <= 100):
                raise HTTPException(status_code=422, detail="Discount limit must be 0–100%.")
        result = branch_config_repo.update_pos_config(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "pos_config", "updated",
             "POS configuration updated.", performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── Security ──────────────────────────────────────────────────────────────

    def get_security(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_or_create_security(db, branch_id, pharmacy_id)

    def update_security(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        if data.get("login_time_enabled"):
            lf = data.get("login_allowed_from")
            lt = data.get("login_allowed_until")
            if lf and lt:
                if _time_to_minutes(lt) <= _time_to_minutes(lf):
                    raise HTTPException(status_code=422, detail="Login end time must be after start.")
        result = branch_config_repo.update_security(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "security", "updated",
             "Security settings updated.", performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── Backup ────────────────────────────────────────────────────────────────

    def get_backup(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_or_create_backup(db, branch_id, pharmacy_id)

    def update_backup(self, db, branch_id, pharmacy_id, data, performed_by_id=None, ip_address=None):
        result = branch_config_repo.update_backup(db, branch_id, pharmacy_id, data)
        _log(db, branch_id, pharmacy_id, "backup", "updated",
             "Backup settings updated.", performed_by_id=performed_by_id, ip_address=ip_address)
        return result

    # ── Audit Log ─────────────────────────────────────────────────────────────

    def list_audit_logs(self, db, branch_id, pharmacy_id, module=None, search=None, skip=0, limit=50):
        return branch_config_repo.list_audit_logs(
            db, branch_id, pharmacy_id, module=module, search=search, skip=skip, limit=limit
        )

    # ── Health Dashboard ──────────────────────────────────────────────────────

    def get_health(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_health(db, branch_id, pharmacy_id)

    # ── Overview ──────────────────────────────────────────────────────────────

    def get_overview(self, db, branch_id, pharmacy_id):
        return branch_config_repo.get_overview(db, branch_id, pharmacy_id)


# ── Singleton ─────────────────────────────────────────────────────────────────

branch_config_service = BranchConfigurationService()
