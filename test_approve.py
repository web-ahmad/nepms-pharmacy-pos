import requests

def test_approve():
    base_url = "http://localhost:8000/api/v1"
    
    # Login
    print("Logging in...")
    res = requests.post(f"{base_url}/auth/login", json={"username": "admin", "password": "admin123"})
    if res.status_code != 200:
        print("Login failed:", res.text)
        return
        
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get POs
    print("Fetching POs...")
    res = requests.get(f"{base_url}/purchase/orders", headers=headers)
    if res.status_code != 200:
        print("Failed to fetch POs:", res.text)
        return
        
    pos = res.json()
    if not pos:
        print("No POs found.")
        return
        
    po_id = pos[0]["id"]
    print(f"Approving PO: {po_id}")
    
    # Approve PO
    res = requests.post(f"{base_url}/purchase/orders/{po_id}/approve", headers=headers)
    print("Status:", res.status_code)
    print("Response:", res.text)

if __name__ == "__main__":
    test_approve()
