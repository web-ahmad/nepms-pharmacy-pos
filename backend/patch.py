import re

with open('services/auto_posting_service.py', 'r') as f:
    lines = f.readlines()

out = []
for line in lines:
    if line.strip().startswith('def post_'):
        # Add kwargs before ):
        line = line.replace('):', ', branch_id: str = None, source_module: str = None, source_id: str = None):')
    
    if line.strip().startswith('reference='):
        # We know description= usually follows or is on the same line.
        # But JournalEntryCreate has reference, description, etc.
        pass
    
    if 'entry = JournalEntryCreate(' in line:
        line = line.replace('entry = JournalEntryCreate(', 'entry = JournalEntryCreate(\n            branch_id=branch_id,\n            source_module=source_module,\n            source_id=source_id,')
        
    out.append(line)

with open('services/auto_posting_service.py', 'w') as f:
    f.writelines(out)
