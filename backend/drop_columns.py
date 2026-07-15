import sqlite3

conn = sqlite3.connect('C:/Users/DEVJiX/Desktop/NEPMS/backend/nepms.db')
cursor = conn.cursor()

cols_po = [
    'warehouse_id', 'approved_by', 'approved_at', 'approval_status',
    'delivery_status', 'payment_status', 'purchase_priority', 'purchase_source',
    'reference_number', 'remarks'
]
cols_po_items = [
    'warehouse_id', 'pending_quantity', 'rejected_quantity', 'bonus_quantity',
    'discount_percentage', 'tax_percentage', 'expiry_required', 'batch_required'
]

for col in cols_po:
    try:
        cursor.execute(f"ALTER TABLE purchase_orders DROP COLUMN {col}")
    except Exception as e:
        pass

for col in cols_po_items:
    try:
        cursor.execute(f"ALTER TABLE po_items DROP COLUMN {col}")
    except Exception as e:
        pass

conn.commit()
conn.close()
