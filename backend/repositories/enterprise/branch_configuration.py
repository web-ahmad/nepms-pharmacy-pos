"""
repositories/enterprise/branch_configuration.py
─────────────────────────────────────────────────
Data-access layer for Phase 3 — Enterprise Branch Operations & Configuration.

All queries are pharmacy-scoped and branch-scoped.
Soft-delete is enforced on all reads.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from models.enterprise.branch_configuration import (
    BranchConfiguration,
    BranchWorkingHours,
    BranchHoliday,
    BranchWarehouse,
    BranchCounter,
    BranchPrinter,
    BranchDevice,
    BranchDocumentSeries,
    BranchTaxSetting,
    BranchPreference,
    BranchLicense,
    BranchFinancialAccount,
    BranchPaymentMethod,
    BranchNotificationSetting,
    BranchBranding,
    BranchPosConfig,
    BranchSecuritySetting,
    BranchBackupSetting,
    BranchConfigAuditLog,
    BranchHealthSnapshot,
    NotificationEvent,
)


# ── Base filter helper ────────────────────────────────────────────────────────

def _active(model: Any, branch_id: str, pharmacy_id: str):
    return and_(
        model.branch_id == branch_id,
        model.pharmacy_id == pharmacy_id,
        model.is_deleted == False,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  BranchConfigurationRepository
# ══════════════════════════════════════════════════════════════════════════════

class BranchConfigurationRepository:

    # ── Configuration (singleton per branch) ─────────────────────────────────

    def get_or_create_config(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> BranchConfiguration:
        obj = db.query(BranchConfiguration).filter(
            BranchConfiguration.branch_id == branch_id,
            BranchConfiguration.pharmacy_id == pharmacy_id,
            BranchConfiguration.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchConfiguration(
                branch_id=branch_id, pharmacy_id=pharmacy_id
            )
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def update_config(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchConfiguration:
        obj = self.get_or_create_config(db, branch_id, pharmacy_id)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        obj.config_version = (obj.config_version or 1) + 1
        db.commit()
        db.refresh(obj)
        return obj

    # ── Working Hours ─────────────────────────────────────────────────────────

    def list_working_hours(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> List[BranchWorkingHours]:
        return db.query(BranchWorkingHours).filter(
            _active(BranchWorkingHours, branch_id, pharmacy_id)
        ).order_by(BranchWorkingHours.day_of_week).all()

    def upsert_working_hours(
        self, db: Session, branch_id: str, pharmacy_id: str,
        day_of_week: str, data: Dict[str, Any]
    ) -> BranchWorkingHours:
        obj = db.query(BranchWorkingHours).filter(
            BranchWorkingHours.branch_id == branch_id,
            BranchWorkingHours.pharmacy_id == pharmacy_id,
            BranchWorkingHours.day_of_week == day_of_week,
            BranchWorkingHours.is_deleted == False,
        ).first()
        if obj:
            for k, v in data.items():
                setattr(obj, k, v)
        else:
            obj = BranchWorkingHours(
                branch_id=branch_id, pharmacy_id=pharmacy_id,
                day_of_week=day_of_week, **data
            )
            db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def delete_working_hours(
        self, db: Session, branch_id: str, pharmacy_id: str, record_id: str
    ) -> bool:
        obj = db.query(BranchWorkingHours).filter(
            BranchWorkingHours.id == record_id,
            BranchWorkingHours.branch_id == branch_id,
            BranchWorkingHours.pharmacy_id == pharmacy_id,
        ).first()
        if not obj:
            return False
        obj.is_deleted = True
        db.commit()
        return True

    # ── Holidays ─────────────────────────────────────────────────────────────

    def list_holidays(
        self, db: Session, branch_id: str, pharmacy_id: str,
        year: Optional[int] = None
    ) -> List[BranchHoliday]:
        q = db.query(BranchHoliday).filter(
            _active(BranchHoliday, branch_id, pharmacy_id)
        )
        if year:
            q = q.filter(func.strftime("%Y", BranchHoliday.holiday_date) == str(year))
        return q.order_by(BranchHoliday.holiday_date).all()

    def create_holiday(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchHoliday:
        obj = BranchHoliday(branch_id=branch_id, pharmacy_id=pharmacy_id, **data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update_holiday(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str,
        data: Dict[str, Any]
    ) -> Optional[BranchHoliday]:
        obj = db.query(BranchHoliday).filter(
            BranchHoliday.id == record_id,
            BranchHoliday.branch_id == branch_id,
            BranchHoliday.pharmacy_id == pharmacy_id,
            BranchHoliday.is_deleted == False,
        ).first()
        if not obj:
            return None
        for k, v in data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete_holiday(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str
    ) -> bool:
        obj = db.query(BranchHoliday).filter(
            BranchHoliday.id == record_id,
            BranchHoliday.branch_id == branch_id,
            BranchHoliday.pharmacy_id == pharmacy_id,
        ).first()
        if not obj:
            return False
        obj.is_deleted = True
        db.commit()
        return True

    # ── Generic CRUD helpers for multi-record sub-resources ──────────────────

    def _list(self, db, Model, branch_id, pharmacy_id, order_by=None):
        q = db.query(Model).filter(_active(Model, branch_id, pharmacy_id))
        if order_by is not None:
            q = q.order_by(order_by)
        return q.all()

    def _get(self, db, Model, record_id, branch_id, pharmacy_id):
        return db.query(Model).filter(
            Model.id == record_id,
            Model.branch_id == branch_id,
            Model.pharmacy_id == pharmacy_id,
            Model.is_deleted == False,
        ).first()

    def _create(self, db, Model, branch_id, pharmacy_id, data):
        obj = Model(branch_id=branch_id, pharmacy_id=pharmacy_id, **data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def _update(self, db, Model, record_id, branch_id, pharmacy_id, data):
        obj = self._get(db, Model, record_id, branch_id, pharmacy_id)
        if not obj:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def _soft_delete(self, db, Model, record_id, branch_id, pharmacy_id):
        obj = db.query(Model).filter(
            Model.id == record_id,
            Model.branch_id == branch_id,
            Model.pharmacy_id == pharmacy_id,
        ).first()
        if not obj:
            return False
        obj.is_deleted = True
        db.commit()
        return True

    # ── Warehouses ────────────────────────────────────────────────────────────

    def list_warehouses(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchWarehouse, branch_id, pharmacy_id)

    def get_warehouse(self, db, record_id, branch_id, pharmacy_id):
        return self._get(db, BranchWarehouse, record_id, branch_id, pharmacy_id)

    def create_warehouse(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchWarehouse, branch_id, pharmacy_id, data)

    def update_warehouse(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchWarehouse, record_id, branch_id, pharmacy_id, data)

    def delete_warehouse(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchWarehouse, record_id, branch_id, pharmacy_id)

    def set_default_warehouse(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str
    ) -> Optional[BranchWarehouse]:
        """Clear all defaults, then mark the target as default."""
        db.query(BranchWarehouse).filter(
            BranchWarehouse.branch_id == branch_id,
            BranchWarehouse.pharmacy_id == pharmacy_id,
            BranchWarehouse.is_deleted == False,
        ).update({"is_default": False})
        obj = self._get(db, BranchWarehouse, record_id, branch_id, pharmacy_id)
        if obj:
            obj.is_default = True
            db.commit()
            db.refresh(obj)
        return obj

    # ── Counters ──────────────────────────────────────────────────────────────

    def list_counters(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchCounter, branch_id, pharmacy_id)

    def create_counter(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchCounter, branch_id, pharmacy_id, data)

    def update_counter(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchCounter, record_id, branch_id, pharmacy_id, data)

    def delete_counter(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchCounter, record_id, branch_id, pharmacy_id)

    def code_exists_counter(
        self, db: Session, branch_id: str, pharmacy_id: str,
        code: str, exclude_id: Optional[str] = None
    ) -> bool:
        q = db.query(BranchCounter).filter(
            BranchCounter.branch_id == branch_id,
            BranchCounter.pharmacy_id == pharmacy_id,
            BranchCounter.code == code,
            BranchCounter.is_deleted == False,
        )
        if exclude_id:
            q = q.filter(BranchCounter.id != exclude_id)
        return q.first() is not None

    # ── Printers ──────────────────────────────────────────────────────────────

    def list_printers(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchPrinter, branch_id, pharmacy_id)

    def create_printer(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchPrinter, branch_id, pharmacy_id, data)

    def update_printer(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchPrinter, record_id, branch_id, pharmacy_id, data)

    def delete_printer(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchPrinter, record_id, branch_id, pharmacy_id)

    def set_default_printer(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str
    ) -> Optional[BranchPrinter]:
        db.query(BranchPrinter).filter(
            BranchPrinter.branch_id == branch_id,
            BranchPrinter.pharmacy_id == pharmacy_id,
            BranchPrinter.is_deleted == False,
        ).update({"is_default": False})
        obj = self._get(db, BranchPrinter, record_id, branch_id, pharmacy_id)
        if obj:
            obj.is_default = True
            db.commit()
            db.refresh(obj)
        return obj

    # ── Devices ───────────────────────────────────────────────────────────────

    def list_devices(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchDevice, branch_id, pharmacy_id)

    def create_device(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchDevice, branch_id, pharmacy_id, data)

    def update_device(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchDevice, record_id, branch_id, pharmacy_id, data)

    def delete_device(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchDevice, record_id, branch_id, pharmacy_id)

    # ── Document Series ───────────────────────────────────────────────────────

    def list_document_series(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchDocumentSeries, branch_id, pharmacy_id)

    def get_document_series_by_type(
        self, db: Session, branch_id: str, pharmacy_id: str, document_type: str
    ) -> Optional[BranchDocumentSeries]:
        return db.query(BranchDocumentSeries).filter(
            BranchDocumentSeries.branch_id == branch_id,
            BranchDocumentSeries.pharmacy_id == pharmacy_id,
            BranchDocumentSeries.document_type == document_type,
            BranchDocumentSeries.is_deleted == False,
        ).first()

    def upsert_document_series(
        self, db: Session, branch_id: str, pharmacy_id: str,
        document_type: str, data: Dict[str, Any]
    ) -> BranchDocumentSeries:
        obj = self.get_document_series_by_type(db, branch_id, pharmacy_id, document_type)
        if obj:
            for k, v in data.items():
                if v is not None:
                    setattr(obj, k, v)
        else:
            obj = BranchDocumentSeries(
                branch_id=branch_id, pharmacy_id=pharmacy_id,
                document_type=document_type, **data
            )
            db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def increment_document_number(
        self, db: Session, branch_id: str, pharmacy_id: str, document_type: str
    ) -> Tuple[BranchDocumentSeries, int]:
        """Atomically increment next_number and return (series, allocated_number)."""
        obj = self.get_document_series_by_type(db, branch_id, pharmacy_id, document_type)
        if not obj:
            raise ValueError(f"No document series configured for {document_type}")
        allocated = obj.next_number
        obj.next_number += 1
        db.commit()
        db.refresh(obj)
        return obj, allocated

    def reset_document_series(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str
    ) -> Optional[BranchDocumentSeries]:
        obj = self._get(db, BranchDocumentSeries, record_id, branch_id, pharmacy_id)
        if not obj:
            return None
        obj.next_number = 1
        obj.last_reset_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
        return obj

    def delete_document_series(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchDocumentSeries, record_id, branch_id, pharmacy_id)

    # ── Tax Settings ──────────────────────────────────────────────────────────

    def list_tax_settings(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchTaxSetting, branch_id, pharmacy_id)

    def create_tax_setting(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchTaxSetting, branch_id, pharmacy_id, data)

    def update_tax_setting(self, db, record_id, branch_id, pharmacy_id, data):
        if data.get("is_default"):
            db.query(BranchTaxSetting).filter(
                BranchTaxSetting.branch_id == branch_id,
                BranchTaxSetting.pharmacy_id == pharmacy_id,
                BranchTaxSetting.is_deleted == False,
            ).update({"is_default": False})
        return self._update(db, BranchTaxSetting, record_id, branch_id, pharmacy_id, data)

    def delete_tax_setting(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchTaxSetting, record_id, branch_id, pharmacy_id)

    # ── Preferences ───────────────────────────────────────────────────────────

    def list_preferences(
        self, db: Session, branch_id: str, pharmacy_id: str,
        category: Optional[str] = None
    ) -> List[BranchPreference]:
        q = db.query(BranchPreference).filter(
            _active(BranchPreference, branch_id, pharmacy_id)
        )
        if category:
            q = q.filter(BranchPreference.category == category)
        return q.order_by(BranchPreference.category, BranchPreference.pref_key).all()

    def bulk_set_preferences(
        self, db: Session, branch_id: str, pharmacy_id: str,
        prefs: List[Dict[str, Any]]
    ) -> List[BranchPreference]:
        results = []
        for p in prefs:
            key = p.pop("pref_key")
            obj = db.query(BranchPreference).filter(
                BranchPreference.branch_id == branch_id,
                BranchPreference.pharmacy_id == pharmacy_id,
                BranchPreference.pref_key == key,
                BranchPreference.is_deleted == False,
            ).first()
            if obj:
                for k, v in p.items():
                    setattr(obj, k, v)
            else:
                obj = BranchPreference(
                    branch_id=branch_id, pharmacy_id=pharmacy_id,
                    pref_key=key, **p
                )
                db.add(obj)
            results.append(obj)
        db.commit()
        for r in results:
            db.refresh(r)
        return results

    # ── Licenses ──────────────────────────────────────────────────────────────

    def list_licenses(self, db, branch_id, pharmacy_id):
        objs = self._list(db, BranchLicense, branch_id, pharmacy_id)
        today = date.today()
        for obj in objs:
            if obj.expiry_date:
                delta = (obj.expiry_date - today).days
                obj.days_until_expiry = delta                           # type: ignore[attr-defined]
                obj.is_expiring_soon = 0 <= delta <= obj.renewal_reminder_days  # type: ignore[attr-defined]
            else:
                obj.days_until_expiry = None                            # type: ignore[attr-defined]
                obj.is_expiring_soon = False                            # type: ignore[attr-defined]
        return objs

    def create_license(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchLicense, branch_id, pharmacy_id, data)

    def update_license(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchLicense, record_id, branch_id, pharmacy_id, data)

    def delete_license(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchLicense, record_id, branch_id, pharmacy_id)

    # ── Financial Accounts ────────────────────────────────────────────────────

    def list_financial_accounts(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchFinancialAccount, branch_id, pharmacy_id)

    def create_financial_account(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchFinancialAccount, branch_id, pharmacy_id, data)

    def update_financial_account(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchFinancialAccount, record_id, branch_id, pharmacy_id, data)

    def delete_financial_account(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchFinancialAccount, record_id, branch_id, pharmacy_id)

    def set_default_financial_account(
        self, db: Session, record_id: str, branch_id: str, pharmacy_id: str
    ) -> Optional[BranchFinancialAccount]:
        db.query(BranchFinancialAccount).filter(
            BranchFinancialAccount.branch_id == branch_id,
            BranchFinancialAccount.pharmacy_id == pharmacy_id,
            BranchFinancialAccount.is_deleted == False,
        ).update({"is_default": False})
        obj = self._get(db, BranchFinancialAccount, record_id, branch_id, pharmacy_id)
        if obj:
            obj.is_default = True
            db.commit()
            db.refresh(obj)
        return obj

    # ── Payment Methods ───────────────────────────────────────────────────────

    def list_payment_methods(self, db, branch_id, pharmacy_id):
        return self._list(db, BranchPaymentMethod, branch_id, pharmacy_id,
                          order_by=BranchPaymentMethod.sort_order)

    def create_payment_method(self, db, branch_id, pharmacy_id, data):
        return self._create(db, BranchPaymentMethod, branch_id, pharmacy_id, data)

    def update_payment_method(self, db, record_id, branch_id, pharmacy_id, data):
        return self._update(db, BranchPaymentMethod, record_id, branch_id, pharmacy_id, data)

    def delete_payment_method(self, db, record_id, branch_id, pharmacy_id):
        return self._soft_delete(db, BranchPaymentMethod, record_id, branch_id, pharmacy_id)

    # ── Notification Settings ─────────────────────────────────────────────────

    def list_notification_settings(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> List[BranchNotificationSetting]:
        objs = {
            s.event_type: s
            for s in db.query(BranchNotificationSetting).filter(
                _active(BranchNotificationSetting, branch_id, pharmacy_id)
            ).all()
        }
        # Ensure all events are represented
        result = []
        for event in NotificationEvent:
            if event.value in objs:
                result.append(objs[event.value])
            else:
                default = BranchNotificationSetting(
                    branch_id=branch_id, pharmacy_id=pharmacy_id,
                    event_type=event.value
                )
                db.add(default)
                result.append(default)
        db.commit()
        return result

    def update_notification_setting(
        self, db: Session, branch_id: str, pharmacy_id: str,
        event_type: str, data: Dict[str, Any]
    ) -> BranchNotificationSetting:
        obj = db.query(BranchNotificationSetting).filter(
            BranchNotificationSetting.branch_id == branch_id,
            BranchNotificationSetting.pharmacy_id == pharmacy_id,
            BranchNotificationSetting.event_type == event_type,
            BranchNotificationSetting.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchNotificationSetting(
                branch_id=branch_id, pharmacy_id=pharmacy_id,
                event_type=event_type
            )
            db.add(obj)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    # ── Branding (singleton) ─────────────────────────────────────────────────

    def get_or_create_branding(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> BranchBranding:
        obj = db.query(BranchBranding).filter(
            BranchBranding.branch_id == branch_id,
            BranchBranding.pharmacy_id == pharmacy_id,
            BranchBranding.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchBranding(branch_id=branch_id, pharmacy_id=pharmacy_id)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def update_branding(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchBranding:
        obj = self.get_or_create_branding(db, branch_id, pharmacy_id)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    # ── POS Config (singleton) ────────────────────────────────────────────────

    def get_or_create_pos_config(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> BranchPosConfig:
        obj = db.query(BranchPosConfig).filter(
            BranchPosConfig.branch_id == branch_id,
            BranchPosConfig.pharmacy_id == pharmacy_id,
            BranchPosConfig.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchPosConfig(branch_id=branch_id, pharmacy_id=pharmacy_id)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def update_pos_config(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchPosConfig:
        obj = self.get_or_create_pos_config(db, branch_id, pharmacy_id)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    # ── Security Settings (singleton) ────────────────────────────────────────

    def get_or_create_security(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> BranchSecuritySetting:
        obj = db.query(BranchSecuritySetting).filter(
            BranchSecuritySetting.branch_id == branch_id,
            BranchSecuritySetting.pharmacy_id == pharmacy_id,
            BranchSecuritySetting.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchSecuritySetting(branch_id=branch_id, pharmacy_id=pharmacy_id)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def update_security(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchSecuritySetting:
        obj = self.get_or_create_security(db, branch_id, pharmacy_id)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    # ── Backup Settings (singleton) ──────────────────────────────────────────

    def get_or_create_backup(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> BranchBackupSetting:
        obj = db.query(BranchBackupSetting).filter(
            BranchBackupSetting.branch_id == branch_id,
            BranchBackupSetting.pharmacy_id == pharmacy_id,
            BranchBackupSetting.is_deleted == False,
        ).first()
        if not obj:
            obj = BranchBackupSetting(branch_id=branch_id, pharmacy_id=pharmacy_id)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def update_backup(
        self, db: Session, branch_id: str, pharmacy_id: str, data: Dict[str, Any]
    ) -> BranchBackupSetting:
        obj = self.get_or_create_backup(db, branch_id, pharmacy_id)
        for k, v in data.items():
            if v is not None:
                setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    # ── Config Audit Log ──────────────────────────────────────────────────────

    def write_audit_log(
        self, db: Session, branch_id: str, pharmacy_id: str,
        module: str, action: str, record_id: Optional[str] = None,
        field_name: Optional[str] = None, old_value: Optional[str] = None,
        new_value: Optional[str] = None, performed_by_id: Optional[str] = None,
        ip_address: Optional[str] = None, device_name: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> BranchConfigAuditLog:
        log = BranchConfigAuditLog(
            branch_id=branch_id, pharmacy_id=pharmacy_id,
            module=module, action=action, record_id=record_id,
            field_name=field_name, old_value=old_value, new_value=new_value,
            performed_by_id=performed_by_id, ip_address=ip_address,
            device_name=device_name, summary=summary,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def list_audit_logs(
        self, db: Session, branch_id: str, pharmacy_id: str,
        module: Optional[str] = None, search: Optional[str] = None,
        skip: int = 0, limit: int = 50
    ) -> Tuple[List[BranchConfigAuditLog], int]:
        q = db.query(BranchConfigAuditLog).filter(
            BranchConfigAuditLog.branch_id == branch_id,
            BranchConfigAuditLog.pharmacy_id == pharmacy_id,
            BranchConfigAuditLog.is_deleted == False,
        )
        if module:
            q = q.filter(BranchConfigAuditLog.module == module)
        if search:
            like = f"%{search}%"
            q = q.filter(
                BranchConfigAuditLog.summary.ilike(like) |
                BranchConfigAuditLog.field_name.ilike(like) |
                BranchConfigAuditLog.module.ilike(like)
            )
        total = q.count()
        items = q.order_by(BranchConfigAuditLog.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    # ── Health Dashboard ──────────────────────────────────────────────────────

    def get_health(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> Dict[str, Any]:
        """Compute live branch health KPIs."""
        from models.enterprise.user import BranchUserAssignment

        active_users = db.query(BranchUserAssignment).filter(
            BranchUserAssignment.branch_id == branch_id,
            BranchUserAssignment.pharmacy_id == pharmacy_id,
            BranchUserAssignment.is_active == True,
            BranchUserAssignment.is_deleted == False,
        ).count()

        active_devices = db.query(BranchDevice).filter(
            _active(BranchDevice, branch_id, pharmacy_id),
            BranchDevice.is_active == True,
        ).count()

        connected_printers = db.query(BranchPrinter).filter(
            _active(BranchPrinter, branch_id, pharmacy_id),
            BranchPrinter.is_active == True,
        ).count()

        active_warehouses = db.query(BranchWarehouse).filter(
            _active(BranchWarehouse, branch_id, pharmacy_id),
            BranchWarehouse.is_active == True,
        ).count()

        active_counters = db.query(BranchCounter).filter(
            _active(BranchCounter, branch_id, pharmacy_id),
            BranchCounter.is_active == True,
        ).count()

        today = date.today()
        soon_cutoff = today + timedelta(days=30)
        licenses_expiring_soon = db.query(BranchLicense).filter(
            _active(BranchLicense, branch_id, pharmacy_id),
            BranchLicense.expiry_date != None,
            BranchLicense.expiry_date >= today,
            BranchLicense.expiry_date <= soon_cutoff,
        ).count()
        licenses_expired = db.query(BranchLicense).filter(
            _active(BranchLicense, branch_id, pharmacy_id),
            BranchLicense.expiry_date != None,
            BranchLicense.expiry_date < today,
        ).count()

        backup = self.get_or_create_backup(db, branch_id, pharmacy_id)

        # Health score heuristic (0–100)
        config = db.query(BranchConfiguration).filter(
            BranchConfiguration.branch_id == branch_id,
            BranchConfiguration.pharmacy_id == pharmacy_id,
            BranchConfiguration.is_deleted == False,
        ).first()
        score = 100.0
        if not config or not config.is_fully_configured:
            score -= 20
        if licenses_expired > 0:
            score -= 15 * min(licenses_expired, 3)
        if licenses_expiring_soon > 0:
            score -= 5
        if active_warehouses == 0:
            score -= 10
        if connected_printers == 0:
            score -= 5
        if backup.last_backup_status == "failed":
            score -= 10
        score = max(0.0, score)

        return {
            "branch_id": branch_id,
            "active_users": active_users,
            "active_devices": active_devices,
            "connected_printers": connected_printers,
            "active_warehouses": active_warehouses,
            "active_counters": active_counters,
            "last_backup_at": backup.last_backup_at,
            "last_backup_status": backup.last_backup_status,
            "storage_used_mb": backup.last_backup_size_mb or 0.0,
            "licenses_expiring_soon": licenses_expiring_soon,
            "licenses_expired": licenses_expired,
            "config_health_score": round(score, 1),
            "missing_configs": [],
        }

    # ── Settings Overview ─────────────────────────────────────────────────────

    def get_overview(
        self, db: Session, branch_id: str, pharmacy_id: str
    ) -> Dict[str, Any]:
        """Load all config resources in one call for the settings page."""
        return {
            "configuration":         self.get_or_create_config(db, branch_id, pharmacy_id),
            "working_hours":         self.list_working_hours(db, branch_id, pharmacy_id),
            "holidays":              self.list_holidays(db, branch_id, pharmacy_id),
            "warehouses":            self.list_warehouses(db, branch_id, pharmacy_id),
            "counters":              self.list_counters(db, branch_id, pharmacy_id),
            "printers":              self.list_printers(db, branch_id, pharmacy_id),
            "devices":               self.list_devices(db, branch_id, pharmacy_id),
            "document_series":       self.list_document_series(db, branch_id, pharmacy_id),
            "tax_settings":          self.list_tax_settings(db, branch_id, pharmacy_id),
            "preferences":           self.list_preferences(db, branch_id, pharmacy_id),
            "licenses":              self.list_licenses(db, branch_id, pharmacy_id),
            "financial_accounts":    self.list_financial_accounts(db, branch_id, pharmacy_id),
            "payment_methods":       self.list_payment_methods(db, branch_id, pharmacy_id),
            "notification_settings": self.list_notification_settings(db, branch_id, pharmacy_id),
            "branding":              self.get_or_create_branding(db, branch_id, pharmacy_id),
            "pos_config":            self.get_or_create_pos_config(db, branch_id, pharmacy_id),
            "security_setting":      self.get_or_create_security(db, branch_id, pharmacy_id),
            "backup_setting":        self.get_or_create_backup(db, branch_id, pharmacy_id),
            "health":                self.get_health(db, branch_id, pharmacy_id),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────

branch_config_repo = BranchConfigurationRepository()
