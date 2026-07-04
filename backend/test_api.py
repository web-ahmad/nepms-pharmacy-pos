import urllib.request

try:
    url = "http://localhost:8000/api/v1/audit/logs?start_date=2026-06-20&end_date=2026-06-30&tab=General%20Activity"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer mock"})
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
    else:
        print(e)
