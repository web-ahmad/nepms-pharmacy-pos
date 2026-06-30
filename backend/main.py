from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "NEPMS API is running."}
