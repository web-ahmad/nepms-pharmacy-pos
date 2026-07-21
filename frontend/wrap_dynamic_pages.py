import os
import shutil

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))

server_wrapper_code = """import ClientPage from './page-client';

export function generateStaticParams() {
  return [];
}

export default function Page(props: any) {
  return <ClientPage {...props} />;
}
"""

count = 0
for root, dirs, files in os.walk(frontend_dir):
    if "page.tsx" in files:
        if "[" in root and "]" in root:
            original_page = os.path.join(root, "page.tsx")
            client_page = os.path.join(root, "page-client.tsx")
            
            # If we haven't already wrapped this folder
            if not os.path.exists(client_page):
                # Check if it has 'use client'
                with open(original_page, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if "use client" in content:
                    # Rename page.tsx -> page-client.tsx
                    os.rename(original_page, client_page)
                    
                    # Create the new Server Component wrapper
                    with open(original_page, 'w', encoding='utf-8') as f:
                        f.write(server_wrapper_code)
                    print(f"Wrapped {original_page}")
                    count += 1
                else:
                    # If it's already a server component, just inject it directly
                    if "generateStaticParams" not in content:
                        with open(original_page, 'a', encoding='utf-8') as f:
                            f.write("\n\nexport function generateStaticParams() { return []; }\n")
                        print(f"Injected into {original_page}")
                        count += 1

print(f"Successfully processed {count} dynamic pages.")
