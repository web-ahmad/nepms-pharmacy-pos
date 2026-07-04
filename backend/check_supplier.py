import sqlite3

conn = sqlite3.connect(r'c:\Users\DEVJiX\Desktop\New folder\backend\nepms_local.db')
c = conn.cursor()
print("---- MEDICINES ----")
c.execute("SELECT id, name, min_stock_level FROM medicines ORDER BY name LIMIT 10")
for r in c.fetchall():
    print(r)

print("\n---- BATCHES with SUPPLIERS ----")
c.execute("SELECT medicine_id, batch_number, current_quantity, supplier_id FROM batches WHERE supplier_id IS NOT NULL")
for r in c.fetchall():
    print(r)

print("\n---- SUPPLIERS ----")
c.execute("SELECT id, name FROM suppliers")
for r in c.fetchall():
    print(r)

print("\n---- TOTAL STOCK ----")
c.execute("SELECT medicine_id, SUM(current_quantity) FROM batches GROUP BY medicine_id LIMIT 10")
for r in c.fetchall():
    print(r)
