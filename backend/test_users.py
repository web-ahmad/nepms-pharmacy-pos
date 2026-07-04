import requests
import sys

# We will try to login to the local API using the default admin credentials (from seed_admin.py)
login_data = {
    "username": "admin",  # or email, let's try admin@nepms.com
    "password": "password123"
}
# Let's try to figure out what the user logs in with.
# But I can just check the database for users to see who exists!
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from models.users import User

db = SessionLocal()
users = db.query(User).all()
if not users:
    print("No users in DB!")
    sys.exit(1)

for u in users:
    print(f"User: {u.username}, Role ID: {u.role_id}")

print("---")

print("Checking roles...")
from models.users import Role
roles = db.query(Role).all()
for r in roles:
    print(f"Role: {r.name}, Perms: {r.permissions}")

db.close()
