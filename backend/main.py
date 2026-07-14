from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import traceback

class ExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            err = traceback.format_exc()
            with open("backend_error.log", "a") as f:
                f.write(err + "\n")
            return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(e)})

from api.v1.api import api_router



tags_metadata = [
    {"name": "Authentication", "description": "Operations with users and login logic."},
    {"name": "Inventory", "description": "Manage medicines, batches, stock adjustments, and low-stock alerts."},
    {"name": "Purchase", "description": "Supplier management, Purchase Orders, GRNs, Invoices, and Payments."},
    {"name": "Sales", "description": "POS checkout, held sales, returns, and customer ledgers."},
    {"name": "Dashboard", "description": "Metrics and analytics for system overview."},
]

app = FastAPI(
    title="NEPMS Backend",
    description="Next-Generation Enterprise Pharmacy Management System API\n\nThis API powers the POS terminal, Inventory Manager, and overall CRM of the Pharmacy system.",
    version="1.0.0",
    openapi_tags=tags_metadata
)

app.add_middleware(ExceptionMiddleware)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

app.include_router(api_router, prefix="/api/v1")

storage_path = os.path.join(os.getcwd(), "storage")
os.makedirs(storage_path, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_path), name="storage")


@app.on_event("startup")
def startup_event():
    from core.sync import run_historical_sync
    run_historical_sync()
    
    # Initialize APScheduler for Cron Jobs
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from services.risk_service import calculate_weekly_risk_scores
        from services.nightly_inventory_audit import run_nightly_inventory_audit
        from services.scheduled_reports_service import run_scheduled_reports_sync
        
        scheduler = BackgroundScheduler()
        # Run every Monday at 6:00 AM
        scheduler.add_job(calculate_weekly_risk_scores, 'cron', day_of_week='mon', hour=6, minute=0)
        
        # Run every night at midnight (00:00)
        scheduler.add_job(run_nightly_inventory_audit, 'cron', hour=0, minute=0)
        
        # Run at the top of every hour to dispatch user-configured scheduled reports
        scheduler.add_job(run_scheduled_reports_sync, 'cron', minute=0)
        
        scheduler.start()
        print("Background cron scheduler started (Risk Scores, Inventory Audit, Scheduled Reports).")
    except ImportError:
        print("Warning: APScheduler is not installed. Background jobs will not run automatically. Run `pip install apscheduler` to enable.")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "NEPMS API is running."}
