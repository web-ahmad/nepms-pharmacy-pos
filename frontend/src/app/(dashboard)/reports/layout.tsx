import { ReactNode } from 'react';

// The report categories now live in the MAIN sidebar (nested under "Reports"),
// so this layout is just a full-width content shell — no secondary sidebar.
export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50/30 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:p-8">
      {children}
    </div>
  );
}
