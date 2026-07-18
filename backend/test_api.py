import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

response = client.post("/api/v1/auth/login", data={"username": "superadmin@nepms.com", "password": "password123"})
if response.status_code == 200:
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.post("/api/v1/hr/departments", json={"name": "Test Dept", "is_active": True}, headers=headers)
    print("Status:", res.status_code)
    print("Response body:", res.text)
    
    res2 = client.post("/api/v1/hr/departments", json={"name": "Test Dept", "is_active": True}, headers=headers)
    print("Status 2:", res2.status_code)
    print("Response body 2:", res2.text)
else:
    print("Failed to login", response.text)
