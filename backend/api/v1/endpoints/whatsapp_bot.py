"""
POST /bot/incoming
──────────────────
Called by the Baileys Node service whenever a message arrives from WhatsApp.
Delegates to the WhatsAppBotService and returns a reply (or null to ignore).
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

from services.whatsapp_bot_service import handle_incoming_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bot", tags=["whatsapp-bot"])


@router.post("/incoming")
async def incoming_message(request: Request):
    """
    Expected JSON body:
        { "sender": "923144236077@s.whatsapp.net", "body": "1" }
    Returns:
        { "reply": "<text>" }   if the bot should respond
        { "reply": null }       if the message should be silently ignored
    """
    try:
        data   = await request.json()
        sender = data.get("sender", "")
        body   = data.get("body", "").strip()
        fromMe = data.get("fromMe", False)

        if not sender or not body:
            return JSONResponse({"reply": None})

        reply = handle_incoming_message(sender, body, fromMe)
        return JSONResponse({"reply": reply})

    except Exception as e:
        logger.error("Bot incoming endpoint error: %s", e)
        return JSONResponse({"reply": None})


@router.get("/logs")
def get_bot_logs(limit: int = 100):
    """Returns recent bot interaction logs for the dashboard."""
    from database import SessionLocal
    from models.audit import WhatsAppBotLog
    db = SessionLocal()
    try:
        rows = (
            db.query(WhatsAppBotLog)
            .order_by(WhatsAppBotLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id":          r.id,
                "sender":      r.sender,
                "command":     r.command,
                "report_type": r.report_type,
                "status":      r.status,
                "created_at":  r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        db.close()
