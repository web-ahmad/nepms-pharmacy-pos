import re

file_path = "c:/Users/DEVJiX/Desktop/NEPMS/frontend/src/app/super-admin/page.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace single-quoted literal fetch
content = re.sub(
    r"fetch\('/api/v1/super-admin/([^']+)'",
    r"fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/super-admin/\1`",
    content
)

# Replace template literal fetch
content = re.sub(
    r"fetch\(`/api/v1/super-admin/([^`]+)`",
    r"fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/super-admin/\1`",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("page.tsx safe replace done")
