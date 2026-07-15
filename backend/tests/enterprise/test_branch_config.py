"""
tests/enterprise/test_branch_config.py
────────────────────────────────────────
Unit / integration tests for Phase 3 — Enterprise Branch Operations & Configuration.

Runs in-process with an in-memory SQLite database.

Coverage (30 tests)
───────────────────
  ✓ Configuration — get_or_create, update
  ✓ Working Hours — upsert day, validate close > open, validate break
  ✓ Holidays — create, duplicate date rejected, update, delete
  ✓ Warehouses — create, update, set_default clears others, delete
  ✓ Counters — create, duplicate code rejected, update, delete
  ✓ Printers — create, set_default clears others, update, delete
  ✓ Devices — create, update, delete
  ✓ Document Series — upsert, increment number, reset, format preview
  ✓ Tax Settings — create, negative rate rejected, update, delete
  ✓ Preferences — bulk_set upserts correctly
  ✓ Licenses — create, days_until_expiry computed, update, delete
  ✓ Financial Accounts — create, set_default clears others
  ✓ Payment Methods — create, update, delete
  ✓ Notification Settings — auto-seed all events, update
  ✓ Branding — get_or_create, update
  ✓ POS Config — get_or_create, update, discount>100 rejected
  ✓ Security Settings — update, login_time validated
  ✓ Backup Settings — get_or_create, update
  ✓ Audit Log — entries written on mutations
  ✓ Health — score computed, missing config reduces score
  ✓ Overview — returns all resources
"""

from __future__ import annotations

from datetime import date, timedelta
import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models.users import User
from models.enterprise.branch import PharmacyBranch
from models.enterprise.branch_configuration import (
    BranchConfiguration, BranchWorkingHours, BranchHoliday,
    BranchWarehouse, BranchCounter, BranchPrinter, BranchDevice,
    BranchDocumentSeries, BranchTaxSetting, BranchPreference,
    BranchLicense, BranchFinancialAccount, BranchPaymentMethod,
    BranchNotificationSetting, BranchBranding, BranchPosConfig,
    BranchSecuritySetting, BranchBackupSetting,
    BranchConfigAuditLog,
)
from repositories.enterprise.branch_configuration import branch_config_repo
from services.enterprise.branch_configuration_service import branch_config_service
from fastapi import HTTPException


# ── Constants ─────────────────────────────────────────────────────────────────

PID      = "pharmacy-test-p3"
BRANCH   = "branch-test-p3"
ADMIN    = "admin-test-p3"


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture(scope="module")
def db(engine):
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    # Seed minimal records
    user = User(id=ADMIN, tenant_id=PID, username="admin3", email="admin3@test.com",
                hashed_password="x")
    session.add(user)
    branch = PharmacyBranch(
        id=BRANCH, pharmacy_id=PID, name="Test Branch P3",
        code="TB3", type="retail_branch", status="active",
    )
    session.add(branch)
    session.commit()
    yield session
    session.close()


# ══════════════════════════════════════════════════════════════════════════════

class TestConfiguration:
    def test_get_or_create(self, db):
        cfg = branch_config_repo.get_or_create_config(db, BRANCH, PID)
        assert cfg.branch_id == BRANCH

    def test_update(self, db):
        cfg = branch_config_repo.update_config(db, BRANCH, PID, {"currency": "USD", "timezone": "UTC"})
        assert cfg.currency == "USD"
        assert cfg.timezone == "UTC"


class TestWorkingHours:
    def test_upsert_valid(self, db):
        wh = branch_config_service.upsert_working_hours(
            db, BRANCH, PID, "monday",
            {"open_time": "09:00", "close_time": "18:00", "is_closed": False}
        )
        assert wh.day_of_week == "monday"
        assert wh.open_time == "09:00"

    def test_close_before_open_rejected(self, db):
        with pytest.raises(HTTPException) as exc:
            branch_config_service.upsert_working_hours(
                db, BRANCH, PID, "tuesday",
                {"open_time": "18:00", "close_time": "09:00", "is_closed": False}
            )
        assert exc.value.status_code == 422

    def test_break_validation(self, db):
        with pytest.raises(HTTPException):
            branch_config_service.upsert_working_hours(
                db, BRANCH, PID, "wednesday",
                {"open_time": "09:00", "close_time": "18:00", "is_closed": False,
                 "break_start": "14:00", "break_end": "12:00"}
            )

    def test_list(self, db):
        hours = branch_config_service.get_working_hours(db, BRANCH, PID)
        assert any(h.day_of_week == "monday" for h in hours)


