"""
Audit Listener – polls the local SQLite audit_events table every 2 seconds,
runs the appropriate handler, captures a webcam snapshot, and sends a
WhatsApp alert via the Baileys Node service.

No Supabase required – uses the same SQLAlchemy session as the rest of the app.
"""

import asyncio
import logging
import datetime
import base64
import os
import uuid

from database import SessionLocal
from models.audit import AuditEvent, AlertHistory, CameraSnapshot, AlertConfig

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Snapshot helper – laptop webcam via OpenCV
# ──────────────────────────────────────────────────────────────────────────────

async def _capture_webcam_snapshot(event_id: str, branch_id: str) -> str | None:
    """Captures one frame from the default webcam, saves it to disk, returns path."""
    def _do_capture():
        try:
            import cv2
            import time

            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                logger.warning("Webcam not available – skipping snapshot.")
                return None

            time.sleep(0.6)          # warm-up
            ret, frame = cap.read()
            cap.release()

            if not ret:
                logger.warning("Webcam read failed.")
                return None

            # Save to backend/storage/snapshots/
            snap_dir = os.path.join(os.getcwd(), "storage", "snapshots")
            os.makedirs(snap_dir, exist_ok=True)
            filename = f"{event_id}_{uuid.uuid4().hex[:6]}.jpg"
            filepath = os.path.join(snap_dir, filename)
            cv2.imwrite(filepath, frame)
            # Return a URL relative to the backend static mount
            return f"/storage/snapshots/{filename}"
        except Exception as e:
            logger.error(f"Webcam capture error: {e}")
            return None

    return await asyncio.to_thread(_do_capture)


# ──────────────────────────────────────────────────────────────────────────────
# WhatsApp helper
# ──────────────────────────────────────────────────────────────────────────────

WHATSAPP_SERVICE_URL = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:3001")
TEST_WHATSAPP_NUMBER = os.getenv("TEST_WHATSAPP_NUMBER", "")


from models.enterprise.branch_configuration import BranchPreference

async def _send_whatsapp(db, branch_id: str, event_id: str, message: str, image_url: str | None) -> bool:
    """Calls the local Baileys Node service /send endpoint."""
    target_number = TEST_WHATSAPP_NUMBER
    try:
        pref = db.query(BranchPreference).filter_by(branch_id=branch_id, pref_key="whatsapp_alert_number").first()
        if pref and pref.pref_value:
            target_number = pref.pref_value
    except Exception as e:
        logger.warning(f"Error fetching whatsapp_alert_number preference: {e}")

    if not target_number:
        logger.warning("WhatsApp alert number not set – skipping WhatsApp alert.")
        return False

    # Build absolute image URL if local path
    abs_image_url = None
    if image_url and image_url.startswith("/storage"):
        abs_image_url = f"http://localhost:8000{image_url}"
    elif image_url:
        abs_image_url = image_url

    try:
        import aiohttp
        payload = {
            "phone": target_number,
            "message": message,
        }
        if abs_image_url:
            payload["imageUrl"] = abs_image_url

        async with aiohttp.ClientSession() as session:
            # Check if Baileys service is running
            try:
                async with session.get(f"{WHATSAPP_SERVICE_URL}/health", timeout=aiohttp.ClientTimeout(total=3)) as r:
                    if r.status != 200:
                        logger.warning("WhatsApp service not ready – skipping alert.")
                        return False
                    health = await r.json()
                    if not health.get("connected"):
                        logger.warning("WhatsApp not connected (no QR scanned yet) – skipping alert.")
                        return False
            except Exception:
                logger.warning("WhatsApp service unreachable – skipping alert.")
                return False

            async with session.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    logger.info(f"WhatsApp alert sent to {TEST_WHATSAPP_NUMBER}")
                    return True
                else:
                    text = await resp.text()
                    logger.error(f"WhatsApp send failed ({resp.status}): {text}")
                    return False
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# DB helpers
# ──────────────────────────────────────────────────────────────────────────────

def _save_snapshot(db, event_id: str, branch_id: str, image_url: str, pharmacy_id: str | None = None):
    snap = CameraSnapshot(
        audit_event_id=event_id,
        branch_id=branch_id,
        image_url=image_url,
        pharmacy_id=pharmacy_id,
    )
    db.add(snap)
    db.commit()


def _log_alert(db, event_id: str, channel: str, status: str, error: str | None = None, pharmacy_id: str | None = None):
    db.add(AlertHistory(
        audit_event_id=event_id,
        sent_to=TEST_WHATSAPP_NUMBER or "dashboard",
        channel=channel,
        status=status,
        error_message=error,
        pharmacy_id=pharmacy_id,
    ))
    db.commit()


def _get_configs(db, branch_id: str, event_type: str):
    return db.query(AlertConfig).filter(
        AlertConfig.branch_id == branch_id,
        AlertConfig.event_type == event_type,
        AlertConfig.is_enabled == True,
    ).all()


# ──────────────────────────────────────────────────────────────────────────────
# Event handlers
# ──────────────────────────────────────────────────────────────────────────────

