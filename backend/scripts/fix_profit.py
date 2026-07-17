import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from core.config import settings
from models.sales import Sale, SaleItem
from models.inventory import Batch, Medicine

from database import SessionLocal

def run_migration():
    db = SessionLocal()

    print("Starting Profit Backfill Migration...")

    try:
        # Get all sales that have total_amount > 0 and (profit == 0 or profit is NULL)
        sales = db.query(Sale).filter(
            Sale.total_amount > 0,
            (Sale.profit == 0.0) | (Sale.profit == None)
        ).all()

        updated_count = 0

        for sale in sales:
            sale_profit = 0.0
            
            for item in sale.items:
                # Calculate cost_price if missing or 0
                if item.cost_price == 0.0 or item.cost_price is None:
                    if item.batch_id:
                        batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
                        if batch and batch.purchase_price:
                            item.cost_price = batch.purchase_price
                    
                    if item.cost_price == 0.0 or item.cost_price is None:
                        # Fallback to medicine's base cost
                        if item.medicine:
                            item.cost_price = item.medicine.cost_per_base_unit or 0.0
                        else:
                            item.cost_price = 0.0

                # Calculate item's gross profit
                # Formula: total - (cost_price * quantity) 
                # (since item.total is already: (unit_price * qty) - discount)
                item.gross_profit = item.total - (item.cost_price * item.quantity)
                
                if item.total > 0:
                    item.margin_percentage = (item.gross_profit / item.total) * 100
                else:
                    item.margin_percentage = 0.0

                sale_profit += item.gross_profit

            # Update sale header
            sale.profit = sale_profit
            updated_count += 1

        db.commit()
        print(f"Migration successful! Updated {updated_count} sales with recalculated profit.")

    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
