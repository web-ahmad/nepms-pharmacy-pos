import os

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'src', 'app'))
layout_code = """export function generateStaticParams() {
  return [];
}

export default function DynamicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
"""

count = 0
for root, dirs, files in os.walk(frontend_dir):
    # If this directory is a dynamic route (e.g. [id])
    basename = os.path.basename(root)
    if basename.startswith("[") and basename.endswith("]"):
        layout_path = os.path.join(root, "layout.tsx")
        if not os.path.exists(layout_path):
            with open(layout_path, "w", encoding="utf-8") as f:
                f.write(layout_code)
            print(f"Created {layout_path}")
            count += 1

print(f"Successfully created {count} layout files.")
