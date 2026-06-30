import requests

r = requests.post('http://127.0.0.1:8000/api/v1/auth/login', json={'username':'owner','password':'Demo@123'})
t = r.json()
print("LOGIN RESPONSE KEYS:", list(t.keys()))
print("ACCESS TOKEN exists:", 'access_token' in t)
print("ROLE field:", t.get('role'))
print("USER field:", t.get('user'))

headers = {'Authorization': f"Bearer {t['access_token']}"}
pos = requests.get('http://127.0.0.1:8000/api/v1/purchase/orders', headers=headers).json()

# Show all unique statuses
statuses = set(p['status'] for p in pos)
print("ALL UNIQUE PO STATUSES:", statuses)

# Show draft POs
drafts = [p for p in pos if 'raft' in p['status'].lower()]
print(f"DRAFT POs count: {len(drafts)}")
for d in drafts[:3]:
    print(f"  PO {d['order_number']} -> status='{d['status']}'")
