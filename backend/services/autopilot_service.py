"""
AI Autopilot — the pharmacy's automation & intelligence command center.

Everything here runs on REAL branch-scoped data:
  • predictive stock-out radar (which medicine runs short, and WHEN)
  • sales forecasting (linear trend + weekday seasonality)
  • expiry / dead-stock loss prediction
  • anomaly detection (voids, deep discounts)
  • smart automated action items
  • Gemini-generated executive insights (graceful heuristic fallback)
"""
import os
import json
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.config import settings
from models.sales import Sale, SaleItem
from models.inventory import Medicine, Batch

GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"]
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
EXCLUDED_SALE_STATUSES = ["Voided", "Void", "Held", "On Hold", "Pending Verification", "Draft", "Cancelled"]


# ── Gemini transport ────────────────────────────────────────────────────────────
def _gemini_key() -> str:
    return (getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY") or "").strip()


def call_gemini(prompt: str, *, json_mode: bool = True, timeout: int = 22) -> Optional[str]:
    key = _gemini_key()
    if not key:
        return None
    gen_cfg: Dict[str, Any] = {"temperature": 0.35, "maxOutputTokens": 2048}
    if json_mode:
        gen_cfg["responseMimeType"] = "application/json"
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gen_cfg}
    for model in GEMINI_MODELS:
        for auth in ({"params": {"key": key}}, {"headers": {"Authorization": f"Bearer {key}"}}):
            try:
                r = requests.post(GEMINI_URL.format(model=model), json=body, timeout=timeout, **auth)
                if r.status_code != 200:
                    continue
                parts = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts).strip()
                if text:
                    return text
            except Exception:
                continue
    return None


def _parse_json(text: Optional[str]) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        t = text.strip().strip("`")
        if t.startswith("json"):
            t = t[4:]
        s, e = t.find("{"), t.rfind("}")
        if s != -1 and e != -1:
            try:
                return json.loads(t[s:e + 1])
            except Exception:
                return None
    return None


# ── Shared query helpers ────────────────────────────────────────────────────────
def _sale_q(db, tenant_id, branch_id):
    q = db.query(Sale).filter(Sale.tenant_id == tenant_id, Sale.status.notin_(EXCLUDED_SALE_STATUSES))
    return q.filter(Sale.branch_id == branch_id) if branch_id else q


def daily_sales_series(db, tenant_id, branch_id, days=60) -> List[Dict[str, Any]]:
    start = datetime.utcnow().date() - timedelta(days=days - 1)
    rows = (_sale_q(db, tenant_id, branch_id)
            .filter(func.date(Sale.sale_date) >= start)
            .with_entities(func.date(Sale.sale_date).label("d"),
                           func.sum(Sale.total_amount).label("total"),
                           func.count(Sale.id).label("cnt"))
            .group_by(func.date(Sale.sale_date)).all())
    by_day = {str(r.d): (float(r.total or 0), int(r.cnt or 0)) for r in rows}
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        total, cnt = by_day.get(str(d), (0.0, 0))
        out.append({"date": str(d), "sales": round(total, 2), "invoices": cnt})
    return out


def forecast_sales(history, horizon=14) -> Dict[str, Any]:
    ys = [h["sales"] for h in history]
    n = len(ys)
    if n < 5 or sum(ys) == 0:
        return {"history": history, "forecast": [], "method": "insufficient-data", "predicted_total": 0.0, "trend": "flat", "avg_daily": 0}
    xs = list(range(n))
    mx, my = statistics.mean(xs), statistics.mean(ys)
    denom = sum((x - mx) ** 2 for x in xs) or 1
    slope = sum((xs[i] - mx) * (ys[i] - my) for i in range(n)) / denom
    intercept = my - slope * mx
    wd: Dict[int, List[float]] = {i: [] for i in range(7)}
    for h in history:
        wd[datetime.strptime(h["date"], "%Y-%m-%d").weekday()].append(h["sales"])
    overall = my or 1
    wd_mult = {k: (statistics.mean(v) / overall if v and overall else 1.0) for k, v in wd.items()}
    last = datetime.strptime(history[-1]["date"], "%Y-%m-%d").date()
    fc, total = [], 0.0
    for k in range(1, horizon + 1):
        base = intercept + slope * (n - 1 + k)
        d = last + timedelta(days=k)
        val = max(0.0, base * wd_mult.get(d.weekday(), 1.0))
        total += val
        fc.append({"date": str(d), "sales": round(val, 2), "predicted": True})
    trend = "rising" if slope > overall * 0.005 else "declining" if slope < -overall * 0.005 else "stable"
    return {"history": history, "forecast": fc, "method": "linear+seasonal",
            "predicted_total": round(total, 2), "trend": trend, "avg_daily": round(my, 2)}


