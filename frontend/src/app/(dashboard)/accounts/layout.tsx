import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  Calculator, 
  ListTree, 
  FileSignature, 
  BookOpen, 
  Scale, 
  TrendingUp, 
  Landmark, 
  Wallet, 
  Receipt 
} from 'lucide-react';

export default function AccountsLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'Dashboard', href: '/accounts', icon: Calculator },
    { name: 'Chart of Accounts', href: '/accounts/chart', icon: ListTree },
    { name: 'Journal Entries', href: '/accounts/journals', icon: FileSignature },
    { name: 'General Ledger', href: '/accounts/ledger', icon: BookOpen },
    { name: 'Trial Balance', href: '/accounts/trial-balance', icon: Scale },
    { name: 'Profit & Loss', href: '/accounts/profit-loss', icon: TrendingUp },
    { name: 'Balance Sheet', href: '/accounts/balance-sheet', icon: Landmark },
    { name: 'Cash Book', href: '/accounts/cash-book', icon: Wallet },
    { name: 'Bank Book', href: '/accounts/bank-book', icon: Landmark },
    { name: 'Expenses', href: '/accounts/expenses', icon: Receipt },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Financial Accounting</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Strict double-entry general ledger, trial balance, and financial statements.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Icon size={16} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
