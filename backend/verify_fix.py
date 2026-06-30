import requests, time
time.sleep(6)
login = requests.post('http://localhost:8000/api/v1/auth/login', json={'username':'owner','password':'Demo@123'}).json()
token = login['access_token']
r = requests.get('http://localhost:8000/api/v1/inventory/medicines?skip=0&limit=5', headers={'Authorization': f'Bearer {token}'})
d = r.json()
print('Status:', r.status_code)
print('Total:', d.get('total'))
if d.get('items'):
    print('First medicine:', d['items'][0]['name'])
else:
    print('No items returned')
