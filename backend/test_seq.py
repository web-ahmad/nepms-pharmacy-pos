import sqlite3

conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()

# Get all invoice numbers
cursor.execute("SELECT invoice_number FROM sales WHERE invoice_number LIKE 'INV-%'")
existing_invoices = cursor.fetchall()

max_num = 0
for (inv_num,) in existing_invoices:
    try:
        num_part = inv_num.replace('INV-', '').strip()
        if num_part.isdigit():
            max_num = max(max_num, int(num_part))
    except Exception:
        pass

next_seq = max_num + 1
invoice_num = f"INV-{next_seq:02d}"

print("Existing invoices count:", len(existing_invoices))
print("Max num found:", max_num)
print("Next invoice generated:", invoice_num)

conn.close()
