import os

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))
code_to_remove = "\n\n// Added for static export compatibility\nexport function generateStaticParams() {\n  return [];\n}\n"

count = 0
for root, dirs, files in os.walk(frontend_dir):
    if "page.tsx" in files:
        if "[" in root and "]" in root:
            filepath = os.path.join(root, "page.tsx")
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if code_to_remove in content:
                content = content.replace(code_to_remove, "")
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1

print(f"Reverted {count} files.")
