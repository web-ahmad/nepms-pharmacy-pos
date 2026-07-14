import os
import logging
import datetime
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

from services.audit_report_service import AuditReportGenerator
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

async def dispatch_scheduled_reports():
    """
    Checks the alert_config table for any reports scheduled for the current hour.
    Supported event_types follow the format: 'report:<period>:<report_name>'
    Example: 'report:daily:staff_risk' or 'report:weekly:cash_reconciliation'
    It uses 'schedule_hour' (0-23) and 'schedule_day_of_week' (0-6, where 0 is Monday).
    """
    logger.info("Checking for scheduled reports...")
    now = datetime.datetime.now()
    current_hour = now.hour

    try:
        # Fetch all enabled configs that start with 'report:'
        resp = supabase.table("alert_config").select("*").like("event_type", "report:%").eq("is_enabled", True).execute()
        configs = resp.data
    except Exception as e:
        logger.error(f"Failed to fetch report configs: {e}")
        return
        
    if not configs:
        return
        
    for config in configs:
        # Check if the report is scheduled for this hour
        configured_hour = config.get('schedule_hour')
        if configured_hour is None:
            configured_hour = 8 # Default 8 AM
        else:
            configured_hour = int(configured_hour)
            
        if current_hour != configured_hour:
            continue
            
        event_type = config.get('event_type')
        branch_id = config.get('branch_id')
        owner_id = config.get('owner_id')
        notify_via = config.get('notify_via')
        
        # Parse 'report:{period}:{type}'
        parts = event_type.split(':')
        if len(parts) != 3:
            logger.warning(f"Invalid report format in alert_config: {event_type}")
            continue
            
        period = parts[1]       # 'daily', 'weekly', 'monthly'
        report_name = parts[2]  # 'staff_risk', 'void_discount', etc.
        
        # Enforce weekly schedule on the configured day of week (0=Monday, 6=Sunday)
        if period == 'weekly':
            configured_day = config.get('schedule_day_of_week')
            target_day = int(configured_day) if configured_day is not None else 0
            if now.weekday() != target_day:
                continue
            
        # Initialize generator
        generator = AuditReportGenerator(branch_id=branch_id, period=period)
        text_summary = ""
        
        # Route to appropriate report generator
        if report_name == "staff_risk":
            _, text_summary = generator.generate_staff_risk_report()
        elif report_name == "void_discount":
            _, text_summary = generator.generate_void_discount_report()
        elif report_name == "cash_reconciliation":
            _, text_summary = generator.generate_cash_reconciliation_report()
        elif report_name == "inventory_shrinkage":
            _, text_summary = generator.generate_inventory_shrinkage_report()
        elif report_name == "expiry":
            _, text_summary = generator.generate_expiry_report()
        else:
            logger.warning(f"Unknown report name '{report_name}' requested in config {config['id']}")
            continue
            
        # Send Alert
        phone_number = "+1234567890" # Stub to be fetched from user profiles
        
        if notify_via in ['whatsapp', 'both']:
            await send_whatsapp_alert(None, owner_id, phone_number, text_summary, None)
            
        if notify_via in ['dashboard', 'both']:
            supabase.table("alert_history").insert({
                "audit_event_id": None,
                "sent_to": owner_id,
                "channel": "dashboard",
                "status": "pending"
            }).execute()
            
        logger.info(f"Dispatched {period} {report_name} report to owner {owner_id}")

def run_scheduled_reports_sync():
    """Wrapper to run the async dispatch function synchronously in APScheduler"""
    asyncio.run(dispatch_scheduled_reports())

if __name__ == "__main__":
    run_scheduled_reports_sync()