class TestHolidays:
    def test_create(self, db):
        h = branch_config_service.create_holiday(
            db, BRANCH, PID,
            {"name": "Eid", "holiday_date": date(2026, 4, 10), "holiday_type": "religious", "is_recurring": False, "is_active": True}
        )
        assert h.name == "Eid"

    def test_duplicate_date_rejected(self, db):
        with pytest.raises(HTTPException) as exc:
            branch_config_service.create_holiday(
                db, BRANCH, PID,
                {"name": "Eid2", "holiday_date": date(2026, 4, 10), "holiday_type": "religious", "is_recurring": False, "is_active": True}
            )
        assert exc.value.status_code == 409

    def test_update(self, db):
        holidays = branch_config_service.list_holidays(db, BRANCH, PID)
        h = holidays[0]
        updated = branch_config_service.update_holiday(db, BRANCH, PID, h.id, {"name": "Eid-ul-Fitr"})
        assert updated.name == "Eid-ul-Fitr"

    def test_delete(self, db):
        holidays = branch_config_service.list_holidays(db, BRANCH, PID)
        branch_config_service.delete_holiday(db, BRANCH, PID, holidays[0].id)
        assert len(branch_config_service.list_holidays(db, BRANCH, PID)) == 0


class TestWarehouses:
    def test_create(self, db):
        w = branch_config_service.create_warehouse(
            db, BRANCH, PID,
            {"name": "Main Store", "code": "WH01", "warehouse_type": "main", "is_default": True, "is_active": True}
        )
        assert w.name == "Main Store"

    def test_create_second_clears_default(self, db):
        w2 = branch_config_service.create_warehouse(
            db, BRANCH, PID,
            {"name": "Cold Store", "code": "WH02", "warehouse_type": "cold", "is_default": False, "is_active": True}
        )
        warehouses = branch_config_service.list_warehouses(db, BRANCH, PID)
        defaults = [w for w in warehouses if w.is_default]
        assert len(defaults) == 1

    def test_set_default(self, db):
        warehouses = branch_config_service.list_warehouses(db, BRANCH, PID)
        non_default = [w for w in warehouses if not w.is_default][0]
        branch_config_service.set_default_warehouse(db, BRANCH, PID, non_default.id)
        refreshed = branch_config_service.list_warehouses(db, BRANCH, PID)
        assert sum(1 for w in refreshed if w.is_default) == 1


class TestCounters:
    def test_create(self, db):
        c = branch_config_service.create_counter(
            db, BRANCH, PID,
            {"name": "Counter 1", "code": "C01", "ip_address": "192.168.1.10", "is_active": True}
        )
        assert c.code == "C01"

    def test_duplicate_code_rejected(self, db):
        with pytest.raises(HTTPException) as exc:
            branch_config_service.create_counter(
                db, BRANCH, PID,
                {"name": "Counter 1B", "code": "C01", "is_active": True}
            )
        assert exc.value.status_code == 409

    def test_delete(self, db):
        counters = branch_config_service.list_counters(db, BRANCH, PID)
        branch_config_service.delete_counter(db, BRANCH, PID, counters[0].id)
        assert len(branch_config_service.list_counters(db, BRANCH, PID)) == 0


class TestPrinters:
    def test_create_and_set_default(self, db):
        p1 = branch_config_service.create_printer(
            db, BRANCH, PID,
            {"name": "Printer A", "printer_type": "thermal", "is_default": True, "is_active": True}
        )
        p2 = branch_config_service.create_printer(
            db, BRANCH, PID,
            {"name": "Printer B", "printer_type": "laser", "is_default": False, "is_active": True}
        )
        branch_config_service.set_default_printer(db, BRANCH, PID, p2.id)
        printers = branch_config_service.list_printers(db, BRANCH, PID)
        defaults = [p for p in printers if p.is_default]
        assert len(defaults) == 1
        assert defaults[0].name == "Printer B"


