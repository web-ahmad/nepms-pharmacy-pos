from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from database import get_db
from core.deps import get_current_user
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
from services import autopilot_service as ap

router = APIRouter()


@router.get("/pulse")
def get_pulse(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return {"status": "success", "data": ap.kpi_pulse(db, scope.tenant_id, scope.branch_id)}


@router.get("/forecast")
def get_forecast(horizon: int = 14, db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    history = ap.daily_sales_series(db, scope.tenant_id, scope.branch_id, days=60)
    return {"status": "success", "data": ap.forecast_sales(history, max(7, min(horizon, 60)))}


@router.get("/stockout-radar")
def get_stockout_radar(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return {"status": "success", "data": ap.stockout_radar(db, scope.tenant_id, scope.branch_id)}


@router.get("/expiry-forecast")
def get_expiry_forecast(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return {"status": "success", "data": ap.expiry_forecast(db, scope.tenant_id, scope.branch_id)}


@router.get("/smart-actions")
def get_smart_actions(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return {"status": "success", "data": ap.smart_actions(db, scope.tenant_id, scope.branch_id)}


@router.get("/insights")
def get_insights(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    ctx = ap.build_context(db, scope.tenant_id, scope.branch_id)
    return {"status": "success", "context": ctx, "ai": ap.generate_insights(ctx)}


@router.get("/market-analysis")
def get_market_analysis(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Pakistan pharmacy market analysis — konsi medicine market me zyada chal rahi hai,
    aap ke stock ka gap, aur kya karna hoga (Roman Urdu)."""
    return {"status": "success", "data": ap.market_analysis(db, scope.tenant_id, scope.branch_id)}


@router.post("/auto-po")
def create_auto_po(
    include_watch: bool = Body(True, embed=True),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user = Depends(get_current_user),
):
    """One-click: stock-out radar ke critical (aur optionally watch) items ke liye
    supplier-wise DRAFT purchase orders khud bana deta hai."""
    from services.purchase_service import PurchaseService
    branch_id = scope.branch_id
    radar = ap.stockout_radar(db, scope.tenant_id, branch_id)
    levels = {"critical", "watch"} if include_watch else {"critical"}
    med_ids = [r["medicine_id"] for r in radar if r["urgency"] in levels]
    if not med_ids:
        return {"status": "success", "created": [], "message": "Abhi koi item order karne wali nahi — sab theek hai."}

    pos = PurchaseService.bulk_draft_po(db, med_ids, scope.tenant_id, branch_id, current_user.id)
    created = [{
        "id": po.id, "order_number": po.order_number,
        "supplier": po.supplier.name if po.supplier else "Unknown",
        "items": len(po.items), "total_amount": po.total_amount,
    } for po in pos]
    skipped = len(med_ids) - sum(c["items"] for c in created)
    return {"status": "success", "created": created, "requested_items": len(med_ids),
            "skipped_no_supplier": max(0, skipped),
            "message": f"{len(created)} draft PO ban gaye ({len(med_ids)} items me se). Purchase Orders me review kar ke approve karein."}


def _pharmacy_name(db, tenant_id):
    try:
        from models.users import Tenant
        t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        return getattr(t, "name", "") if t else ""
    except Exception:
        return ""


@router.get("/briefing/preview")
def briefing_preview(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Rozana WhatsApp briefing ka text preview + kis number par jayega."""
    text = ap.build_daily_briefing(db, scope.tenant_id, scope.branch_id, _pharmacy_name(db, scope.tenant_id))
    return {"status": "success", "text": text, "number": ap.briefing_number(db, scope.branch_id)}


@router.post("/briefing/send")
async def briefing_send(
    phone: str = Body(None, embed=True),
    db: Session = Depends(get_db),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
    current_user = Depends(get_current_user),
):
    """Abhi WhatsApp par briefing bhej dein (scan-wala WhatsApp — Audit Center wala hi)."""
    res = await ap.send_daily_briefing(db, scope.tenant_id, scope.branch_id,
                                       _pharmacy_name(db, scope.tenant_id), phone=phone, owner_id=current_user.id)
    return {"status": "success", **res}


@router.get("/expiry-discount/preview")
def expiry_discount_preview(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Preview: near-expiry batches par kitna auto-discount lagega (koi change nahi)."""
    return {"status": "success", "data": ap.expiry_discount_plan(db, scope.tenant_id, scope.branch_id)}


@router.post("/expiry-discount/apply")
def expiry_discount_apply(db: Session = Depends(get_db), scope: PharmacyScope = Depends(get_pharmacy_scope),
                          current_user = Depends(get_current_user)):
    """Apply: near-expiry batches par markdown laga deta hai (reversible). POS khud
    kam price par bechega. Jo batches ab near-expiry nahi, unki price wapas ho jati hai."""
    res = ap.apply_expiry_discounts(db, scope.tenant_id, scope.branch_id)
    return {"status": "success", **res,
            "message": f"{res['applied']} batches par discount laga, {res['reverted']} wapas normal huin."}
