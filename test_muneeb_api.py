from fastapi.testclient import TestClient
from backend.main import app
from backend.models.users import User
from backend.database import SessionLocal
from backend.core.config import settings
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

db = SessionLocal()
muneeb = db.query(User).filter(User.email.like('%muneeb%')).first()
if not muneeb:
    print("Muneeb not found")
    exit(1)

branch = muneeb.branches[0].branch if muneeb.branches else None
branch_id = branch.id if branch else ""

payload = {
    "sub": muneeb.username,
    "user_id": muneeb.id,
    "tenant_id": muneeb.tenant_id,
    "branch_id": branch_id,
    "hierarchy_level": 3,
    "is_super_admin": False
}
token = create_access_token(payload)

client = TestClient(app)
headers = {"Authorization": f"Bearer {token}", "x-branch-id": branch_id}

# Test chart of accounts
response = client.get("/api/v1/accounting/accounts/chart", headers=headers)
print(f"Chart of Accounts: {response.status_code}")
if response.status_code != 200:
    print(response.json())

# Test dashboard stats
response = client.get("/api/v1/accounting/accounts/dashboard-stats", headers=headers)
print(f"Dashboard Stats: {response.status_code}")
if response.status_code != 200:
    print(response.json())
    
# Test journals
response = client.get("/api/v1/accounting/accounts/journals", headers=headers)
print(f"Journals: {response.status_code}")
if response.status_code != 200:
    print(response.json())