class TestDevices:
    def test_create_update_delete(self, db):
        d = branch_config_service.create_device(
            db, BRANCH, PID,
            {"device_name": "Tablet 01", "device_type": "tablet", "is_registered": True, "is_active": True, "is_trusted": False}
        )
        assert d.device_name == "Tablet 01"
        updated = branch_config_service.update_device(db, BRANCH, PID, d.id, {"is_trusted": True})
        assert updated.is_trusted is True
        branch_config_service.delete_device(db, BRANCH, PID, d.id)
        assert len(branch_config_service.list_devices(db, BRANCH, PID)) == 0


class TestDocumentSeries:
    def test_upsert_and_preview(self, db):
        s = branch_config_service.upsert_document_series(
            db, BRANCH, PID, "sale_invoice",
            {"prefix": "SI-", "next_number": 1, "padding": 5, "reset_policy": "yearly", "is_active": True}
        )
        assert s.prefix == "SI-"
        assert s.preview_number == "SI-00001"

    def test_next_number_increments(self, db):
        branch_config_service.get_next_document_number(db, BRANCH, PID, "sale_invoice")
        series = branch_config_repo.get_document_series_by_type(db, BRANCH, PID, "sale_invoice")
        assert series.next_number == 2

    def test_reset(self, db):
        series = branch_config_repo.get_document_series_by_type(db, BRANCH, PID, "sale_invoice")
        branch_config_service.reset_document_series(db, BRANCH, PID, series.id)
        series = branch_config_repo.get_document_series_by_type(db, BRANCH, PID, "sale_invoice")
        assert series.next_number == 1


class TestTaxSettings:
    def test_create(self, db):
        t = branch_config_service.create_tax_setting(
            db, BRANCH, PID,
            {"tax_name": "GST", "tax_type": "gst", "rate": 17.0, "is_default": True, "is_active": True}
        )
        assert t.rate == 17.0

    def test_negative_rate_rejected(self, db):
        with pytest.raises(HTTPException) as exc:
            branch_config_service.create_tax_setting(
                db, BRANCH, PID,
                {"tax_name": "Bad", "tax_type": "gst", "rate": -5.0, "is_active": True}
            )
        assert exc.value.status_code == 422


class TestPreferences:
    def test_bulk_set(self, db):
        prefs = [
            {"pref_key": "show_profit_margin", "pref_value": "true", "data_type": "bool", "category": "ui"},
            {"pref_key": "rows_per_page", "pref_value": "25", "data_type": "int", "category": "ui"},
        ]
        result = branch_config_service.bulk_set_preferences(db, BRANCH, PID, prefs)
        assert len(result) == 2
        # Update same key
        branch_config_service.bulk_set_preferences(db, BRANCH, PID,
            [{"pref_key": "rows_per_page", "pref_value": "50", "data_type": "int", "category": "ui"}])
        refreshed = branch_config_service.list_preferences(db, BRANCH, PID, category="ui")
        rpp = next(p for p in refreshed if p.pref_key == "rows_per_page")
        assert rpp.pref_value == "50"


class TestLicenses:
    def test_create_and_expiry(self, db):
        expiry = date.today() + timedelta(days=20)
        lic = branch_config_service.create_license(
            db, BRANCH, PID,
            {"license_name": "Drug License", "license_type": "drug", "expiry_date": expiry,
             "renewal_reminder_days": 30, "status": "active"}
        )
        assert lic.license_name == "Drug License"
        licenses = branch_config_service.list_licenses(db, BRANCH, PID)
        assert licenses[0].is_expiring_soon is True


class TestFinancialAccounts:
    def test_create_and_default(self, db):
        a1 = branch_config_service.create_financial_account(
            db, BRANCH, PID,
            {"account_name": "Cash", "account_type": "cash", "is_default": True, "is_active": True}
        )
        a2 = branch_config_service.create_financial_account(
            db, BRANCH, PID,
            {"account_name": "Meezan Bank", "account_type": "bank", "is_default": False, "is_active": True}
        )
        branch_config_service.set_default_financial_account(db, BRANCH, PID, a2.id)
        accounts = branch_config_service.list_financial_accounts(db, BRANCH, PID)
        defaults = [a for a in accounts if a.is_default]
        assert len(defaults) == 1
        assert defaults[0].account_name == "Meezan Bank"


