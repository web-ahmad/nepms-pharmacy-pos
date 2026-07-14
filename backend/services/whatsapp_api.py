import os
import logging
import asyncio
import aiohttp
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your_service_key")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

WHATSAPP_SERVICE_URL = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:3001")

def _log_to_history(event_id: str, owner_id: str, status: str):
    """Helper to log delivery status to Supabase alert_history"""
    try:
        supabase.table("alert_history").insert({
            "audit_event_id": event_id,
            "sent_to": owner_id,
            "channel": "whatsapp",
            "status": status
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log alert_history for event {event_id}: {e}")

async def send_whatsapp_alert(event_id: str, owner_id: str, phone_number: str, message: str, image_url: str | None = None) -> bool:
    """
    Sends a WhatsApp message (with optional image) using the local Baileys microservice.
    Includes 3 retries with exponential backoff.
    Logs final status to alert_history.
    """
    health_url = f"{WHATSAPP_SERVICE_URL}/health"
    send_url = f"{WHATSAPP_SERVICE_URL}/send"
    
    # Construct Payload
    payload = {
        "phone": phone_number,
        "message": message,
    }
    if image_url:
        payload["imageUrl"] = image_url

    max_retries = 3
    base_delay = 2.0
    
    async with aiohttp.ClientSession() as session:
        # Check health first
        try:
            async with session.get(health_url, timeout=5.0) as health_resp:
                if health_resp.status != 200:
                    logger.warning("WhatsApp Service is unreachable.")
                    _log_to_history(event_id, owner_id, "failed (service offline)")
                    return False
                health_data = await health_resp.json()
                if not health_data.get("connected"):
                    logger.warning("WhatsApp Service is running but not connected (QR scan needed).")
                    _log_to_history(event_id, owner_id, "failed (disconnected)")
                    return False
        except Exception as e:
            logger.error(f"Failed to reach WhatsApp Service at {health_url}: {e}")
            _log_to_history(event_id, owner_id, "failed (service unreachable)")
            return False

        for attempt in range(1, max_retries + 1):
            try:
                async with session.post(send_url, json=payload, timeout=15.0) as response:
                    if response.status in [200, 201]:
                        logger.info(f"WhatsApp message sent successfully to {phone_number}")
                        _log_to_history(event_id, owner_id, "delivered")
                        return True
                    else:
                        error_text = await response.text()
                        logger.warning(f"WhatsApp Service error (Attempt {attempt}): {error_text}")
                        # Don't retry if the service explicitly tells us it's disconnected
                        if response.status == 503:
                            _log_to_history(event_id, owner_id, "failed (disconnected)")
                            return False
                        
            except Exception as e:
                logger.warning(f"WhatsApp request failed (Attempt {attempt}): {e}")
            
            if attempt < max_retries:
                sleep_time = base_delay * (2 ** (attempt - 1)) # 2s, 4s
                logger.info(f"Retrying WhatsApp alert to {phone_number} in {sleep_time} seconds...")
                await asyncio.sleep(sleep_time)
                
    logger.error(f"Failed to send WhatsApp message to {phone_number} after {max_retries} attempts.")
    _log_to_history(event_id, owner_id, "failed (retries exhausted)")
    return False
