import requests
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.config import settings as core_settings
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, core_settings.SECRET_KEY, algorithm=core_settings.ALGORITHM)
    return encoded_jwt

# Just get the first user to get a tenant_id
from database import SessionLocal
from models.users import User
db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No user found")
    sys.exit(1)

token = create_access_token(data={
    "sub": user.id,
    "tenant_id": user.tenant_id,
    "role": "Owner",
    "permissions": ["*"]
})
db.close()

headers = {"Authorization": f"Bearer {token}"}
print("Calling GET /api/v1/settings")
try:
    resp = requests.get("http://127.0.0.1:8000/api/v1/settings", headers=headers)
    print("Status:", resp.status_code)
    print("Body:", resp.text[:200])
except Exception as e:
    print("Request failed:", e)