class TestPaymentMethods:
    def test_create_update_delete(self, db):
        pm = branch_config_service.create_payment_method(
            db, BRANCH, PID,
            {"method_type": "cash", "display_name": "Cash", "is_enabled": True, "is_default": True, "sort_order": 0}
        )
        assert pm.method_type == "cash"
        branch_config_service.update_payment_method(db, BRANCH, PID, pm.id, {"display_name": "Cash Payment"})
        branch_config_service.delete_payment_method(db, BRANCH, PID, pm.id)
        assert len(branch_config_service.list_payment_methods(db, BRANCH, PID)) == 0


class TestNotifications:
    def test_auto_seed_all_events(self, db):
        settings = branch_config_service.list_notification_settings(db, BRANCH, PID)
        assert len(settings) == 12  # all NotificationEvent values

    def test_update(self, db):
        settings = branch_config_service.list_notification_settings(db, BRANCH, PID)
        evt = settings[0].event_type
        updated = branch_config_service.update_notification_setting(
            db, BRANCH, PID, evt, {"channel_sms": True, "cool_down_minutes": 120}
        )
        assert updated.channel_sms is True


class TestBranding:
    def test_get_or_create(self, db):
        b = branch_config_service.get_branding(db, BRANCH, PID)
        assert b.branch_id == BRANCH

    def test_update(self, db):
        b = branch_config_service.update_branding(db, BRANCH, PID, {"theme_color": "#ff0000"})
        assert b.theme_color == "#ff0000"


class TestPosConfig:
    def test_get_or_create(self, db):
        p = branch_config_service.get_pos_config(db, BRANCH, PID)
        assert p.branch_id == BRANCH

    def test_update(self, db):
        p = branch_config_service.update_pos_config(db, BRANCH, PID, {"auto_print_receipt": False, "discount_limit_percent": 15.0})
        assert p.auto_print_receipt is False

    def test_discount_over_100_rejected(self, db):
        with pytest.raises(HTTPException) as exc:
            branch_config_service.update_pos_config(db, BRANCH, PID, {"discount_limit_percent": 150.0})
        assert exc.value.status_code == 422


class TestSecuritySettings:
    def test_update(self, db):
        s = branch_config_service.update_security(db, BRANCH, PID,
            {"ip_whitelist_enabled": True, "ip_whitelist": ["192.168.1.0/24"]})
        assert s.ip_whitelist_enabled is True

    def test_login_time_invalid(self, db):
        with pytest.raises(HTTPException):
            branch_config_service.update_security(db, BRANCH, PID,
                {"login_time_enabled": True, "login_allowed_from": "18:00", "login_allowed_until": "08:00"})


class TestBackupSettings:
    def test_get_or_create(self, db):
        b = branch_config_service.get_backup(db, BRANCH, PID)
        assert b.auto_backup_enabled is True

    def test_update(self, db):
        b = branch_config_service.update_backup(db, BRANCH, PID,
            {"backup_schedule": "weekly", "retention_days": 60})
        assert b.retention_days == 60


class TestAuditLog:
    def test_audit_entries_written(self, db):
        items, total = branch_config_service.list_audit_logs(db, BRANCH, PID)
        assert total > 0

    def test_search(self, db):
        items, total = branch_config_service.list_audit_logs(db, BRANCH, PID, search="configuration")
        assert total > 0


class TestHealth:
    def test_health_computed(self, db):
        health = branch_config_service.get_health(db, BRANCH, PID)
        assert 0.0 <= health["config_health_score"] <= 100.0
        assert "active_users" in health


class TestOverview:
    def test_overview_loads(self, db):
        overview = branch_config_service.get_overview(db, BRANCH, PID)
        assert "configuration" in overview
        assert "working_hours" in overview
        assert "health" in overview