def _velocity_map(db, tenant_id, branch_id, lookback=30) -> Dict[str, float]:
    start = datetime.utcnow().date() - timedelta(days=lookback)
    q = (db.query(SaleItem.medicine_id, func.sum(SaleItem.quantity).label("sold"))
         .join(Sale, Sale.id == SaleItem.sale_id)
         .filter(Sale.tenant_id == tenant_id, Sale.status.notin_(EXCLUDED_SALE_STATUSES),
                 func.date(Sale.sale_date) >= start))
    if branch_id:
        q = q.filter(Sale.branch_id == branch_id)
    return {r.medicine_id: float(r.sold or 0) / lookback for r in q.group_by(SaleItem.medicine_id).all()}


def _stock_for(db, med_id, branch_id) -> float:
    bq = db.query(func.coalesce(func.sum(Batch.current_quantity), 0)).filter(
        Batch.medicine_id == med_id, Batch.status == "Active", Batch.is_deleted == False)
    if branch_id:
        bq = bq.filter(Batch.branch_id == branch_id)
    return float(bq.scalar() or 0)


def stockout_radar(db, tenant_id, branch_id, lead_time=14, horizon=30, limit=25) -> List[Dict[str, Any]]:
    """Which medicines will run short — and the predicted stock-out date."""
    vel = _velocity_map(db, tenant_id, branch_id)
    today = datetime.utcnow().date()
    out = []
    for med in db.query(Medicine).filter(Medicine.id.in_(list(vel.keys()) or ["__none__"])).all():
        v = vel.get(med.id, 0)
        if v <= 0:
            continue
        stock = _stock_for(db, med.id, branch_id)
        days_left = round(stock / v, 1)
        stockout_date = today + timedelta(days=int(days_left))
        suggested = max(0, round(v * lead_time * 2 - stock))
        urgency = "critical" if days_left <= lead_time else "watch" if days_left <= lead_time * 2 else "ok"
        out.append({
            "medicine_id": med.id,
            "medicine": med.name, "velocity_per_day": round(v, 2), "current_stock": int(stock),
            "days_to_stockout": days_left, "stockout_date": str(stockout_date),
            "suggested_order_qty": suggested, "urgency": urgency,
        })
    out.sort(key=lambda x: x["days_to_stockout"])
    return out[:limit]


def expiry_forecast(db, tenant_id, branch_id, window=90) -> Dict[str, Any]:
    """Batches expiring soon + predicted un-sellable (waste) value."""
    today = datetime.utcnow().date()
    end = today + timedelta(days=window)
    vel = _velocity_map(db, tenant_id, branch_id, lookback=30)
    q = db.query(Batch).join(Medicine).filter(
        Batch.tenant_id == tenant_id, Batch.expiry_date >= today,
        Batch.expiry_date <= end, Batch.current_quantity > 0)
    if branch_id:
        q = q.filter(Batch.branch_id == branch_id)
    items, total_val, waste_val = [], 0.0, 0.0
    for b in q.order_by(Batch.expiry_date.asc()).all():
        days = (b.expiry_date - today).days
        cost = float(b.purchase_price or (b.medicine.cost_per_base_unit if b.medicine else 0) or 0)
        qty = float(b.current_quantity or 0)
        v = vel.get(b.medicine_id, 0)
        projected_sold = v * days
        waste_qty = max(0.0, qty - projected_sold)
        val = qty * cost
        total_val += val
        waste_val += waste_qty * cost
        if len(items) < 20:
            items.append({
                "medicine": b.medicine.name if b.medicine else "Unknown",
                "batch": b.batch_number, "qty": int(qty), "days_left": days,
                "expiry_date": str(b.expiry_date), "value": round(val, 2),
                "predicted_waste_qty": int(waste_qty),
                "risk": "high" if waste_qty > 0 and days <= 45 else "medium" if waste_qty > 0 else "low",
            })
    return {"items": items, "total_value_at_risk": round(total_val, 2),
            "predicted_waste_value": round(waste_val, 2), "window_days": window}


