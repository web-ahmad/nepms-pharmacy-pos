import os
import glob

# Find all page.tsx files inside dynamic routes
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))
print(f"Searching in {frontend_dir}")

code_to_inject = "\n\n// Added for static export compatibility\nexport function generateStaticParams() {\n  return [];\n}\n"

count = 0
for root, dirs, files in os.walk(frontend_dir):
    if "page.tsx" in files:
        # Check if any part of the path has [param]
        if "[" in root and "]" in root:
            filepath = os.path.join(root, "page.tsx")
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Prevent double injection
            if "generateStaticParams" not in content:
                with open(filepath, 'a', encoding='utf-8') as f:
                    f.write(code_to_inject)
                print(f"Updated {filepath}")
                count += 1

print(f"Successfully updated {count} files.")
