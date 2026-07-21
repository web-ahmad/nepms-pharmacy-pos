import os
import re

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))

count = 0
for root, dirs, files in os.walk(frontend_dir):
    if "page.tsx" in files and "page-client.tsx" in files:
        filepath = os.path.join(root, "page.tsx")
        
        # Find the parameter name from the folder path (e.g. [id] -> id)
        params_found = re.findall(r'\[([^\]]+)\]', root)
        if not params_found:
            continue
            
        param_obj_str = "{ " + ", ".join([f"{p}: '1'" for p in params_found]) + " }"
        
        # New Suspense wrapper code WITHOUT props
        new_content = f"""import ClientPage from './page-client';
import {{ Suspense }} from 'react';

export function generateStaticParams() {{
  return [{param_obj_str}];
}}

export default function Page() {{
  return (
    <Suspense fallback={{<div className="flex justify-center items-center h-screen"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>}}>
      <ClientPage />
    </Suspense>
  );
}}
"""
        
        # Overwrite the page.tsx wrapper
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        print(f"Updated wrapper without props for {filepath}")
        count += 1

print(f"Successfully updated {count} files.")
