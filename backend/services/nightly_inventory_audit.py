import os
import logging
import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your_service_key")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_nightly_inventory_audit():
    """
    Nightly cron job to compare expected stock against actual counts,
    and flag products nearing expiry or already expired but still in stock.
    """
    logger.info("Starting nightly inventory audit...")
    
    today = datetime.date.today()
    records_to_flag = []
    
    # ==========================================
    # 1. EXPIRY AUDIT
    # ==========================================
    try:
        # Query active batches with positive inventory
        response = supabase.table("batches").select("*").eq("is_deleted", False).gt("current_quantity", 0).execute()
        batches = response.data
        
        for batch in batches:
            branch_id = batch.get('branch_id')
            medicine_id = batch.get('medicine_id')
            expiry_date_str = batch.get('expiry_date')
            
            if expiry_date_str:
                try:
                    expiry_date_str_clean = str(expiry_date_str).split('T')[0]
                    expiry_date = datetime.datetime.strptime(expiry_date_str_clean, "%Y-%m-%d").date()
                    days_to_expiry = (expiry_date - today).days
                    
                    qty = batch.get('current_quantity', 0)
                    
                    if days_to_expiry < 0:
                        records_to_flag.append({
                            "branch_id": branch_id,
                            "product_id": medicine_id,
                            "flag_type": "expired",
                            "expected_qty": qty,
                            "actual_qty": qty,
                            "variance": 0,
                            "notes": f"CRITICAL: Batch {batch.get('batch_number')} expired on {expiry_date_str_clean} but has {qty} units in active stock."
                        })
                    elif days_to_expiry <= 90:
                        records_to_flag.append({
                            "branch_id": branch_id,
                            "product_id": medicine_id,
                            "flag_type": "near_expiry",
                            "expected_qty": qty,
                            "actual_qty": qty,
                            "variance": 0,
                            "notes": f"Batch {batch.get('batch_number')} expiring in {days_to_expiry} days ({expiry_date_str_clean})."
                        })
                except ValueError:
                    logger.error(f"Could not parse expiry date {expiry_date_str} for batch {batch.get('id')}")
                    
    except Exception as e:
        logger.error(f"Failed to fetch batches for expiry audit: {e}")


    # ==========================================
    # 2. SHRINKAGE AUDIT (Expected vs Actual)
    # ==========================================
    try:
        # Assuming we track completed counts in physical_stock_counts or audit_items
        # But we can also query the main inventory system if it maintains expected vs actual logs
        # For this audit module, we check if physical_stock_counts has discrepancies
        counts_resp = supabase.table("physical_stock_counts").select("*").eq("status", "completed").execute()
        physical_counts = counts_resp.data
        
        for count in physical_counts:
            expected_qty = count.get('expected_qty', 0)
            actual_qty = count.get('actual_qty', 0)
            variance = actual_qty - expected_qty
            
            if abs(variance) > 0:
                records_to_flag.append({
                    "branch_id": count.get('branch_id'),
                    "product_id": count.get('medicine_id'),
                    "flag_type": "shrinkage",
                    "expected_qty": expected_qty,
                    "actual_qty": actual_qty,
                    "variance": variance,
                    "notes": f"Physical count variance detected on {count.get('counted_at', 'unknown date')}."
                })
                
                # Update status to avoid flagging every night
                supabase.table("physical_stock_counts").update({"status": "audited"}).eq("id", count['id']).execute()
                
    except Exception as e:
        logger.warning(f"Skipped shrinkage audit. Physical counts table might not be accessible: {e}")


    # ==========================================
    # 3. INSERT FLAGS
    # ==========================================
    if records_to_flag:
        try:
            supabase.table("inventory_audit_flags").insert(records_to_flag).execute()
            logger.info(f"Successfully inserted {len(records_to_flag)} inventory audit flags.")
        except Exception as e:
            logger.error(f"Failed to insert inventory flags: {e}")
    else:
        logger.info("No inventory flags generated for tonight.")

if __name__ == "__main__":
    run_nightly_inventory_audit()
