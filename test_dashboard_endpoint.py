import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.users import User

db = SessionLocal()
muneeb = db.query(User).filter(User.hierarchy_level == 3).first()
if not muneeb:
    print("No branch owner found!")
    sys.exit(1)

print(f"Testing with user: {muneeb.email or muneeb.username}")

from core.security import create_access_token
access_token = create_access_token(
    subject=muneeb.id,
    user_type=muneeb.user_type,
    tenant_id=muneeb.tenant_id,
    is_super_admin=muneeb.is_super_admin,
    hierarchy_level=muneeb.hierarchy_level,
    permissions=muneeb.permissions,
)

client = TestClient(app)
response = client.get(
    "/api/v1/dashboard/inventory",
    headers={"Authorization": f"Bearer {access_token}"}
)

print("Status:", response.status_code)
if response.status_code != 200:
    print("Response:", response.json())
else:
    print("Success:", response.json())
