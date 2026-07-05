import re

with open('src/features/inventory/components/MedicineMasterWizard/SimpleFormLayout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace class for standard inputs/selects/textareas
new_text = re.sub(
    r'className=(\"|\`)w-full border-outline-variant rounded-custom',
    r'className=\g<1>w-full border border-outline-variant rounded-custom h-10 px-3 py-2',
    text
)

# Fix textarea since h-10 will make it too short
new_text = re.sub(
    r'(<textarea.*?className=(\"|\`))w-full border border-outline-variant rounded-custom h-10 px-3 py-2',
    r'\g<1>w-full border border-outline-variant rounded-custom px-3 py-2 min-h-[80px]',
    new_text, flags=re.DOTALL
)

# Fix the 'border-red-200' missing 'border' class as well
new_text = re.sub(
    r'className=(\"|\`)w-full border-red-200 bg-red-50/30 rounded-custom',
    r'className=\g<1>w-full border border-red-200 bg-red-50/30 rounded-custom h-10 px-3 py-2',
    new_text
)

# Fix rounded-l-custom / rounded-r-custom inputs to have borders
new_text = re.sub(
    r'className=(\"|\`)w-full border-outline-variant rounded-l-custom',
    r'className=\g<1>w-full border border-outline-variant rounded-l-custom h-10 px-3 py-2',
    new_text
)
new_text = re.sub(
    r'className=(\"|\`)w-full border-outline-variant rounded-r-custom',
    r'className=\g<1>w-full border border-outline-variant rounded-r-custom h-10 px-3 py-2',
    new_text
)
new_text = re.sub(
    r'className=(\"|\`)w-full bg-slate-50 border-outline-variant rounded-r-custom',
    r'className=\g<1>w-full bg-slate-50 border border-outline-variant rounded-r-custom h-10 px-3 py-2',
    new_text
)

with open('src/features/inventory/components/MedicineMasterWizard/SimpleFormLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(new_text)

print('Updated border and padding classes')