async def _handle_void(event: AuditEvent, db):
    meta = event.metadata_ or {}
    configs = _get_configs(db, event.branch_id, "void")
    pharmacy_id = getattr(event, 'pharmacy_id', None)

    # If no alert_config rows exist yet, still capture + send to the test number
    should_alert = bool(configs) or bool(TEST_WHATSAPP_NUMBER)

    if not should_alert:
        return

    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url, pharmacy_id=pharmacy_id)

    staff_name = meta.get("staff_name", "Unknown Staff")
    item_name  = meta.get("item_name",  "Unknown Item")
    amount     = meta.get("amount", 0.0)
    reason     = meta.get("reason", "No reason provided")
    invoice    = meta.get("invoice_number", "")

    msg = (
        f"🚨 *Suspicious Void Detected*\n\n"
        f"📋 *Invoice*: {invoice}\n"
        f"👤 *Staff*: {staff_name}\n"
        f"📦 *Item*: {item_name}\n"
        f"💰 *Amount*: PKR {float(amount):.2f}\n"
        f"📝 *Reason*: {reason}\n"
        f"🕒 *Time*: {event.created_at}\n\n"
        f"{'📷 Snapshot attached.' if image_url else '📷 Camera unavailable.'}"
    )

    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed", pharmacy_id=pharmacy_id)


async def _handle_discount(event: AuditEvent, db):
    meta = event.metadata_ or {}
    pharmacy_id = getattr(event, 'pharmacy_id', None)
    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url, pharmacy_id=pharmacy_id)

    msg = (
        f"🚨 *Large Discount Applied*\n\n"
        f"👤 *Staff*: {meta.get('staff_name', 'Unknown')}\n"
        f"✂️ *Discount*: {meta.get('discount_percent', 0)}%\n"
        f"🕒 *Time*: {event.created_at}"
    )
    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed", pharmacy_id=pharmacy_id)


async def _handle_refund(event: AuditEvent, db):
    meta = event.metadata_ or {}
    pharmacy_id = getattr(event, 'pharmacy_id', None)
    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url, pharmacy_id=pharmacy_id)

    msg = (
        f"⚠️ *Refund Issued*\n\n"
        f"👤 *Staff*: {meta.get('staff_name', 'Unknown')}\n"
        f"💰 *Amount*: PKR {float(meta.get('amount', 0)):.2f}\n"
        f"📝 *Reason*: {meta.get('reason', 'N/A')}\n"
        f"🕒 *Time*: {event.created_at}"
    )
    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed", pharmacy_id=pharmacy_id)


async def _handle_cash_variance(event: AuditEvent, db):
    meta = event.metadata_ or {}
    variance = float(meta.get('variance', 0))

    # Always capture a snapshot when a shift closes
    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url)

    direction = meta.get('variance_type', 'SHORT' if variance < 0 else 'OVER')
    emoji = '🔴' if variance < 0 else '🟡'

    msg = (
        f"{emoji} *Cash Drawer {direction} Detected*\n\n"
        f"👤 *Cashier*: {meta.get('staff_name', 'Unknown')}\n"
        f"📅 *Shift Date*: {meta.get('shift_date', 'N/A')}\n"
        f"💵 *Expected*: PKR {float(meta.get('expected_cash', 0)):.2f}\n"
        f"💵 *Actual*:   PKR {float(meta.get('actual_cash', 0)):.2f}\n"
        f"⚖️  *Variance*:  PKR {abs(variance):.2f} ({direction})\n"
        f"📝 *Notes*: {meta.get('notes', 'None')}\n"
        f"🕒 *Closed At*: {event.created_at}\n\n"
        f"{'📷 Snapshot attached.' if image_url else '📷 Camera unavailable.'}"
    )
    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed")


async def _handle_expired(event: AuditEvent, db):
    """Camera + WhatsApp when an expired-stock alert fires."""
    meta = event.metadata_ or {}
    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url)

    msg = (
        f"🔴 *Expired Stock Detected*\n\n"
        f"💊 *Product*: {meta.get('product_name', 'Unknown')}\n"
        f"🏷️  *Batch*:   {meta.get('batch_no', 'N/A')}\n"
        f"📅 *Expired*: {meta.get('expiry_date', 'N/A')}\n"
        f"📦 *Qty on Hand*: {meta.get('qty', 0)} units\n"
        f"🕒 *Detected*: {event.created_at}\n\n"
        f"⚠️ Please remove this batch from the shelf immediately."
    )
    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed")


async def _handle_near_expiry(event: AuditEvent, db):
    """WhatsApp warning for stock expiring within 30 days."""
    meta = event.metadata_ or {}
    image_url = await _capture_webcam_snapshot(event.id, event.branch_id)
    if image_url:
        _save_snapshot(db, event.id, event.branch_id, image_url)

    msg = (
        f"🟡 *Near-Expiry Stock Warning*\n\n"
        f"💊 *Product*: {meta.get('product_name', 'Unknown')}\n"
        f"🏷️  *Batch*:   {meta.get('batch_no', 'N/A')}\n"
        f"📅 *Expires*: {meta.get('expiry_date', 'N/A')} "
        f"({meta.get('days_remaining', '?')} days left)\n"
        f"📦 *Qty on Hand*: {meta.get('qty', 0)} units\n"
        f"🕒 *Detected*: {event.created_at}\n\n"
        f"💡 Prioritise selling or returning this batch."
    )
    success = await _send_whatsapp(db, event.branch_id, event.id, msg, image_url)
    _log_alert(db, event.id, "whatsapp", "sent" if success else "failed")


