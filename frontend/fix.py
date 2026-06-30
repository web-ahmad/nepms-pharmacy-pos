import os

for root, dirs, files in os.walk('c:/Users/DEVJiX/Desktop/New folder/frontend/src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if "import api from '@/lib/api';" in content:
                    content = content.replace("import api from '@/lib/api';", "import { api } from '@/services/api';")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
            except Exception as e:
                pass
