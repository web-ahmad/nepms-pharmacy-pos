import sys
import os

# Add parent directory of scripts to path so we can import database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine
# Import all models so they register on Base.metadata
from models.base import BaseModel
from models.inventory import Medicine, Batch, StockMovement
from models.sales import Sale, SaleItem, SaleReturn, SaleReturnItem, CustomerPayment, CustomerLedger
from models.users import User, Branch, Tenant
from models.crm import Customer

print("Calling Base.metadata.create_all...")
Base.metadata.create_all(bind=engine)
print("Create_all completed successfully.")
