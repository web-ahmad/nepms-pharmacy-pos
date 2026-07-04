import sqlite3

def reset_inventory_tables():
    conn = sqlite3.connect('nepms_local.db')
    cursor = conn.cursor()
    
    # Disable foreign keys temporarily
    cursor.execute("PRAGMA foreign_keys = OFF;")
    
    # Drop tables
    tables_to_drop = [
        "medicine_substitutes",
        "packaging_levels",
        "batches",
        "medicines",
        "inventory_transactions",
        "stock_movements",
        "stock_adjustments",
        "grn_items",
        "grns",
        "audit_items",
        "audit_sessions",
        "purchase_order_items",
        "purchase_orders"
    ]
    
    for table in tables_to_drop:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table};")
            print(f"Dropped {table}")
        except Exception as e:
            print(f"Error dropping {table}: {e}")
            
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    conn.close()
    
    print("Dropped tables.")
    
    # Now recreate them
    from database import engine
    from models.base import BaseModel
    import models.inventory
    import models.packaging
    import models.purchase
    
    BaseModel.metadata.create_all(bind=engine)
    print("Recreated tables successfully.")

if __name__ == "__main__":
    reset_inventory_tables()
