from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import SessionLocal
from core.deps import get_db, get_current_user, get_token_payload
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from models.audit import AuditEvent, AlertHistory, CameraSnapshot, AlertConfig
from models.users import User
from services.risk_service import calculate_weekly_risk_scores
from services.audit_report_service import AuditReportGenerator

router = APIRouter()

ALLOWED_REPORTS = ["staff_risk", "void_discount", "cash_reconciliation", "inventory_shrinkage", "expiry"]

# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/events  – recent audit activity log
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/events")
def get_audit_events(
    branch_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    q = db.query(AuditEvent)
    if branch_id:
        q = q.filter(AuditEvent.branch_id == branch_id)
    if event_type:
        q = q.filter(AuditEvent.event_type == event_type)

    events = q.order_by(AuditEvent.created_at.desc()).limit(limit).all()

    result = []
    for e in events:
        # Fetch related snapshots and alerts
        snapshots = db.query(CameraSnapshot).filter(CameraSnapshot.audit_event_id == e.id).all()
        alerts    = db.query(AlertHistory).filter(AlertHistory.audit_event_id == e.id).all()

        result.append({
            "id":             e.id,
            "branch_id":      e.branch_id,
            "staff_id":       e.staff_id,
            "event_type":     e.event_type,
            "transaction_id": e.transaction_id,
            "metadata":       e.metadata_,
            "severity":       e.severity,
            "created_at":     e.created_at.isoformat() if e.created_at else None,
            "camera_snapshots": [{"image_url": s.image_url, "captured_at": s.captured_at.isoformat()} for s in snapshots],
            "alert_history":    [{"channel": a.channel, "status": a.status, "sent_at": a.sent_at.isoformat()} for a in alerts],
        })

    return result


# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/alert-history
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/alert-history")
def get_alert_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    rows = db.query(AlertHistory).order_by(AlertHistory.sent_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "audit_event_id": r.audit_event_id,
            "sent_to": r.sent_to,
            "channel": r.channel,
            "status": r.status,
            "error_message": r.error_message,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
        }
        for r in rows
    ]


# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/alert-config  |  POST /audit/alert-config
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/alert-config")
def get_alert_config(
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    q = db.query(AlertConfig)
    if branch_id:
        q = q.filter(AlertConfig.branch_id == branch_id)
    rows = q.all()

    # ── Auto-seed defaults if no configs exist yet for this branch ─────────
    if not rows:
        # Determine owner from the token
        owner_id = token_payload.get("sub", "system") if token_payload else "system"
        effective_branch = branch_id or "default"

        DEFAULTS = [
            {"event_type": "void",          "threshold_value": None,   "notify_via": "whatsapp", "description": "Sale voided at POS"},
            {"event_type": "discount",       "threshold_value": 20.0,  "notify_via": "whatsapp", "description": "Discount applied above threshold %"},
            {"event_type": "refund",         "threshold_value": None,   "notify_via": "whatsapp", "description": "Sale refund issued"},
            {"event_type": "cash_variance",  "threshold_value": 50.0,  "notify_via": "whatsapp", "description": "Cash drawer short/over at shift close"},
            {"event_type": "expired",        "threshold_value": None,   "notify_via": "whatsapp", "description": "Expired stock detected in inventory"},
            {"event_type": "near_expiry",    "threshold_value": 30.0,  "notify_via": "whatsapp", "description": "Stock expiring within N days"},
        ]
        for d in DEFAULTS:
            db.add(AlertConfig(
                branch_id       = effective_branch,
                owner_id        = owner_id,
                event_type      = d["event_type"],
                is_enabled      = True,
                threshold_value = d["threshold_value"],
                notify_via      = d["notify_via"],
            ))
        db.commit()
        rows = db.query(AlertConfig).filter(AlertConfig.branch_id == effective_branch).all()

    return [
        {
            "id":              r.id,
            "branch_id":       r.branch_id,
            "owner_id":        r.owner_id,
            "event_type":      r.event_type,
            "is_enabled":      r.is_enabled,
            "threshold_value": r.threshold_value,
            "notify_via":      r.notify_via,
        }
        for r in rows
    ]


@router.post("/alert-config")
def upsert_alert_config(
    payload: dict,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    config_id = payload.get("id")
    if config_id:
        row = db.query(AlertConfig).filter(AlertConfig.id == config_id).first()
        if row:
            for field in ["is_enabled", "threshold_value", "notify_via"]:
                if field in payload:
                    setattr(row, field, payload[field])
            db.commit()
            return {"status": "updated"}

    row = AlertConfig(
        branch_id       = payload.get("branch_id", ""),
        owner_id        = payload.get("owner_id", ""),
        event_type      = payload.get("event_type", ""),
        is_enabled      = payload.get("is_enabled", True),
        threshold_value = payload.get("threshold_value"),
        notify_via      = payload.get("notify_via", "whatsapp"),
    )
    db.add(row)
    db.commit()
    return {"status": "created", "id": row.id}

from models.enterprise.branch_configuration import BranchPreference

@router.get("/whatsapp-number")
def get_whatsapp_number(
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    branch_id = scope.branch_id
    if not branch_id:
        branch_id = "global"
    pref = db.query(BranchPreference).filter_by(branch_id=branch_id, pref_key="whatsapp_alert_number").first()
    if pref and pref.pref_value:
        return {"whatsapp_number": pref.pref_value}
    
    # fallback to env
    import os
    return {"whatsapp_number": os.getenv("TEST_WHATSAPP_NUMBER", "")}

@router.post("/whatsapp-number")
def set_whatsapp_number(
    payload: dict,
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    branch_id = scope.branch_id
    if not branch_id:
        branch_id = "global"
    new_number = payload.get("whatsapp_number", "").strip()
    
    pref = db.query(BranchPreference).filter_by(branch_id=branch_id, pref_key="whatsapp_alert_number").first()
    if not pref:
        pref = BranchPreference(
            branch_id=branch_id,
            pref_key="whatsapp_alert_number",
            pref_value=new_number,
            data_type="string",
            category="alerts",
            description="WhatsApp number for audit alerts"
        )
        db.add(pref)
    else:
        pref.pref_value = new_number
    db.commit()
    return {"status": "success", "whatsapp_number": new_number}

@router.patch("/alert-config")
def patch_alert_config(
    payload: dict,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    return upsert_alert_config(payload, db, token_payload)


# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/risk-scores
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/risk-scores")
def get_risk_scores(
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    """Returns staff_risk_scores rows. (Populated by the weekly cron job.)"""
    from models.audit import AuditEvent
    import datetime

    # Compute on-the-fly from last 7 days of audit events
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    q = db.query(AuditEvent).filter(AuditEvent.created_at >= cutoff)
    if branch_id:
        q = q.filter(AuditEvent.branch_id == branch_id)

    from collections import defaultdict
    staff_counts: dict = defaultdict(lambda: {"voids": 0, "discounts": 0, "refunds": 0})
    for ev in q.all():
        key = (ev.staff_id, ev.branch_id)
        if ev.event_type == "void":
            staff_counts[key]["voids"] += 1
        elif ev.event_type == "discount":
            staff_counts[key]["discounts"] += 1
        elif ev.event_type == "refund":
            staff_counts[key]["refunds"] += 1

    result = []
    for (staff_id, br_id), counts in staff_counts.items():
        score = min(100, counts["voids"] * 15 + counts["discounts"] * 5 + counts["refunds"] * 10)
        level = "red" if score >= 50 else "yellow" if score >= 20 else "green"
        result.append({
            "staff_id":       staff_id,
            "branch_id":      br_id,
            "void_count":     counts["voids"],
            "discount_count": counts["discounts"],
            "refund_count":   counts["refunds"],
            "risk_score":     score,
            "risk_level":     level,
        })
    return result


# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/cash-reconciliation
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/cash-reconciliation")
def get_cash_reconciliation(
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    """Returns cash reconciliation rows from audit_events (cash_variance type)."""
    q = db.query(AuditEvent).filter(AuditEvent.event_type == "cash_variance")
    if branch_id:
        q = q.filter(AuditEvent.branch_id == branch_id)
    events = q.order_by(AuditEvent.created_at.desc()).limit(50).all()

    result = []
    for e in events:
        meta = e.metadata_ or {}
        result.append({
            "id":            e.id,
            "branch_id":     e.branch_id,
            "staff_id":      e.staff_id,
            "staff_name":    meta.get("staff_name", ""),
            "shift_date":    meta.get("shift_date", e.created_at.date().isoformat() if e.created_at else ""),
            "expected_cash": float(meta.get("expected_cash", 0)),
            "actual_cash":   float(meta.get("actual_cash", 0)),
            "variance":      float(meta.get("variance", 0)),
            "variance_type": meta.get("variance_type", ""),
            "notes":         meta.get("notes", ""),
            "severity":      e.severity,
            "created_at":    e.created_at.isoformat() if e.created_at else None,
        })
    return result


# ──────────────────────────────────────────────────────────────────────────────
# GET /audit/inventory-flags
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/inventory-flags")
def get_inventory_flags(
    branch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_token_payload),
):
    """
    Returns inventory flags from two sources merged together:
    1. audit_events rows (expired / near_expiry) — includes alert & snapshot status
    2. Live batch scan for anything not yet in audit_events (so UI is never stale)
    """
    import datetime
    from models.inventory import Batch, Medicine

    today = datetime.date.today()
    soon  = today + datetime.timedelta(days=30)

    # ── Part 1: audit_events rows ─────────────────────────────────────────────
    q = db.query(AuditEvent).filter(
        AuditEvent.event_type.in_(["expired", "near_expiry"])
    )
    if branch_id:
        q = q.filter(AuditEvent.branch_id == branch_id)

    events = q.order_by(AuditEvent.created_at.desc()).limit(200).all()

    # Track which batch+day combos are already in audit_events
    seen_keys: set = set()
    result = []

    for e in events:
        meta = e.metadata_ or {}
        snapshots = db.query(CameraSnapshot).filter(CameraSnapshot.audit_event_id == e.id).all()
        alerts    = db.query(AlertHistory).filter(AlertHistory.audit_event_id == e.id).all()
        wa_alert  = next((a for a in alerts if a.channel == "whatsapp"), None)

        dedup_key = e.transaction_id or ""
        seen_keys.add(dedup_key)

        result.append({
            "id":            e.id,
            "source":        "audit_event",
            "branch_id":     e.branch_id,
            "flag_type":     e.event_type,
            "severity":      e.severity,
            "product_id":    meta.get("product_id", ""),
            "product_name":  meta.get("product_name", "Unknown"),
            "batch_no":      meta.get("batch_no", ""),
            "expiry_date":   meta.get("expiry_date", ""),
            "days_remaining": meta.get("days_remaining", None),
            "qty":           meta.get("qty", 0),
            "created_at":    e.created_at.isoformat() if e.created_at else None,
            "alert_status":  wa_alert.status if wa_alert else "pending",
            "snapshot_url":  snapshots[0].image_url if snapshots else None,
        })

    # ── Part 2: Live batch scan (for items not yet processed by the scanner) ──
    bq = (
        db.query(Batch, Medicine)
        .join(Medicine, Batch.medicine_id == Medicine.id)
        .filter(Batch.is_deleted == False, Batch.current_quantity > 0)
    )
    if branch_id:
        bq = bq.filter(Batch.branch_id == branch_id)

    for batch, medicine in bq.all():
        if not batch.expiry_date:
            continue
        exp = (
            batch.expiry_date
            if isinstance(batch.expiry_date, datetime.date)
            else batch.expiry_date.date()
        )
        if exp >= soon:
            continue

        flag_type = "expired" if exp < today else "near_expiry"
        days_rem  = (exp - today).days
        dedup_key = f"{batch.id}:{today.isoformat()}"

        if dedup_key in seen_keys:
            continue  # already shown from audit_events

        result.append({
            "id":            str(batch.id),
            "source":        "live_scan",
            "branch_id":     str(batch.branch_id),
            "flag_type":     flag_type,
            "severity":      "high" if flag_type == "expired" else "medium",
            "product_id":    str(medicine.id),
            "product_name":  medicine.name,
            "batch_no":      batch.batch_number or str(batch.id),
            "expiry_date":   exp.isoformat(),
            "days_remaining": days_rem,
            "qty":           batch.current_quantity,
            "created_at":    today.isoformat(),
            "alert_status":  "not_sent",
            "snapshot_url":  None,
        })

    # Sort: expired first, then near_expiry; within each group newest first
    result.sort(key=lambda r: (0 if r["flag_type"] == "expired" else 1, r.get("expiry_date", "")))
    return result



# ──────────────────────────────────────────────────────────────────────────────
# Pre-built reports & risk score trigger
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/risk-scores/calculate")
def trigger_risk_score_calculation(background_tasks: BackgroundTasks):
    background_tasks.add_task(calculate_weekly_risk_scores)
    return {"status": "success", "message": "Risk score calculation triggered in the background."}


@router.get("/reports/{report_type}")
def get_audit_report(
    report_type: str,
    branch_id: str = Query(default="", description="Branch UUID (optional)"),
    period: str = Query("monthly"),
    token_payload: dict = Depends(get_token_payload),
):
    if report_type not in ALLOWED_REPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid report_type. Allowed: {ALLOWED_REPORTS}")

    generator = AuditReportGenerator(branch_id=branch_id, period=period)

    if report_type == "staff_risk":
        json_data, text = generator.generate_staff_risk_report()
    elif report_type == "void_discount":
        json_data, text = generator.generate_void_discount_report()
    elif report_type == "cash_reconciliation":
        json_data, text = generator.generate_cash_reconciliation_report()
    elif report_type == "inventory_shrinkage":
        json_data, text = generator.generate_inventory_shrinkage_report()
    elif report_type == "expiry":
        json_data, text = generator.generate_expiry_report()
    else:
        raise HTTPException(status_code=400, detail="Unknown report type")

    json_data["whatsapp_text"] = text
    return json_data

