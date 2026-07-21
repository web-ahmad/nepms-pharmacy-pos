import os
import re

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))

count = 0
for root, dirs, files in os.walk(frontend_dir):
    if "page.tsx" in files and "[" in root and "]" in root:
        filepath = os.path.join(root, "page.tsx")
        
        # Find the parameter name from the folder path (e.g. [id] -> id)
        params_found = re.findall(r'\[([^\]]+)\]', root)
        if not params_found:
            continue
            
        # Create a dictionary string like { id: "1", code: "1" }
        param_obj_str = "{ " + ", ".join([f"{p}: '1'" for p in params_found]) + " }"
        
        new_generate_func = f"""export function generateStaticParams() {{
  return [{param_obj_str}];
}}"""
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace the old empty array return
        old_func = "export function generateStaticParams() {\n  return [];\n}"
        old_func2 = "export function generateStaticParams() { return []; }"
        
        if old_func in content or old_func2 in content:
            content = content.replace(old_func, new_generate_func)
            content = content.replace(old_func2, new_generate_func)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated params for {filepath} -> {param_obj_str}")
            count += 1

print(f"Successfully updated {count} files.")