def anomalies(db, tenant_id, branch_id, days=7) -> List[Dict[str, Any]]:
    start = datetime.utcnow().date() - timedelta(days=days)
    base = _sale_q(db, tenant_id, branch_id).filter(func.date(Sale.sale_date) >= start)
    out = []
    voided = (db.query(func.count(Sale.id)).filter(
        Sale.tenant_id == tenant_id, Sale.status.in_(["Voided", "Void"]),
        func.date(Sale.sale_date) >= start))
    if branch_id:
        voided = voided.filter(Sale.branch_id == branch_id)
    vcount = int(voided.scalar() or 0)
    if vcount >= 3:
        out.append({"type": "voids", "severity": "high" if vcount >= 6 else "medium",
                    "message": f"Pichle {days} din me {vcount} sales void hui hain — cash leakage ke liye check karein."})
    deep = base.filter(Sale.discount_amount > 0, Sale.total_amount > 0,
                       Sale.discount_amount >= Sale.total_amount * 0.3).count()
    if deep >= 2:
        out.append({"type": "discounts", "severity": "medium",
                    "message": f"{deep} sales par 30% se zyada discount diya gaya — pricing override check karein."})
    return out


def _top_medicines(db, tenant_id, branch_id, days=30, limit=8):
    start = datetime.utcnow().date() - timedelta(days=days)
    q = (db.query(Medicine.name, func.sum(SaleItem.quantity).label("qty"), func.sum(SaleItem.total).label("rev"))
         .join(SaleItem, SaleItem.medicine_id == Medicine.id)
         .join(Sale, Sale.id == SaleItem.sale_id)
         .filter(Sale.tenant_id == tenant_id, Sale.status.notin_(EXCLUDED_SALE_STATUSES),
                 func.date(Sale.sale_date) >= start))
    if branch_id:
        q = q.filter(Sale.branch_id == branch_id)
    rows = q.group_by(Medicine.name).order_by(func.sum(SaleItem.total).desc()).limit(limit).all()
    return [{"name": r.name, "qty": int(r.qty or 0), "revenue": round(float(r.rev or 0), 2)} for r in rows]


def kpi_pulse(db, tenant_id, branch_id) -> Dict[str, Any]:
    today = datetime.utcnow().date()
    yest = today - timedelta(days=1)

    def day_total(d):
        q = _sale_q(db, tenant_id, branch_id).filter(func.date(Sale.sale_date) == d)
        return float(q.with_entities(func.coalesce(func.sum(Sale.total_amount), 0)).scalar() or 0), \
            int(q.with_entities(func.count(Sale.id)).scalar() or 0)

    ts, ti = day_total(today)
    ys, _ = day_total(yest)
    change = round(((ts - ys) / ys * 100), 1) if ys else (100.0 if ts else 0.0)

    low = db.query(func.count(Batch.id)).join(Medicine).filter(
        Batch.tenant_id == tenant_id, Batch.current_quantity > 0,
        Batch.current_quantity <= Medicine.min_stock_level)
    exp = db.query(func.count(Batch.id)).join(Medicine).filter(
        Batch.tenant_id == tenant_id, Batch.expiry_date >= today,
        Batch.expiry_date <= today + timedelta(days=30), Batch.current_quantity > 0)
    if branch_id:
        low = low.filter(Batch.branch_id == branch_id)
        exp = exp.filter(Batch.branch_id == branch_id)
    return {"today_sales": round(ts, 2), "today_invoices": ti, "vs_yesterday_pct": change,
            "low_stock_items": int(low.scalar() or 0), "expiring_30d": int(exp.scalar() or 0)}


# ── Context + Gemini insights ───────────────────────────────────────────────────
def build_context(db, tenant_id, branch_id) -> Dict[str, Any]:
    history = daily_sales_series(db, tenant_id, branch_id, days=30)
    fc = forecast_sales(history, 14)
    radar = stockout_radar(db, tenant_id, branch_id)
    exp = expiry_forecast(db, tenant_id, branch_id)
    return {
        "period_sales_30d": round(sum(h["sales"] for h in history), 2),
        "avg_daily_sales": fc["avg_daily"], "sales_trend": fc["trend"],
        "forecast_next_14d": fc["predicted_total"],
        "top_medicines": _top_medicines(db, tenant_id, branch_id),
        "medicines_running_short": [r for r in radar if r["urgency"] in ("critical", "watch")][:8],
        "predicted_waste_value": exp["predicted_waste_value"],
        "expiring_batches_90d": len(exp["items"]),
        "anomalies": anomalies(db, tenant_id, branch_id),
    }


