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

import core.audit # Registers SQLAlchemy event listeners

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "NEPMS API is running."}
