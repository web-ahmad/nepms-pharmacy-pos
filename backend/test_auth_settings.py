import requests
import json

print("Attempting to login as owner...")
resp = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={
    "username": "owner",
    "password": "password" # I assume from seed_admin.py
}, headers={"Content-Type": "application/x-www-form-urlencoded"})

print("Login status:", resp.status_code)
if resp.status_code != 200:
    print("Failed to login:", resp.text)
    
    # Try admin
    resp = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={
        "username": "admin",
        "password": "password123"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    if resp.status_code != 200:
        import sys
        sys.exit(1)

token = resp.json().get("access_token")
print("Got token")

headers = {"Authorization": f"Bearer {token}"}
print("Calling GET /api/v1/settings")
r2 = requests.get("http://127.0.0.1:8000/api/v1/settings", headers=headers)
print("Settings status:", r2.status_code)
if r2.status_code != 200:
    print("Settings failed:", r2.text)

print("Calling GET /api/v1/settings/modules")
r3 = requests.get("http://127.0.0.1:8000/api/v1/settings/modules", headers=headers)
print("Modules status:", r3.status_code)
if r3.status_code != 200:
    print("Modules failed:", r3.text)

