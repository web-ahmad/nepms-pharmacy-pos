import re

file_path = "c:/Users/DEVJiX/Desktop/NEPMS/frontend/src/app/super-admin/PharmacyGrid.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I accidentally created strings like: fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/super-admin/pharmacies', {
# Notice it starts with a backtick but ends with a single quote. I will replace the trailing single quote with a backtick.
# It matches: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/... '
content = re.sub(r"(\`\$\{process\.env\.NEXT_PUBLIC_API_URL\}/api/v1/[^\']+)\'", r"\1`", content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Syntax fixed")
