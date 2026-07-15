import sqlite3
conn = sqlite3.connect('C:/Users/DEVJiX/Desktop/NEPMS/backend/nepms.db')
cursor = conn.cursor()
tables = [
    'purchase_approvals', 'purchase_receivings', 'purchase_receiving_items', 
    'purchase_requests', 'purchase_request_items', 'purchase_quotations', 
    'purchase_quotation_items', 'supplier_price_history', 'supplier_contracts', 
    'purchase_attachments'
]
for t in tables:
    try:
        cursor.execute(f"DROP TABLE IF EXISTS {t}")
    except Exception as e:
        pass
conn.commit()
conn.close()
