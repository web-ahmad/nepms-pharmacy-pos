import os
import logging
import datetime
from collections import defaultdict
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

def calculate_weekly_risk_scores():
    """
    Background job to calculate weekly staff risk scores.
    Groups staff by branch and role, compares their voids, refunds, and discounts
    against their peers, and assigns a weighted risk score (0-100) and color tier.
    """
    logger.info("Starting weekly risk score calculation...")
    
    end_date = datetime.datetime.now(datetime.timezone.utc)
    start_date = end_date - datetime.timedelta(days=7)
    
    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat()
    
    # 1. Fetch audit events for the last 7 days
    try:
        response = supabase.table("audit_events") \
            .select("*") \
            .gte("created_at", start_iso) \
            .lte("created_at", end_iso) \
            .in_("event_type", ["void", "discount", "refund"]) \
            .execute()
        events = response.data
    except Exception as e:
        logger.error(f"Failed to fetch audit events: {e}")
        return
        
    if not events:
        logger.info("No relevant audit events found for the past week. Exiting.")
        return
    
    # 2. Fetch staff roles to group by peer roles
    # (Assuming a `staff_roles` table with user_id, branch_id, and role)
    try:
        roles_response = supabase.table("staff_roles").select("user_id, branch_id, role").execute()
        staff_roles = {r['user_id']: r for r in roles_response.data} if roles_response.data else {}
    except Exception as e:
        logger.warning(f"Could not fetch staff roles, defaulting all to 'staff': {e}")
        staff_roles = {}
    
    # 3. Aggregate data per staff
    # Structure: branch_id -> role -> staff_id -> stats
    branch_role_staff_stats = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        'void_count': 0,
        'discount_total': 0.0,
        'refund_count': 0
    })))
    
    for event in events:
        staff_id = event['staff_id']
        branch_id = event['branch_id']
        event_type = event['event_type']
        metadata = event.get('metadata', {})
        
        # Determine role for fair peer comparison
        role_info = staff_roles.get(staff_id, {})
        role = role_info.get('role', 'staff')
        
        stats = branch_role_staff_stats[branch_id][role][staff_id]
        
        if event_type == 'void':
            stats['void_count'] += 1
        elif event_type == 'refund':
            stats['refund_count'] += 1
        elif event_type == 'discount':
            # Extract discount amount from metadata. Fallback to 0 if missing.
            amount = float(metadata.get('amount', 0.0))
            stats['discount_total'] += amount
            
    # 4. Calculate peer averages and compute risk scores
    records_to_insert = []
    
    for branch_id, roles in branch_role_staff_stats.items():
        for role, staff_members in roles.items():
            
            # Calculate peer averages for this specific role in this specific branch
            num_peers = len(staff_members)
            if num_peers == 0:
                continue
                
            avg_voids = sum(s['void_count'] for s in staff_members.values()) / num_peers
            avg_discounts = sum(s['discount_total'] for s in staff_members.values()) / num_peers
            avg_refunds = sum(s['refund_count'] for s in staff_members.values()) / num_peers
            
            # Compute score for each staff member
            for staff_id, stats in staff_members.items():
                voids = stats['void_count']
                discounts = stats['discount_total']
                refunds = stats['refund_count']
                
                score = 0.0
                
                # --- WEIGHTED FORMULA ---
                # A baseline score of 0 means perfect behavior.
                # Max penalty points: Voids (40), Refunds (40), Discounts (20) = 100 max
                
                # Void Penalty (Max 40 points)
                if avg_voids > 0 and voids > avg_voids:
                    ratio = voids / avg_voids
                    score += min(40.0, (ratio - 1) * 20) 
                elif avg_voids == 0 and voids > 0:
                    score += min(40.0, voids * 10)
                    
                # Refund Penalty (Max 40 points)
                if avg_refunds > 0 and refunds > avg_refunds:
                    ratio = refunds / avg_refunds
                    score += min(40.0, (ratio - 1) * 20)
                elif avg_refunds == 0 and refunds > 0:
                    score += min(40.0, refunds * 10)
                    
                # Discount Penalty (Max 20 points)
                if avg_discounts > 0 and discounts > avg_discounts:
                    ratio = discounts / avg_discounts
                    score += min(20.0, (ratio - 1) * 10)
                elif avg_discounts == 0 and discounts > 0:
                    score += min(20.0, discounts * 0.1) # Soft penalty for flat discount amounts
                
                # Cap score at 100 strictly
                final_score = min(100.0, max(0.0, score))
                
                # Assign Categorical Risk Level
                if final_score > 70:
                    risk_level = 'red'
                elif final_score >= 40:
                    risk_level = 'yellow'
                else:
                    risk_level = 'green'
                    
                records_to_insert.append({
                    "staff_id": staff_id,
                    "branch_id": branch_id,
                    "period_start": start_iso,
                    "period_end": end_iso,
                    "void_count": voids,
                    "discount_total": round(discounts, 2),
                    "refund_count": refunds,
                    "risk_score": round(final_score, 2),
                    "risk_level": risk_level
                })
                
    # 5. Bulk insert results into staff_risk_scores table
    if records_to_insert:
        try:
            supabase.table("staff_risk_scores").insert(records_to_insert).execute()
            logger.info(f"Successfully calculated and inserted {len(records_to_insert)} staff risk scores.")
        except Exception as e:
            logger.error(f"Failed to insert risk scores: {e}")
    else:
        logger.info("No risk scores to insert for this period.")

if __name__ == "__main__":
    calculate_weekly_risk_scores()
