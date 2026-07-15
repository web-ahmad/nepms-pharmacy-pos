import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BranchSettingsOverview } from '@/features/branches/types/branchConfig';
import { branchConfigService } from '@/features/branches/services/branchConfigService';

interface Props {
  branchId: string;
  data: BranchSettingsOverview;
  refetch: () => void;
}

export default function AuditTrailTab({ branchId }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['branch-config-audit-logs', branchId, debouncedSearch],
    queryFn: () => branchConfigService.getAuditLogs(branchId, { search: debouncedSearch, limit: 50 }),
  });

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'updated': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'deleted': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configuration Audit Trail</h2>
          <p className="text-muted-foreground mt-1">Track all changes made to the branch configuration.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search logs..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">Failed to load audit logs.</div>
          ) : data?.items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No audit logs found.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data?.items.map((log) => (
                <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-start gap-4 hover:bg-muted/30 transition-colors">
                  <div className="md:w-48 shrink-0 text-sm">
                    <div className="font-medium">{new Date(log.created_at).toLocaleString()}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{log.ip_address || 'Unknown IP'}</div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase font-mono text-[10px]">{log.module}</Badge>
                      <Badge variant="secondary" className={`capitalize text-[10px] border-none ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{log.summary}</p>
                    
                    {log.field_name && (
                      <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md font-mono overflow-x-auto">
                        <span className="font-semibold text-foreground">{log.field_name}: </span>
                        <span className="line-through text-red-500/70 mr-2">{log.old_value || 'null'}</span>
                        <span className="text-green-600 dark:text-green-400">{log.new_value || 'null'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
