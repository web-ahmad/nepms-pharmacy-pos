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


class AuditReportGenerator:
    """
    Generates pre-built, structured audit reports for a given branch and time period.
    Outputs a tuple of (json_payload, whatsapp_formatted_text_summary).
    Supported periods: 'daily', 'weekly', 'monthly'.
    """
    
    def __init__(self, branch_id: str, period: str = 'daily'):
        self.branch_id = branch_id
        self.period = period.lower()
        
        self.end_date = datetime.datetime.now(datetime.timezone.utc)
        if self.period == 'daily':
            self.start_date = self.end_date - datetime.timedelta(days=1)
        elif self.period == 'weekly':
            self.start_date = self.end_date - datetime.timedelta(days=7)
        elif self.period == 'monthly':
            self.start_date = self.end_date - datetime.timedelta(days=30)
        else:
            self.start_date = self.end_date - datetime.timedelta(days=1)
            
        self.start_iso = self.start_date.isoformat()
        self.end_iso = self.end_date.isoformat()


    def generate_staff_risk_report(self):
        resp = supabase.table("staff_risk_scores") \
            .select("*") \
            .eq("branch_id", self.branch_id) \
            .gte("period_start", self.start_iso) \
            .execute()
        
        data = resp.data
        if not data:
            return {"data": []}, f"📊 *{self.period.capitalize()} Staff Risk Report*\nNo risk scores calculated for this period."
            
        # Sort by highest risk score
        data.sort(key=lambda x: x.get('risk_score', 0), reverse=True)
        top_risks = data[:5]
        
        text = f"📊 *{self.period.capitalize()} Staff Risk Report*\n\n"
        for staff in top_risks:
            level = staff.get('risk_level', 'green')
            icon = "🔴" if level == 'red' else "🟡" if level == 'yellow' else "🟢"
            score = staff.get('risk_score', 0)
            voids = staff.get('void_count', 0)
            refunds = staff.get('refund_count', 0)
            
            text += f"{icon} *Staff {staff.get('staff_id')}* - Score: {score}/100 (Voids: {voids}, Refunds: {refunds})\n"
            
        return {"data": data}, text


    def generate_void_discount_report(self):
        resp = supabase.table("audit_events") \
            .select("event_type, metadata") \
            .eq("branch_id", self.branch_id) \
            .gte("created_at", self.start_iso) \
            .in_("event_type", ["void", "discount"]) \
            .execute()
            
        data = resp.data
        voids = [d for d in data if d.get('event_type') == 'void']
        discounts = [d for d in data if d.get('event_type') == 'discount']
        
        void_total = sum(float(v.get('metadata', {}).get('amount', 0)) for v in voids)
        discount_total = sum(float(d.get('metadata', {}).get('amount', 0)) for d in discounts)
        
        text = (
            f"📊 *{self.period.capitalize()} Void/Discount Trend Report*\n\n"
            f"✂️ *Voids*: {len(voids)} events (Total Value: ${void_total:.2f})\n"
            f"🏷️ *Discounts*: {len(discounts)} events (Total Value: ${discount_total:.2f})"
        )
        
        json_data = {
            "voids": {"count": len(voids), "total_value": void_total},
            "discounts": {"count": len(discounts), "total_value": discount_total},
            "raw_events": data
        }
        
        return json_data, text


    def generate_cash_reconciliation_report(self):
        resp = supabase.table("cash_reconciliation") \
            .select("*") \
            .eq("branch_id", self.branch_id) \
            .gte("created_at", self.start_iso) \
            .execute()
            
        data = resp.data
        shortages = [d for d in data if float(d.get('variance', 0)) < 0]
        overages = [d for d in data if float(d.get('variance', 0)) > 0]
        
        shortage_total = sum(abs(float(s.get('variance', 0))) for s in shortages)
        overage_total = sum(float(o.get('variance', 0)) for o in overages)
        
        text = (
            f"📊 *{self.period.capitalize()} Cash Reconciliation Report*\n\n"
            f"📉 *Shortages*: {len(shortages)} shifts (Total: ${shortage_total:.2f})\n"
            f"📈 *Overages*: {len(overages)} shifts (Total: ${overage_total:.2f})"
        )
        
        json_data = {
            "shortages": {"count": len(shortages), "total_value": shortage_total},
            "overages": {"count": len(overages), "total_value": overage_total},
            "raw_events": data
        }
        
        return json_data, text


    def generate_inventory_shrinkage_report(self):
        resp = supabase.table("inventory_audit_flags") \
            .select("*") \
            .eq("branch_id", self.branch_id) \
            .eq("flag_type", "shrinkage") \
            .gte("created_at", self.start_iso) \
            .execute()
            
        data = resp.data
        total_variance = sum(abs(float(d.get('variance', 0))) for d in data)
        
        text = (
            f"📊 *{self.period.capitalize()} Inventory Shrinkage Report*\n\n"
            f"📦 *Total Items Flagged*: {len(data)}\n"
            f"📉 *Absolute Variance (Units)*: {total_variance}"
        )
        
        json_data = {
            "summary": {"total_items": len(data), "total_variance": total_variance},
            "data": data
        }
        
        return json_data, text


    def generate_expiry_report(self):
        resp = supabase.table("inventory_audit_flags") \
            .select("*") \
            .eq("branch_id", self.branch_id) \
            .in_("flag_type", ["expired", "near_expiry"]) \
            .gte("created_at", self.start_iso) \
            .execute()
            
        data = resp.data
        expired = [d for d in data if d.get('flag_type') == 'expired']
        near_expiry = [d for d in data if d.get('flag_type') == 'near_expiry']
        
        text = (
            f"📊 *{self.period.capitalize()} Expiry Report*\n\n"
            f"☠️ *Expired Items in Stock*: {len(expired)}\n"
            f"⚠️ *Items Nearing Expiry*: {len(near_expiry)}"
        )
        
        json_data = {
            "expired_count": len(expired),
            "near_expiry_count": len(near_expiry),
            "raw_events": data
        }
        
        return json_data, text

