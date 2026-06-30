import re
import os

files = [
    r'c:\Users\DEVJiX\Desktop\New folder\frontend\src\app\(dashboard)\inventory\medicines\add\page.tsx',
    r'c:\Users\DEVJiX\Desktop\New folder\frontend\src\app\(dashboard)\inventory\medicines\[id]\page.tsx'
]

imports = """import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
"""

def replace_select(match):
    name = match.group(1)
    options_str = match.group(2)
    
    # Parse options
    options = re.findall(r'<option value="([^"]*)">([^<]+)</option>', options_str)
    
    items = []
    placeholder = f"Select {name}"
    for val, text in options:
        if val == "":
            placeholder = text
        else:
            items.append(f'<SelectItem value="{val}">{text}</SelectItem>')
    
    items_str = '\n                '.join(items)
    
    return f"""<Controller
                control={{control}}
                name="{name}"
                render={{({{ field }}) => (
                  <Select onValueChange={{field.onChange}} value={{field.value || undefined}}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="{placeholder}" />
                    </SelectTrigger>
                    <SelectContent>
                      {items_str}
                    </SelectContent>
                  </Select>
                )}}
              />"""

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "import { Input }" not in content:
        content = content.replace("import { Button } from '@/components/ui/button';", imports + "import { Button } from '@/components/ui/button';")

    # Replace <label>
    content = re.sub(r'<label className="block text-sm font-medium text-[a-zA-Z0-9\-]+ mb-1">(.*?)</label>', r'<Label className="block mb-2">\1</Label>', content)

    # Replace <input> classes (simplifying them to just bg-white)
    content = re.sub(r'className="w-full px-4 py-2 border border-[a-zA-Z0-9\-]+ rounded-md focus:ring-2 focus:ring-[a-zA-Z0-9\-]+ outline-none(.*?)"', r'className="bg-white\1"', content)
    
    # Replace <input type="number">
    content = re.sub(r'<input\s+type="number"', r'<Input type="number"', content)
    content = re.sub(r'<input\s+type="date"', r'<Input type="date"', content)
    content = re.sub(r'<input\s+\{\.\.\.register', r'<Input {...register', content)
    
    # Barcode special input
    content = content.replace('<input \n                  {...register(\'barcode\')}', '<Input \n                  {...register(\'barcode\')}')
    
    # Replace Select elements
    # <select {...register('category')} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
    #   <option value="">Select Category</option>
    #   ...
    # </select>
    
    content = re.sub(r'<select \{\.\.\.register\(\'([a-zA-Z0-9_]+)\'\)\}[^>]+>(.*?)</select>', replace_select, content, flags=re.DOTALL)
    
    # Supplier select is special because it has dynamic options mapping
    if "supplier_id" in content:
        # We need to manually fix supplier select.
        supplier_select = """<Controller
                  control={control}
                  name="supplier_id"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />"""
        content = re.sub(r'<select \{\.\.\.register\(\'supplier_id\'\)\}[^>]+>.*?</select>', supplier_select, content, flags=re.DOTALL)
    
    # Save back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
