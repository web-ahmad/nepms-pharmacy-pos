import asyncio
import os
import logging
import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

from services.camera_service import capture_snapshot
from services.whatsapp_api import send_whatsapp_alert

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your_service_key")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# Snapshot Helper
# ==========================================

async def process_camera_snapshot(event_id: str, branch_id: str, created_at: str) -> str | None:
    """Captures a snapshot and persists it to the database if successful."""
    snapshot_url = await capture_snapshot(branch_id, created_at)
    
    if snapshot_url:
        try:
            supabase.table("camera_snapshots").insert({
                "audit_event_id": event_id,
                "branch_id": branch_id,
                "camera_id": "POS_CAM_1",  # Configurable per branch in a real setup
                "image_url": snapshot_url,
                "captured_at": created_at
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save camera snapshot record for event {event_id}: {e}")
            
    return snapshot_url


# ==========================================
# Handlers for Specific Audit Events
# ==========================================

async def void_handler(event_data: dict):
    event_id = event_data.get('id')
    branch_id = event_data.get('branch_id')
    event_type = event_data.get('event_type')
    metadata = event_data.get('metadata', {})
    created_at = event_data.get('created_at')
    
    logger.info(f"Handling void event: {event_id}")
    
    # 1. Fetch alert_config for this branch/event_type to check if alerts are enabled
    config_resp = supabase.table("alert_config") \
        .select("*") \
        .eq("branch_id", branch_id) \
        .eq("event_type", event_type) \
        .eq("is_enabled", True) \
        .execute()
    
    configs = config_resp.data
    if not configs:
        logger.info(f"Alerts disabled or not configured for branch {branch_id}, event {event_type}")
        return

    # 2. Trigger the camera snapshot service (Phase 3)
    snapshot_url = await process_camera_snapshot(event_id, branch_id, created_at)

    # 3. Format the alert message
    staff_name = metadata.get('staff_name', 'Unknown Staff')
    item_name = metadata.get('item_name', 'Unknown Item')
    amount = metadata.get('amount', 0.0)
    reason = metadata.get('reason', 'No reason provided')
    
    message = (
        f"🚨 *Suspicious Void Detected*\n\n"
        f"👤 *Staff*: {staff_name}\n"
        f"📦 *Item*: {item_name}\n"
        f"💰 *Amount*: ${amount:.2f}\n"
        f"📝 *Reason*: {reason}\n"
        f"🕒 *Time*: {created_at}\n\n"
        f"Please check the attached snapshot from the POS camera."
    )
    
    # 4 & 5. Call WhatsApp service and log in alert_history
    for config in configs:
        notify_via = config.get('notify_via')
        owner_id = config.get('owner_id')
        
        # In a real scenario, fetch owner's phone number from a users/profiles table
        phone_number = "+1234567890" 
        
        if notify_via in ['whatsapp', 'both']:
            # Call WhatsApp service (Phase 4)
            # Service inherently handles retries and logs to alert_history
            await send_whatsapp_alert(event_id, owner_id, phone_number, message, snapshot_url)
            
        if notify_via in ['dashboard', 'both']:
            supabase.table("alert_history").insert({
                "audit_event_id": event_id,
                "sent_to": owner_id,
                "channel": "dashboard",
                "status": "pending" # UI dashboard reads pending alerts
            }).execute()

async def discount_handler(event_data: dict):
    event_id = event_data.get('id')
    branch_id = event_data.get('branch_id')
    event_type = event_data.get('event_type')
    metadata = event_data.get('metadata', {})
    created_at = event_data.get('created_at')
    
    logger.info(f"Handling discount event: {event_id}")
    
    config_resp = supabase.table("alert_config") \
        .select("*") \
        .eq("branch_id", branch_id) \
        .eq("event_type", event_type) \
        .eq("is_enabled", True) \
        .execute()
    
    configs = config_resp.data
    if not configs:
        return
        
    discount_pct = float(metadata.get('discount_percent', 0.0))
    # Only alert if the discount exceeds the owner's configured threshold
    active_configs = [c for c in configs if discount_pct > float(c.get('threshold_value') or 100.0)]
    
    if not active_configs:
        logger.info(f"Discount ({discount_pct}%) below threshold for event {event_id}")
        return

    snapshot_url = await process_camera_snapshot(event_id, branch_id, created_at)
    
    staff_name = metadata.get('staff_name', 'Unknown Staff')
    item_name = metadata.get('item_name', 'Unknown Item')
    original_price = metadata.get('original_price', 0.0)
    
    message = (
        f"🚨 *Large Discount Detected*\n\n"
        f"👤 *Staff*: {staff_name}\n"
        f"📦 *Item*: {item_name}\n"
        f"💰 *Original Price*: ${original_price:.2f}\n"
        f"✂️ *Discount*: {discount_pct}%\n"
        f"🕒 *Time*: {created_at}\n\n"
        f"Check snapshot for visual confirmation."
    )
    
    for config in active_configs:
        notify_via = config.get('notify_via')
        owner_id = config.get('owner_id')
        phone_number = "+1234567890" 
        
        if notify_via in ['whatsapp', 'both']:
            await send_whatsapp_alert(event_id, owner_id, phone_number, message, snapshot_url)
            
        if notify_via in ['dashboard', 'both']:
            supabase.table("alert_history").insert({
                "audit_event_id": event_id,
                "sent_to": owner_id,
                "channel": "dashboard",
                "status": "pending"
            }).execute()

async def refund_handler(event_data: dict):
    event_id = event_data.get('id')
    branch_id = event_data.get('branch_id')
    staff_id = event_data.get('staff_id')
    event_type = event_data.get('event_type')
    metadata = event_data.get('metadata', {})
    created_at = event_data.get('created_at')
    
    logger.info(f"Handling refund event: {event_id}")
    
    customer_id = metadata.get('customer_id')
    
    config_resp = supabase.table("alert_config") \
        .select("*") \
        .eq("branch_id", branch_id) \
        .eq("event_type", event_type) \
        .eq("is_enabled", True) \
        .execute()
    
    configs = config_resp.data
    if not configs:
        return
        
    is_repeated = False
    
    if customer_id:
        thirty_days_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).isoformat()
        
        past_refunds = supabase.table("audit_events") \
            .select("id") \
            .eq("branch_id", branch_id) \
            .eq("staff_id", staff_id) \
            .eq("event_type", "refund") \
            .gt("created_at", thirty_days_ago) \
            .neq("id", event_id) \
            .contains("metadata", {"customer_id": customer_id}) \
            .execute()
            
        if past_refunds.data and len(past_refunds.data) > 0:
            is_repeated = True
            supabase.table("audit_events").update({"severity": "high"}).eq("id", event_id).execute()
            logger.warning(f"Repeated refund detected for staff {staff_id} and customer {customer_id}. Severity escalated.")

    snapshot_url = await process_camera_snapshot(event_id, branch_id, created_at)
    
    staff_name = metadata.get('staff_name', 'Unknown Staff')
    amount = metadata.get('amount', 0.0)
    reason = metadata.get('reason', 'No reason provided')
    
    alert_prefix = "🚨 *ESCALATED: Repeated Refund Detected*" if is_repeated else "⚠️ *Refund Issued*"
    
    message = (
        f"{alert_prefix}\n\n"
        f"👤 *Staff*: {staff_name}\n"
        f"💰 *Amount*: ${amount:.2f}\n"
        f"📝 *Reason*: {reason}\n"
        f"🕒 *Time*: {created_at}\n\n"
        f"Check snapshot for visual confirmation."
    )
    
    for config in configs:
        notify_via = config.get('notify_via')
        owner_id = config.get('owner_id')
        phone_number = "+1234567890"
        
        if notify_via in ['whatsapp', 'both']:
            await send_whatsapp_alert(event_id, owner_id, phone_number, message, snapshot_url)
            
        if notify_via in ['dashboard', 'both']:
            supabase.table("alert_history").insert({
                "audit_event_id": event_id,
                "sent_to": owner_id,
                "channel": "dashboard",
                "status": "pending"
            }).execute()

async def drawer_handler(event_data: dict):
    event_id = event_data.get('id')
    branch_id = event_data.get('branch_id')
    created_at = event_data.get('created_at')
    logger.info(f"Handling drawer_open event: {event_id}")
    await process_camera_snapshot(event_id, branch_id, created_at)

async def stock_handler(event_data: dict):
    logger.info(f"Handling stock_adjustment event: {event_data.get('id')}")

async def expiry_handler(event_data: dict):
    logger.info(f"Handling expired_sale event: {event_data.get('id')}")

async def after_hours_handler(event_data: dict):
    event_id = event_data.get('id')
    branch_id = event_data.get('branch_id')
    created_at = event_data.get('created_at')
    logger.info(f"Handling after_hours_login event: {event_id}")
    await process_camera_snapshot(event_id, branch_id, created_at)


# ==========================================
# Event Router
# ==========================================

async def route_event(event_data: dict):
    """
    Routes the event to the appropriate handler asynchronously.
    """
    event_type = event_data.get('event_type')
    
    handlers = {
        'void': void_handler,
        'discount': discount_handler,
        'refund': refund_handler,
        'drawer_open': drawer_handler,
        'stock_adjustment': stock_handler,
        'expired_sale': expiry_handler,
        'after_hours_login': after_hours_handler
    }
    
    handler = handlers.get(event_type)
    if handler:
        try:
            # Await the specific handler's logic
            await handler(event_data)
        except Exception as e:
            logger.error(f"Error executing handler for {event_type}: {e}")
    else:
        logger.warning(f"No handler found for event_type: {event_type}")


# ==========================================
# Listener Logic (Async Polling)
# ==========================================
# We use async polling here to guarantee event delivery even if the service 
# restarts or websockets drop. It also integrates seamlessly with asyncio 
# without thread synchronization complexities.

async def poll_audit_events(poll_interval: float = 2.0):
    logger.info("Starting async polling for audit_events...")
    
    # 1. On startup, fetch the most recent created_at to avoid re-processing old events.
    last_processed_time = "1970-01-01T00:00:00Z"
    try:
        response = supabase.table("audit_events").select("created_at").order("created_at", desc=True).limit(1).execute()
        if response.data:
            last_processed_time = response.data[0]['created_at']
            logger.info(f"Resuming listener from: {last_processed_time}")
    except Exception as e:
        logger.error(f"Error fetching initial state: {e}")

    # 2. Continuous async polling loop
    while True:
        try:
            # Query for events strictly newer than our last processed time
            response = supabase.table("audit_events") \
                .select("*") \
                .gt("created_at", last_processed_time) \
                .order("created_at", desc=False) \
                .execute()
            
            for event in response.data:
                # 3. Dispatch the router as an independent asyncio task 
                # so the polling loop is never blocked by a slow handler (like an API call).
                asyncio.create_task(route_event(event))
                
                # Update the watermark
                last_processed_time = event['created_at']
                
        except Exception as e:
            logger.error(f"Polling error: {e}")
            
        # Non-blocking sleep
        await asyncio.sleep(poll_interval)


if __name__ == "__main__":
    try:
        asyncio.run(poll_audit_events(poll_interval=2.0))
    except KeyboardInterrupt:
        logger.info("Audit Listener stopped manually.")
