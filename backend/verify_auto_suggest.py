import requests
import json

base_url = "http://127.0.0.1:8000"

print("Logging in...")
login_data = {'username': 'owner', 'password': 'Demo@123'}
r = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
if r.status_code != 200:
    print("Login Failed:", r.text)
    exit()

token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

print("Fetching auto-suggest API...")
res = requests.get(f"{base_url}/api/v1/purchase/auto-suggest", headers=headers)
print("Status Code:", res.status_code)

if res.status_code != 200:
    print("Error:", res.text)
else:
    data = res.json()
    print("Length:", len(data))
    if len(data) > 0:
        print("First item:", json.dumps(data[0], indent=2))
    else:
        print("Data is empty!")
