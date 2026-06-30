import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Building2, 
  Contact2, 
  Clock, 
  CalendarCheck, 
  Palmtree, 
  Banknote,
  LayoutDashboard
} from 'lucide-react';

export default function HRLayout({ children }: { children: ReactNode }) {
  const links = [
    { name: 'Dashboard', href: '/hr', icon: LayoutDashboard },
    { name: 'Employees', href: '/hr/employees', icon: Users },
    { name: 'Departments', href: '/hr/departments', icon: Building2 },
    { name: 'Designations', href: '/hr/designations', icon: Contact2 },
    { name: 'Shifts', href: '/hr/shifts', icon: Clock },
    { name: 'Attendance', href: '/hr/attendance', icon: CalendarCheck },
    { name: 'Leaves', href: '/hr/leaves', icon: Palmtree },
    { name: 'Payroll', href: '/hr/payroll', icon: Banknote },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">HR & Payroll Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage staff, attendance, leaves, and auto-posting payroll runs.</p>
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
