import sqlite3

conn = sqlite3.connect('backend/nepms_local.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('''
    SELECT 
        u.email, 
        r.name as legacy_role_name,
        eu.enterprise_role_id,
        er.name as enterprise_role_name,
        er.hierarchy_level
    FROM users u 
    LEFT JOIN roles r ON u.role_id = r.id 
    LEFT JOIN enterprise_users eu ON eu.user_id = u.id
    LEFT JOIN enterprise_roles er ON eu.enterprise_role_id = er.id
    WHERE u.email LIKE '%muneeb%' OR u.username LIKE '%muneeb%' OR u.full_name LIKE '%muneeb%';
''')

rows = cursor.fetchall()
for row in rows:
    print(f"Email: {row['email']}")
    print(f"Legacy Role: {row['legacy_role_name']}")
    print(f"Enterprise Role: {row['enterprise_role_name']} (Level {row['hierarchy_level']})")
    print("---")
