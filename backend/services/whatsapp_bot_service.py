"""
WhatsApp Report Bot Service
────────────────────────────
Receives an incoming message from the Baileys Node service (via POST /bot/incoming),
checks the sender against a whitelist, resolves the command to a report function,
generates a text reply, logs everything to whatsapp_bot_log, and returns the reply.

The Node service is responsible for actually sending the reply back to the sender.
"""

import os
import logging
import datetime
from typing import Optional

from database import SessionLocal
from models.audit import WhatsAppBotLog

logger = logging.getLogger(__name__)

# ── Whitelist ─────────────────────────────────────────────────────────────────
# Comma-separated list in .env:  WHATSAPP_BOT_WHITELIST=923144236077,923001234567
# Numbers must be in E.164 format without "+": 923xxxxxxxxx
def _load_whitelist() -> set:
    raw = os.getenv("WHATSAPP_BOT_WHITELIST", "")
    if not raw:
        # Fall back to the single alert number if whitelist not set
        fallback = os.getenv("TEST_WHATSAPP_NUMBER", "").replace("+", "").replace(" ", "")
        return {fallback} if fallback else set()
    return {n.strip().replace("+", "") for n in raw.split(",") if n.strip()}


# ── Menu definition ───────────────────────────────────────────────────────────
MENU_TEXT = (
    "📋 *NEPMS Report Bot*\n"
    "━━━━━━━━━━━━━━━━━━━━\n"
    "Reply with a number:\n\n"
    "1️⃣  Today's Sales Summary\n"
    "2️⃣  Cash Reconciliation\n"
    "3️⃣  Staff Risk Report\n"
    "4️⃣  Inventory Shrinkage\n"
    "5️⃣  Expiry Report\n"
    "6️⃣  Low Stock Alert\n"
    "7️⃣  Purchases Summary\n"
    "8️⃣  Near-Expiry Warning\n"
    "9️⃣  Void / Discount Trend\n\n"
    "Or type the report name directly.\n"
    "Type *menu* anytime to see this list."
)

UNKNOWN_TEXT = (
    "❓ Sorry, I didn't understand that.\n"
    "Reply *menu* to see available reports."
)

# Command → (report_type_key, human_label)
COMMAND_MAP: dict[str, tuple[str, str]] = {
    # Number shortcuts
    "1": ("sales_today",           "Today's Sales Summary"),
    "2": ("cash_reconciliation",   "Cash Reconciliation"),
    "3": ("staff_risk",            "Staff Risk Report"),
    "4": ("inventory_shrinkage",   "Inventory Shrinkage"),
    "5": ("expiry",                "Expiry Report"),
    "6": ("low_stock",             "Low Stock Alert"),
    "7": ("purchases",             "Purchases Summary"),
    "8": ("near_expiry",           "Near-Expiry Warning"),
    "9": ("void_discount",         "Void / Discount Trend"),
    # Keyword aliases
    "sales":              ("sales_today",         "Today's Sales Summary"),
    "today":              ("sales_today",         "Today's Sales Summary"),
    "cash":               ("cash_reconciliation", "Cash Reconciliation"),
    "reconciliation":     ("cash_reconciliation", "Cash Reconciliation"),
    "risk":               ("staff_risk",          "Staff Risk Report"),
    "staff":              ("staff_risk",          "Staff Risk Report"),
    "shrinkage":          ("inventory_shrinkage", "Inventory Shrinkage"),
    "inventory":          ("inventory_shrinkage", "Inventory Shrinkage"),
    "expiry":             ("expiry",              "Expiry Report"),
    "expired":            ("expiry",              "Expiry Report"),
    "lowstock":           ("low_stock",           "Low Stock Alert"),
    "low":                ("low_stock",           "Low Stock Alert"),
    "stock":              ("low_stock",           "Low Stock Alert"),
    "purchases":          ("purchases",           "Purchases Summary"),
    "purchase":           ("purchases",           "Purchases Summary"),
    "near":               ("near_expiry",         "Near-Expiry Warning"),
    "nearexpiry":         ("near_expiry",         "Near-Expiry Warning"),
    "void":               ("void_discount",       "Void / Discount Trend"),
    "discount":           ("void_discount",       "Void / Discount Trend"),
    "voids":              ("void_discount",       "Void / Discount Trend"),
}

