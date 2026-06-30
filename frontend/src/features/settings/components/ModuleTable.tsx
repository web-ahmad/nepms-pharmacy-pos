import { useState } from 'react';
import { SystemModule } from '../types/settings';
import { useUpdateModule } from '../services/settings.api';
import { Badge } from '@/components/ui/badge';

interface ModuleTableProps {
  data: SystemModule[];
  isLoading: boolean;
}

export default function ModuleTable({ data, isLoading }: ModuleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  const filteredData = data?.filter(m => 
    m.module_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Group by category
  const grouped = filteredData.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, SystemModule[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="text"
          placeholder="Search modules..."
          className="w-full sm:w-64 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([category, modules]) => (
          <div key={category} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{category}</h3>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {modules.map((mod) => (
                <ModuleRow key={mod.id} module={mod} />
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-8 text-zinc-500">No modules found.</div>
        )}
      </div>
    </div>
  );
}

function ModuleRow({ module }: { module: SystemModule }) {
  const updateModule = useUpdateModule(module.id);

  const toggleStatus = () => {
    updateModule.mutate(!module.is_enabled);
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
      <div>
        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{module.module_name}</h4>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Key: {module.module_key}</p>
      </div>
      <div className="flex items-center gap-4">
        {module.is_enabled ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
        ) : (
          <Badge variant="secondary">Disabled</Badge>
        )}
        <label className="relative inline-flex cursor-pointer items-center">
          <input 
            type="checkbox" 
            className="peer sr-only" 
            checked={module.is_enabled}
            onChange={toggleStatus}
            disabled={updateModule.isPending}
          />
          <div className="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-zinc-600 dark:bg-zinc-700 dark:peer-focus:ring-indigo-800"></div>
        </label>
      </div>
    </div>
  );
}
