'use client';

import { useAuthStore } from '@/stores/auth-store';
import { LogOut, User as UserIcon, Bell, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export function TopNavigation() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-1 items-center gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Pharmacy Dashboard
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Placeholder for Branch Switcher */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-md">
            Main Branch
          </span>
        </div>

        <button className="relative p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-600"></span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <UserIcon size={16} />
          </div>
          <div className="hidden md:block text-sm text-right">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{user?.username || 'Guest'}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.role || 'User'}</p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
            title="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
