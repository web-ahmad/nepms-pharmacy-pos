from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from services.risk_service import calculate_weekly_risk_scores
from services.audit_report_service import AuditReportGenerator

router = APIRouter()

ALLOWED_REPORTS = ["staff_risk", "void_discount", "cash_reconciliation", "inventory_shrinkage", "expiry"]

@router.post("/risk-scores/calculate")
def trigger_risk_score_calculation(background_tasks: BackgroundTasks):
    """
    Manually triggers the weekly risk score calculation job.
    Runs in the background to avoid blocking the HTTP response.
    """
    background_tasks.add_task(calculate_weekly_risk_scores)
    return {"status": "success", "message": "Risk score calculation triggered in the background."}

@router.get("/reports/{report_type}")
def get_audit_report(
    report_type: str,
    branch_id: str = Query(..., description="Branch UUID"),
    period: str = Query("daily", description="Period: daily, weekly, monthly")
):
    """
    Returns the JSON payload for a pre-built audit report.
    """
    if report_type not in ALLOWED_REPORTS:
        raise HTTPException(status_code=400, detail=f"Invalid report_type. Allowed: {ALLOWED_REPORTS}")
        
    generator = AuditReportGenerator(branch_id=branch_id, period=period)
    
    if report_type == "staff_risk":
        json_data, _ = generator.generate_staff_risk_report()
    elif report_type == "void_discount":
        json_data, _ = generator.generate_void_discount_report()
    elif report_type == "cash_reconciliation":
        json_data, _ = generator.generate_cash_reconciliation_report()
    elif report_type == "inventory_shrinkage":
        json_data, _ = generator.generate_inventory_shrinkage_report()
    elif report_type == "expiry":
        json_data, _ = generator.generate_expiry_report()
        
    return json_data
