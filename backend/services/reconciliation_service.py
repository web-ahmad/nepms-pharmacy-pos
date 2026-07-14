import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
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


async def reconcile_shift_cash(
    branch_id: str, 
    staff_id: str, 
    shift_date: str, 
    opening_float: float, 
    total_cash_sales: float, 
    total_cash_refunds: float, 
    actual_cash: float, 
    notes: str = ""
):
    """
    Compares expected_cash against actual_cash entered by the staff at shift close.
    Inserts the result into cash_reconciliation and triggers an alert if variance exceeds threshold.
    """
    logger.info(f"Reconciling cash for staff {staff_id} at branch {branch_id} on {shift_date}")
    
    # Calculate Expected Cash
    expected_cash = opening_float + total_cash_sales - total_cash_refunds
    variance = actual_cash - expected_cash
    
    # 1. Insert into cash_reconciliation table
    try:
        reconciliation_data = {
            "branch_id": branch_id,
            "staff_id": staff_id,
            "shift_date": shift_date,
            "expected_cash": round(expected_cash, 2),
            "actual_cash": round(actual_cash, 2),
            "variance": round(variance, 2),
            "notes": notes
        }
        resp = supabase.table("cash_reconciliation").insert(reconciliation_data).execute()
        reconciliation_id = resp.data[0]['id'] if resp.data else None
    except Exception as e:
        logger.error(f"Failed to insert cash reconciliation record: {e}")
        return
        
    # 2. Check for threshold alerts
    # We query alert_config for 'cash_variance'
    config_resp = supabase.table("alert_config") \
        .select("*") \
        .eq("branch_id", branch_id) \
        .eq("event_type", "cash_variance") \
        .eq("is_enabled", True) \
        .execute()
        
    configs = config_resp.data
    if not configs:
        logger.info("No active cash_variance alerts configured for this branch.")
        return
        
    abs_variance = abs(variance)
    
    # Filter configs where the absolute variance exceeds the allowed threshold
    active_configs = [c for c in configs if abs_variance > float(c.get('threshold_value') or 0.0)]
    
    if not active_configs:
        logger.info(f"Variance (${variance}) is within acceptable thresholds.")
        return
        
    # 3. Format Alert Message
    status_icon = "🟢" if variance >= 0 else "🔴"
    status_text = "OVERAGE" if variance > 0 else "SHORTAGE"
    
    message = (
        f"🚨 *Cash {status_text} Detected*\n\n"
        f"👤 *Staff ID*: {staff_id}\n"
        f"📅 *Shift Date*: {shift_date}\n"
        f"💵 *Expected*: ${expected_cash:.2f}\n"
        f"💰 *Actual*: ${actual_cash:.2f}\n"
        f"📉 *Variance*: {status_icon} ${variance:.2f}\n\n"
        f"📝 *Notes*: {notes}"
    )
    
    # 4. Dispatch Alerts
    for config in active_configs:
        notify_via = config.get('notify_via')
        owner_id = config.get('owner_id')
        phone_number = "+1234567890" # Stub to be fetched from a user profile
        
        if notify_via in ['whatsapp', 'both']:
            # We reuse the WhatsApp API, passing None for snapshot_url since this is an end-of-shift aggregate
            # Passing the reconciliation_id as the event_id for tracking in alert_history
            await send_whatsapp_alert(str(reconciliation_id), owner_id, phone_number, message, None)
            
        if notify_via in ['dashboard', 'both']:
            supabase.table("alert_history").insert({
                # Store the UUID of the cash_reconciliation so the frontend can link it
                "audit_event_id": None, 
                "sent_to": owner_id,
                "channel": "dashboard",
                "status": "pending"
            }).execute()
