import sqlite3

def cascade_delete():
    conn = sqlite3.connect('nepms_local.db')
    cursor = conn.cursor()
    
    # Find all deleted pharmacies
    cursor.execute("SELECT id, name, tenant_id FROM pharmacies WHERE is_deleted = 1")
    pharmacies = cursor.fetchall()
    
    for p in pharmacies:
        pharmacy_id, name, tenant_id = p
        if tenant_id:
            print(f"Cascading delete for pharmacy: {name} (Tenant: {tenant_id})")
            
            # Deactivate tenant
            cursor.execute("UPDATE tenants SET is_active = 0 WHERE id = ?", (tenant_id,))
            
            # Deactivate and soft-delete users
            cursor.execute("UPDATE users SET is_active = 0, is_deleted = 1 WHERE tenant_id = ?", (tenant_id,))
            
            # Soft-delete branches
            cursor.execute("UPDATE branches SET is_deleted = 1 WHERE tenant_id = ?", (tenant_id,))
            
    conn.commit()
    conn.close()
    print("Cleanup completed successfully.")

if __name__ == "__main__":
    cascade_delete()
