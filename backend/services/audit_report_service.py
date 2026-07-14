"""
Audit Report Generator – fully local SQLAlchemy / SQLite implementation.
All five report types are generated from the local database with no Supabase dependency.
"""

import logging
import datetime
from collections import defaultdict

from database import SessionLocal
from models.audit import AuditEvent, AlertHistory

logger = logging.getLogger(__name__)


class AuditReportGenerator:
    """
    Generates pre-built, structured audit reports for a given branch and time period.
    Returns (json_payload, whatsapp_text_summary).
    Supported periods: 'daily', 'weekly', 'monthly'.
    """

    def __init__(self, branch_id: str, period: str = "daily"):
        self.branch_id = branch_id
        self.period = period.lower()

        self.end_date = datetime.datetime.utcnow()
        if self.period == "weekly":
            self.start_date = self.end_date - datetime.timedelta(days=7)
        elif self.period == "monthly":
            self.start_date = self.end_date - datetime.timedelta(days=30)
        else:                             # daily (default)
            self.start_date = self.end_date - datetime.timedelta(days=1)

    # ── helpers ───────────────────────────────────────────────────────────────

    def _get_events(self, *event_types) -> list:
        """Return AuditEvent rows filtered by branch, period and event_type(s)."""
        db = SessionLocal()
        try:
            q = (
                db.query(AuditEvent)
                .filter(
                    AuditEvent.created_at >= self.start_date,
                    AuditEvent.event_type.in_(list(event_types)),
                )
            )
            # Only filter by branch when a branch_id is provided
            if self.branch_id:
                q = q.filter(AuditEvent.branch_id == self.branch_id)
            return q.order_by(AuditEvent.created_at.desc()).all()
        finally:
            db.close()


    def _event_to_dict(self, e: AuditEvent) -> dict:
        meta = e.metadata_ or {}
        return {
            "id":             e.id,
            "event_type":     e.event_type,
            "staff_id":       e.staff_id,
            "staff_name":     meta.get("staff_name", e.staff_id),
            "transaction_id": e.transaction_id,
            "metadata":       meta,
            "severity":       e.severity,
            "created_at":     e.created_at.isoformat() if e.created_at else None,
        }

    # ── 1. Staff Risk Report ───────────────────────────────────────────────────

    def generate_staff_risk_report(self):
        events = self._get_events("void", "discount", "refund")

        staff_counts: dict = defaultdict(lambda: {
            "voids": 0, "discounts": 0, "refunds": 0, "staff_name": ""
        })
        for ev in events:
            meta = ev.metadata_ or {}
            key  = ev.staff_id
            staff_counts[key]["staff_name"] = meta.get("staff_name", ev.staff_id)
            if ev.event_type == "void":
                staff_counts[key]["voids"] += 1
            elif ev.event_type == "discount":
                staff_counts[key]["discounts"] += 1
            elif ev.event_type == "refund":
                staff_counts[key]["refunds"] += 1

        rows = []
        for staff_id, counts in staff_counts.items():
            score = min(100, counts["voids"] * 15 + counts["discounts"] * 5 + counts["refunds"] * 10)
            level = "red" if score >= 50 else "yellow" if score >= 20 else "green"
            rows.append({
                "staff_id":       staff_id,
                "staff_name":     counts["staff_name"] or staff_id,
                "void_count":     counts["voids"],
                "discount_count": counts["discounts"],
                "refund_count":   counts["refunds"],
                "risk_score":     score,
                "risk_level":     level,
            })

        rows.sort(key=lambda r: r["risk_score"], reverse=True)
        top5 = rows[:5]

        period_label = self.period.capitalize()
        text = f"📊 *{period_label} Staff Risk Report*\n\n"
        for r in top5:
            icon  = "🔴" if r["risk_level"] == "red" else "🟡" if r["risk_level"] == "yellow" else "🟢"
            text += (
                f"{icon} *{r['staff_name']}* — Score: {r['risk_score']}/100\n"
                f"   Voids: {r['void_count']} | Discounts: {r['discount_count']} | Refunds: {r['refund_count']}\n"
            )

        return {
            "period":    self.period,
            "branch_id": self.branch_id,
            "total_staff_analysed": len(rows),
            "data":      rows,
        }, text

    # ── 2. Void / Discount Trend ───────────────────────────────────────────────

    def generate_void_discount_report(self):
        events = self._get_events("void", "discount")

        voids     = [e for e in events if e.event_type == "void"]
        discounts = [e for e in events if e.event_type == "discount"]

        void_total     = sum(float((e.metadata_ or {}).get("amount", 0)) for e in voids)
        discount_total = sum(float((e.metadata_ or {}).get("amount", 0)) for e in discounts)

        # Group by day for a simple trend
        void_by_day: dict     = defaultdict(int)
        discount_by_day: dict = defaultdict(int)
        for e in voids:
            void_by_day[e.created_at.date().isoformat()] += 1
        for e in discounts:
            discount_by_day[e.created_at.date().isoformat()] += 1

        period_label = self.period.capitalize()
        text = (
            f"📊 *{period_label} Void/Discount Trend*\n\n"
            f"✂️ *Voids*: {len(voids)} events — Total: Rs {void_total:.2f}\n"
            f"🏷️ *Discounts*: {len(discounts)} events — Total: Rs {discount_total:.2f}"
        )

        return {
            "period":    self.period,
            "branch_id": self.branch_id,
            "voids":     {"count": len(voids),     "total_value": void_total,     "by_day": dict(void_by_day)},
            "discounts": {"count": len(discounts), "total_value": discount_total, "by_day": dict(discount_by_day)},
            "raw_events": [self._event_to_dict(e) for e in events],
        }, text

    # ── 3. Cash Reconciliation Report ─────────────────────────────────────────

    def generate_cash_reconciliation_report(self):
        events = self._get_events("cash_variance")

        shortages = [e for e in events if float((e.metadata_ or {}).get("variance", 0)) < 0]
        overages  = [e for e in events if float((e.metadata_ or {}).get("variance", 0)) > 0]
        balanced  = [e for e in events if float((e.metadata_ or {}).get("variance", 0)) == 0]

        shortage_total = sum(abs(float((e.metadata_ or {}).get("variance", 0))) for e in shortages)
        overage_total  = sum(float((e.metadata_ or {}).get("variance", 0)) for e in overages)

        period_label = self.period.capitalize()
        text = (
            f"📊 *{period_label} Cash Reconciliation Report*\n\n"
            f"📉 *Shortages*: {len(shortages)} shifts — Total: Rs {shortage_total:.2f}\n"
            f"📈 *Overages*:  {len(overages)} shifts — Total: Rs {overage_total:.2f}\n"
            f"✅ *Balanced*:  {len(balanced)} shifts"
        )

        rows = []
        for e in events:
            meta = e.metadata_ or {}
            rows.append({
                "staff_name":    meta.get("staff_name", e.staff_id),
                "shift_date":    meta.get("shift_date", ""),
                "expected_cash": float(meta.get("expected_cash", 0)),
                "actual_cash":   float(meta.get("actual_cash", 0)),
                "variance":      float(meta.get("variance", 0)),
                "variance_type": meta.get("variance_type", ""),
                "severity":      e.severity,
            })

        return {
            "period":    self.period,
            "branch_id": self.branch_id,
            "shortages": {"count": len(shortages), "total_value": shortage_total},
            "overages":  {"count": len(overages),  "total_value": overage_total},
            "balanced":  {"count": len(balanced)},
            "data":      rows,
        }, text

    # ── 4. Inventory Shrinkage Report ──────────────────────────────────────────

    def generate_inventory_shrinkage_report(self):
        # Shrinkage = negative stock adjustments recorded in audit
        events = self._get_events("shrinkage", "expired", "near_expiry")

        product_counts: dict = defaultdict(int)
        total_units = 0
        for e in events:
            meta = e.metadata_ or {}
            name = meta.get("product_name", "Unknown")
            qty  = int(meta.get("qty", 0))
            product_counts[name] += qty
            total_units += qty

        top_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        period_label = self.period.capitalize()
        text = (
            f"📊 *{period_label} Inventory Shrinkage Report*\n\n"
            f"📦 *Items Flagged*: {len(events)}\n"
            f"📉 *Total Units at Risk*: {total_units}"
        )

        return {
            "period":        self.period,
            "branch_id":     self.branch_id,
            "total_events":  len(events),
            "total_units":   total_units,
            "top_products":  [{"name": n, "units": u} for n, u in top_products],
            "raw_events":    [self._event_to_dict(e) for e in events],
        }, text

    # ── 5. Expiry Report ───────────────────────────────────────────────────────

    def generate_expiry_report(self):
        events = self._get_events("expired", "near_expiry")

        expired_evs    = [e for e in events if e.event_type == "expired"]
        near_expiry_ev = [e for e in events if e.event_type == "near_expiry"]

        period_label = self.period.capitalize()
        text = (
            f"📊 *{period_label} Expiry Report*\n\n"
            f"☠️ *Expired in Stock*:   {len(expired_evs)} items\n"
            f"⚠️  *Nearing Expiry*:    {len(near_expiry_ev)} items"
        )

        def ev_row(e):
            meta = e.metadata_ or {}
            return {
                "product_name":   meta.get("product_name", "Unknown"),
                "batch_no":       meta.get("batch_no", ""),
                "expiry_date":    meta.get("expiry_date", ""),
                "days_remaining": meta.get("days_remaining", None),
                "qty":            meta.get("qty", 0),
                "flag_type":      e.event_type,
                "severity":       e.severity,
            }

        return {
            "period":            self.period,
            "branch_id":         self.branch_id,
            "expired_count":     len(expired_evs),
            "near_expiry_count": len(near_expiry_ev),
            "expired":           [ev_row(e) for e in expired_evs],
            "near_expiry":       [ev_row(e) for e in near_expiry_ev],
        }, text