def generate_insights(context) -> Dict[str, Any]:
    prompt = (
        "You are the AI Autopilot for a Pakistani pharmacy ERP. Analyse the JSON operations data and "
        "return ONLY a JSON object with keys: summary (1-2 sentences), insights (3-5 short data-backed "
        "points), recommendations (3-5 objects with 'title' and 'detail'), risks (2-4 short alerts), "
        "opportunities (2-4 short growth ideas). "
        "VERY IMPORTANT: Write EVERY string value in ROMAN URDU — that is, the Urdu language written using "
        "English/Latin letters (for example: 'Aap ki sales barh rahi hain, Panadol sab se zyada bik raha hai'). "
        "Use a simple, casual, friendly tone that a common Pakistani pharmacy owner can easily read. Do NOT use "
        "Arabic/Urdu script and do NOT use pure English sentences. Keep numbers, medicine names and currency "
        "(Rs) as they are. JSON keys must stay in English.\n"
        f"DATA:\n{json.dumps(context, default=str)}"
    )
    parsed = _parse_json(call_gemini(prompt))
    if parsed and isinstance(parsed, dict) and parsed.get("summary"):
        parsed["source"] = "gemini"
    else:
        parsed = _heuristic(context)
        parsed["source"] = "heuristic"
    parsed["generated_at"] = datetime.utcnow().isoformat()
    return parsed


def _heuristic(ctx) -> Dict[str, Any]:
    # Roman-Urdu fallback so the module always speaks the owner's language.
    top = ctx.get("top_medicines", [])
    short = ctx.get("medicines_running_short", [])
    trend = ctx.get("sales_trend", "stable")
    trend_ur = {"rising": "barh rahi hai", "declining": "kam ho rahi hai", "stable": "stable hai"}.get(trend, "stable hai")
    insights, recs, risks, opps = [], [], [], []
    insights.append(f"Pichle 30 din me sales Rs {ctx.get('period_sales_30d', 0):,.0f} rahi "
                    f"(rozana avg Rs {ctx.get('avg_daily_sales', 0):,.0f}), trend {trend_ur}.")
    if top:
        insights.append(f"Sab se zyada bikne wali dawa: {top[0]['name']} (Rs {top[0]['revenue']:,.0f}).")
    insights.append(f"Agle 14 din ki sales ka andaza: Rs {ctx.get('forecast_next_14d', 0):,.0f}.")
    for s in short[:3]:
        risks.append(f"{s['medicine']} lagbhag {s['days_to_stockout']} din me khatam ho jayegi "
                     f"(~{s['stockout_date']}) — takreeban {s['suggested_order_qty']} order kar lein.")
    if short:
        recs.append({"title": "Fast-moving dawaiyan mangwa lein",
                     "detail": f"{len(short)} item(s) khatam hone wali hain — abhi purchase order banayein."})
    if ctx.get("predicted_waste_value", 0) > 0:
        risks.append(f"Takreeban Rs {ctx['predicted_waste_value']:,.0f} ka stock expire ho sakta hai — clearance chalayein.")
        recs.append({"title": "Expiry wala stock clear karein",
                     "detail": "Near-expiry batches par discount/bundle laga kar paisa recover karein."})
    for a in ctx.get("anomalies", []):
        risks.append(a["message"])
    opps.append("Sales barh rahi hai — top categories ka stock aur barha lein." if trend == "rising"
                else "Sales kam ho rahi hai — loyalty ya WhatsApp campaign chala kar customers wapas layein." if trend == "declining"
                else "Sales stable hai — targeted promotion se aur barha sakte hain.")
    if top:
        opps.append(f"Counter par {top[0]['name']} ke saath related items cross-sell karein.")
    recs.append({"title": "Reorder level theek karein",
                 "detail": "Buffer stock ko sales speed ke hisaab se set karein taake na stock khatam ho na dead stock bane."})
    return {"summary": f"Aap ki business {trend_ur}; 30 din me Rs {ctx.get('period_sales_30d', 0):,.0f} ki sales, "
                       f"agle 2 hafton ka andaza Rs {ctx.get('forecast_next_14d', 0):,.0f}.",
            "insights": insights, "recommendations": recs, "risks": risks, "opportunities": opps}