GREETING_WORDS = {"menu", "hi", "hello", "hey", "start", "help", "سلام", "ہیلو"}


# ── Report generators ─────────────────────────────────────────────────────────

def _generate_report(report_type: str) -> str:
    """Calls the appropriate report function and returns a WhatsApp-formatted text."""
    try:
        db = SessionLocal()
        try:
            return _dispatch(report_type, db)
        finally:
            db.close()
    except Exception as e:
        logger.error("Bot report generation failed for %s: %s", report_type, e)
        return f"⚠️ Sorry, an error occurred generating the {report_type} report. Please try again."


def _dispatch(report_type: str, db) -> str:
    import datetime as dt

    # ── Audit reports (reuse AuditReportGenerator) ───────────────────────────
    if report_type in ("staff_risk", "cash_reconciliation", "inventory_shrinkage",
                       "expiry", "void_discount", "near_expiry"):
        from services.audit_report_service import AuditReportGenerator
        gen = AuditReportGenerator(branch_id="", period="daily")

        if report_type == "staff_risk":
            _, text = gen.generate_staff_risk_report()
        elif report_type == "cash_reconciliation":
            _, text = gen.generate_cash_reconciliation_report()
        elif report_type == "inventory_shrinkage":
            _, text = gen.generate_inventory_shrinkage_report()
        elif report_type == "expiry":
            _, text = gen.generate_expiry_report()
        elif report_type == "void_discount":
            _, text = gen.generate_void_discount_report()
        elif report_type == "near_expiry":
            # near_expiry is part of the expiry report
            data, _ = gen.generate_expiry_report()
            near = data.get("near_expiry", [])
            if not near:
                return "✅ No near-expiry items within 30 days."
            lines = [f"🟡 *Near-Expiry Warning* ({len(near)} items)\n"]
            for r in near[:10]:
                lines.append(f"💊 {r['product_name']} | Batch {r['batch_no']} | Expires {r['expiry_date']} ({r.get('days_remaining','?')}d) | Qty: {r['qty']}")
            return "\n".join(lines)
        return text

    # ── Sales today (reuse ReportsService / ReportsRepository) ───────────────
    if report_type == "sales_today":
        try:
            from repositories.reports import ReportsRepository
            from schemas.reports import DateRangeParams
            today = dt.date.today()
            params = DateRangeParams(
                start_date=today.isoformat(),
                end_date=today.isoformat(),
            )
            # Get the first branch/tenant from DB (best-effort for single-branch setups)
            from models.settings import Branch
            branch = db.query(Branch).first()
            tenant_id = str(branch.id) if branch else ""
            repo = ReportsRepository(db)
            rows = repo.get_sales_summary(tenant_id, params, period="day")
            if not rows:
                return f"📊 *Today's Sales Summary*\n\nNo sales recorded yet today ({today})."
            total_invoices = sum(r.get("invoice_count", 0) for r in rows)
            total_net      = sum(float(r.get("net_sales", 0)) for r in rows)
            total_discounts= sum(float(r.get("discounts", 0)) for r in rows)
            return (
                f"📊 *Today's Sales Summary*\n"
                f"📅 {today}\n\n"
                f"🧾 Invoices:   {total_invoices}\n"
                f"💰 Net Sales:  Rs {total_net:,.2f}\n"
                f"🏷️  Discounts:  Rs {total_discounts:,.2f}"
            )
        except Exception as e:
            logger.error("Sales today report error: %s", e)
            return "⚠️ Could not generate today's sales report."

    # ── Low stock ─────────────────────────────────────────────────────────────
    if report_type == "low_stock":
        try:
            from repositories.reports import ReportsRepository
            from models.settings import Branch
            branch = db.query(Branch).first()
            tenant_id = str(branch.id) if branch else ""
            repo = ReportsRepository(db)
            rows = repo.get_low_stock_report(tenant_id)
            if not rows:
                return "✅ *Low Stock Alert*\n\nAll items are adequately stocked."
            lines = [f"⚠️ *Low Stock Alert* ({len(rows)} items)\n"]
            for r in rows[:15]:
                lines.append(
                    f"💊 {r.get('medicine_name','?')} | "
                    f"Stock: {r.get('stock_quantity','?')} | "
                    f"Min: {r.get('min_stock_level','?')}"
                )
            if len(rows) > 15:
                lines.append(f"…and {len(rows)-15} more items.")
            return "\n".join(lines)
        except Exception as e:
            logger.error("Low stock report error: %s", e)
            return "⚠️ Could not generate low stock report."

    # ── Purchases summary ─────────────────────────────────────────────────────
    if report_type == "purchases":
        try:
            from repositories.reports import ReportsRepository
            from schemas.reports import DateRangeParams
            from models.settings import Branch
            import datetime as dt2
            today = dt2.date.today()
            start = (today.replace(day=1)).isoformat()
            params = DateRangeParams(start_date=start, end_date=today.isoformat())
            branch = db.query(Branch).first()
            tenant_id = str(branch.id) if branch else ""
            repo = ReportsRepository(db)
            rows = repo.get_purchase_summary(tenant_id, params)
            if not rows:
                return "📦 *Purchases Summary*\n\nNo purchase orders this month."
            total = sum(float(r.get("total_purchased", 0)) for r in rows)
            lines = [f"📦 *Purchases Summary* (This Month)\n💰 Total: Rs {total:,.2f}\n"]
            for r in rows[:10]:
                lines.append(f"🏢 {r.get('supplier_name','?')} | Orders: {r.get('po_count','?')} | Rs {float(r.get('total_purchased',0)):,.2f}")
            return "\n".join(lines)
        except Exception as e:
            logger.error("Purchases report error: %s", e)
            return "⚠️ Could not generate purchases report."

    return f"⚠️ Unknown report type: {report_type}"


