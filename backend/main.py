
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os
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
    title="Pharvix Backend",
    description="Next-Generation Enterprise Pharmacy Management System API\n\nThis API powers the POS terminal, Inventory Manager, and overall CRM of the Pharmacy system.",
    version="1.0.0",
    openapi_tags=tags_metadata
)

app.add_middleware(ExceptionMiddleware)

# Configure CORS
# Extra browser origins allowed to call the API, comma-separated, e.g.
# CORS_ORIGINS=https://pharvix.devjix.com
# In the docker-compose deployment nginx serves the app and the API from one
# origin, so requests are same-origin and this list stays empty. It only matters
# if the frontend is ever hosted somewhere else.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
] + [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

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

# WhatsApp Bot endpoint (called by the Baileys Node service)
from api.v1.endpoints.whatsapp_bot import router as bot_router
app.include_router(bot_router, prefix="/api/v1")

storage_path = os.path.join(os.getcwd(), "storage")
os.makedirs(storage_path, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_path), name="storage")


@app.on_event("startup")
async def startup_event():
    from core.sync import run_historical_sync
    run_historical_sync()

    # Auto-create audit tables (AuditEvent, AlertHistory, CameraSnapshot, AlertConfig, WhatsAppBotLog)
    from models.audit import AuditEvent, AlertHistory, CameraSnapshot, AlertConfig, WhatsAppBotLog  # noqa – ensures registration
    # Enterprise multi-branch tables
    from models.enterprise.branch import PharmacyBranch, BranchStaffAssignment  # noqa
    # Enterprise user & identity tables (Phase 2)
    from models.enterprise.user import (  # noqa
        EnterpriseUser, EnterpriseRole, EnterprisePermission, EnterpriseRolePermission,
        BranchUserAssignment, UserSession, UserTrustedDevice,
        UserLoginHistory, UserActivityLog, UserApprovalRequest,
    )
    # Enterprise Branch Operations & Configuration (Phase 3)
    from models.enterprise.branch_configuration import (  # noqa
        BranchConfiguration, BranchWorkingHours, BranchHoliday,
        BranchWarehouse, BranchCounter, BranchPrinter, BranchDevice,
        BranchDocumentSeries, BranchTaxSetting, BranchPreference,
        BranchLicense, BranchFinancialAccount, BranchPaymentMethod,
        BranchNotificationSetting, BranchBranding, BranchPosConfig,
        BranchSecuritySetting, BranchBackupSetting,
        BranchConfigAuditLog, BranchHealthSnapshot,
    )
    from database import engine, Base
    Base.metadata.create_all(bind=engine, checkfirst=True)

    # Start the continuous Audit Listener for real-time alerts (Voids, Discounts, etc.)
    import asyncio
    from services.audit_listener import poll_audit_events, scan_inventory_flags
    asyncio.create_task(poll_audit_events(poll_interval=2.0))
    # Scan inventory for expired/near-expiry batches immediately, then every hour
    asyncio.create_task(scan_inventory_flags(scan_interval_seconds=3600.0))
    
    # Billing / Subscription Grace Period loop
    from services.billing_listener import start_billing_enforcement_loop
    asyncio.create_task(start_billing_enforcement_loop())
    
    # Initialize APScheduler for Cron Jobs
    try:
        # pyrefly: ignore [missing-import]
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

        # AI Autopilot — rozana subah 9 baje WhatsApp briefing (scan-wala WhatsApp)
        from services.autopilot_service import run_daily_briefings, run_expiry_auto_discounts
        scheduler.add_job(run_daily_briefings, 'cron', hour=9, minute=0)
        # AI Autopilot — rozana raat 1 baje expiry auto-discount lagana
        scheduler.add_job(run_expiry_auto_discounts, 'cron', hour=1, minute=0)

        # System module automation — hourly tick that performs each tenant's
        # scheduled backup / retention prune / log cleanup when its hour lands.
        from services.system_ops_service import run_system_automation
        scheduler.add_job(run_system_automation, 'cron', minute=5)

        scheduler.start()
        print("Background cron scheduler started (Risk Scores, Inventory Audit, Scheduled Reports, AI Briefing, Expiry Discounts, System Automation).")
    except ImportError:
        print("Warning: APScheduler is not installed. Background jobs will not run automatically. Run `pip install apscheduler` to enable.")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Pharvix API is running."}


@app.get("/health")
def health():
    """Liveness + database reachability, for the container healthcheck and nginx.

    Deliberately cheap: `SELECT 1` proves the pool can still hand out a working
    connection, which is the failure that actually takes the app down (Supabase
    drops idle connections, and its session pooler caps the whole project at 15
    clients). A process that is up but cannot reach Postgres should read as
    unhealthy, not healthy.
    """
    from sqlalchemy import text
    from database import SessionLocal

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "up"}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "down", "detail": str(exc)[:200]},
        )
    finally:
        db.close()