def _pak_season(month: int) -> Dict[str, Any]:
    """Pakistan ki season aur us ki typical medical demand (Roman Urdu)."""
    if month in (12, 1, 2):
        return {"season": "Sardi (Winter)",
                "focus": ["Khaansi/zukam syrups", "Flu & bukhaar (Panadol)", "Antibiotics (chest infection)",
                          "Vitamin C / immunity", "Inhalers (asthma)"]}
    if month in (3, 4, 5):
        return {"season": "Bahaar / Allergy (Spring)",
                "focus": ["Anti-allergy (Rigix, Softin)", "Eye/nose allergy drops", "Antihistamines",
                          "Skin allergy creams", "Asthma/inhalers"]}
    if month in (6, 7, 8):
        return {"season": "Garmi / Barsaat (Summer & Monsoon)",
                "focus": ["ORS / dehydration", "Anti-diarrheal (Flagyl, Imodium)", "Gastro antibiotics",
                          "Typhoid / bukhaar (Panadol)", "Skin/fungal creams", "Loo/heatstroke items"]}
    return {"season": "Khizaan / Dengue (Autumn)",
            "focus": ["Panadol (dengue bukhaar)", "ORS & fluids", "Platelet support / papaya leaf",
                      "Viral fever items", "Mosquito repellents", "CBC-related support"]}


def market_analysis(db, tenant_id, branch_id) -> Dict[str, Any]:
    """Pakistan pharmacy market analysis: konsi medicine market me zyada chal rahi hai,
    aap ke apne data se gap, aur 'kya karna hoga' plan. Gemini se (fallback heuristic)."""
    month = datetime.utcnow().month
    season = _pak_season(month)
    own_top = _top_medicines(db, tenant_id, branch_id, days=45, limit=10)
    own_names = [m["name"] for m in own_top]

    # Full-ish inventory name list (for gap analysis).
    inv_q = db.query(Medicine.name).filter(Medicine.tenant_id == tenant_id)
    inv_names = [n[0] for n in inv_q.limit(120).all()]

    prompt = (
        "You are a senior pharmaceutical MARKET analyst for PAKISTAN. Using your knowledge of the Pakistani "
        "retail pharmacy market and the current season, produce a market analysis. "
        f"Current month: {month} ({season['season']}). Seasonal high-demand areas: {season['focus']}. "
        f"This pharmacy's own top sellers (last 45 days): {own_names}. "
        f"This pharmacy's stocked medicines (sample): {inv_names[:80]}. "
        "Return ONLY a JSON object with keys: "
        "summary (1-2 sentences), "
        "top_market_medicines (array of 6-10 objects: 'name', 'category', 'demand' one of high/medium, 'reason'), "
        "seasonal_demand (array of 3-5 objects: 'category', 'note'), "
        "stock_gap (array of 4-8 medicine/category names that are HOT in the Pakistan market right now but "
        "are MISSING or weak in this pharmacy's stocked list — be specific), "
        "action_plan (array of 4-6 objects: 'title', 'detail' — exactly what the owner should DO: kya stock karein, "
        "kitni quantity, pricing, promotion). "
        "VERY IMPORTANT: write EVERY string value in ROMAN URDU (Urdu in English letters), simple casual tone. "
        "Keep medicine/brand names and Rs as-is. JSON keys stay English."
    )
    parsed = _parse_json(call_gemini(prompt))
    if parsed and isinstance(parsed, dict) and parsed.get("top_market_medicines"):
        parsed["source"] = "gemini"
        parsed["season"] = season["season"]
        parsed["generated_at"] = datetime.utcnow().isoformat()
        return parsed
    return _market_heuristic(season, own_names, inv_names)


# Well-known consistently high-demand Pakistan retail pharmacy items (brand — category).
_PAK_TOP = [
    ("Panadol", "Bukhaar / Dard (Paracetamol)", "high", "Har mausam me sab se zyada bikta hai, dengue/flu me demand aur barh jaati hai."),
    ("Augmentin", "Antibiotic (Amoxicillin+Clav)", "high", "Chest & throat infections ke liye doctors sab se zyada likhte hain."),
    ("Brufen", "Dard / Sozish (Ibuprofen)", "high", "Body pain, periods aur injury me aam istemal."),
    ("Risek / Nexum", "Meday ki tezabiyat (Omeprazole)", "high", "Gastric/acidity Pakistan me bahut aam masla hai."),
    ("Flagyl", "Anti-diarrheal (Metronidazole)", "high", "Barsaat/garmi me pait kharabi aur loose motions me demand."),
    ("ORS / Peditral", "Dehydration salts", "high", "Garmi aur gastro me foran zaroorat parti hai."),
    ("Rigix / Softin", "Anti-allergy (Cetirizine)", "medium", "Allergy aur zukam me consistent demand."),
    ("Ponstan", "Dard (Mefenamic acid)", "medium", "Period pain aur bukhaar me aam."),
    ("Glucophage", "Sugar / Diabetes (Metformin)", "high", "Pakistan me diabetes patients bahut — regular repeat sale."),
    ("Disprol / Calpol", "Bachon ka bukhaar (Paracetamol syrup)", "high", "Bachon ke bukhaar me har ghar ki zaroorat."),
]