# ── Bot log ────────────────────────────────────────────────────────────────────

def _log(sender: str, command: str, report_type: Optional[str],
         reply: str, status: str) -> None:
    try:
        db = SessionLocal()
        try:
            db.add(WhatsAppBotLog(
                sender=sender,
                command=command,
                report_type=report_type,
                reply_text=reply[:2000],   # cap to avoid bloat
                status=status,
            ))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error("Failed to log bot interaction: %s", e)


# ── Public entry point (called by the FastAPI endpoint) ───────────────────────

def handle_incoming_message(sender: str, body: str, fromMe: bool = False) -> Optional[str]:
    """
    Process one incoming WhatsApp message.

    Returns:
        str  — the reply text to send back  (None means silently ignore)
    """
    whitelist = _load_whitelist()

    # Normalise sender: strip @s.whatsapp.net and leading +
    clean_sender = sender.split("@")[0].replace("+", "").strip()

    # Whitelist gate
    if whitelist and clean_sender not in whitelist:
        logger.debug("Bot ignoring message from unlisted number: %s", clean_sender)
        _log(clean_sender, body, None, "", "ignored")
        return None   # silent ignore

    cmd = body.strip().lower().replace(" ", "")

    # Greeting → show menu
    if cmd in GREETING_WORDS:
        reply = MENU_TEXT
        _log(clean_sender, body, "menu", reply, "ok")
        return reply

    # Known command → generate report
    if cmd in COMMAND_MAP:
        report_type, label = COMMAND_MAP[cmd]
        header = f"⏳ Generating *{label}*…\n\n"
        report_text = _generate_report(report_type)
        reply = header + report_text
        _log(clean_sender, body, report_type, reply, "ok")
        return reply

    # Unknown
    if fromMe:
        # If the message is from ourselves (e.g. testing by messaging oneself, or the bot's own replies),
        # silently ignore unknown commands to prevent infinite bot reply loops.
        return None

    _log(clean_sender, body, "unknown", UNKNOWN_TEXT, "ok")
    return UNKNOWN_TEXT
