import { useState } from 'react';
import { motion } from 'framer-motion';
import { SystemModule } from '../types/settings';
import { useUpdateModule } from '../services/settings.api';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Blocks } from 'lucide-react';

interface ModuleTableProps {
  data: SystemModule[];
  isLoading: boolean;
}

export default function ModuleTable({ data, isLoading }: ModuleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const filteredData = data?.filter(m =>
    m.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const grouped = filteredData.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, SystemModule[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search modules..."
            className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, modules], i) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="border-b border-zinc-200 bg-zinc-50/60 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Blocks size={16} className="text-blue-500" />
                {category}
              </h3>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {modules.map((mod) => (
                <ModuleRow key={mod.id} module={mod} />
              ))}
            </div>
          </motion.div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-zinc-500 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            No modules found.
          </div>
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
    <div className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
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
        <Switch checked={module.is_enabled} onCheckedChange={toggleStatus} disabled={updateModule.isPending} />
      </div>
    </div>
  );
}
