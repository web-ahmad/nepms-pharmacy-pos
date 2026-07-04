import sys
import traceback
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("Logging in...")
login_data = {'username': 'owner', 'password': 'Demo@123'}
res_login = client.post('/api/v1/auth/login', json=login_data)
if res_login.status_code != 200:
    print("Login Failed:", res_login.text)
    sys.exit()

token = res_login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

print("Fetching suppliers API via TestClient...")
try:
    res = client.get('/api/v1/purchase/suppliers', headers=headers)
    print("Status Code:", res.status_code)
    if res.status_code == 500:
        print("Response Content:", res.text)
except Exception as e:
    traceback.print_exc()