def _market_heuristic(season, own_names, inv_names) -> Dict[str, Any]:
    inv_lower = " ".join(inv_names).lower()
    top = [{"name": n, "category": c, "demand": d, "reason": r} for (n, c, d, r) in _PAK_TOP]
    # Gap = market-hot items jo inventory me nazar nahi aate.
    gap = []
    for (n, c, d, r) in _PAK_TOP:
        key = n.split(" ")[0].lower()
        if key not in inv_lower:
            gap.append(f"{n} — {c}")
    for f in season["focus"]:
        gap.append(f"{f} (season ki demand)")
    gap = gap[:8]

    seasonal = [{"category": f, "note": "Is mausam me demand zyada — stock poora rakhein."} for f in season["focus"][:5]]
    action = [
        {"title": "Season ka stock barha lein",
         "detail": f"{season['season']} me {', '.join(season['focus'][:3])} ki demand zyada hoti hai — inhe kam na hone dein."},
        {"title": "Market ke top-sellers rakhein",
         "detail": "Panadol, Augmentin, Brufen, Risek, ORS, Flagyl jaise fast-moving items hamesha available rakhein."},
        {"title": "Gap wali items mangwayein",
         "detail": "Jo cheezein market me chal rahi hain lekin aap ke paas nahi — supplier se turant order karein."},
        {"title": "Bundle & counter display",
         "detail": "Bukhaar ke saath ORS/vitamin, gastric ke saath ORS — counter par saath rakhein taake extra sale ho."},
        {"title": "Pricing competitive rakhein",
         "detail": "Fast-moving items ki price aas-paas ki dukaano ke barabar rakhein taake customer na jaye."},
    ]
    return {
        "source": "heuristic", "season": season["season"],
        "summary": f"{season['season']} chal raha hai — Pakistan market me Panadol, antibiotics, gastric aur "
                   f"season wali dawaiyon ki demand sab se zyada hai. Neeche apne stock ka gap aur plan dekhein.",
        "top_market_medicines": top, "seasonal_demand": seasonal,
        "stock_gap": gap, "action_plan": action,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── Expiry Auto-Discount Engine (reversible) ────────────────────────────────────
# Default rules: (din_baqi <= X)  →  discount %.  Smallest bracket wins.
DEFAULT_EXPIRY_RULES = [(15, 35), (30, 20), (45, 10)]


def _discount_for(days_left: int, rules) -> float:
    best = 0.0
    for threshold, disc in sorted(rules, key=lambda x: x[0]):
        if days_left <= threshold:
            best = max(best, float(disc))
    # smallest bracket = biggest discount → pick the max applicable
    applicable = [float(d) for (th, d) in rules if days_left <= th]
    return max(applicable) if applicable else 0.0


def _near_expiry_batches(db, tenant_id, branch_id, max_days):
    today = datetime.utcnow().date()
    q = db.query(Batch).join(Medicine).filter(
        Batch.tenant_id == tenant_id, Batch.current_quantity > 0,
        Batch.status == "Active", Batch.is_deleted == False,
        Batch.expiry_date >= today, Batch.expiry_date <= today + timedelta(days=max_days))
    if branch_id:
        q = q.filter(Batch.branch_id == branch_id)
    return q.order_by(Batch.expiry_date.asc()).all()


def expiry_discount_plan(db, tenant_id, branch_id, rules=None) -> Dict[str, Any]:
    """Preview: konsi batch par kitna discount lagega (koi change nahi karta)."""
    rules = rules or DEFAULT_EXPIRY_RULES
    max_days = max(t for t, _ in rules)
    today = datetime.utcnow().date()
    items = []
    for b in _near_expiry_batches(db, tenant_id, branch_id, max_days):
        days = (b.expiry_date - today).days
        disc = _discount_for(days, rules)
        if disc <= 0:
            continue
        base = b.original_selling_price if b.original_selling_price else b.selling_price
        new_price = round(base * (1 - disc / 100), 2)
        items.append({
            "batch_id": b.id, "medicine": b.medicine.name if b.medicine else "Unknown",
            "batch": b.batch_number, "qty": int(b.current_quantity or 0), "days_left": days,
            "expiry_date": str(b.expiry_date), "old_price": round(base, 2), "new_price": new_price,
            "discount_pct": disc, "already_applied": abs((b.auto_discount_percentage or 0) - disc) < 0.01,
        })
    return {"rules": rules, "items": items, "count": len(items)}


def apply_expiry_discounts(db, tenant_id, branch_id, rules=None) -> Dict[str, Any]:
    """Apply karta hai: near-expiry batches par markdown lagata hai, aur jo ab
    near-expiry nahi rahi unki price wapas original par le aata hai (reversible)."""
    rules = rules or DEFAULT_EXPIRY_RULES
    max_days = max(t for t, _ in rules)
    today = datetime.utcnow().date()
    applied, reverted = 0, 0

    # 1) Apply / update on near-expiry batches.
    target_ids = set()
    for b in _near_expiry_batches(db, tenant_id, branch_id, max_days):
        days = (b.expiry_date - today).days
        disc = _discount_for(days, rules)
        if disc <= 0:
            continue
        target_ids.add(b.id)
        if not b.original_selling_price:
            b.original_selling_price = b.selling_price
        base = b.original_selling_price or 0.0
        new_price = round(base * (1 - disc / 100), 2)
        if b.unit_selling_price != new_price or (b.auto_discount_percentage or 0) != disc:
            b.unit_selling_price = new_price
            b.auto_discount_percentage = disc
            applied += 1

    # 2) Revert batches previously discounted but no longer in the window.
    prev = db.query(Batch).filter(Batch.tenant_id == tenant_id,
                                  Batch.auto_discount_percentage > 0)
    if branch_id:
        prev = prev.filter(Batch.branch_id == branch_id)
    for b in prev.all():
        if b.id in target_ids:
            continue
        if b.original_selling_price is not None:
            b.unit_selling_price = b.original_selling_price
        b.auto_discount_percentage = 0.0
        b.original_selling_price = None
        reverted += 1

    db.commit()
    return {"applied": applied, "reverted": reverted}


def run_expiry_auto_discounts():
    """Scheduler job (rozana): har branch par expiry auto-discount lagata hai."""
    from database import SessionLocal
    from models.users import Branch
    db = SessionLocal()
    try:
        for b in db.query(Branch).filter(Branch.is_deleted == False).all():
            try:
                apply_expiry_discounts(db, b.tenant_id, b.id)
            except Exception as e:
                print(f"[expiry-discount] branch {getattr(b,'id','?')} failed: {e}")
    finally:
        db.close()


# ── Rozana WhatsApp Briefing (Baileys / scan-based WhatsApp) ────────────────────
def briefing_number(db, branch_id: str) -> Optional[str]:
    """Same source as Audit Center: branch preference 'whatsapp_alert_number',
    warna TEST_WHATSAPP_NUMBER."""
    num = None
    try:
        from models.enterprise.branch_configuration import BranchPreference
        pref = db.query(BranchPreference).filter_by(branch_id=branch_id, pref_key="whatsapp_alert_number").first()
        if pref and pref.pref_value:
            num = pref.pref_value
    except Exception:
        pass
    if not num:
        num = os.getenv("TEST_WHATSAPP_NUMBER") or getattr(settings, "TEST_WHATSAPP_NUMBER", None)
    return num


def build_daily_briefing(db, tenant_id, branch_id, pharmacy_name: str = "") -> str:
    """Roman-Urdu daily WhatsApp summary — sales, kya khatam ho raha, expiry, aaj kya karna."""
    pulse = kpi_pulse(db, tenant_id, branch_id)
    history = daily_sales_series(db, tenant_id, branch_id, days=30)
    fc = forecast_sales(history, 7)
    radar = stockout_radar(db, tenant_id, branch_id)
    crit = [r for r in radar if r["urgency"] == "critical"]
    watch = [r for r in radar if r["urgency"] == "watch"]
    exp = expiry_forecast(db, tenant_id, branch_id)
    today = datetime.utcnow().strftime("%d %b %Y")
    arrow = "📈" if pulse["vs_yesterday_pct"] >= 0 else "📉"

    lines = []
    lines.append("🤖 *AI Autopilot — Rozana Report*")
    lines.append(f"🏥 {pharmacy_name or 'Aap ki Pharmacy'} · 🗓️ {today}")
    lines.append("")
    lines.append(f"💰 *Aaj ki sales:* Rs {pulse['today_sales']:,.0f}  ({pulse['today_invoices']} invoices)")
    lines.append(f"{arrow} Kal se: {pulse['vs_yesterday_pct']:+.0f}%")
    lines.append(f"🔮 Agle 7 din ka andaza: Rs {fc['predicted_total']:,.0f} ({ 'barh rahi' if fc['trend']=='rising' else 'kam ho rahi' if fc['trend']=='declining' else 'stable' })")
    lines.append("")

    if crit:
        lines.append("⚠️ *Jald khatam hone wali dawaiyan:*")
        for r in crit[:5]:
            lines.append(f"• {r['medicine']} — {r['days_to_stockout']} din ( ~{r['suggested_order_qty']} mangwayein )")
    else:
        lines.append("✅ Koi dawa foran khatam hone wali nahi.")
    if watch:
        lines.append(f"👀 {len(watch)} aur dawaiyan nazar me rakhein.")
    lines.append("")

    if exp["predicted_waste_value"] > 0:
        lines.append(f"⏳ *Expiry khatra:* ~Rs {exp['predicted_waste_value']:,.0f} ka stock expire ho sakta hai — clearance chalayein.")
    if pulse["low_stock_items"]:
        lines.append(f"📦 {pulse['low_stock_items']} items reorder level se neeche hain.")
    lines.append("")
    lines.append("👉 *Aaj ka kaam:* " + (
        f"{len(crit)} zaroori dawaiyan order karein." if crit
        else "Expiry wala stock clear karein." if exp["predicted_waste_value"] > 0
        else "Sab control me hai — top-sellers ka stock poora rakhein."))
    lines.append("")
    lines.append("_NEPMS AI Autopilot_")
    return "\n".join(lines)


async def send_daily_briefing(db, tenant_id, branch_id, pharmacy_name: str = "", phone: str = None, owner_id: str = "system") -> Dict[str, Any]:
    from services.whatsapp_api import send_whatsapp_alert
    number = phone or briefing_number(db, branch_id)
    if not number:
        return {"sent": False, "reason": "WhatsApp number set nahi hai. Audit Center me whatsapp_alert_number set karein."}
    text = build_daily_briefing(db, tenant_id, branch_id, pharmacy_name)
    ok = await send_whatsapp_alert(f"briefing-{datetime.utcnow().date()}", owner_id, number, text)
    return {"sent": bool(ok), "number": number}


def run_daily_briefings():
    """Scheduler job (9am): har branch ke liye rozana briefing bhejta hai."""
    import asyncio
    from database import SessionLocal
    from models.users import Branch, Tenant
    db = SessionLocal()
    try:
        branches = db.query(Branch).filter(Branch.is_deleted == False).all()
        for b in branches:
            try:
                tenant = db.query(Tenant).filter(Tenant.id == b.tenant_id).first()
                pname = getattr(tenant, "name", "") if tenant else ""
                if not briefing_number(db, b.id):
                    continue
                asyncio.run(send_daily_briefing(db, b.tenant_id, b.id, pname))
            except Exception as e:
                print(f"[briefing] branch {getattr(b,'id','?')} failed: {e}")
    finally:
        db.close()


def smart_actions(db, tenant_id, branch_id) -> List[Dict[str, Any]]:
    """Concrete automated to-dos the owner can act on immediately."""
    actions = []
    radar = stockout_radar(db, tenant_id, branch_id)
    crit = [r for r in radar if r["urgency"] == "critical"]
    if crit:
        actions.append({"kind": "reorder", "priority": "high", "icon": "package",
                        "title": f"{len(crit)} zaroori dawaiyan mangwa lein",
                        "detail": f"{', '.join(r['medicine'] for r in crit[:3])}"
                                  + (" …" if len(crit) > 3 else "") + " jald khatam hone wali hain.",
                        "cta": "Purchase Order banayein", "href": "/purchase/orders/new"})
    exp = expiry_forecast(db, tenant_id, branch_id)
    if exp["predicted_waste_value"] > 0:
        actions.append({"kind": "expiry", "priority": "medium", "icon": "clock",
                        "title": f"Rs {exp['predicted_waste_value']:,.0f} expiry ke khatre me",
                        "detail": f"{len(exp['items'])} batch 90 din me expire ho rahi hain.",
                        "cta": "Inventory dekhein", "href": "/inventory"})
    for a in anomalies(db, tenant_id, branch_id):
        actions.append({"kind": a["type"], "priority": a["severity"], "icon": "alert",
                        "title": "Ghair-mamooli activity", "detail": a["message"],
                        "cta": "Audit Center kholein", "href": "/audit"})
    watch = [r for r in radar if r["urgency"] == "watch"]
    if watch:
        actions.append({"kind": "watch", "priority": "low", "icon": "trending",
                        "title": f"{len(watch)} dawaiyan nazar me rakhein",
                        "detail": "Yeh agle kuch hafton me khatam ho sakti hain.",
                        "cta": "Low Stock dekhein", "href": "/inventory/low-stock"})
    return actions
