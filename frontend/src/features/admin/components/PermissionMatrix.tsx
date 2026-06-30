import { Badge } from '@/components/ui/badge';

interface PermissionMatrixProps {
  permissions: string[];
  isLoading: boolean;
}

export default function PermissionMatrix({ permissions, isLoading }: PermissionMatrixProps) {
  if (isLoading) {
    return <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  // Group by domain (e.g. settings.view -> domain: settings)
  const grouped = permissions.reduce((acc, perm) => {
    const [domain] = perm.split('.');
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([domain, perms]) => (
          <div key={domain} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{domain} Domain</h3>
            <div className="flex flex-col gap-2">
              {perms.map((p) => (
                <div key={p} className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800/50 last:border-0 last:pb-0">
                  <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">{p}</span>
                  <Badge variant="outline" className="text-xs">Available</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
