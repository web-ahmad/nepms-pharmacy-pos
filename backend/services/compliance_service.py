"""
services/compliance_service.py
──────────────────────────────
Compliance & audit reporting.

Reads the audit trails the application actually writes:
  • audit_events      — operational events (voids, expiry, exports, variances)
  • user_activity_logs — administrative actions on user accounts
  • user_login_history — sign-in attempts, devices and IPs

The previous version imported a non-existent `AuditLog` model against a table
that was never created, so every compliance endpoint raised on import.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

# Event types that are destructive or financially sensitive. Anything here is
# surfaced on the Sensitive Actions view regardless of its stored severity.
SENSITIVE_EVENT_TYPES = {
    "void", "expense_void", "delete", "sale_delete", "user_delete",
    "REPORT_EXPORT", "export", "cash_variance", "payroll_approve",
    "role_change", "permission_change", "password_reset", "backup",
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}

DEFAULT_RETENTION = {
    "audit_events_retention_days": 365,
    "login_history_retention_days": 180,
    "activity_log_retention_days": 365,
    "auto_purge_enabled": False,
}


class ComplianceService:
    def __init__(self, db: Session):
        self.db = db

    # ── Overview KPIs ────────────────────────────────────────────────────────

    def overview(self, tenant_id: str, pharmacy_id: Optional[str] = None) -> Dict[str, Any]:
        from models.audit import AuditEvent

        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)

        base = self.db.query(AuditEvent)
        if pharmacy_id:
            base = base.filter(AuditEvent.pharmacy_id == pharmacy_id)

        total_events = base.count()
        events_24h = base.filter(AuditEvent.created_at >= day_ago).count()
        high_severity = base.filter(AuditEvent.severity.in_(["high", "critical"])).count()
        sensitive = base.filter(AuditEvent.event_type.in_(list(SENSITIVE_EVENT_TYPES))).count()
        actors = base.with_entities(func.count(func.distinct(AuditEvent.staff_id))).scalar() or 0

        oldest = base.with_entities(func.min(AuditEvent.created_at)).scalar()

        failed_24h = self._count_logins(tenant_id, success=False, since=day_ago)
        failed_7d = self._count_logins(tenant_id, success=False, since=week_ago)
        logins_24h = self._count_logins(tenant_id, success=True, since=day_ago)

        return {
            "total_events": total_events,
            "events_24h": events_24h,
            "high_severity": high_severity,
            "sensitive_actions": sensitive,
            "distinct_actors": actors,
            "oldest_record": oldest,
            "logins_24h": logins_24h,
            "failed_logins_24h": failed_24h,
            "failed_logins_7d": failed_7d,
            "activity_log_count": self._safe_count("user_activity_logs", tenant_id),
            "login_history_count": self._safe_count("user_login_history", tenant_id),
        }

    def severity_breakdown(self, pharmacy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        from models.audit import AuditEvent
        q = self.db.query(AuditEvent.severity, func.count(AuditEvent.id))
        if pharmacy_id:
            q = q.filter(AuditEvent.pharmacy_id == pharmacy_id)
        rows = q.group_by(AuditEvent.severity).all()
        out = [{"severity": (s or "unknown"), "count": c} for s, c in rows]
        return sorted(out, key=lambda r: SEVERITY_ORDER.get(r["severity"], 0), reverse=True)

    def event_type_breakdown(self, pharmacy_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        from models.audit import AuditEvent
        q = self.db.query(AuditEvent.event_type, func.count(AuditEvent.id).label("n"))
        if pharmacy_id:
            q = q.filter(AuditEvent.pharmacy_id == pharmacy_id)
        rows = q.group_by(AuditEvent.event_type).order_by(text("n DESC")).limit(limit).all()
        return [{"event_type": t or "unknown", "count": n} for t, n in rows]

    def activity_timeline(self, pharmacy_id: Optional[str] = None, days: int = 14) -> List[Dict[str, Any]]:
        """Events per day for the trend chart."""
        from models.audit import AuditEvent
        since = datetime.utcnow() - timedelta(days=days)
        q = self.db.query(
            func.date(AuditEvent.created_at).label("d"),
            func.count(AuditEvent.id).label("n"),
        ).filter(AuditEvent.created_at >= since)
        if pharmacy_id:
            q = q.filter(AuditEvent.pharmacy_id == pharmacy_id)
        rows = {str(d): n for d, n in q.group_by(text("d")).all()}

        out = []
        for i in range(days - 1, -1, -1):
            day = (datetime.utcnow() - timedelta(days=i)).date().isoformat()
            out.append({"date": day, "count": rows.get(day, 0)})
        return out

    # ── Audit trail ──────────────────────────────────────────────────────────

    def audit_trail(
        self, pharmacy_id: Optional[str] = None, *,
        search: Optional[str] = None, severity: Optional[str] = None,
        event_type: Optional[str] = None, days: Optional[int] = None,
        sensitive_only: bool = False, limit: int = 100, offset: int = 0,
    ) -> Dict[str, Any]:
        from models.audit import AuditEvent

        q = self.db.query(AuditEvent)
        if pharmacy_id:
            q = q.filter(AuditEvent.pharmacy_id == pharmacy_id)
        if severity:
            q = q.filter(AuditEvent.severity == severity)
        if event_type:
            q = q.filter(AuditEvent.event_type == event_type)
        if sensitive_only:
            q = q.filter(AuditEvent.event_type.in_(list(SENSITIVE_EVENT_TYPES)))
        if days:
            q = q.filter(AuditEvent.created_at >= datetime.utcnow() - timedelta(days=days))
        if search:
            like = f"%{search}%"
            q = q.filter(or_(
                AuditEvent.event_type.ilike(like),
                AuditEvent.transaction_id.ilike(like),
                AuditEvent.staff_id.ilike(like),
            ))

        total = q.count()
        rows = q.order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit).all()

        staff_names = self._staff_name_map([r.staff_id for r in rows])
        branch_names = self._branch_name_map([r.branch_id for r in rows])

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": [{
                "id": r.id,
                "event_type": r.event_type,
                "severity": r.severity or "medium",
                "staff_id": r.staff_id,
                "staff_name": staff_names.get(r.staff_id) or "System",
                "branch_id": r.branch_id,
                "branch_name": branch_names.get(r.branch_id),
                "transaction_id": r.transaction_id,
                "metadata": r.metadata_ or {},
                "is_sensitive": r.event_type in SENSITIVE_EVENT_TYPES,
                "created_at": r.created_at,
            } for r in rows],
        }

    def export_audit_csv(self, pharmacy_id: Optional[str] = None, **filters) -> str:
        """Full filtered trail as CSV — auditors always ask for a file.

        Page-size arguments are dropped: an export always covers the whole
        filtered set, never just the page the user happened to be viewing.
        """
        filters.pop("limit", None)
        filters.pop("offset", None)
        data = self.audit_trail(pharmacy_id, limit=10_000, **filters)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["Timestamp (UTC)", "Event", "Severity", "Sensitive", "Staff", "Branch", "Transaction", "Details"])
        for r in data["items"]:
            w.writerow([
                r["created_at"].isoformat(sep=" ") if r["created_at"] else "",
                r["event_type"], r["severity"], "YES" if r["is_sensitive"] else "",
                r["staff_name"], r["branch_name"] or "", r["transaction_id"] or "",
                str(r["metadata"] or ""),
            ])
        return buf.getvalue()

    # ── Login history & security signals ─────────────────────────────────────

    def login_history(self, tenant_id: str, limit: int = 100, only_failed: bool = False) -> List[Dict[str, Any]]:
        try:
            from models.enterprise.user import UserLoginHistory, EnterpriseUser
            from models.users import User
        except ImportError:
            return []

        q = self.db.query(UserLoginHistory).filter(UserLoginHistory.tenant_id == tenant_id)
        if only_failed:
            q = q.filter(UserLoginHistory.success == False)
        rows = q.order_by(UserLoginHistory.created_at.desc()).limit(limit).all()

        # Resolve display names in one pass rather than per row.
        eu_ids = {r.enterprise_user_id for r in rows if r.enterprise_user_id}
        names: Dict[str, str] = {}
        if eu_ids:
            pairs = (self.db.query(EnterpriseUser.id, User.username, User.full_name)
                     .join(User, User.id == EnterpriseUser.user_id)
                     .filter(EnterpriseUser.id.in_(eu_ids)).all())
            names = {eid: (full or uname or "Unknown") for eid, uname, full in pairs}

        return [{
            "id": r.id,
            "user": names.get(r.enterprise_user_id, "Unknown"),
            "event_type": r.event_type,
            "success": bool(r.success),
            "failure_reason": r.failure_reason,
            "ip_address": r.ip_address,
            "device_name": r.device_name,
            "browser": r.browser,
            "os": r.os,
            "created_at": r.created_at,
        } for r in rows]

    def security_signals(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Derived warnings an auditor would want flagged, computed from real rows."""
        signals: List[Dict[str, Any]] = []
        now = datetime.utcnow()

        failed_24h = self._count_logins(tenant_id, success=False, since=now - timedelta(days=1))
        if failed_24h >= 5:
            signals.append({
                "level": "high" if failed_24h >= 15 else "medium",
                "title": f"{failed_24h} failed sign-in attempts in 24 hours",
                "detail": "Repeated failures can indicate password guessing. Review the login history and lock affected accounts.",
            })

        try:
            from models.audit import AuditEvent
            voids = (self.db.query(func.count(AuditEvent.id))
                     .filter(AuditEvent.event_type.in_(["void", "expense_void"]),
                             AuditEvent.created_at >= now - timedelta(days=7))
                     .scalar() or 0)
            if voids >= 5:
                signals.append({
                    "level": "medium",
                    "title": f"{voids} voided transactions this week",
                    "detail": "Frequent voids are a common shrinkage pattern — check which staff raised them.",
                })

            variances = (self.db.query(func.count(AuditEvent.id))
                         .filter(AuditEvent.event_type == "cash_variance",
                                 AuditEvent.created_at >= now - timedelta(days=30))
                         .scalar() or 0)
            if variances:
                signals.append({
                    "level": "high" if variances >= 3 else "medium",
                    "title": f"{variances} cash variance event(s) this month",
                    "detail": "Drawer counts didn't match expected totals. Reconcile the affected shifts.",
                })

            expired = (self.db.query(func.count(AuditEvent.id))
                       .filter(AuditEvent.event_type == "expired",
                               AuditEvent.created_at >= now - timedelta(days=30))
                       .scalar() or 0)
            if expired:
                signals.append({
                    "level": "high",
                    "title": f"{expired} expired-stock events this month",
                    "detail": "Expired medicine on shelf is a regulatory risk. Clear and record the disposal.",
                })
        except Exception:
            self.db.rollback()

        if not signals:
            signals.append({
                "level": "ok",
                "title": "No compliance risks detected",
                "detail": "No failed-login spikes, void clusters, cash variances or expiry events in the review window.",
            })
        return signals

    # ── Retention policy ─────────────────────────────────────────────────────

    def get_retention(self, tenant_id: str) -> Dict[str, Any]:
        cfg = dict(DEFAULT_RETENTION)
        cfg.update(self._stored_retention(tenant_id))
        return cfg

    def update_retention(self, tenant_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        from models.settings import TenantSettings
        from sqlalchemy.orm.attributes import flag_modified

        row = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not row:
            row = TenantSettings(tenant_id=tenant_id)
            self.db.add(row)
            self.db.flush()

        current = dict(row.inventory_settings or {})
        block = dict(current.get("_compliance_retention") or {})
        for key in DEFAULT_RETENTION:
            if key in patch and patch[key] is not None:
                block[key] = patch[key]
        current["_compliance_retention"] = block
        row.inventory_settings = current
        flag_modified(row, "inventory_settings")
        self.db.commit()
        return self.get_retention(tenant_id)

    def purge_expired(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Delete records past their retention window. Returns what was removed."""
        cfg = self.get_retention(tenant_id)
        results = []
        plan = [
            ("audit_events", "audit_events_retention_days", "Audit events", False),
            ("user_login_history", "login_history_retention_days", "Login history", True),
            ("user_activity_logs", "activity_log_retention_days", "Activity logs", True),
        ]
        for table, key, label, scoped in plan:
            days = int(cfg.get(key) or 0)
            if days <= 0:
                continue
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat(sep=" ")
            sql = f"DELETE FROM {table} WHERE created_at < :cutoff"
            params: Dict[str, Any] = {"cutoff": cutoff}
            if scoped:
                sql += " AND tenant_id = :tid"
                params["tid"] = tenant_id
            try:
                res = self.db.execute(text(sql), params)
                results.append({"table": table, "label": label, "deleted": res.rowcount or 0, "keep_days": days})
            except Exception:
                self.db.rollback()
                continue
        self.db.commit()
        return results

    # ── internals ────────────────────────────────────────────────────────────

    def _stored_retention(self, tenant_id: str) -> Dict[str, Any]:
        from models.settings import TenantSettings
        row = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not row:
            return {}
        return dict((row.inventory_settings or {}).get("_compliance_retention") or {})

    def _count_logins(self, tenant_id: str, *, success: bool, since: datetime) -> int:
        try:
            from models.enterprise.user import UserLoginHistory
            return (self.db.query(func.count(UserLoginHistory.id))
                    .filter(UserLoginHistory.tenant_id == tenant_id,
                            UserLoginHistory.success == success,
                            UserLoginHistory.created_at >= since)
                    .scalar() or 0)
        except Exception:
            self.db.rollback()
            return 0

    def _safe_count(self, table: str, tenant_id: Optional[str] = None) -> int:
        try:
            if tenant_id:
                return self.db.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE tenant_id = :t"), {"t": tenant_id}
                ).scalar() or 0
            return self.db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
        except Exception:
            self.db.rollback()
            return 0

    def _staff_name_map(self, ids: List[str]) -> Dict[str, str]:
        clean = {i for i in ids if i}
        if not clean:
            return {}
        try:
            from models.users import User
            rows = self.db.query(User.id, User.username, User.full_name).filter(User.id.in_(clean)).all()
            return {i: (full or uname or "Unknown") for i, uname, full in rows}
        except Exception:
            self.db.rollback()
            return {}

    def _branch_name_map(self, ids: List[str]) -> Dict[str, str]:
        clean = {i for i in ids if i}
        if not clean:
            return {}
        try:
            from models.users import Branch
            rows = self.db.query(Branch.id, Branch.name).filter(Branch.id.in_(clean)).all()
            return {i: n for i, n in rows}
        except Exception:
            self.db.rollback()
            return {}