# ──────────────────────────────────────────────────────────────────────────────
# Inventory scanner – runs once on startup then every hour
# Finds expired / near-expiry batches and inserts AuditEvents so the listener
# fires camera + WhatsApp for each one (deduplicated by batch_no + day).
# ──────────────────────────────────────────────────────────────────────────────

async def scan_inventory_flags(scan_interval_seconds: float = 3600.0):
    """Background task: periodically scan for expired/near-expiry batches."""
    import datetime
    from models.inventory import Batch, Medicine

    logger.info("Inventory scanner started – interval %.0fs", scan_interval_seconds)

    while True:
        try:
            db = SessionLocal()   # uses module-level SessionLocal (patchable in tests)
            today = datetime.date.today()
            soon  = today + datetime.timedelta(days=30)

            try:
                batches = (
                    db.query(Batch, Medicine)
                    .join(Medicine, Batch.medicine_id == Medicine.id)
                    .filter(Batch.is_deleted == False, Batch.current_quantity > 0)
                    .all()
                )

                for batch, medicine in batches:
                    if not batch.expiry_date:
                        continue

                    exp = (
                        batch.expiry_date
                        if isinstance(batch.expiry_date, datetime.date)
                        else batch.expiry_date.date()
                    )

                    if exp >= soon:          # more than 30 days away — skip
                        continue

                    flag_type = "expired" if exp < today else "near_expiry"
                    days_rem  = (exp - today).days

                    # Dedup: only one alert per batch per day
                    dedup_key = f"{batch.id}:{today.isoformat()}"
                    already   = (
                        db.query(AuditEvent)
                        .filter(
                            AuditEvent.event_type == flag_type,
                            AuditEvent.transaction_id == dedup_key,
                        )
                        .first()
                    )
                    if already:
                        continue

                    severity = "high" if flag_type == "expired" else "medium"
                    # Resolve pharmacy_id for the new AuditEvent
                    pharm_id = getattr(batch, 'pharmacy_id', None)
                    if not pharm_id:
                        # Fallback: look up via Pharmacy table using batch's medicine
                        try:
                            from models.users import Pharmacy as PharmacyModel
                            pharm = db.query(PharmacyModel).filter(
                                PharmacyModel.is_active == True
                            ).first()
                            pharm_id = pharm.id if pharm else None
                        except Exception:
                            pharm_id = None

                    ev = AuditEvent(
                        branch_id      = str(batch.branch_id),
                        pharmacy_id    = pharm_id,           # ← stamped here
                        staff_id       = "system",
                        event_type     = flag_type,
                        transaction_id = dedup_key,
                        metadata_      = {
                            "product_name":  medicine.name,
                            "product_id":    str(medicine.id),
                            "batch_no":      batch.batch_number or str(batch.id),
                            "expiry_date":   exp.isoformat(),
                            "days_remaining": days_rem,
                            "qty":           batch.current_quantity,
                        },
                        severity       = severity,
                    )
                    db.add(ev)

                db.commit()
                logger.info("Inventory scan complete for %s – new events committed.", today)

            except Exception as scan_err:
                logger.warning("Inventory scan error: %s", scan_err)
            finally:
                db.close()

        except Exception as outer_err:
            logger.error("Inventory scanner outer error: %s", outer_err)

        await asyncio.sleep(scan_interval_seconds)


HANDLERS = {
    "void":           _handle_void,
    "discount":       _handle_discount,
    "refund":         _handle_refund,
    "cash_variance":  _handle_cash_variance,
    "expired":        _handle_expired,
    "near_expiry":    _handle_near_expiry,
}



# ──────────────────────────────────────────────────────────────────────────────
# Polling loop – runs as a background asyncio task inside FastAPI
# ──────────────────────────────────────────────────────────────────────────────

async def poll_audit_events(poll_interval: float = 2.0):
    logger.info("Audit listener started – polling every %.1fs", poll_interval)

    last_processed_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)

    while True:
        try:
            db = SessionLocal()
            try:
                events = (
                    db.query(AuditEvent)
                    .filter(AuditEvent.created_at > last_processed_at)
                    .order_by(AuditEvent.created_at.asc())
                    .all()
                )

                for event in events:
                    last_processed_at = event.created_at
                    handler = HANDLERS.get(event.event_type)
                    if handler:
                        async def wrapped_handler(evt, hnd):
                            local_db = SessionLocal()
                            try:
                                await hnd(evt, local_db)
                            finally:
                                local_db.close()
                        asyncio.create_task(wrapped_handler(event, handler))
                    else:
                        logger.debug("No handler for event_type=%s", event.event_type)
            finally:
                db.close()
        except Exception as e:
            logger.error("Audit poll error: %s", e)

        await asyncio.sleep(poll_interval)
