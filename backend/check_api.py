import urllib.request
import json

url = "http://localhost:8000/api/v1/reports/sales/summary?start_date=2026-07-21&end_date=2026-07-21&period=day"

req = urllib.request.Request(url, headers={
    # We don't have a valid token, so this might return 401 Unauthorized
    # But if there's a 500 error, sometimes it happens BEFORE auth or after auth.
    # We will just see if we can get a response.
})

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
