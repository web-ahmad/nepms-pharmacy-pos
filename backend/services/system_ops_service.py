"""
services/system_ops_service.py
──────────────────────────────
Real system-administration operations for the System module.

Everything here reports or acts on ACTUAL state — disk, database file, row
counts, real backup copies. Nothing is simulated. Deliberately stdlib-only so
it runs without extra packages (no psutil dependency).
"""

from __future__ import annotations

import os
import re
import shutil
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import SQLALCHEMY_DATABASE_URL

# Marks when this process started, so uptime is real rather than invented.
PROCESS_STARTED_AT = time.time()

BACKUP_DIR = os.path.join(os.getcwd(), "storage", "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

# Tables worth surfacing as "data footprint" on the dashboard.
_COUNTED_TABLES = [
    ("sales", "Sales"),
    ("sale_items", "Sale items"),
    ("medicines", "Medicines"),
    ("batches", "Batches"),
    ("customers", "Customers"),
    ("purchases", "Purchases"),
    ("employees", "Employees"),
    ("attendance", "Attendance"),
    ("journal_entries", "Journal entries"),
    ("users", "Users"),
]

# Tables that accumulate noise and are safe to prune by age.
_PRUNABLE = [
    ("user_login_history", "created_at", "Login history"),
    ("user_sessions", "created_at", "Expired sessions"),
    ("user_activity_logs", "created_at", "Activity logs"),
    ("notifications", "created_at", "Read notifications"),
]

DEFAULT_AUTOMATION = {
    "auto_backup_enabled": False,
    "auto_backup_hour": 2,          # 0–23, server local time
    "backup_retention_days": 14,
    "auto_cleanup_enabled": False,
    "log_retention_days": 90,
}


def _sqlite_path() -> Optional[str]:
    """Filesystem path of the SQLite database, or None on other engines."""
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return None
    raw = SQLALCHEMY_DATABASE_URL.split("///", 1)[-1]
    return os.path.abspath(raw)


def _human_mb(num_bytes: float) -> float:
    return round(num_bytes / (1024 * 1024), 2)


class SystemOpsService:
    def __init__(self, db: Session):
        self.db = db

    # ── Health ────────────────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        db_path = _sqlite_path()
        engine = "SQLite" if db_path else "PostgreSQL/Other"

        db_size_mb = _human_mb(os.path.getsize(db_path)) if db_path and os.path.exists(db_path) else 0.0

        total, used, free = shutil.disk_usage(os.getcwd())
        uptime_seconds = int(time.time() - PROCESS_STARTED_AT)

        # A real connectivity probe rather than a hardcoded "Healthy".
        db_ok, db_latency_ms = True, 0.0
        try:
            t0 = time.perf_counter()
            self.db.execute(text("SELECT 1"))
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        except Exception:
            db_ok = False

        last_backup = self._last_backup_info()
        pending_ocr = self._safe_count("ocr_queues", "WHERE status IN ('Pending','Processing')")

        return {
            "database_status": "Healthy" if db_ok else "Unreachable",
            "database_engine": engine,
            "database_latency_ms": db_latency_ms,
            "database_size_mb": db_size_mb,
            "disk_total_gb": round(total / (1024 ** 3), 2),
            "disk_used_gb": round(used / (1024 ** 3), 2),
            "disk_free_gb": round(free / (1024 ** 3), 2),
            "disk_used_percent": round(used / total * 100, 1) if total else 0.0,
            "cpu_cores": os.cpu_count() or 1,
            "uptime_seconds": uptime_seconds,
            "queues_pending": pending_ocr,
            "last_backup_at": last_backup["at"],
            "last_backup_age_hours": last_backup["age_hours"],
            "backup_count": last_backup["count"],
            "scheduler_active": self._scheduler_available(),
        }

    def data_footprint(self) -> List[Dict[str, Any]]:
        """Row counts for the tables that actually carry business data."""
        out = []
        for table, label in _COUNTED_TABLES:
            count = self._safe_count(table)
            if count is not None:
                out.append({"table": table, "label": label, "rows": count})
        return out

    # ── Backups (real file copies) ───────────────────────────────────────────

    def create_backup(self, tenant_id: str, user_id: str) -> Dict[str, Any]:
        from models.system import BackupHistory

        db_path = _sqlite_path()
        if not db_path or not os.path.exists(db_path):
            raise RuntimeError("Backups are only supported on the SQLite database in this deployment.")

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"nepms_{stamp}.db"
        dest = os.path.join(BACKUP_DIR, file_name)

        # sqlite3's backup API produces a consistent copy even while the app
        # is writing — safer than shutil.copy on a live database.
        src = sqlite3.connect(db_path)
        try:
            dst = sqlite3.connect(dest)
            try:
                src.backup(dst)
            finally:
                dst.close()
        finally:
            src.close()

        size_mb = _human_mb(os.path.getsize(dest))
        record = BackupHistory(
            tenant_id=tenant_id,
            file_name=file_name,
            size_mb=size_mb,
            status="Success",
            created_by=user_id,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return {
            "id": record.id, "file_name": file_name, "size_mb": size_mb,
            "status": "Success", "created_at": record.created_at,
        }

    def backup_file_path(self, file_name: str) -> str:
        """Resolve a backup file safely — never escapes the backup directory."""
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", file_name or ""):
            raise ValueError("Invalid backup file name.")
        path = os.path.abspath(os.path.join(BACKUP_DIR, file_name))
        if not path.startswith(os.path.abspath(BACKUP_DIR) + os.sep):
            raise ValueError("Invalid backup file name.")
        if not os.path.exists(path):
            raise FileNotFoundError("That backup file is no longer on disk.")
        return path

    def delete_backup(self, tenant_id: str, backup_id: str) -> None:
        from models.system import BackupHistory
        rec = (self.db.query(BackupHistory)
               .filter(BackupHistory.id == backup_id, BackupHistory.tenant_id == tenant_id)
               .first())
        if not rec:
            raise FileNotFoundError("Backup not found.")
        try:
            os.remove(self.backup_file_path(rec.file_name))
        except (FileNotFoundError, ValueError):
            pass  # already gone from disk — still drop the record
        self.db.delete(rec)
        self.db.commit()

    def prune_backups(self, tenant_id: str, keep_days: int) -> int:
        """Delete backups older than keep_days. Returns how many were removed."""
        from models.system import BackupHistory
        cutoff = datetime.utcnow() - timedelta(days=max(1, keep_days))
        old = (self.db.query(BackupHistory)
               .filter(BackupHistory.tenant_id == tenant_id, BackupHistory.created_at < cutoff)
               .all())
        for rec in old:
            try:
                os.remove(self.backup_file_path(rec.file_name))
            except (FileNotFoundError, ValueError):
                pass
            self.db.delete(rec)
        self.db.commit()
        return len(old)

    # ── Maintenance ──────────────────────────────────────────────────────────

    def vacuum(self) -> Dict[str, Any]:
        """Reclaim free pages in the SQLite file. Reports the real space saved."""
        db_path = _sqlite_path()
        if not db_path or not os.path.exists(db_path):
            raise RuntimeError("VACUUM is only available on the SQLite database.")
        before = os.path.getsize(db_path)
        # VACUUM can't run inside a transaction — go through a raw connection.
        conn = sqlite3.connect(db_path)
        try:
            conn.execute("VACUUM")
            conn.commit()
        finally:
            conn.close()
        after = os.path.getsize(db_path)
        return {
            "before_mb": _human_mb(before),
            "after_mb": _human_mb(after),
            "reclaimed_mb": _human_mb(max(0, before - after)),
        }

    def cleanup_logs(self, keep_days: int = 90) -> List[Dict[str, Any]]:
        """Prune old audit/session noise older than keep_days."""
        cutoff = (datetime.utcnow() - timedelta(days=max(1, keep_days))).isoformat(sep=" ")
        results = []
        for table, col, label in _PRUNABLE:
            if self._safe_count(table) is None:
                continue          # table doesn't exist in this build
            try:
                res = self.db.execute(
                    text(f"DELETE FROM {table} WHERE {col} < :cutoff"), {"cutoff": cutoff}
                )
                results.append({"table": table, "label": label, "deleted": res.rowcount or 0})
            except Exception:
                self.db.rollback()
                continue
        self.db.commit()
        return results

    # ── Automation settings ──────────────────────────────────────────────────

    def get_automation(self, tenant_id: str) -> Dict[str, Any]:
        cfg = dict(DEFAULT_AUTOMATION)
        cfg.update(self._stored_automation(tenant_id))
        cfg["scheduler_active"] = self._scheduler_available()
        return cfg

    def update_automation(self, tenant_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        from models.settings import TenantSettings
        row = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not row:
            row = TenantSettings(tenant_id=tenant_id)
            self.db.add(row)
            self.db.flush()

        current = dict(row.inventory_settings or {})
        block = dict(current.get("_system_automation") or {})
        for key in DEFAULT_AUTOMATION:
            if key in patch and patch[key] is not None:
                block[key] = patch[key]
        current["_system_automation"] = block
        row.inventory_settings = current
        # JSON columns need an explicit change signal to persist.
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(row, "inventory_settings")
        self.db.commit()
        return self.get_automation(tenant_id)

    # ── internals ────────────────────────────────────────────────────────────

    def _stored_automation(self, tenant_id: str) -> Dict[str, Any]:
        from models.settings import TenantSettings
        row = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not row:
            return {}
        return dict((row.inventory_settings or {}).get("_system_automation") or {})

    def _safe_count(self, table: str, where: str = "") -> Optional[int]:
        try:
            return self.db.execute(text(f"SELECT COUNT(*) FROM {table} {where}")).scalar() or 0
        except Exception:
            self.db.rollback()
            return None

    def _last_backup_info(self) -> Dict[str, Any]:
        from models.system import BackupHistory
        try:
            count = self.db.query(func.count(BackupHistory.id)).scalar() or 0
            latest = self.db.query(BackupHistory).order_by(BackupHistory.created_at.desc()).first()
        except Exception:
            self.db.rollback()
            return {"at": None, "age_hours": None, "count": 0}
        if not latest or not latest.created_at:
            return {"at": None, "age_hours": None, "count": count}
        age = (datetime.utcnow() - latest.created_at).total_seconds() / 3600
        return {"at": latest.created_at, "age_hours": round(age, 1), "count": count}

    @staticmethod
    def _scheduler_available() -> bool:
        try:
            import apscheduler  # noqa: F401
            return True
        except ImportError:
            return False


# ── Scheduled automation ─────────────────────────────────────────────────────

def run_system_automation() -> None:
    """Hourly tick: for every tenant, take the nightly backup and prune old
    data if they've switched those on. Registered with APScheduler in main.py.

    Runs once an hour and only acts when the configured hour matches, so a
    missed tick never doubles up the work.
    """
    from database import SessionLocal
    from models.settings import TenantSettings

    db = SessionLocal()
    try:
        svc = SystemOpsService(db)
        hour_now = datetime.now().hour

        for row in db.query(TenantSettings).all():
            cfg = dict(DEFAULT_AUTOMATION)
            cfg.update(dict((row.inventory_settings or {}).get("_system_automation") or {}))
            tenant_id = row.tenant_id

            if cfg.get("auto_backup_enabled") and int(cfg.get("auto_backup_hour", 2)) == hour_now:
                try:
                    svc.create_backup(tenant_id, user_id="system")
                    svc.prune_backups(tenant_id, int(cfg.get("backup_retention_days", 14)))
                    print(f"[system-automation] backup + prune done for tenant {tenant_id[:8]}")
                except Exception as e:
                    print(f"[system-automation] backup failed for {tenant_id[:8]}: {e}")

            if cfg.get("auto_cleanup_enabled") and hour_now == 3:
                try:
                    svc.cleanup_logs(int(cfg.get("log_retention_days", 90)))
                    print(f"[system-automation] log cleanup done for tenant {tenant_id[:8]}")
                except Exception as e:
                    print(f"[system-automation] cleanup failed for {tenant_id[:8]}: {e}")
    finally:
        db.close()
