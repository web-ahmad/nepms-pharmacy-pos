import urllib.request, json, sys, os
sys.path.append(os.path.abspath('backend'))
BASE = 'http://127.0.0.1:8000'
res_data = urllib.request.urlopen(urllib.request.Request(f'{BASE}/api/v1/auth/login', data=json.dumps({'username': 'owner', 'password': 'Demo@123'}).encode(), headers={'Content-Type': 'application/json'})).read().decode()
token = json.loads(res_data)['access_token']
H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
req = urllib.request.Request(f'{BASE}/api/v1/inventory/medicines', headers=H)
data = json.loads(urllib.request.urlopen(req).read().decode())
items = data if isinstance(data, list) else (data.get('items') or data.get('data'))
med = items[0]

import test_frontend_payload
payload = test_frontend_payload.backend_payload
req = urllib.request.Request(f'{BASE}/api/v1/inventory/medicines/{med["id"]}', data=json.dumps(payload).encode(), headers=H, method='PUT')
try:
    res = urllib.request.urlopen(req)
    print('SUCCESS:', res.status)
except Exception as e:
    print('ERROR:', e.read().decode() if hasattr(e, 'read') else str(e))
