import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("Logging in as admin...")
    resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if resp.status_code != 200:
        print("Login failed:", resp.status_code, resp.text)
        return
        
    print("Login success.")
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        "/api/v1/auth/me",
        "/api/v1/dashboard/overview",
        "/api/v1/dashboard/inventory",
        "/api/v1/dashboard/alerts/expiry",
        "/api/v1/dashboard/alerts/low-stock",
        "/api/v1/inventory/alerts/low-stock?skip=0&limit=100",
        "/api/v1/notifications"
    ]
    
    for ep in endpoints:
        r = requests.get(f"{BASE_URL}{ep}", headers=headers)
        print(f"GET {ep} -> {r.status_code}")
        if r.status_code != 200:
            print("Response:", r.text[:200])

if __name__ == "__main__":
    test_endpoints()
